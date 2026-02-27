import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { downloadToBuffer, vectorizeToSvg, removeWhiteBackground, ensurePng, compositeLogoWithText, compositeLogoWithTextTransparent, generateNameImages, colorizeToWhite, colorizeToBlack, toGrayscale, compositeOnBackground } from '@/lib/brand/postprocess';
import { downloadFromR2 } from '@/lib/brand/storage';
import { extractBrandPalette } from '@/lib/brand/palette';
import { getFontPairing } from '@/lib/brand/typography';
import { selectTypeSystem } from '@/lib/brand/typographer';
import { buildColorSystem } from '@/lib/brand/colorist';
import { runCriticQA } from '@/lib/brand/critic';
import { generateSocialKit } from '@/lib/brand/socialKit';
import { generateSocialStrategy } from '@/lib/brand/socialDirector';
import { generateFaviconPackage, FaviconAsset } from '@/lib/brand/favicons';
import { generateBrandPdf } from '@/lib/brand/brandPdf';
import { generateBusinessCards } from '@/lib/brand/businessCards';
import { assembleZip } from '@/lib/brand/packaging';
import { generateLetterhead } from '@/lib/brand/letterhead';
import { generateEmailSignature } from '@/lib/brand/emailSignature';
import { BrandSignals } from '@/lib/brand/signals';
import { DesignBrief } from '@/lib/brand/strategist';
import { generateVariations, LogoVariations } from '@/lib/brand/variationGenerator';

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

    // 8c. Generate logo color variants
    let logoWhitePng: Buffer | undefined;
    let logoBlackPng: Buffer | undefined;
    let logoGrayscalePng: Buffer | undefined;
    let logoOnDarkBgPng: Buffer | undefined;
    let logoOnBrandBgPng: Buffer | undefined;
    let logoHighRes4000: Buffer | undefined;
    let logoWithTextHighRes: Buffer | undefined;
    try {
      const [white, black, gray, onDark, onBrand, hiRes] = await Promise.all([
        colorizeToWhite(logoPngTransparent),
        colorizeToBlack(logoPngTransparent),
        toGrayscale(logoPngBuffer),
        compositeOnBackground(logoPngTransparent, finalPalette.dark),
        compositeOnBackground(logoPngTransparent, finalPalette.primary),
        sharp(logoPngTransparent).resize(4000, 4000, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
      ]);
      logoWhitePng = white;
      logoBlackPng = black;
      logoGrayscalePng = gray;
      logoOnDarkBgPng = onDark;
      logoOnBrandBgPng = onBrand;
      logoHighRes4000 = hiRes;
      // Also generate high-res logo-with-name if the composite exists
      if (logoWithTextTransparentPng) {
        logoWithTextHighRes = await sharp(logoWithTextTransparentPng)
          .resize(4000, 4000, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png().toBuffer();
      }
    } catch (err: any) {
      console.warn('Logo variant generation failed:', err.message);
    }

    // 8d. Generate logo variation matrix (6 variations x 5 color versions)
    let logoVariations: LogoVariations | undefined;
    try {
      const tagline = brief?.tagline || '';
      logoVariations = await generateVariations(
        logoPngTransparent,
        brandName,
        tagline,
        { primary: finalPalette.primary, dark: finalPalette.dark }
      );
    } catch (err: any) {
      console.warn('Logo variation generation failed:', err.message);
    }

    // 9. Favicons
    let favicons: FaviconAsset[];
    try {
      favicons = await generateFaviconPackage(logoPngBuffer, session.domainName);
    } catch (err: any) {
      console.warn('Favicon generation failed:', err.message);
      favicons = [];
    }

    // 10-12. Social kit, business cards, PDF, print collateral (for BRAND_KIT and BRAND_KIT_PRO)
    let socialKit = undefined;
    let brandPdf = undefined;
    let businessCards = undefined;
    let letterhead = undefined;
    let emailSignature = undefined;
    if (tier !== 'LOGO_ONLY') {
      let socialStrategy = undefined;
      try {
        socialStrategy = brief ? await generateSocialStrategy(brief, signals) : undefined;
      } catch (err: any) {
        console.warn('Social strategy generation failed:', err.message);
      }

      try {
        socialKit = await generateSocialKit(logoPngBuffer, finalPalette, signals, session.domainName, socialStrategy, conceptSalt);
      } catch (err: any) {
        console.warn('Social kit generation failed:', err.message);
      }

      try {
        businessCards = await generateBusinessCards(logoPngBuffer, finalPalette, session.domainName, brief);
      } catch (err: any) {
        console.warn('Business cards generation failed:', err.message);
      }

      try {
        letterhead = await generateLetterhead(logoPngBuffer, finalPalette, session.domainName, brief);
      } catch (err: any) {
        console.warn('Letterhead generation failed:', err.message);
      }

      try {
        emailSignature = generateEmailSignature(finalPalette, session.domainName, brief);
      } catch (err: any) {
        console.warn('Email signature generation failed:', err.message);
      }

      try {
        brandPdf = await generateBrandPdf(
          session.domainName, signals, logoPngBuffer, logoSvg, finalPalette, fonts,
          brief, typeSystem, finalColorSystem, logoPngTransparent
        );
      } catch (err: any) {
        console.warn('Brand PDF generation failed:', err.message);
      }
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
      // Phase 1 additions
      logoWhitePng,
      logoBlackPng,
      logoGrayscalePng,
      logoOnDarkBgPng,
      logoOnBrandBgPng,
      logoHighRes4000,
      logoWithTextHighRes,
      colorSystem: finalColorSystem,
      letterhead,
      emailSignature,
      logoVariations,
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
    console.error('Brand kit build failed:', error?.message, error?.stack);
    return NextResponse.json(
      { error: 'Brand kit generation failed', details: error?.message, stack: error?.stack },
      { status: 500 }
    );
  }
}
