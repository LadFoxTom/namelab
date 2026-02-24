import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { sessionId, conceptId } = await req.json();

  if (!sessionId || !conceptId) {
    return NextResponse.json({ error: 'Missing sessionId or conceptId' }, { status: 400 });
  }

  // Deselect all concepts for this session
  await prisma.brandConcept.updateMany({
    where: { brandSessionId: sessionId },
    data: { isSelected: false },
  });

  // Select the chosen concept
  const concept = await prisma.brandConcept.update({
    where: { id: conceptId },
    data: { isSelected: true },
  });

  return NextResponse.json({ success: true, selectedId: concept.id });
}
