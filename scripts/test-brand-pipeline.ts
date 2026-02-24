/**
 * Test script for the full brand post-purchase pipeline.
 *
 * Usage:
 *   npx tsx scripts/test-brand-pipeline.ts <brandSessionId> <conceptId> [tier]
 *
 * Examples:
 *   npx tsx scripts/test-brand-pipeline.ts cm7jxyz123 cm7jxyz456
 *   npx tsx scripts/test-brand-pipeline.ts cm7jxyz123 cm7jxyz456 BRAND_KIT
 *
 * To find session/concept IDs, generate logos via the UI, then query the DB:
 *   npx prisma studio  (opens browser, look at BrandSession + BrandConcept tables)
 *
 * Or run:
 *   npx tsx -e "const {prisma} = require('./lib/prisma'); prisma.brandSession.findMany({orderBy:{createdAt:'desc'},take:3,include:{concepts:true}}).then(s=>console.log(JSON.stringify(s,null,2)))"
 *
 * Tiers: LOGO_ONLY (default), BRAND_KIT, BRAND_KIT_PRO
 *
 * What this script does:
 *   1. Removes background from selected logo (fal.ai rembg)
 *   2. Upscales to 2x (fal.ai esrgan)
 *   3. Downloads as high-res PNG buffer
 *   4. Vectorizes to SVG (vectorizer.ai)
 *   5. Extracts color palette from logo
 *   6. Gets font pairing based on brand tone
 *   7. Generates favicon package (16px-512px + .ico + webmanifest)
 *   8. If BRAND_KIT or higher: generates 20 social media assets
 *   9. If BRAND_KIT or higher: generates 5-page Brand Guidelines PDF
 *  10. Assembles ZIP and writes to disk
 *
 * Required env vars: FAL_KEY, VECTORIZER_AI_API_ID, VECTORIZER_AI_API_SECRET
 * Optional: OPENAI_API_KEY (for signals, but we read from DB)
 */

