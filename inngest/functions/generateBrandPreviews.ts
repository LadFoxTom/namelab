import { inngest } from '../client';
import { prisma } from '@/lib/prisma';
import { extractBrandSignals, BrandSignals } from '@/lib/brand/signals';
import { generateLogoConcepts } from '@/lib/brand/generate';
import { pregeneratePalette } from '@/lib/brand/palettePregen';
import { downloadToBuffer } from '@/lib/brand/postprocess';
import { applyWatermark } from '@/lib/brand/watermark';
import { uploadToR2 } from '@/lib/brand/storage';

export const generateBrandPreviews = inngest.createFunction(
  {
    id: 'generate-brand-previews',
    retries: 1,
    timeouts: { finish: '5m' },
    onFailure: async ({ event }) => {
      const brandSessionId = event.data.event.data.brandSessionId;
      if (brandSessionId) {
        await prisma.brandSession.update({
          where: { id: brandSessionId },
          data: { status: 'FAILED', progress: null },
        });
      }
    },
  },
  { event: 'brand/generate.previews' },
  async ({ event, step }) => {
    const { brandSessionId, domainName, searchQuery, preferences } = event.data;

    // Step 1: Extract brand signals
    const signals = await step.run('extract-signals', async () => {
      const userPrefs: Partial<BrandSignals> = {};
      if (preferences?.tone) userPrefs.tone = preferences.tone as BrandSignals['tone'];
      if (preferences?.iconStyle) userPrefs.iconStyle = preferences.iconStyle as BrandSignals['iconStyle'];
      if (preferences?.colorPreference) {
        userPrefs.colorDirection = { primary: preferences.colorPreference, mood: '', avoid: '', paletteStyle: 'analogous' };
      }
      if (preferences?.logoDescription) userPrefs.logoDescription = preferences.logoDescription;

      const description = preferences?.businessDescription || searchQuery;
      const extracted = await extractBrandSignals(
        domainName,
        description,
        Object.keys(userPrefs).length > 0 ? userPrefs : undefined
      );

      await prisma.brandSession.update({
        where: { id: brandSessionId },
        data: { signals: extracted as any, progress: 'generating_logos' },
      });

      return extracted;
    });

    // Step 2: Generate logo concepts
    const concepts = await step.run('generate-logos', async () => {
      const palette = pregeneratePalette(signals);
      return generateLogoConcepts(signals, palette);
    });

    // Step 3: Watermark, upload to R2, save to DB
    await step.run('process-and-save', async () => {
      for (let i = 0; i < concepts.length; i++) {
        const concept = concepts[i];

        const imageBuffer = await downloadToBuffer(concept.imageUrl);

        const watermarkedBuffer = await applyWatermark(imageBuffer);
        const previewKey = `brand/${brandSessionId}/previews/${concept.style}-${i}.png`;
        const previewUrl = await uploadToR2(previewKey, watermarkedBuffer, 'image/png', true);

        const originalKey = `brand/${brandSessionId}/originals/${concept.style}-${i}.png`;
        await uploadToR2(originalKey, imageBuffer, 'image/png', false);

        await prisma.brandConcept.create({
          data: {
            brandSessionId,
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
        where: { id: brandSessionId },
        data: { status: 'READY', progress: 'ready' },
      });
    });

    return { success: true, brandSessionId };
  }
);
