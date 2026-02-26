import { BrandSignals } from './signals';
import { GeneratedPalette } from './palettePregen';
import { DesignBrief } from './strategist';

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
  palette: GeneratedPalette,
  brief?: DesignBrief
): PromptSet {
  const builders: Record<LogoStyle, () => PromptSet> = {
    wordmark: () => buildWordmarkPrompt(signals, palette, brief),
    icon_wordmark: () => buildIconWordmarkPrompt(signals, palette, brief),
    monogram: () => buildMonogramPrompt(signals, palette, brief),
    abstract_mark: () => buildAbstractMarkPrompt(signals, palette, brief),
  };

  return builders[style]();
}

// Keep backward-compatible export for any code still using buildLogoPrompt
export function buildLogoPrompt(style: LogoStyle, signals: BrandSignals): string {
  const fallbackPalette: GeneratedPalette = {
    primary: signals.colorDirection.primary,
    secondary: '#1E293B',
    accent: '#3B82F6',
    dark: '#0F172A',
    light: '#F8FAFC',
  };
  return buildPromptSet(style, signals, fallbackPalette).prompt;
}

// ── Strategic context helpers ───────────────────────────────────────────────

function getAestheticStyle(brief?: DesignBrief): string {
  if (!brief) return '';
  const dir = brief.aestheticDirection.toLowerCase();
  if (dir.includes('minimalism') || dir.includes('swiss')) return 'clean Swiss-style precision, grid-based';
  if (dir.includes('luxury') || dir.includes('classical')) return 'refined classical elegance, high-contrast';
  if (dir.includes('brutalism') || dir.includes('terminal')) return 'raw technical aesthetic, monospaced feel';
  if (dir.includes('warmth') || dir.includes('organic')) return 'warm approachable forms, subtle curves';
  if (dir.includes('editorial')) return 'editorial restraint, typographic hierarchy';
  if (dir.includes('industrial') || dir.includes('tactical')) return 'industrial precision, engineered feel';
  if (dir.includes('deco')) return 'geometric Art Deco patterns, decorative geometry';
  if (dir.includes('nordic') || dir.includes('simplicity')) return 'Scandinavian simplicity, clean and airy';
  if (dir.includes('bold') || dir.includes('geometric')) return 'bold geometric construction, strong forms';
  if (dir.includes('heritage') || dir.includes('refined')) return 'refined heritage aesthetic, timeless quality';
  return brief.aestheticDirection;
}

function getTypeDescription(brief?: DesignBrief): string {
  if (!brief) return '';
  const cat = brief.typeGuidance.displayCategory;
  const fonts = brief.typeGuidance.suggestedDisplayFonts;
  const fontHint = fonts.length > 0 ? ` (similar to ${fonts[0]})` : '';

  const catMap: Record<string, string> = {
    'geometric_sans': `geometric sans-serif${fontHint}, even stroke weight, precise construction`,
    'humanist_sans': `humanist sans-serif${fontHint}, open apertures, friendly readability`,
    'high_contrast_serif': `high-contrast serif${fontHint}, dramatic thick-thin strokes, elegant`,
    'transitional_serif': `transitional serif${fontHint}, balanced contrast, authoritative`,
    'monospaced': `monospaced typeface${fontHint}, technical character, equal-width`,
    'condensed': `condensed sans-serif${fontHint}, space-efficient, impactful`,
    'display_expressive': `expressive display type${fontHint}, distinctive character, bold personality`,
  };

  return catMap[cat] || `clean professional typeface${fontHint}`;
}

function getStrokeWeight(brief?: DesignBrief): string {
  if (!brief) return 'medium';
  return brief.logoGuidance.strokeWeight;
}

// ── Prompt builders ─────────────────────────────────────────────────────────

