import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBrandSignals, BrandSignals } from '@/lib/brand/signals';
import { generateLogoConcepts } from '@/lib/brand/generate';
import { applyWatermark } from '@/lib/brand/watermark';
import { uploadToR2 } from '@/lib/brand/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { domainName, tld, searchQuery, anonymousId, preferences } = await req.json();

  if (!domainName || !searchQuery) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const session = await prisma.brandSession.create({
    data: {
      domainName,
      tld: tld ?? '.com',
      searchQuery,
      anonymousId: anonymousId ?? null,
      signals: {},
      status: 'GENERATING',
      progress: 'extracting_signals',
    },
  });

  generateBrandPreview(session.id, domainName, searchQuery, preferences).catch(console.error);

  return NextResponse.json({ sessionId: session.id, status: 'GENERATING' });
}

async function generateBrandPreview(
  sessionId: string,
  domainName: string,
  searchQuery: string,
  preferences?: { businessDescription?: string; tone?: string; colorPreference?: string; iconStyle?: string }
) {
  try {
    // Build user preferences for signal extraction
    const userPrefs: Partial<BrandSignals> = {};
    if (preferences?.tone) userPrefs.tone = preferences.tone as BrandSignals['tone'];
    if (preferences?.iconStyle) userPrefs.iconStyle = preferences.iconStyle as BrandSignals['iconStyle'];
    if (preferences?.colorPreference) {
      userPrefs.colorDirection = { primary: preferences.colorPreference, mood: '', avoid: '', paletteStyle: 'analogous' };
    }

    const description = preferences?.businessDescription || searchQuery;
    const signals = await extractBrandSignals(domainName, description, Object.keys(userPrefs).length > 0 ? userPrefs : undefined);

    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { signals: signals as any, progress: 'generating_logos' },
    });

    // Generate 1 image per style (4 total) — no vision scoring needed
    const concepts = await generateLogoConcepts(signals);

    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { progress: 'processing_previews' },
    });

    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i];

      const originalRes = await fetch(concept.imageUrl);
      const originalBuffer = Buffer.from(await originalRes.arrayBuffer());

      const watermarkedBuffer = await applyWatermark(originalBuffer);

      const originalKey = `brand/${sessionId}/originals/${concept.style}.png`;
      const previewKey = `brand/${sessionId}/previews/${concept.style}.png`;

      const [originalUrl, previewUrl] = await Promise.all([
        uploadToR2(originalKey, originalBuffer, 'image/png', false),
        uploadToR2(previewKey, watermarkedBuffer, 'image/png', true),
      ]);

      await prisma.brandConcept.create({
        data: {
          brandSessionId: sessionId,
          style: concept.style,
          previewUrl,
          originalUrl,
          generationIndex: i,
          promptUsed: concept.prompt,
        },
      });
    }

    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { status: 'READY', progress: 'ready' },
    });
  } catch (error) {
    console.error('Brand preview generation failed:', error);
    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { status: 'FAILED', progress: null },
    });
  }
}