import { prisma } from '../lib/prisma';
import { removeBackground, upscaleImage, downloadToBuffer, vectorizeToSvg } from '../lib/brand/postprocess';
import { extractBrandPalette } from '../lib/brand/palette';
import { getFontPairing } from '../lib/brand/typography';
import { generateSocialKit } from '../lib/brand/socialKit';
import { generateFaviconPackage } from '../lib/brand/favicons';
import { generateBrandPdf } from '../lib/brand/brandPdf';
import { assembleZip } from '../lib/brand/packaging';
import { BrandSignals } from '../lib/brand/signals';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const [,, sessionId, conceptId, tierArg] = process.argv;
  const tier = (tierArg as any) || 'BRAND_KIT';

  if (!sessionId || !conceptId) {
    console.error('Usage: npx tsx scripts/test-brand-pipeline.ts <sessionId> <conceptId> [tier]');
    console.error('\nTo find IDs, run: npx prisma studio');
    process.exit(1);
  }

  console.log(`\nTesting brand pipeline:`);
  console.log(`  Session: ${sessionId}`);
  console.log(`  Concept: ${conceptId}`);
  console.log(`  Tier:    ${tier}\n`);

  // Step 1: Load data
  console.log('1/10 Loading session data...');
  const session = await prisma.brandSession.findUniqueOrThrow({ where: { id: sessionId } });
  const concept = await prisma.brandConcept.findUniqueOrThrow({ where: { id: conceptId } });
  const signals = session.signals as unknown as BrandSignals;
  console.log(`  Domain: ${session.domainName}, Tone: ${signals.tone}, Style: ${concept.style}`);
  console.log(`  Original URL: ${concept.originalUrl}`);

  // Step 2: Remove background
  console.log('\n2/10 Removing background (fal.ai rembg)...');
  const noBgUrl = await removeBackground(concept.originalUrl);
  console.log(`  No-bg URL: ${noBgUrl}`);

  // Step 3: Upscale
  console.log('\n3/10 Upscaling 2x (fal.ai esrgan)...');
  const upscaledUrl = await upscaleImage(noBgUrl);
  console.log(`  Upscaled URL: ${upscaledUrl}`);

  // Step 4: Download to buffer
  console.log('\n4/10 Downloading high-res PNG...');
  const logoPngBuffer = await downloadToBuffer(upscaledUrl);
  console.log(`  Buffer size: ${(logoPngBuffer.length / 1024).toFixed(1)}KB`);

  // Step 5: Vectorize to SVG
  console.log('\n5/10 Vectorizing to SVG (vectorizer.ai)...');
  let logoSvg: string;
  try {
    logoSvg = await vectorizeToSvg(logoPngBuffer);
    console.log(`  SVG length: ${logoSvg.length} chars`);
  } catch (err: any) {
    console.warn(`  SVG vectorization failed: ${err.message}`);
    console.warn('  Continuing with placeholder SVG...');
    logoSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text y="50">Logo</text></svg>';
  }

  // Step 6: Extract palette
  console.log('\n6/10 Extracting color palette...');
  const palette = await extractBrandPalette(logoPngBuffer);
  console.log(`  Primary: ${palette.primary}, Secondary: ${palette.secondary}, Accent: ${palette.accent}`);

  // Step 7: Font pairing
  console.log('\n7/10 Getting font pairing...');
  const fonts = getFontPairing(signals.tone);
  console.log(`  Heading: ${fonts.heading.name}, Body: ${fonts.body.name}`);

  // Step 8: Favicons
  console.log('\n8/10 Generating favicon package...');
  const favicons = await generateFaviconPackage(logoPngBuffer, session.domainName);
  console.log(`  Generated ${favicons.length} favicon assets`);

  let socialKit = undefined;
  let brandPdf = undefined;

  if (tier !== 'LOGO_ONLY') {
    // Step 9: Social kit
    console.log('\n9/10 Generating social media kit...');
    socialKit = await generateSocialKit(logoPngBuffer, palette.primary);
    console.log(`  Generated ${socialKit.length} social media assets`);

    // Step 10: Brand Guidelines PDF
    console.log('\n10/10 Generating brand guidelines PDF...');
    brandPdf = await generateBrandPdf(session.domainName, signals, logoPngBuffer, logoSvg, palette, fonts);
    console.log(`  PDF size: ${(brandPdf.length / 1024).toFixed(1)}KB`);
  } else {
    console.log('\n9/10 Skipping social kit (LOGO_ONLY tier)');
    console.log('10/10 Skipping brand PDF (LOGO_ONLY tier)');
  }

  // Assemble ZIP
  console.log('\nAssembling ZIP...');
  const zipBuffer = await assembleZip({
    domainName: session.domainName,
    logoPng: logoPngBuffer,
    logoSvg,
    palette,
    fonts,
    socialKit,
    favicons,
    brandPdf,
    tier: tier as any,
  });

  // Write to disk
  const outputDir = path.join(process.cwd(), 'test-output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const zipPath = path.join(outputDir, `${session.domainName}-brand-${tier.toLowerCase()}.zip`);
  fs.writeFileSync(zipPath, zipBuffer);
  console.log(`\nZIP written to: ${zipPath}`);
  console.log(`ZIP size: ${(zipBuffer.length / 1024).toFixed(1)}KB`);

  // Also write individual files for inspection
  if (brandPdf) {
    const pdfPath = path.join(outputDir, `${session.domainName}-brand-guidelines.pdf`);
    fs.writeFileSync(pdfPath, brandPdf);
    console.log(`PDF written to: ${pdfPath}`);
  }

  const svgPath = path.join(outputDir, `${session.domainName}-logo.svg`);
  fs.writeFileSync(svgPath, logoSvg);
  console.log(`SVG written to: ${svgPath}`);

  const pngPath = path.join(outputDir, `${session.domainName}-logo-2000px.png`);
  fs.writeFileSync(pngPath, logoPngBuffer);
  console.log(`PNG written to: ${pngPath}`);

  console.log('\nDone! Open the ZIP or individual files to inspect quality.');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('\nPipeline failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
