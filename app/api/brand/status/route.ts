import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const STALE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

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

    return NextResponse.json({ status: 'FAILED', progress: null, signals: null, concepts: [] });
  }

  return NextResponse.json({
    status: session.status,
    progress: session.progress,
    signals: session.status === 'READY' ? session.signals : null,
    concepts: session.status === 'READY'
      ? session.concepts.map(c => ({
          id: c.id,
          style: c.style,
          previewUrl: c.previewUrl,
          isSelected: c.isSelected,
        }))
      : [],
  });
}
