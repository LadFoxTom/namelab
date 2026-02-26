import { fal } from '@fal-ai/client';
import { BrandSignals } from './signals';
import { buildPromptSet, LogoStyle, PromptSet } from './prompts';
import { GeneratedPalette } from './palettePregen';
import { evaluateConcept, ACCEPT_THRESHOLD } from './evaluationAgent';
import { refinePrompt } from './promptRefinementAgent';
import { DesignBrief } from './strategist';

fal.config({ credentials: process.env.FAL_KEY! });

export interface GeneratedConcept {
  style: LogoStyle;
  imageUrl: string;
  prompt: string;
  negativePrompt: string;
  seed: number;
  score: number;
  evaluationFlags: string[];
  attemptCount: number;
  passedEvaluation: boolean;
}

const LOGO_STYLES: LogoStyle[] = ['wordmark', 'icon_wordmark', 'monogram', 'abstract_mark', 'pictorial', 'mascot', 'emblem', 'dynamic'];
const FAL_CONCURRENCY = 2;
const MAX_ATTEMPTS = 2;

async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const i = nextIndex++;
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() };
      } catch (reason: any) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

export async function generateLogoConcepts(
  signals: BrandSignals,
  palette: GeneratedPalette,
  stylesOverride?: LogoStyle[],
  brief?: DesignBrief
): Promise<GeneratedConcept[]> {
  const styles = stylesOverride ?? LOGO_STYLES;

  const tasks = styles.map((style) => () => generateStyleWithEvaluation(style, signals, palette, brief));
  const results = await runWithConcurrency(tasks, FAL_CONCURRENCY);

  const concepts: GeneratedConcept[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      concepts.push(result.value);
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

async function generateStyleWithEvaluation(
  style: LogoStyle,
  signals: BrandSignals,
  palette: GeneratedPalette,
  brief?: DesignBrief
): Promise<GeneratedConcept> {
  let promptSet: PromptSet = buildPromptSet(style, signals, palette, brief);
  let bestResult: { imageUrl: string; seed: number; score: number; flags: string[]; promptSet: PromptSet } | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Generate 1 candidate
    const { imageUrl, seed } = await generateCandidate(promptSet);

    // Evaluate with GPT-4o vision
    const evaluation = await evaluateConcept(imageUrl, style, signals.domainName);

    // Track best result across attempts
    if (!bestResult || evaluation.score > bestResult.score) {
      bestResult = { imageUrl, seed, score: evaluation.score, flags: evaluation.flags, promptSet };
    }

    // Accept if passes threshold
    if (evaluation.passed) {
      console.log(`[Brand] ${style} accepted on attempt ${attempt} with score ${evaluation.score}`);
      return {
        style,
        imageUrl,
        prompt: promptSet.prompt,
        negativePrompt: promptSet.negativePrompt,
        seed,
        score: evaluation.score,
        evaluationFlags: evaluation.flags,
        attemptCount: attempt,
        passedEvaluation: true,
      };
    }

    // If more attempts available, refine the prompt
    if (attempt < MAX_ATTEMPTS) {
      console.log(`[Brand] ${style} attempt ${attempt} scored ${evaluation.score}, refining prompt...`);
      promptSet = await refinePrompt(
        promptSet.prompt,
        promptSet.negativePrompt,
        evaluation,
        style,
        signals,
        attempt + 1
      );
    }
  }

  // Fallback: use best result we found across all attempts
  console.warn(`[Brand] ${style} used best result after ${MAX_ATTEMPTS} attempts. Score: ${bestResult!.score}`);
  return {
    style,
    imageUrl: bestResult!.imageUrl,
    prompt: bestResult!.promptSet.prompt,
    negativePrompt: bestResult!.promptSet.negativePrompt,
    seed: bestResult!.seed,
    score: bestResult!.score,
    evaluationFlags: bestResult!.flags,
    attemptCount: MAX_ATTEMPTS,
    passedEvaluation: false,
  };
}

async function generateCandidate(promptSet: PromptSet): Promise<{ imageUrl: string; seed: number }> {
  const result = await fal.subscribe('fal-ai/flux/schnell', {
    input: {
      prompt: promptSet.prompt,
      image_size: { width: 1024, height: 1024 },
      num_images: 1,
    },
    logs: false,
  }) as any;

  const img = result.data.images[0];
  return { imageUrl: img.url, seed: result.data.seed || 0 };
}
