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
import { DesignBrief } from '@/lib/brand/strategist';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { sessionId, conceptId, tier = 'BRAND_KIT' } = await req.json();

  if (!sessionId || !conceptId) {
    return NextResponse.json({ error: 'Missing sessionId or conceptId' }, { status: 400 });
  }

  try {
    // Load data
    const session = await prisma.brandSession.findUniqueOrThrow({ where: { id: sessionId } });
    const concept = await prisma.brandConcept.findUniqueOrThrow({ where: { id: conceptId } });
    // Support both old format (flat BrandSignals) and new format ({ brief, derived })
    const rawSignals = session.signals as any;
    const signals: BrandSignals = rawSignals?.derived ?? rawSignals as BrandSignals;
    const brief: DesignBrief | undefined = rawSignals?.brief;

    // 1. Download the original (unwatermarked) image from R2
    let logoPngBuffer: Buffer;
    if (concept.originalUrl.startsWith('http')) {
      // Legacy: originalUrl is already a full URL
      const rawBuffer = await downloadToBuffer(concept.originalUrl);
      logoPngBuffer = await ensurePng(rawBuffer);
    } else {
      // originalUrl is an R2 key — download directly via SDK (no signed URL needed)
      try {
        const rawBuffer = await downloadFromR2(concept.originalUrl);
        logoPngBuffer = await ensurePng(rawBuffer);
      } catch (err: any) {
        console.warn('R2 direct download failed, falling back to previewUrl:', err.message);
        const rawBuffer = await downloadToBuffer(concept.previewUrl);
        logoPngBuffer = await ensurePng(rawBuffer);
      }
    }

    // 1b. Upscale 2x via fal.ai (gracefully skip if unavailable)
    // Note: upscaler needs a URL, so we upload the clean buffer temporarily or skip
    // For now, skip upscaling if fal.ai is down — the original is already good quality

    // 4. Vectorize to SVG (fallback if no API key)
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

    // 6. Typographer: sector-aware font selection using design brief
    const conceptSalt = (concept as any).style as string | undefined;
    const typeSystem = brief ? selectTypeSystem(brief, signals, conceptSalt) : undefined;
    const fonts = typeSystem || getFontPairing(signals.tone);

    // 7. Colorist: systematic HSL palette with accessibility checks
    const colorSystem = brief ? buildColorSystem(brief, imagePalette, imagePalette.primary) : undefined;
    // Use the colorist's brand palette if available (enriched with CMYK, CSS vars), else image-extracted
    const palette = colorSystem?.brand ?? imagePalette;

    // 8. Critic QA — validate and auto-fix brand system
    let qaReport = undefined;
    let finalPalette = palette;
    let finalColorSystem = colorSystem;
    if (brief) {
      const qa = runCriticQA(brief, signals, palette, fonts, typeSystem, colorSystem);
      qaReport = qa.report;
      finalPalette = qa.fixedPalette;
      finalColorSystem = qa.fixedColorSystem ?? colorSystem;
      if (qaReport.fixes.length > 0) {
        console.log(`Critic applied ${qaReport.fixes.length} auto-fix(es): ${qaReport.summary}`);
      }
    }

    // 8b. Generate logo-with-text composites and name images
    let logoWithTextPng: Buffer | undefined;
    let logoWithTextTransparentPng: Buffer | undefined;
    let nameWhiteBgPng: Buffer | undefined;
    let nameTransparentPng: Buffer | undefined;
    const brandName = brief?.brandName || session.domainName.charAt(0).toUpperCase() + session.domainName.slice(1);
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
      const socialStrategy = brief ? await generateSocialStrategy(brief, signals) : undefined;
      socialKit = await generateSocialKit(logoPngBuffer, finalPalette, signals, session.domainName, socialStrategy, conceptSalt);
      businessCards = await generateBusinessCards(logoPngBuffer, finalPalette, session.domainName, brief);
      brandPdf = await generateBrandPdf(
        session.domainName, signals, logoPngBuffer, logoSvg, finalPalette, fonts,
        brief, typeSystem, finalColorSystem
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

    // 12. Return ZIP as binary response
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${session.domainName}-brand-kit.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Brand kit build failed:', error);
    return NextResponse.json(
      { error: 'Brand kit generation failed', details: error.message },
      { status: 500 }
    );
  }
}
