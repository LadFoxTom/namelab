import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const sessions = await prisma.brandSession.findMany({
    where: {
      userId: user.id,
      status: 'READY',
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      domainName: true,
      tld: true,
      searchQuery: true,
      createdAt: true,
      concepts: {
        orderBy: { generationIndex: 'asc' },
        select: {
          id: true,
          style: true,
          previewUrl: true,
        },
      },
    },
  });

  return NextResponse.json({ brands: sessions });
}