function buildWordmarkPrompt(signals: BrandSignals, palette: GeneratedPalette, brief?: DesignBrief): PromptSet {
  const typeDesc = brief ? getTypeDescription(brief) : ({
    techy:         'geometric sans-serif, sharp corners, even stroke weight',
    professional:  'clean humanist sans-serif, balanced proportions, trustworthy',
    bold:          'wide extended sans-serif, heavy weight, high impact',
    playful:       'rounded sans-serif, soft terminals, friendly character',
    calm:          'light weight sans-serif, generous spacing, airy feel',
    sophisticated: 'elegant serif, high contrast strokes, refined',
  }[signals.tone] ?? 'clean modern sans-serif');

  const aestheticCtx = brief ? `\nAesthetic direction: ${getAestheticStyle(brief)}. The brand tension is "${brief.tensionPair}" — the typography should embody this.` : '';
  const anchorCtx = brief?.memorableAnchor ? `\nMemorable anchor: ${brief.memorableAnchor}. Subtly incorporate this concept.` : '';
  const logoContext = signals.logoDescription ? `\nInspired by: ${signals.logoDescription}. Apply this concept subtly to the letterform design.` : '';
  const strokeCtx = brief ? `Stroke weight: ${getStrokeWeight(brief)}.` : '';

  return {
    prompt: `
Professional wordmark logo design for the brand name "${signals.domainName}".
Pure white background. The brand name rendered in ${typeDesc}.
Color: ${palette.primary} for the text. ${strokeCtx}${aestheticCtx}${anchorCtx}${logoContext}
Typography only — absolutely no icons, no symbols, no decorative elements, no borders.
The letters of "${signals.domainName}" are the ONLY visual element.
Centered on the canvas with generous whitespace. Flat 2D vector style.
Custom letterform spacing, professional kerning. Distinctive and ownable letterforms.
Logo design, branding, vector graphic, flat design.
    `.trim(),
    negativePrompt: `${GLOBAL_NEGATIVE}, icon, symbol, logo mark, badge, shield, circle frame, any shape other than letters, decorative border`,
  };
}

function buildIconWordmarkPrompt(signals: BrandSignals, palette: GeneratedPalette, brief?: DesignBrief): PromptSet {
  const conceptSeeds = brief?.logoGuidance.conceptSeeds || [];
  const iconDescription = signals.logoDescription || conceptSeeds.slice(0, 2).join(' or ') || signals.suggestedKeywords.slice(0, 2).join(' or ');

  const geometry = brief?.logoGuidance.geometry || 'geometric';
  const iconStyle = {
    'circular': 'simple circular geometric icon',
    'angular': 'precise angular geometric symbol',
    'geometric': 'precise geometric symbol made of basic shapes',
    'organic': 'smooth organic flowing symbol',
    'freeform': 'distinctive freeform abstract symbol',
  }[geometry] ?? ({
    minimal:    'simple flat geometric icon',
    geometric:  'precise geometric symbol made of basic shapes',
    organic:    'smooth organic flowing symbol',
    abstract:   'abstract minimal symbol',
    lettermark: 'stylized initial letter as symbol',
    mascot:     'simple bold mascot icon',
  }[signals.iconStyle] ?? 'simple minimal icon');

  const typeDesc = brief ? getTypeDescription(brief) : 'clean modern sans-serif';
  const aestheticCtx = brief ? `\nAesthetic: ${getAestheticStyle(brief)}. Brand tension: "${brief.tensionPair}".` : '';
  const sectorCtx = brief ? `\nSector: ${brief.sectorClassification}. Target: ${brief.targetAudienceSummary}.` : '';

  return {
    prompt: `
Professional logo design for brand "${signals.domainName}" in the ${signals.industry} space.
Composition: ${iconStyle} representing ${iconDescription} on the LEFT, brand name text "${signals.domainName}" on the RIGHT.
Icon color: ${palette.primary}. Text color: ${palette.dark}. Text in ${typeDesc}.${aestheticCtx}${sectorCtx}
Pure white background. Icon and text horizontally aligned, vertically centered.
Icon is simple, distinctive, works at 16px. Two elements only: icon mark + brand name.
Flat 2D vector style, no shadows, no gradients, no borders or frames.
Professional logo, brand identity, vector graphic.
    `.trim(),
    negativePrompt: `${GLOBAL_NEGATIVE}, text only, icon only, three or more elements, border, badge, shield frame, busy background`,
  };
}

