import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBrandSignals, BrandSignals } from '@/lib/brand/signals';
import { generateLogoConcepts } from '@/lib/brand/generate';
import { applyWatermark } from '@/lib/brand/watermark';
import { uploadToR2 } from '@/lib/brand/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { sessionId, preferences } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  const session = await prisma.brandSession.findUnique({ where: { id: sessionId } });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // Mark as generating again
  await prisma.brandSession.update({
    where: { id: sessionId },
    data: { status: 'GENERATING', progress: 'extracting_signals' },
  });

  // Delete old concepts
  await prisma.brandConcept.deleteMany({ where: { brandSessionId: sessionId } });

  // Regenerate with user preferences
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

    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { progress: 'processing_previews' },
    });

    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i];

      const originalRes = await fetch(concept.imageUrl);
      const originalBuffer = Buffer.from(await originalRes.arrayBuffer());
      const watermarkedBuffer = await applyWatermark(originalBuffer);

      const originalKey = `brand/${sessionId}/originals/${concept.style}-${Date.now()}.png`;
      const previewKey = `brand/${sessionId}/previews/${concept.style}-${Date.now()}.png`;

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
