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
import { upscaleImage, downloadToBuffer, vectorizeToSvg, removeWhiteBackground } from '../lib/brand/postprocess';
import { extractBrandPalette } from '../lib/brand/palette';
import { getFontPairing } from '../lib/brand/typography';
import { selectTypeSystem } from '../lib/brand/typographer';
import { buildColorSystem } from '../lib/brand/colorist';
import { generateSocialKit } from '../lib/brand/socialKit';
import { generateFaviconPackage } from '../lib/brand/favicons';
import { generateBrandPdf } from '../lib/brand/brandPdf';
import { runCriticQA } from '../lib/brand/critic';
import { assembleZip } from '../lib/brand/packaging';
import { getSignedDownloadUrl } from '../lib/brand/storage';
import { BrandSignals } from '../lib/brand/signals';
import { DesignBrief } from '../lib/brand/strategist';
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
  // Support both old format (flat BrandSignals) and new format ({ brief, derived })
  const rawSignals = session.signals as any;
  const signals: BrandSignals = rawSignals?.derived ?? rawSignals as BrandSignals;
  const brief: DesignBrief | undefined = rawSignals?.brief;
  console.log(`  Domain: ${session.domainName}, Tone: ${signals.tone}, Style: ${concept.style}`);
  if (brief) console.log(`  Brief: ${brief.aestheticDirection} / "${brief.tensionPair}"`);
  console.log(`  Original URL: ${concept.originalUrl}`);

  // Step 1b: Resolve R2 key if needed
  const originalUrl = concept.originalUrl.startsWith('http')
    ? concept.originalUrl
    : await getSignedDownloadUrl(concept.originalUrl);
  if (originalUrl !== concept.originalUrl) {
    console.log(`  Resolved R2 key → signed URL`);
  }

  // Step 2: Upscale 2x
  console.log('\n2/10 Upscaling 2x (fal.ai esrgan)...');
  const upscaledUrl = await upscaleImage(originalUrl);
  console.log(`  Upscaled URL: ${upscaledUrl}`);

  // Step 3: Download high-res PNG (skip bg removal — rembg destroys logo text)
  console.log('\n3/10 Downloading high-res PNG...');
  const logoPngBuffer = await downloadToBuffer(upscaledUrl);
  console.log(`  Buffer size: ${(logoPngBuffer.length / 1024).toFixed(1)}KB`);

  // Step 4: Generate transparent-background variant
  console.log('\n4/10 Removing white background...');
  const logoPngTransparent = await removeWhiteBackground(logoPngBuffer);
  console.log(`  Transparent PNG size: ${(logoPngTransparent.length / 1024).toFixed(1)}KB`);

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
  const imagePalette = await extractBrandPalette(logoPngBuffer);
  console.log(`  Primary: ${imagePalette.primary}, Secondary: ${imagePalette.secondary}, Accent: ${imagePalette.accent}`);

  // Step 6b: Colorist (if design brief available)
  const colorSystem = brief ? buildColorSystem(brief, imagePalette) : undefined;
  const palette = colorSystem?.brand ?? imagePalette;
  if (colorSystem) {
    console.log(`  Colorist: theme=${colorSystem.theme}, AA pass=${colorSystem.allAaPass}`);
  }

  // Step 7: Font pairing (Typographer if brief available)
  console.log('\n7/10 Getting font pairing...');
  const typeSystem = brief ? selectTypeSystem(brief, signals) : undefined;
  const fonts = typeSystem || getFontPairing(signals.tone);
  console.log(`  Heading: ${fonts.heading.name}, Body: ${fonts.body.name}`);

  // Step 8: Critic QA
  let qaReport = undefined;
  let finalPalette = palette;
  let finalColorSystem = colorSystem;
  if (brief) {
    console.log('\n8/11 Running Critic QA...');
    const qa = runCriticQA(brief, signals, palette, fonts, typeSystem, colorSystem);
    qaReport = qa.report;
    finalPalette = qa.fixedPalette;
    finalColorSystem = qa.fixedColorSystem ?? colorSystem;
    console.log(`  Verdict: ${qaReport.verdict}, Overall: ${qaReport.scores.overall}/10`);
    console.log(`  Issues: ${qaReport.issues.length}, Fixes: ${qaReport.fixes.length}`);
    if (qaReport.issues.length > 0) {
      for (const issue of qaReport.issues) {
        console.log(`    [${issue.severity}] ${issue.category}: ${issue.description}`);
      }
    }
    if (qaReport.fixes.length > 0) {
      for (const fix of qaReport.fixes) {
        console.log(`    [fix] ${fix.category}: ${fix.before} → ${fix.after}`);
      }
    }
  } else {
    console.log('\n8/11 Skipping Critic QA (no design brief)');
  }

  // Step 9: Favicons
  console.log('\n9/11 Generating favicon package...');
  const favicons = await generateFaviconPackage(logoPngBuffer, session.domainName);
  console.log(`  Generated ${favicons.length} favicon assets`);

  let socialKit = undefined;
  let brandPdf = undefined;

  if (tier !== 'LOGO_ONLY') {
    // Step 10: Social kit
    console.log('\n10/11 Generating social media kit...');
    socialKit = await generateSocialKit(logoPngBuffer, finalPalette, signals, session.domainName);
    console.log(`  Generated ${socialKit.length} social media assets`);

    // Step 11: Brand Guidelines PDF
    console.log('\n11/11 Generating brand guidelines PDF...');
    brandPdf = await generateBrandPdf(session.domainName, signals, logoPngBuffer, logoSvg, finalPalette, fonts, brief, typeSystem, finalColorSystem, qaReport);
    console.log(`  PDF size: ${(brandPdf.length / 1024).toFixed(1)}KB`);
  } else {
    console.log('\n10/11 Skipping social kit (LOGO_ONLY tier)');
    console.log('11/11 Skipping brand PDF (LOGO_ONLY tier)');
  }

  // Assemble ZIP
  console.log('\nAssembling ZIP...');
  const zipBuffer = await assembleZip({
    domainName: session.domainName,
    logoPng: logoPngBuffer,
    logoPngTransparent,
    logoSvg,
    palette: finalPalette,
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
