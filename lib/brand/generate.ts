import { fal } from '@fal-ai/client';
import { BrandSignals } from './signals';
import { buildPromptSet, LogoStyle, PromptSet, deriveMonogramLetters } from './prompts';
import { GeneratedPalette } from './palettePregen';
import { evaluateConcept, ACCEPT_THRESHOLD } from './evaluationAgent';
import { refinePrompt } from './promptRefinementAgent';
import { reviewLogoText } from './textReviewer';
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
const MAX_ATTEMPTS_TEXT = 4; // Extra attempts for text-bearing styles

const TEXT_STYLES: LogoStyle[] = ['wordmark', 'icon_wordmark', 'emblem', 'dynamic'];

function getExpectedText(style: LogoStyle, signals: BrandSignals, brief?: DesignBrief): string | null {
  if (TEXT_STYLES.includes(style)) return brief?.brandName || signals.domainName;
  if (style === 'monogram') return deriveMonogramLetters(signals.domainName, brief).initials;
  return null;
}

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

  const expectedText = getExpectedText(style, signals, brief);
  const maxAttempts = expectedText ? MAX_ATTEMPTS_TEXT : MAX_ATTEMPTS;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Generate 1 candidate
    const { imageUrl, seed } = await generateCandidate(promptSet);

    // Evaluate with GPT-4o vision
    const evaluation = await evaluateConcept(imageUrl, style, signals.domainName);

    // Track best result across attempts
    if (!bestResult || evaluation.score > bestResult.score) {
      bestResult = { imageUrl, seed, score: evaluation.score, flags: evaluation.flags, promptSet };
    }

    // Accept if passes visual threshold, then check text correctness
    if (evaluation.passed) {
      if (expectedText) {
        const textReview = await reviewLogoText(imageUrl, style, expectedText);
        if (!textReview.textCorrect) {
          console.log(`[Brand] ${style} attempt ${attempt} text incorrect: got "${textReview.detectedText}", expected "${expectedText}"`);
          // Treat as failed — refine prompt with stronger text emphasis
          evaluation.passed = false;
          evaluation.flags.push('wrong_text');
          evaluation.refinementInstructions =
            `The text in the logo is WRONG. It shows "${textReview.detectedText}" but must show exactly "${expectedText}". Spell each letter: ${expectedText.split('').join('-')}.`;

          if (attempt < maxAttempts) {
            promptSet = await refinePrompt(
              promptSet.prompt,
              promptSet.negativePrompt,
              evaluation,
              style,
              signals,
              attempt + 1
            );
          }
          continue;
        }
      }

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
    if (attempt < maxAttempts) {
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
  console.warn(`[Brand] ${style} used best result after ${maxAttempts} attempts. Score: ${bestResult!.score}`);
  return {
    style,
    imageUrl: bestResult!.imageUrl,
    prompt: bestResult!.promptSet.prompt,
    negativePrompt: bestResult!.promptSet.negativePrompt,
    seed: bestResult!.seed,
    score: bestResult!.score,
    evaluationFlags: bestResult!.flags,
    attemptCount: maxAttempts,
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
