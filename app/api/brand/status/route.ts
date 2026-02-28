import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const STALE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });

  const session = await prisma.brandSession.findUnique({
    where: { id: sessionId },
    include: { concepts: { orderBy: { generationIndex: 'asc' } } },
  });

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // Auto-fail sessions stuck in GENERATING for too long
  if (session.status === 'GENERATING' && Date.now() - session.updatedAt.getTime() > STALE_TIMEOUT_MS) {
    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { status: 'FAILED', progress: null },
    });

    return NextResponse.json({ status: 'FAILED', progress: null, signals: null, designBrief: null, concepts: [] });
  }

  // Extract designBrief from signals as soon as the strategist has written it
  const rawSignals = session.signals as any;
  const designBrief = rawSignals?.brief ?? null;

  // Return concepts that have been saved so far, even during generation
  const concepts = session.concepts.map(c => ({
    id: c.id,
    style: c.style,
    previewUrl: c.previewUrl,
    isSelected: c.isSelected,
    score: c.score,
  }));

  return NextResponse.json({
    status: session.status,
    progress: session.progress,
    designBrief,
    signals: session.status === 'READY' ? session.signals : null,
    concepts,
  });
}
