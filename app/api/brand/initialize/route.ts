import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBrandSignals } from '@/lib/brand/signals';
import { generateLogoConcepts } from '@/lib/brand/generate';
import { selectBestConcepts } from '@/lib/brand/select';
import { applyWatermark } from '@/lib/brand/watermark';
import { uploadToR2 } from '@/lib/brand/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { domainName, tld, searchQuery, anonymousId } = await req.json();

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
    },
  });

  generateBrandPreview(session.id, domainName, searchQuery).catch(console.error);

  return NextResponse.json({ sessionId: session.id, status: 'GENERATING' });
}

async function generateBrandPreview(sessionId: string, domainName: string, searchQuery: string) {
  try {
    const signals = await extractBrandSignals(domainName, searchQuery);
    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { signals: signals as any },
    });

    const candidates = await generateLogoConcepts(signals);
    const selected = await selectBestConcepts(candidates);

    for (let i = 0; i < selected.length; i++) {
      const concept = selected[i];

      const originalRes = await fetch(concept.imageUrl);
      const originalBuffer = Buffer.from(await originalRes.arrayBuffer());

      const watermarkedBuffer = await applyWatermark(originalBuffer);

      const originalKey = `brand/${sessionId}/originals/${concept.style}.png`;
      const previewKey = `brand/${sessionId}/previews/${concept.style}.png`;

      const [originalUrl, previewUrl] = await Promise.all([
        uploadToR2(originalKey, originalBuffer, 'image/png', false),
        uploadToR2(previewKey, watermarkedBuffer, 'image/png', true),
      ]);

      await prisma.brandConcept.create({
        data: {
          brandSessionId: sessionId,
          style: concept.style,
          previewUrl,
          originalUrl,
          generationIndex: i,
          promptUsed: concept.prompt,
        },
      });
    }

    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { status: 'READY' },
    });
  } catch (error) {
    console.error('Brand preview generation failed:', error);
    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { status: 'FAILED' },
    });
  }
}
