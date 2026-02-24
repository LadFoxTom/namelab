import OpenAI from 'openai';
import { EvaluationFlag, EvaluationResult } from './evaluationAgent';
import { LogoStyle } from './prompts';
import { BrandSignals } from './signals';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FLAG_FIXES: Record<EvaluationFlag, { addToPrompt: string; addToNegative: string }> = {
  photorealistic: {
    addToPrompt: 'flat vector graphic, 2D illustration, no photography, no realistic textures,',
    addToNegative: 'photo, realistic, 3d render, photorealistic, photograph, HDR, bokeh,',
  },
  too_complex: {
    addToPrompt: 'extremely simple, minimal, 3 elements maximum, clean and uncluttered,',
    addToNegative: 'complex, detailed, intricate, busy, many elements,',
  },
  bad_typography: {
    addToPrompt: 'clear crisp typography, professional typeface, legible text, high contrast letters,',
    addToNegative: 'blurry text, illegible font, distorted letters, warped text,',
  },
  wrong_style: {
    addToPrompt: '',
    addToNegative: '',
  },
  dark_background: {
    addToPrompt: 'pure white background, white canvas, isolated on white,',
    addToNegative: 'dark background, colored background, gradient background, black background,',
  },
  drop_shadows: {
    addToPrompt: 'flat design, no shadows, no depth effects, 2D only,',
    addToNegative: 'drop shadow, box shadow, inner shadow, 3D effect, emboss, bevel, depth,',
  },
  text_in_abstract: {
    addToPrompt: 'purely abstract symbol, no letters, no words, no text, no numbers, symbol only,',
    addToNegative: 'text, letters, words, typography, alphabet, numbers, characters,',
  },
  no_text_in_wordmark: {
    addToPrompt: 'large clear brand name text as the primary element, typography-focused,',
    addToNegative: 'no text, text-free,',
  },
  cluttered: {
    addToPrompt: 'minimal, single focal point, lots of whitespace, clean and simple,',
    addToNegative: 'cluttered, busy, many elements, overcrowded,',
  },
  gradient_heavy: {
    addToPrompt: 'flat solid colors only, no gradients, single color fills,',
    addToNegative: 'gradient, color blend, rainbow, ombre, multicolor blend,',
  },
  low_contrast: {
    addToPrompt: 'high contrast, strong color differentiation, bold colors against white,',
    addToNegative: 'low contrast, muted, faded, pastel on white,',
  },
  wrong_aspect_ratio: {
    addToPrompt: 'perfectly centered composition, equal padding on all sides, square format,',
    addToNegative: 'off-center, asymmetric layout, touching edges,',
  },
};

export async function refinePrompt(
  originalPrompt: string,
  originalNegativePrompt: string,
  evaluation: EvaluationResult,
  style: LogoStyle,
  signals: BrandSignals,
  attemptNumber: number
): Promise<{ prompt: string; negativePrompt: string }> {
  // Apply hard-coded flag fixes
  let promptAdditions = '';
  let negativeAdditions = '';

  for (const flag of evaluation.flags) {
    const fix = FLAG_FIXES[flag];
    if (fix) {
      promptAdditions += fix.addToPrompt + ' ';
      negativeAdditions += fix.addToNegative + ' ';
    }
  }

  // On attempt 3, ask GPT to do a deeper rewrite
  if (attemptNumber >= 3) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: `You are a prompt engineer specializing in AI logo generation with FLUX image models.

Original prompt: "${originalPrompt}"
Problems found: ${evaluation.flags.join(', ')}
Evaluator notes: ${evaluation.refinementInstructions}
Logo style required: ${style}
Brand: ${signals.domainName}, tone: ${signals.tone}

This is attempt ${attemptNumber}. The previous prompts failed. Rewrite the prompt completely from scratch.
Be extremely specific. The model responds well to: detailed style descriptors, explicit format instructions, and clear negative space descriptions.

Return JSON: { "prompt": "...", "negativePrompt": "..." }`
        }]
      });

      const parsed = JSON.parse(response.choices[0].message.content!);
      return { prompt: parsed.prompt, negativePrompt: parsed.negativePrompt };
    } catch {
      // Fall through to simple injection
    }
  }

  // For attempts 1-2, inject fixes into existing prompt
  const refinedPrompt = `${promptAdditions}${originalPrompt}`.trim();
  const refinedNegative = `${negativeAdditions}${originalNegativePrompt}`.trim();

  return { prompt: refinedPrompt, negativePrompt: refinedNegative };
}
