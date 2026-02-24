import OpenAI from 'openai';
import { LogoStyle } from './prompts';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const ACCEPT_THRESHOLD = 72;

export interface EvaluationResult {
  score: number;
  passed: boolean;
  flags: EvaluationFlag[];
  strengths: string[];
  refinementInstructions: string;
}

export type EvaluationFlag =
  | 'photorealistic'
  | 'too_complex'
  | 'bad_typography'
  | 'wrong_style'
  | 'dark_background'
  | 'drop_shadows'
  | 'text_in_abstract'
  | 'no_text_in_wordmark'
  | 'cluttered'
  | 'gradient_heavy'
  | 'low_contrast'
  | 'wrong_aspect_ratio';

const STYLE_RUBRICS: Record<LogoStyle, string> = {
  wordmark: `
You are evaluating a WORDMARK logo concept. A wordmark is typography-only — the brand name rendered in a distinctive typeface with no icons or symbols.

Score on these dimensions (each 0-25):
1. Typography quality: Is the text clear, well-kerned, professional? Is it a distinctive typeface rather than a default font?
2. Scalability: Would this work at 16px? No fine details that disappear at small sizes.
3. Style compliance: Is this ONLY typography with NO icons, symbols, or decorative elements beyond the letterforms themselves?
4. Background: Is the background white or transparent? No colored backgrounds.

Flag these problems if present:
- Any icon, symbol, or graphic element alongside the text → flag "wrong_style"
- Photorealistic rendering → flag "photorealistic"
- Dark or colored background → flag "dark_background"
- Text is unclear or pixelated → flag "bad_typography"
- Drop shadows or 3D bevels → flag "drop_shadows"`,

  icon_wordmark: `
You are evaluating an ICON + WORDMARK logo concept. This has two parts: a simple icon/symbol AND the brand name as text, working together as a composition.

Score on these dimensions (each 0-25):
1. Icon quality: Is the icon simple, geometric, and distinctive? Does it work as a standalone symbol?
2. Typography quality: Is the brand name clearly readable in a clean typeface?
3. Composition: Are the icon and text balanced and well-proportioned relative to each other?
4. Scalability + background: Clean white/transparent background, no drop shadows, works at small sizes.

Flag these problems if present:
- No icon present, only text → flag "wrong_style"
- No text present, only icon → flag "wrong_style"
- Background is not white/transparent → flag "dark_background"
- Photorealistic icon → flag "photorealistic"
- Icon is too complex/detailed → flag "too_complex"
- Drop shadows or 3D effects → flag "drop_shadows"`,

  monogram: `
You are evaluating a MONOGRAM / LETTERMARK logo. This uses 1-3 letters (typically initials) rendered as an interlocking, stacked, or stylized letterform composition.

Score on these dimensions (each 0-25):
1. Letter clarity: Are the specific letters clearly identifiable? Not just abstract shapes.
2. Design quality: Is the letterform composition creative, balanced, and distinctive?
3. Style compliance: Is it ONLY letters with NO additional icons, illustrations, or full brand name text?
4. Scalability + background: Works at small sizes, white/transparent background, no shadows.

Flag these problems if present:
- Full brand name text present (not just 1-3 letters) → flag "wrong_style"
- Icons or illustrations added → flag "wrong_style"
- Letters not recognizable → flag "bad_typography"
- Background not white/transparent → flag "dark_background"
- Too many decorative elements → flag "cluttered"`,

  abstract_mark: `
You are evaluating an ABSTRACT MARK — a purely symbolic, non-literal logo mark with NO text whatsoever.

Score on these dimensions (each 0-25):
1. Abstraction quality: Is it a clean abstract or geometric symbol that evokes the brand without being literal?
2. Distinctiveness: Is it unique and ownable? Not a generic shape everyone uses.
3. Style compliance: Absolutely NO text, letters, or readable words anywhere in the image.
4. Scalability + background: Simple enough to work at 16px, white/transparent background, no shadows or gradients.

Flag these problems if present:
- Any text or letters visible → flag "text_in_abstract"
- Photorealistic elements → flag "photorealistic"
- Too complex to work at small size → flag "too_complex"
- Dark/colored background → flag "dark_background"
- Heavy gradients → flag "gradient_heavy"
- Generic shape (circle, square, basic triangle) with no distinctive quality → note in refinement`,
};

export async function evaluateConcept(
  imageUrl: string,
  style: LogoStyle,
  domainName: string
): Promise<EvaluationResult> {
  const rubric = STYLE_RUBRICS[style];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${rubric}

Brand name: "${domainName}"

Evaluate this logo concept strictly. Return JSON only:
{
  "score": <number 0-100>,
  "flags": <array of flag strings from the list above, empty if none>,
  "strengths": <array of 1-3 specific things that work well>,
  "refinementInstructions": <specific instructions for improving the prompt if score < 72, otherwise empty string>
}

Be strict. Most AI-generated logos score 40-65. Only truly clean, professional, scalable logo-quality outputs should score above 72.`
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl, detail: 'low' }
            }
          ]
        }
      ]
    });

    const content = response.choices[0].message.content!;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { score: 50, passed: false, flags: [], strengths: [], refinementInstructions: 'Could not parse evaluation' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      score: parsed.score,
      passed: parsed.score >= ACCEPT_THRESHOLD,
      flags: parsed.flags ?? [],
      strengths: parsed.strengths ?? [],
      refinementInstructions: parsed.refinementInstructions ?? '',
    };
  } catch (error) {
    console.error('Evaluation failed:', error);
    return { score: 50, passed: false, flags: [], strengths: [], refinementInstructions: 'Evaluation error' };
  }
}
