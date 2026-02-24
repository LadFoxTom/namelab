import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBrandSignals, BrandSignals } from '@/lib/brand/signals';
import { generateLogoConcepts } from '@/lib/brand/generate';

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

  regenerateWithPreferences(sessionId, session.domainName, session.searchQuery, preferences).catch(console.error);

  return NextResponse.json({ status: 'GENERATING' });
}

async function regenerateWithPreferences(
  sessionId: string,
  domainName: string,
  searchQuery: string,
  preferences: Partial<BrandSignals>
) {
  try {
    const signals = await extractBrandSignals(domainName, searchQuery, preferences);
    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { signals: signals as any, progress: 'generating_logos' },
    });

    const concepts = await generateLogoConcepts(signals);

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
        },
      });
    }

    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { status: 'READY', progress: 'ready' },
    });
  } catch (error) {
    console.error('Brand refinement failed:', error);
    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { status: 'FAILED', progress: null },
    });
  }
}
