import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBrandSignals, BrandSignals } from '@/lib/brand/signals';
import { generateLogoConcepts } from '@/lib/brand/generate';
import { pregeneratePalette } from '@/lib/brand/palettePregen';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { sessionId, preferences } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  const session = await prisma.brandSession.findUnique({ where: { id: sessionId } });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  await prisma.brandSession.update({
    where: { id: sessionId },
    data: { status: 'GENERATING', progress: 'extracting_signals' },
  });

  await prisma.brandConcept.deleteMany({ where: { brandSessionId: sessionId } });

  try {
    const userPrefs: Partial<BrandSignals> = {};
    if (preferences?.tone) userPrefs.tone = preferences.tone as BrandSignals['tone'];
    if (preferences?.iconStyle) userPrefs.iconStyle = preferences.iconStyle as BrandSignals['iconStyle'];
    if (preferences?.colorPreference) {
      userPrefs.colorDirection = { primary: preferences.colorPreference, mood: '', avoid: '', paletteStyle: 'analogous' };
    }
    if (preferences?.logoDescription) userPrefs.logoDescription = preferences.logoDescription;

    const description = preferences?.businessDescription || session.searchQuery;
    const signals = await extractBrandSignals(session.domainName, description, Object.keys(userPrefs).length > 0 ? userPrefs : undefined);
    const palette = pregeneratePalette(signals);

    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { signals: signals as any, progress: 'generating_logos' },
    });

    const concepts = await generateLogoConcepts(signals, palette);

    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i];
      await prisma.brandConcept.create({
        data: {
          brandSessionId: sessionId,
          style: concept.style,
          previewUrl: concept.imageUrl,
          originalUrl: concept.imageUrl,
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
      where: { id: sessionId },
      data: { status: 'READY', progress: 'ready' },
    });

    return NextResponse.json({ status: 'READY' });
  } catch (error) {
    console.error('Brand refinement failed:', error);
    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { status: 'FAILED', progress: null },
    });
    return NextResponse.json({ status: 'FAILED' }, { status: 500 });
  }
}
