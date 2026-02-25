import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { upscaleImage, downloadToBuffer, vectorizeToSvg, removeWhiteBackground } from '@/lib/brand/postprocess';
import { getSignedDownloadUrl } from '@/lib/brand/storage';
import { extractBrandPalette } from '@/lib/brand/palette';
import { getFontPairing } from '@/lib/brand/typography';
import { generateSocialKit } from '@/lib/brand/socialKit';
import { generateFaviconPackage } from '@/lib/brand/favicons';
import { generateBrandPdf } from '@/lib/brand/brandPdf';
import { assembleZip } from '@/lib/brand/packaging';
import { BrandSignals } from '@/lib/brand/signals';

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
    const signals = session.signals as unknown as BrandSignals;

    // 1. Resolve originalUrl: if it's an R2 key (not a URL), get a signed download URL
    const originalUrl = concept.originalUrl.startsWith('http')
      ? concept.originalUrl
      : await getSignedDownloadUrl(concept.originalUrl);

    // 1b. Upscale 2x (keep white background — rembg destroys logo text)
    const upscaledUrl = await upscaleImage(originalUrl);

    // 2. Download high-res PNG
    const logoPngBuffer = await downloadToBuffer(upscaledUrl);

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

    // 5. Extract palette
    const palette = await extractBrandPalette(logoPngBuffer);

    // 6. Font pairing
    const fonts = getFontPairing(signals.tone);

    // 7. Favicons
    const favicons = await generateFaviconPackage(logoPngBuffer, session.domainName);

    // 8-9. Social kit + PDF (for BRAND_KIT and BRAND_KIT_PRO)
    let socialKit = undefined;
    let brandPdf = undefined;
    if (tier !== 'LOGO_ONLY') {
      socialKit = await generateSocialKit(logoPngBuffer, palette, signals, session.domainName);
      brandPdf = await generateBrandPdf(session.domainName, signals, logoPngBuffer, logoSvg, palette, fonts);
    }

    // 10. Assemble ZIP
    const zipBuffer = await assembleZip({
      domainName: session.domainName,
      logoPng: logoPngBuffer,
      logoPngTransparent,
      logoSvg,
      palette,
      fonts,
      socialKit,
      favicons,
      brandPdf,
      tier: tier as any,
    });

    // 11. Return ZIP as binary response
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
