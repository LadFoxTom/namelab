import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });

  const session = await prisma.brandSession.findUnique({
    where: { id: sessionId },
    include: { concepts: { orderBy: { generationIndex: 'asc' } } },
  });

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

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
