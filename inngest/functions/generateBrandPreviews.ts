import { inngest } from '../client';
import { prisma } from '@/lib/prisma';
import { generateDesignBrief, briefToSignals, DesignBrief } from '@/lib/brand/strategist';
import { generateLogoConcepts, GeneratedConcept } from '@/lib/brand/generate';
import { pregeneratePalette } from '@/lib/brand/palettePregen';
import { downloadToBuffer } from '@/lib/brand/postprocess';
import { applyWatermark } from '@/lib/brand/watermark';
import { uploadToR2 } from '@/lib/brand/storage';
import { LogoStyle } from '@/lib/brand/prompts';

const LOGO_STYLES: LogoStyle[] = ['wordmark', 'icon_wordmark', 'monogram', 'abstract_mark'];

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

    // Step 1: Strategist — generate a rich design brief (~5-10s, uses GPT-4o)
    const brief = await step.run('strategist', async () => {
      await prisma.brandSession.update({
        where: { id: brandSessionId },
        data: { progress: 'analyzing_brand' },
      });

      const designBrief = await generateDesignBrief(
        domainName,
        searchQuery,
        preferences ?? undefined
      );

      // Derive backward-compatible signals from the brief
      const signals = briefToSignals(designBrief, domainName, preferences?.logoDescription);

      // Store both the full brief and derived signals
      await prisma.brandSession.update({
        where: { id: brandSessionId },
        data: {
          signals: { brief: designBrief, derived: signals } as any,
          progress: 'generating_logos',
        },
      });

      return { brief: designBrief, signals };
    });

    const signals = brief.signals;
    const designBrief = brief.brief;

    // Steps 2-5: Generate one style at a time (~15-30s each, fits in 60s limit)
    const allConcepts: GeneratedConcept[] = [];

    for (const style of LOGO_STYLES) {
      const concepts = await step.run(`generate-${style}`, async () => {
        const palette = pregeneratePalette(signals, designBrief);
        return generateLogoConcepts(signals, palette, [style], designBrief);
      });
      allConcepts.push(...concepts);
    }

    // Step 6: Watermark, upload to R2, save to DB (~10-20s)
    await step.run('process-and-save', async () => {
      await prisma.brandSession.update({
        where: { id: brandSessionId },
        data: { progress: 'processing_previews' },
      });

      for (let i = 0; i < allConcepts.length; i++) {
        const concept = allConcepts[i];

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
