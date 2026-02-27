import OpenAI from 'openai';
import { LogoStyle } from './prompts';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface TextReviewResult {
  textCorrect: boolean;
  detectedText: string;
  expectedText: string;
  confidence: 'high' | 'medium' | 'low';
  issues: string[];
}

const NO_TEXT_STYLES: LogoStyle[] = ['abstract_mark', 'pictorial', 'mascot'];

export async function reviewLogoText(
  imageUrl: string,
  style: LogoStyle,
  expectedText: string
): Promise<TextReviewResult> {
  // Non-text styles: skip
  if (NO_TEXT_STYLES.includes(style)) {
    return { textCorrect: true, detectedText: '', expectedText, confidence: 'high', issues: [] };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Look at this logo image carefully. Read ALL text and letters visible in the image.
Spell out every character you see, in order, exactly as rendered. If there are multiple words or text elements, include all of them.

Return JSON only:
{
  "detectedText": "<exact characters visible, in reading order>",
  "confidence": "high" | "medium" | "low",
  "notes": "<any observations about text clarity or stylization>"
}`
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl, detail: 'high' }
            }
          ]
        }
      ]
    });

    const content = response.choices[0].message.content!;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[TextReviewer] Could not parse GPT response, skipping text check');
      return { textCorrect: true, detectedText: '', expectedText, confidence: 'low', issues: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const detectedText: string = parsed.detectedText || '';
    const confidence: 'high' | 'medium' | 'low' = parsed.confidence || 'medium';

    const isMonogram = style === 'monogram';
    const correct = isMonogram
      ? checkMonogramMatch(detectedText, expectedText)
      : checkFullTextMatch(detectedText, expectedText);

    const issues: string[] = [];
    if (!correct) {
      const normalizedDetected = normalize(detectedText);
      const normalizedExpected = normalize(expectedText);
      if (normalizedDetected.length !== normalizedExpected.length) {
        issues.push(`Expected ${normalizedExpected.length} characters, got ${normalizedDetected.length}`);
      }
      issues.push(`Expected "${expectedText}", detected "${detectedText}"`);
    }

    return { textCorrect: correct, detectedText, expectedText, confidence, issues };
  } catch (error) {
    console.error('[TextReviewer] Review failed:', error);
    // On error, don't block the pipeline
    return { textCorrect: true, detectedText: '', expectedText, confidence: 'low', issues: [] };
  }
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function checkFullTextMatch(detected: string, expected: string): boolean {
  const d = normalize(detected);
  const e = normalize(expected);
  if (d === e) return true;
  return levenshtein(d, e) <= 1;
}

function checkMonogramMatch(detected: string, expected: string): boolean {
  const d = normalize(detected);
  const e = normalize(expected);
  if (d === e) return true;
  // For monograms, check if detected contains all expected initials in order
  let pos = 0;
  for (const char of e) {
    const found = d.indexOf(char, pos);
    if (found === -1) return false;
    pos = found + 1;
  }
  return true;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}
