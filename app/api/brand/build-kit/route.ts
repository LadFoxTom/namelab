import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { upscaleImage, downloadToBuffer, vectorizeToSvg, removeWhiteBackground, ensurePng } from '@/lib/brand/postprocess';
import { getSignedDownloadUrl } from '@/lib/brand/storage';
import { extractBrandPalette } from '@/lib/brand/palette';
import { getFontPairing } from '@/lib/brand/typography';
import { selectTypeSystem } from '@/lib/brand/typographer';
import { buildColorSystem } from '@/lib/brand/colorist';
import { runCriticQA } from '@/lib/brand/critic';
import { generateSocialKit } from '@/lib/brand/socialKit';
import { generateFaviconPackage } from '@/lib/brand/favicons';
import { generateBrandPdf } from '@/lib/brand/brandPdf';
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

    // 1. Resolve image URL — try private original, fall back to public preview
    let resolvedUrl: string;
    if (concept.originalUrl.startsWith('http')) {
      resolvedUrl = concept.originalUrl;
    } else {
      try {
        const signedUrl = await getSignedDownloadUrl(concept.originalUrl);
        // Verify the signed URL is accessible
        const headRes = await fetch(signedUrl, { method: 'HEAD' });
        resolvedUrl = headRes.ok ? signedUrl : concept.previewUrl;
        if (!headRes.ok) console.warn('Signed URL returned', headRes.status, '— falling back to previewUrl');
      } catch {
        resolvedUrl = concept.previewUrl;
        console.warn('Signed URL failed — falling back to previewUrl');
      }
    }

    // 1b. Upscale 2x (gracefully skip if fal.ai is unavailable)
    let imageUrl = resolvedUrl;
    try {
      imageUrl = await upscaleImage(resolvedUrl);
    } catch (err: any) {
      console.warn('Upscaling failed, using original image:', err.message);
    }

    // 2. Download and ensure PNG format (pdf-lib requires PNG)
    const rawBuffer = await downloadToBuffer(imageUrl);
    const logoPngBuffer = await ensurePng(rawBuffer);

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
    const typeSystem = brief ? selectTypeSystem(brief, signals) : undefined;
    const fonts = typeSystem || getFontPairing(signals.tone);

    // 7. Colorist: systematic HSL palette with accessibility checks
    const colorSystem = brief ? buildColorSystem(brief, imagePalette) : undefined;
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

    // 9. Favicons
    const favicons = await generateFaviconPackage(logoPngBuffer, session.domainName);

    // 10-11. Social kit + PDF (for BRAND_KIT and BRAND_KIT_PRO)
    let socialKit = undefined;
    let brandPdf = undefined;
    if (tier !== 'LOGO_ONLY') {
      socialKit = await generateSocialKit(logoPngBuffer, finalPalette, signals, session.domainName);
      brandPdf = await generateBrandPdf(
        session.domainName, signals, logoPngBuffer, logoSvg, finalPalette, fonts,
        brief, typeSystem, finalColorSystem, qaReport
      );
    }

    // 12. Assemble ZIP
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
