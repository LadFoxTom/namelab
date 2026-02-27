import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { prisma } from '@/lib/prisma';
import { revisePromptWithFeedback } from '@/lib/brand/prompts';
import { downloadToBuffer, ensurePng } from '@/lib/brand/postprocess';
import { uploadToR2 } from '@/lib/brand/storage';

export const runtime = 'nodejs';
export const maxDuration = 120;

fal.config({ credentials: process.env.FAL_KEY! });

export async function POST(req: NextRequest) {
  const { conceptId, feedback } = await req.json();

  if (!conceptId || typeof conceptId !== 'string') {
    return NextResponse.json({ error: 'Missing conceptId' }, { status: 400 });
  }
  if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
    return NextResponse.json({ error: 'Missing or empty feedback' }, { status: 400 });
  }
  if (feedback.length > 500) {
    return NextResponse.json({ error: 'Feedback too long (max 500 chars)' }, { status: 400 });
  }

  // 1. Load concept + session
  const concept = await prisma.brandConcept.findUnique({
    where: { id: conceptId },
    include: { brandSession: true },
  });
  if (!concept) {
    return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
  }

  const session = concept.brandSession;

  // 2. Revise the prompt with GPT
  const revisedPrompt = await revisePromptWithFeedback(concept.promptUsed, feedback.trim());

  // 3. Generate refined image via Flux img2img (keeps the original composition)
  const result = await fal.subscribe('fal-ai/flux/dev/image-to-image', {
    input: {
      image_url: concept.previewUrl,
      prompt: revisedPrompt,
      strength: 0.6,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
    },
    logs: false,
  }) as any;

  const imageUrl: string = result.data.images[0].url;

  // 4. Download + upload to R2
  const rawBuffer = await downloadToBuffer(imageUrl);
  const pngBuffer = await ensurePng(rawBuffer);

  const previewKey = `brand/${session.id}/previews/${concept.style}-${concept.generationIndex}.png`;
  const originalKey = `brand/${session.id}/originals/${concept.style}-${concept.generationIndex}.png`;

  const publicPreviewUrl = await uploadToR2(previewKey, pngBuffer, 'image/png', true);
  await uploadToR2(originalKey, pngBuffer, 'image/png', false);

  // 5. Update DB record
  const cacheBuster = `?v=${Date.now()}`;
  const newPreviewUrl = `${publicPreviewUrl}${cacheBuster}`;

  await prisma.brandConcept.update({
    where: { id: conceptId },
    data: {
      previewUrl: newPreviewUrl,
      originalUrl: originalKey,
      promptUsed: revisedPrompt,
    },
  });

  return NextResponse.json({ success: true, previewUrl: newPreviewUrl });
}
