import { BrandSignals } from './signals';
import { GeneratedPalette } from './palettePregen';

export type LogoStyle = 'wordmark' | 'icon_wordmark' | 'monogram' | 'abstract_mark';

export interface PromptSet {
  prompt: string;
  negativePrompt: string;
}

// GLOBAL NEGATIVE PROMPT — applied to every generation
export const GLOBAL_NEGATIVE = [
  'photorealistic', 'photography', 'photo', 'realistic', '3d render', 'CGI',
  'drop shadow', 'box shadow', 'inner glow', 'outer glow', 'bevel', 'emboss',
  'gradient background', 'dark background', 'colored background',
  'watermark', 'signature', 'copyright', 'stock photo',
  'blurry', 'low quality', 'pixelated', 'jpeg artifacts',
  'multiple logos', 'logo sheet', 'variations', 'mockup',
  'person', 'human', 'face', 'hands', 'body',
  'landscape', 'nature photo', 'building photo',
].join(', ');

export function buildPromptSet(
  style: LogoStyle,
  signals: BrandSignals,
  palette: GeneratedPalette
): PromptSet {
  const builders: Record<LogoStyle, () => PromptSet> = {
    wordmark: () => buildWordmarkPrompt(signals, palette),
    icon_wordmark: () => buildIconWordmarkPrompt(signals, palette),
    monogram: () => buildMonogramPrompt(signals, palette),
    abstract_mark: () => buildAbstractMarkPrompt(signals, palette),
  };

  return builders[style]();
}

// Keep backward-compatible export for any code still using buildLogoPrompt
export function buildLogoPrompt(style: LogoStyle, signals: BrandSignals): string {
  // Fallback palette when called without one
  const fallbackPalette: GeneratedPalette = {
    primary: signals.colorDirection.primary,
    secondary: '#1E293B',
    accent: '#3B82F6',
    dark: '#0F172A',
    light: '#F8FAFC',
  };
  return buildPromptSet(style, signals, fallbackPalette).prompt;
}

function buildWordmarkPrompt(signals: BrandSignals, palette: GeneratedPalette): PromptSet {
  const fontStyle = {
    techy:         'geometric sans-serif, sharp corners, even stroke weight',
    professional:  'clean humanist sans-serif, balanced proportions, trustworthy',
    bold:          'wide extended sans-serif, heavy weight, high impact',
    playful:       'rounded sans-serif, soft terminals, friendly character',
    calm:          'light weight sans-serif, generous spacing, airy feel',
    sophisticated: 'elegant serif, high contrast strokes, refined',
  }[signals.tone] ?? 'clean modern sans-serif';

  return {
    prompt: `
Professional wordmark logo design for the brand name "${signals.domainName}".
Pure white background. The brand name rendered in ${fontStyle}.
Color: ${palette.primary} for the text.
Typography only — absolutely no icons, no symbols, no decorative elements, no borders.
The letters of "${signals.domainName}" are the ONLY visual element.
Centered on the canvas with generous whitespace. Flat 2D vector style.
Custom letterform spacing, professional kerning.
Logo design, branding, vector graphic, flat design.
    `.trim(),
    negativePrompt: `${GLOBAL_NEGATIVE}, icon, symbol, logo mark, badge, shield, circle frame, any shape other than letters, decorative border`,
  };
}

function buildIconWordmarkPrompt(signals: BrandSignals, palette: GeneratedPalette): PromptSet {
  const iconDescription = signals.suggestedKeywords.slice(0, 2).join(' or ');
  const iconStyle = {
    minimal:    'simple flat geometric icon',
    geometric:  'precise geometric symbol made of basic shapes',
    organic:    'smooth organic flowing symbol',
    abstract:   'abstract minimal symbol',
    lettermark: 'stylized initial letter as symbol',
    mascot:     'simple bold mascot icon',
  }[signals.iconStyle] ?? 'simple minimal icon';

  return {
    prompt: `
Professional logo design for brand "${signals.domainName}".
Composition: ${iconStyle} representing ${iconDescription} on the LEFT, brand name text "${signals.domainName}" on the RIGHT.
Icon color: ${palette.primary}. Text color: ${palette.dark}.
Pure white background. Icon and text horizontally aligned, vertically centered.
Icon is simple, works at 16px. Text is in clean modern sans-serif.
Two elements only: icon mark + brand name. Nothing else.
Flat 2D vector style, no shadows, no gradients, no borders or frames.
Professional logo, brand identity, vector graphic.
    `.trim(),
    negativePrompt: `${GLOBAL_NEGATIVE}, text only, icon only, three or more elements, border, badge, shield frame, busy background`,
  };
}

function buildMonogramPrompt(signals: BrandSignals, palette: GeneratedPalette): PromptSet {
  const initials = signals.domainName.slice(0, 2).toUpperCase();
  const firstLetter = signals.domainName[0].toUpperCase();

  return {
    prompt: `
Professional lettermark / monogram logo using ONLY the letters "${initials}" or just "${firstLetter}".
The letters are rendered as a bold, distinctive, interlocking or creatively composed typographic mark.
Color: ${palette.primary}. Pure white background.
Only the letter(s) "${initials}" — no additional words, no brand name text, no icons.
The letterforms themselves are the design — creative, balanced, memorable.
Flat 2D vector style. No shadows, no frames, no badges, no circles around the letters.
Centered with generous whitespace. Professional monogram logo, lettermark, brand identity.
    `.trim(),
    negativePrompt: `${GLOBAL_NEGATIVE}, full word, additional text, brand name written out, icon, symbol, decorative frame, circle badge, shield`,
  };
}

function buildAbstractMarkPrompt(signals: BrandSignals, palette: GeneratedPalette): PromptSet {
  const conceptWords = signals.suggestedKeywords.join(', ');
  const shapeLanguage = {
    minimal:    'single minimal geometric form',
    geometric:  'precise geometric construction from basic shapes',
    organic:    'smooth organic curved form',
    abstract:   'unique abstract symbol',
    lettermark: 'abstract form derived from letterforms',
    mascot:     'bold simplified symbolic form',
  }[signals.iconStyle] ?? 'clean abstract geometric symbol';

  return {
    prompt: `
Abstract logo mark symbol for a brand in the ${signals.industry} space.
Visual concepts: ${conceptWords}.
Style: ${shapeLanguage} that evokes ${signals.brandPersonality}.
Color: ${palette.primary} on pure white background.
CRITICAL: NO TEXT. NO LETTERS. NO WORDS. Pure abstract symbol only.
The mark should be distinctive, scalable, and work at any size from 16px to billboard.
Flat 2D vector style. No shadows. No gradients. No outlines or frames around the symbol.
Simple enough to be memorable. One unified form, not a collection of shapes.
Abstract logo mark, brand symbol, vector graphic, flat design.
    `.trim(),
    negativePrompt: `${GLOBAL_NEGATIVE}, text, letters, alphabet, words, typography, brand name, any readable characters, numbers`,
  };
}
