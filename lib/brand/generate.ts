import { fal } from '@fal-ai/client';
import { BrandSignals } from './signals';
import { buildLogoPrompt, LogoStyle } from './prompts';

fal.config({ credentials: process.env.FAL_KEY! });

export interface GeneratedConcept {
  style: LogoStyle;
  imageUrl: string;
  prompt: string;
  seed: number;
}

const LOGO_STYLES: LogoStyle[] = ['wordmark', 'icon_wordmark', 'monogram', 'abstract_mark'];

export async function generateLogoConcepts(
  signals: BrandSignals,
  stylesOverride?: LogoStyle[]
): Promise<GeneratedConcept[]> {
  const styles = stylesOverride ?? LOGO_STYLES;

  const results = await Promise.allSettled(
    styles.map(async (style) => {
      const prompt = buildLogoPrompt(style, signals);

      const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
        input: {
          prompt,
          image_size: { width: 1024, height: 1024 },
          num_images: 1,
          safety_tolerance: '2',
        },
        logs: false,
      }) as any;

      return result.data.images.map((img: { url: string }, i: number) => ({
        style,
        imageUrl: img.url,
        prompt,
        seed: (result.data.seed || 0) + i,
      }));
    })
  );

  const concepts: GeneratedConcept[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      concepts.push(...result.value);
    } else {
      console.error('Logo pipeline failed:', result.reason?.message || result.reason);
    }
  }

  if (concepts.length === 0) {
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason?.message || String(r.reason));
    throw new Error(`All logo generation pipelines failed: ${errors.join('; ')}`);
  }

  return concepts;
}
