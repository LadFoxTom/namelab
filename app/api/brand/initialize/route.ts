import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { inngest } from '@/inngest/client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { domainName, tld, searchQuery, anonymousId, preferences } = await req.json();

  if (!domainName || !searchQuery) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const sessionUser = await getSession();

  const session = await prisma.brandSession.create({
    data: {
      domainName,
      tld: tld ?? '.com',
      searchQuery,
      anonymousId: anonymousId ?? null,
      userId: sessionUser?.id ?? null,
      signals: {},
      status: 'GENERATING',
      progress: 'extracting_signals',
    },
  });

  // Fire background generation via Inngest — return immediately
  await inngest.send({
    name: 'brand/generate.previews',
    data: {
      brandSessionId: session.id,
      domainName,
      tld: tld ?? '.com',
      searchQuery,
      preferences: preferences ?? null,
    },
  });

  return NextResponse.json({ sessionId: session.id, status: 'GENERATING' });
}
