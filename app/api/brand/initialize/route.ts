import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBrandSignals, BrandSignals } from '@/lib/brand/signals';
import { generateLogoConcepts } from '@/lib/brand/generate';
import { pregeneratePalette } from '@/lib/brand/palettePregen';
import { downloadToBuffer } from '@/lib/brand/postprocess';
import { applyWatermark } from '@/lib/brand/watermark';
import { uploadToR2 } from '@/lib/brand/storage';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { domainName, tld, searchQuery, anonymousId, preferences } = await req.json();

  if (!domainName || !searchQuery) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
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

  // Use a streaming response to keep the connection alive during long generation.
  // Vercel Hobby allows streaming responses for up to 60s (vs 10s for buffered).
  // We send progress events as the generation proceeds, then a final result.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, any>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({ sessionId: session.id, progress: 'extracting_signals' });

        const userPrefs: Partial<BrandSignals> = {};
        if (preferences?.tone) userPrefs.tone = preferences.tone as BrandSignals['tone'];
        if (preferences?.iconStyle) userPrefs.iconStyle = preferences.iconStyle as BrandSignals['iconStyle'];
        if (preferences?.colorPreference) {
          userPrefs.colorDirection = { primary: preferences.colorPreference, mood: '', avoid: '', paletteStyle: 'analogous' };
        }
        if (preferences?.logoDescription) userPrefs.logoDescription = preferences.logoDescription;

        const description = preferences?.businessDescription || searchQuery;
        const signals = await extractBrandSignals(domainName, description, Object.keys(userPrefs).length > 0 ? userPrefs : undefined);

        const palette = pregeneratePalette(signals);

        await prisma.brandSession.update({
          where: { id: session.id },
          data: { signals: signals as any, progress: 'generating_logos' },
        });

        send({ sessionId: session.id, progress: 'generating_logos' });

        const concepts = await generateLogoConcepts(signals, palette);

        send({ sessionId: session.id, progress: 'processing_previews' });

        for (let i = 0; i < concepts.length; i++) {
          const concept = concepts[i];

          const imageBuffer = await downloadToBuffer(concept.imageUrl);

          const watermarkedBuffer = await applyWatermark(imageBuffer);
          const previewKey = `brand/${session.id}/previews/${concept.style}-${i}.png`;
          const previewUrl = await uploadToR2(previewKey, watermarkedBuffer, 'image/png', true);

          const originalKey = `brand/${session.id}/originals/${concept.style}-${i}.png`;
          await uploadToR2(originalKey, imageBuffer, 'image/png', false);

          await prisma.brandConcept.create({
            data: {
              brandSessionId: session.id,
              style: concept.style,
              previewUrl,
              originalUrl: originalKey,
              generationIndex: i,
              promptUsed: concept.prompt,
              score: concept.score,
              evaluationFlags: concept.evaluationFlags,
              attemptCount: concept.attemptCount,
              passedEvaluation: concept.passedEvaluation,
            },
          });
        }

        await prisma.brandSession.update({
          where: { id: session.id },
          data: { status: 'READY', progress: 'ready' },
        });

        send({ sessionId: session.id, status: 'READY' });
      } catch (error) {
        console.error('Brand preview generation failed:', error);
        await prisma.brandSession.update({
          where: { id: session.id },
          data: { status: 'FAILED', progress: null },
        }).catch(() => {});

        send({ sessionId: session.id, status: 'FAILED' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
