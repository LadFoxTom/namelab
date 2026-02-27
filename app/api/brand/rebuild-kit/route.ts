import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { downloadToBuffer, vectorizeToSvg, removeWhiteBackground, ensurePng, compositeLogoWithText, compositeLogoWithTextTransparent, generateNameImages } from '@/lib/brand/postprocess';
import { downloadFromR2 } from '@/lib/brand/storage';
import { extractBrandPalette } from '@/lib/brand/palette';
import { getFontPairing } from '@/lib/brand/typography';
import { selectTypeSystem } from '@/lib/brand/typographer';
import { buildColorSystem } from '@/lib/brand/colorist';
import { runCriticQA } from '@/lib/brand/critic';
import { generateSocialKit } from '@/lib/brand/socialKit';
import { generateSocialStrategy } from '@/lib/brand/socialDirector';
import { generateFaviconPackage } from '@/lib/brand/favicons';
import { generateBrandPdf } from '@/lib/brand/brandPdf';
import { generateBusinessCards } from '@/lib/brand/businessCards';
import { assembleZip } from '@/lib/brand/packaging';
import { BrandSignals } from '@/lib/brand/signals';
import { DesignBrief, BrandFeedback, reviseBrief, briefToSignals } from '@/lib/brand/strategist';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { sessionId, conceptId, tier = 'BRAND_KIT', feedback } = await req.json();

  if (!sessionId || !conceptId) {
    return NextResponse.json({ error: 'Missing sessionId or conceptId' }, { status: 400 });
  }

  if (!feedback || typeof feedback !== 'object') {
    return NextResponse.json({ error: 'Missing or invalid feedback object' }, { status: 400 });
  }

  try {
    // Load data
    const session = await prisma.brandSession.findUniqueOrThrow({ where: { id: sessionId } });
    const concept = await prisma.brandConcept.findUniqueOrThrow({ where: { id: conceptId } });
    const rawSignals = session.signals as any;
    const originalBrief: DesignBrief | undefined = rawSignals?.brief;

    if (!originalBrief) {
      return NextResponse.json(
        { error: 'No design brief found for this session. Cannot rebuild without an existing brief.' },
        { status: 400 }
      );
    }

    // Revise the brief based on user feedback
    const revisedBrief = await reviseBrief(originalBrief, feedback as BrandFeedback);

    // Derive fresh signals from the revised brief
    const signals: BrandSignals = briefToSignals(revisedBrief, session.domainName);

    // 1. Download the original (unwatermarked) image from R2 (same logo, no regeneration)
    let logoPngBuffer: Buffer;
    if (concept.originalUrl.startsWith('http')) {
      const rawBuffer = await downloadToBuffer(concept.originalUrl);
      logoPngBuffer = await ensurePng(rawBuffer);
    } else {
      try {
        const rawBuffer = await downloadFromR2(concept.originalUrl);
        logoPngBuffer = await ensurePng(rawBuffer);
      } catch (err: any) {
        console.warn('R2 direct download failed, falling back to previewUrl:', err.message);
        const rawBuffer = await downloadToBuffer(concept.previewUrl);
        logoPngBuffer = await ensurePng(rawBuffer);
      }
    }

    // 4. Vectorize to SVG
    let logoSvg: string;
    try {
      logoSvg = await vectorizeToSvg(logoPngBuffer);
    } catch {
      console.warn('SVG vectorization failed, using placeholder');
      logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><text x="50%" y="50%" text-anchor="middle" font-size="48">${session.domainName}</text></svg>`;
    }

    // 4b. Generate transparent-background variant
    const logoPngTransparent = await removeWhiteBackground(logoPngBuffer);

    // 5. Extract palette from logo image
    const imagePalette = await extractBrandPalette(logoPngBuffer);

    // 6. Typographer: font selection using REVISED brief
    const conceptSalt = (concept as any).style as string | undefined;
    const typeSystem = selectTypeSystem(revisedBrief, signals, conceptSalt);
    const fonts = typeSystem || getFontPairing(signals.tone);

    // 7. Colorist: systematic HSL palette using REVISED brief
    const colorSystem = buildColorSystem(revisedBrief, imagePalette, imagePalette.primary);
    const palette = colorSystem?.brand ?? imagePalette;

    // 8. Critic QA
    const qa = runCriticQA(revisedBrief, signals, palette, fonts, typeSystem, colorSystem);
    const qaReport = qa.report;
    const finalPalette = qa.fixedPalette;
    const finalColorSystem = qa.fixedColorSystem ?? colorSystem;
    if (qaReport.fixes.length > 0) {
      console.log(`Critic applied ${qaReport.fixes.length} auto-fix(es): ${qaReport.summary}`);
    }

    // 8b. Generate logo-with-text composites and name images
    let logoWithTextPng: Buffer | undefined;
    let logoWithTextTransparentPng: Buffer | undefined;
    let nameWhiteBgPng: Buffer | undefined;
    let nameTransparentPng: Buffer | undefined;
    const brandName = revisedBrief.brandName || session.domainName.charAt(0).toUpperCase() + session.domainName.slice(1);
    try {
      logoWithTextPng = await compositeLogoWithText(logoPngBuffer, brandName, finalPalette.primary, finalPalette.dark);
      logoWithTextTransparentPng = await compositeLogoWithTextTransparent(logoPngBuffer, brandName, finalPalette.dark);
      const nameImages = await generateNameImages(brandName, finalPalette.dark);
      nameWhiteBgPng = nameImages.nameWhiteBg;
      nameTransparentPng = nameImages.nameTransparent;
    } catch (err: any) {
      console.warn('Logo-with-text/name composites failed:', err.message);
    }

    // 9. Favicons
    const favicons = await generateFaviconPackage(logoPngBuffer, session.domainName);

    // 10-12. Social kit, business cards, PDF (for BRAND_KIT and BRAND_KIT_PRO)
    let socialKit = undefined;
    let brandPdf = undefined;
    let businessCards = undefined;
    if (tier !== 'LOGO_ONLY') {
      const socialStrategy = await generateSocialStrategy(revisedBrief, signals);
      socialKit = await generateSocialKit(logoPngBuffer, finalPalette, signals, session.domainName, socialStrategy, conceptSalt);
      businessCards = await generateBusinessCards(logoPngBuffer, finalPalette, session.domainName, revisedBrief);
      brandPdf = await generateBrandPdf(
        session.domainName, signals, logoPngBuffer, logoSvg, finalPalette, fonts,
        revisedBrief, typeSystem, finalColorSystem, logoPngTransparent
      );
    }

    // 13. Assemble ZIP
    const zipBuffer = await assembleZip({
      domainName: session.domainName,
      logoPng: logoPngBuffer,
      logoPngTransparent,
      logoWithTextPng,
      logoWithTextTransparentPng,
      nameWhiteBgPng,
      nameTransparentPng,
      logoSvg,
      palette: finalPalette,
      fonts,
      socialKit,
      favicons,
      brandPdf,
      businessCards,
      tier: tier as any,
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${session.domainName}-brand-kit-revised.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Brand kit rebuild failed:', error);
    return NextResponse.json(
      { error: 'Brand kit rebuild failed', details: error.message },
      { status: 500 }
    );
  }
}
