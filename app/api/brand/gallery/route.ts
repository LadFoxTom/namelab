import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const cursor = req.nextUrl.searchParams.get('cursor');
  const limit = 12;

  const sessions = await prisma.brandSession.findMany({
    where: {
      status: 'READY',
      showInGallery: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      domainName: true,
      tld: true,
      searchQuery: true,
      createdAt: true,
      concepts: {
        orderBy: { score: 'desc' },
        take: 1,
        select: {
          id: true,
          style: true,
          previewUrl: true,
        },
      },
    },
  });

  const hasMore = sessions.length > limit;
  const items = sessions.slice(0, limit);
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({
    items: items.map((s) => ({
      sessionId: s.id,
      domainName: s.domainName,
      tld: s.tld,
      description: s.searchQuery,
      createdAt: s.createdAt,
      topConcept: s.concepts[0] ?? null,
    })),
    nextCursor,
  });
}
