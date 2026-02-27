import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateLogoConcepts } from '@/lib/brand/generate';
import { pregeneratePalette } from '@/lib/brand/palettePregen';
import { downloadToBuffer, ensurePng } from '@/lib/brand/postprocess';
import { uploadToR2 } from '@/lib/brand/storage';
import { LogoStyle } from '@/lib/brand/prompts';
import { BrandSignals } from '@/lib/brand/signals';
import { DesignBrief } from '@/lib/brand/strategist';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { conceptId } = await req.json();

  if (!conceptId) {
    return NextResponse.json({ error: 'Missing conceptId' }, { status: 400 });
  }

  try {
    const concept = await prisma.brandConcept.findUniqueOrThrow({ where: { id: conceptId } });
    const session = await prisma.brandSession.findUniqueOrThrow({ where: { id: concept.brandSessionId } });

    const rawSignals = session.signals as any;
    const signals: BrandSignals = rawSignals?.derived ?? rawSignals as BrandSignals;
    const brief: DesignBrief | undefined = rawSignals?.brief;
    const style = concept.style as LogoStyle;

    // Generate a new candidate for this style
    const palette = pregeneratePalette(signals, brief);
    const concepts = await generateLogoConcepts(signals, palette, [style], brief);

    if (concepts.length === 0) {
      return NextResponse.json({ error: 'Generation failed — no candidates produced' }, { status: 500 });
    }

    const newConcept = concepts[0];
    const imageBuffer = await downloadToBuffer(newConcept.imageUrl);
    const pngBuffer = await ensurePng(imageBuffer);

    // Upload to R2
    const previewKey = `brand/${session.id}/previews/${style}-regen-${Date.now()}.png`;
    const previewUrl = await uploadToR2(previewKey, pngBuffer, 'image/png', true);

    const originalKey = `brand/${session.id}/originals/${style}-regen-${Date.now()}.png`;
    await uploadToR2(originalKey, pngBuffer, 'image/png', false);

    // Update the concept record
    await prisma.brandConcept.update({
      where: { id: conceptId },
      data: {
        previewUrl,
        originalUrl: originalKey,
        promptUsed: newConcept.prompt,
        score: newConcept.score,
        evaluationFlags: newConcept.evaluationFlags,
        attemptCount: newConcept.attemptCount,
        passedEvaluation: newConcept.passedEvaluation,
      },
    });

    return NextResponse.json({
      success: true,
      previewUrl: `${previewUrl}?v=${Date.now()}`,
      score: newConcept.score,
    });
  } catch (err: any) {
    console.error('Regenerate style failed:', err);
    return NextResponse.json(
      { error: 'Regeneration failed', details: err.message },
      { status: 500 }
    );
  }
}
