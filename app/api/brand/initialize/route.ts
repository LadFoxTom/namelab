import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBrandSignals, BrandSignals } from '@/lib/brand/signals';
import { generateLogoConcepts } from '@/lib/brand/generate';
import { pregeneratePalette } from '@/lib/brand/palettePregen';
import { downloadToBuffer } from '@/lib/brand/postprocess';
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

  try {
    const userPrefs: Partial<BrandSignals> = {};
    if (preferences?.tone) userPrefs.tone = preferences.tone as BrandSignals['tone'];
    if (preferences?.iconStyle) userPrefs.iconStyle = preferences.iconStyle as BrandSignals['iconStyle'];
    if (preferences?.colorPreference) {
      userPrefs.colorDirection = { primary: preferences.colorPreference, mood: '', avoid: '', paletteStyle: 'analogous' };
    }
    if (preferences?.logoDescription) userPrefs.logoDescription = preferences.logoDescription;

    const description = preferences?.businessDescription || searchQuery;
    const signals = await extractBrandSignals(domainName, description, Object.keys(userPrefs).length > 0 ? userPrefs : undefined);

    // Pre-generate palette before image generation so hex colors go into prompts
    const palette = pregeneratePalette(signals);

    await prisma.brandSession.update({
      where: { id: session.id },
      data: { signals: signals as any, progress: 'generating_logos' },
    });

    const concepts = await generateLogoConcepts(signals, palette);

    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i];

      // Download raw image from fal.ai CDN to buffer
      const imageBuffer = await downloadToBuffer(concept.imageUrl);

      // Apply watermark for preview (public)
      const watermarkedBuffer = await applyWatermark(imageBuffer);
      const previewKey = `brand/${session.id}/previews/${concept.style}-${i}.png`;
      const previewUrl = await uploadToR2(previewKey, watermarkedBuffer, 'image/png', true);

      // Upload original unwatermarked to R2 (private)
      const originalKey = `brand/${session.id}/originals/${concept.style}-${i}.png`;
      await uploadToR2(originalKey, imageBuffer, 'image/png', false);

      await prisma.brandConcept.create({
        data: {
          brandSessionId: session.id,
          style: concept.style,
          previewUrl,
          originalUrl: originalKey,
          generationIndex: i,
          promptUsed: concept.prompt,
          score: concept.score,
          evaluationFlags: concept.evaluationFlags,
          attemptCount: concept.attemptCount,
          passedEvaluation: concept.passedEvaluation,
        },
      });
    }

    await prisma.brandSession.update({
      where: { id: session.id },
      data: { status: 'READY', progress: 'ready' },
    });

    return NextResponse.json({ sessionId: session.id, status: 'READY' });
  } catch (error) {
    console.error('Brand preview generation failed:', error);
    await prisma.brandSession.update({
      where: { id: session.id },
      data: { status: 'FAILED', progress: null },
    });
    return NextResponse.json({ sessionId: session.id, status: 'FAILED' }, { status: 500 });
  }
}