function buildMonogramPrompt(signals: BrandSignals, palette: GeneratedPalette, brief?: DesignBrief): PromptSet {
  const initials = signals.domainName.slice(0, 2).toUpperCase();
  const firstLetter = signals.domainName[0].toUpperCase();

  const typeDesc = brief ? getTypeDescription(brief) : 'bold, distinctive';
  const aestheticCtx = brief ? `\nAesthetic: ${getAestheticStyle(brief)}. The monogram should feel "${brief.tensionPair}".` : '';
  const strokeCtx = brief ? `Stroke weight: ${getStrokeWeight(brief)}.` : '';
  const anchorCtx = brief?.memorableAnchor ? `\nThe design should subtly evoke: ${brief.memorableAnchor}.` : '';

  return {
    prompt: `
Professional lettermark / monogram logo using ONLY the letters "${initials}" or just "${firstLetter}".
The letters are rendered in ${typeDesc} — interlocking or creatively composed typographic mark. ${strokeCtx}
Color: ${palette.primary}. Pure white background.${aestheticCtx}${anchorCtx}
Only the letter(s) "${initials}" — no additional words, no brand name text, no icons.
The letterforms themselves are the design — creative, balanced, memorable, ownable.
Flat 2D vector style. No shadows, no frames, no badges, no circles around the letters.
Centered with generous whitespace. Professional monogram logo, lettermark, brand identity.
    `.trim(),
    negativePrompt: `${GLOBAL_NEGATIVE}, full word, additional text, brand name written out, icon, symbol, decorative frame, circle badge, shield`,
  };
}

function buildAbstractMarkPrompt(signals: BrandSignals, palette: GeneratedPalette, brief?: DesignBrief): PromptSet {
  const conceptSeeds = brief?.logoGuidance.conceptSeeds || [];
  const conceptWords = signals.logoDescription || conceptSeeds.join(', ') || signals.suggestedKeywords.join(', ');

  const geometry = brief?.logoGuidance.geometry || '';
  const shapeLanguage = geometry ? ({
    'circular': 'circular geometric form with precise proportions',
    'angular': 'angular geometric construction with sharp precision',
    'geometric': 'precise geometric construction from basic shapes',
    'organic': 'smooth organic curved form with natural flow',
    'freeform': 'distinctive freeform shape with intentional asymmetry',
  }[geometry] ?? 'clean abstract geometric symbol') : ({
    minimal:    'single minimal geometric form',
    geometric:  'precise geometric construction from basic shapes',
    organic:    'smooth organic curved form',
    abstract:   'unique abstract symbol',
    lettermark: 'abstract form derived from letterforms',
    mascot:     'bold simplified symbolic form',
  }[signals.iconStyle] ?? 'clean abstract geometric symbol');

  const aestheticCtx = brief ? `\nAesthetic: ${getAestheticStyle(brief)}. The mark should embody "${brief.tensionPair}".` : '';
  const anchorCtx = brief?.memorableAnchor ? `\nMemorable anchor: ${brief.memorableAnchor} — the mark should evoke this concept.` : '';
  const diffCtx = brief?.competitiveDifferentiation ? `\nAvoid: ${brief.competitiveDifferentiation}.` : '';

  return {
    prompt: `
Abstract logo mark symbol for a brand in the ${signals.industry} space.
Visual concepts: ${conceptWords}.
Style: ${shapeLanguage} that evokes ${signals.brandPersonality}.${aestheticCtx}${anchorCtx}${diffCtx}
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
