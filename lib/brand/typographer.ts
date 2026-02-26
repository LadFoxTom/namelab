import { DesignBrief } from './strategist';
import { BrandSignals } from './signals';
import { FontPairing, FontSpec } from './typography';

// ── Extended output with type scale and rationale ───────────────────────────

export interface TypeSystem extends FontPairing {
  pairingRationale: string;
  typeScale: TypeScaleLevel[];
  scaleRatio: number;
  scaleRatioName: string;
}

export interface TypeScaleLevel {
  name: string;       // Display, H1, H2, H3, Body, Caption, Code
  font: string;
  weight: string;
  sizePt: number;
  leadingPt: number;
  tracking: string;   // e.g. "0", "+0.02em", "+0.05em"
}

// ── Curated font library by category ────────────────────────────────────────

interface FontEntry {
  name: string;
  weights: number[];
  cssFamily: string;
  personality: string;
  formalityRange: [number, number]; // [min, max] on 1-5 scale
}

const DISPLAY_FONTS: Record<string, FontEntry[]> = {
  geometric_sans: [
    { name: 'Syne', weights: [400, 500, 600, 700, 800], cssFamily: "'Syne', sans-serif", personality: 'bold geometric with wide proportions', formalityRange: [1, 3] },
    { name: 'Outfit', weights: [300, 400, 500, 600, 700], cssFamily: "'Outfit', sans-serif", personality: 'clean geometric with rounded terminals', formalityRange: [2, 4] },
    { name: 'General Sans', weights: [400, 500, 600, 700], cssFamily: "'General Sans', sans-serif", personality: 'modern precise geometry', formalityRange: [2, 4] },
    { name: 'DM Sans', weights: [400, 500, 700], cssFamily: "'DM Sans', sans-serif", personality: 'compact geometric for tight spaces', formalityRange: [2, 4] },
    { name: 'Space Grotesk', weights: [400, 500, 600, 700], cssFamily: "'Space Grotesk', sans-serif", personality: 'technical geometric with personality', formalityRange: [1, 3] },
  ],
  humanist_sans: [
    { name: 'Nunito Sans', weights: [300, 400, 600, 700], cssFamily: "'Nunito Sans', sans-serif", personality: 'warm approachable humanist', formalityRange: [1, 3] },
    { name: 'Source Sans 3', weights: [300, 400, 600, 700], cssFamily: "'Source Sans 3', sans-serif", personality: 'versatile readable humanist', formalityRange: [2, 4] },
    { name: 'Lato', weights: [300, 400, 700, 900], cssFamily: "'Lato', sans-serif", personality: 'balanced friendly warmth', formalityRange: [2, 4] },
    { name: 'Work Sans', weights: [300, 400, 500, 600, 700], cssFamily: "'Work Sans', sans-serif", personality: 'optimized for screen readability', formalityRange: [2, 4] },
  ],
  high_contrast_serif: [
    { name: 'Playfair Display', weights: [400, 500, 600, 700, 800], cssFamily: "'Playfair Display', serif", personality: 'dramatic high-contrast editorial', formalityRange: [3, 5] },
    { name: 'Cormorant Garamond', weights: [300, 400, 500, 600, 700], cssFamily: "'Cormorant Garamond', serif", personality: 'delicate classical elegance', formalityRange: [3, 5] },
    { name: 'Bodoni Moda', weights: [400, 500, 600, 700, 800], cssFamily: "'Bodoni Moda', serif", personality: 'sharp modern classic', formalityRange: [4, 5] },
    { name: 'Fraunces', weights: [300, 400, 500, 700, 900], cssFamily: "'Fraunces', serif", personality: 'quirky old-style with personality', formalityRange: [2, 4] },
  ],
  transitional_serif: [
    { name: 'Libre Baskerville', weights: [400, 700], cssFamily: "'Libre Baskerville', serif", personality: 'authoritative readable classic', formalityRange: [3, 5] },
    { name: 'Lora', weights: [400, 500, 600, 700], cssFamily: "'Lora', serif", personality: 'calligraphic warmth and contrast', formalityRange: [3, 4] },
    { name: 'Source Serif 4', weights: [300, 400, 600, 700], cssFamily: "'Source Serif 4', serif", personality: 'neutral professional serif', formalityRange: [3, 5] },
    { name: 'Merriweather', weights: [300, 400, 700, 900], cssFamily: "'Merriweather', serif", personality: 'screen-optimized thick strokes', formalityRange: [3, 4] },
  ],
  monospaced: [
    { name: 'JetBrains Mono', weights: [400, 500, 700], cssFamily: "'JetBrains Mono', monospace", personality: 'developer-first legible mono', formalityRange: [1, 3] },
    { name: 'Space Mono', weights: [400, 700], cssFamily: "'Space Mono', monospace", personality: 'editorial mono with character', formalityRange: [1, 3] },
    { name: 'IBM Plex Mono', weights: [300, 400, 500, 600, 700], cssFamily: "'IBM Plex Mono', monospace", personality: 'corporate mono neutrality', formalityRange: [2, 4] },
    { name: 'Fira Code', weights: [300, 400, 500, 600, 700], cssFamily: "'Fira Code', monospace", personality: 'ligature-rich code font', formalityRange: [1, 3] },
  ],
  condensed: [
    { name: 'Barlow Condensed', weights: [400, 500, 600, 700], cssFamily: "'Barlow Condensed', sans-serif", personality: 'space-efficient industrial', formalityRange: [2, 4] },
    { name: 'Oswald', weights: [300, 400, 500, 600, 700], cssFamily: "'Oswald', sans-serif", personality: 'bold condensed impact', formalityRange: [2, 4] },
    { name: 'Archivo Narrow', weights: [400, 500, 600, 700], cssFamily: "'Archivo Narrow', sans-serif", personality: 'technical narrow grotesk', formalityRange: [2, 4] },
  ],
  display_expressive: [
    { name: 'Cabinet Grotesk', weights: [400, 500, 700, 800], cssFamily: "'Cabinet Grotesk', sans-serif", personality: 'contemporary display character', formalityRange: [1, 3] },
    { name: 'Clash Display', weights: [400, 500, 600, 700], cssFamily: "'Clash Display', sans-serif", personality: 'bold futuristic display', formalityRange: [1, 3] },
    { name: 'Instrument Serif', weights: [400], cssFamily: "'Instrument Serif', serif", personality: 'editorial display with personality', formalityRange: [2, 4] },
    { name: 'Syne', weights: [400, 500, 600, 700, 800], cssFamily: "'Syne', sans-serif", personality: 'wide geometric display', formalityRange: [1, 3] },
  ],
};

const BODY_FONTS: Record<string, FontEntry[]> = {
  humanist_sans: [
    { name: 'DM Sans', weights: [400, 500, 700], cssFamily: "'DM Sans', sans-serif", personality: 'compact geometric body', formalityRange: [2, 4] },
    { name: 'Nunito Sans', weights: [300, 400, 600, 700], cssFamily: "'Nunito Sans', sans-serif", personality: 'warm rounded body', formalityRange: [1, 3] },
    { name: 'Source Sans 3', weights: [300, 400, 600, 700], cssFamily: "'Source Sans 3', sans-serif", personality: 'versatile professional body', formalityRange: [2, 4] },
    { name: 'Work Sans', weights: [300, 400, 500, 600, 700], cssFamily: "'Work Sans', sans-serif", personality: 'optimized for screen reading', formalityRange: [2, 4] },
    { name: 'IBM Plex Sans', weights: [300, 400, 500, 600, 700], cssFamily: "'IBM Plex Sans', sans-serif", personality: 'corporate humanist neutral', formalityRange: [3, 5] },
  ],
  geometric_sans: [
    { name: 'DM Sans', weights: [400, 500, 700], cssFamily: "'DM Sans', sans-serif", personality: 'geometric compact', formalityRange: [2, 4] },
    { name: 'Manrope', weights: [300, 400, 500, 600, 700, 800], cssFamily: "'Manrope', sans-serif", personality: 'wide-set geometric body', formalityRange: [2, 4] },
    { name: 'Outfit', weights: [300, 400, 500, 600, 700], cssFamily: "'Outfit', sans-serif", personality: 'rounded geometric', formalityRange: [2, 4] },
  ],
  serif: [
    { name: 'Source Serif 4', weights: [300, 400, 600, 700], cssFamily: "'Source Serif 4', serif", personality: 'neutral professional', formalityRange: [3, 5] },
    { name: 'Cormorant Garamond', weights: [300, 400, 500, 600, 700], cssFamily: "'Cormorant Garamond', serif", personality: 'elegant classical', formalityRange: [3, 5] },
    { name: 'Merriweather', weights: [300, 400, 700], cssFamily: "'Merriweather', serif", personality: 'thick-stroked screen serif', formalityRange: [3, 4] },
    { name: 'Lora', weights: [400, 500, 600, 700], cssFamily: "'Lora', serif", personality: 'calligraphic warmth', formalityRange: [3, 4] },
    { name: 'Literata', weights: [300, 400, 500, 600, 700], cssFamily: "'Literata', serif", personality: 'modern editorial', formalityRange: [3, 5] },
  ],
  monospaced: [
    { name: 'JetBrains Mono', weights: [400, 500, 700], cssFamily: "'JetBrains Mono', monospace", personality: 'developer body', formalityRange: [1, 3] },
    { name: 'IBM Plex Mono', weights: [300, 400, 500, 600, 700], cssFamily: "'IBM Plex Mono', monospace", personality: 'corporate mono', formalityRange: [2, 4] },
  ],
};

const MONO_FONTS: FontEntry[] = [
  { name: 'JetBrains Mono', weights: [400, 500, 700], cssFamily: "'JetBrains Mono', monospace", personality: 'developer-first', formalityRange: [1, 3] },
  { name: 'IBM Plex Mono', weights: [300, 400, 500, 600], cssFamily: "'IBM Plex Mono', monospace", personality: 'corporate neutral', formalityRange: [3, 5] },
  { name: 'Fira Code', weights: [300, 400, 500, 600, 700], cssFamily: "'Fira Code', monospace", personality: 'ligature-rich code', formalityRange: [1, 3] },
  { name: 'Space Mono', weights: [400, 700], cssFamily: "'Space Mono', monospace", personality: 'editorial character', formalityRange: [1, 3] },
  { name: 'Courier Prime', weights: [400, 700], cssFamily: "'Courier Prime', monospace", personality: 'classical typewriter', formalityRange: [3, 5] },
];

// Overused fonts — avoid unless strategist explicitly suggested them
const OVERUSED = ['Inter', 'Roboto', 'Arial', 'Open Sans', 'Montserrat'];

// Simple string hash to seed font selection variety per brand
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ── Type scale ratios ───────────────────────────────────────────────────────

const SCALE_RATIOS: Record<string, { ratio: number; name: string }> = {
  '1': { ratio: 1.125, name: 'Major Second' },     // casual, compact
  '2': { ratio: 1.200, name: 'Minor Third' },       // balanced
  '3': { ratio: 1.250, name: 'Major Third' },       // generous
  '4': { ratio: 1.333, name: 'Perfect Fourth' },    // dramatic
  '5': { ratio: 1.500, name: 'Perfect Fifth' },     // bold, high-impact
};

// ── Main typographer function ───────────────────────────────────────────────

export function selectTypeSystem(brief: DesignBrief, signals: BrandSignals): TypeSystem {
  const formality = brief.typeGuidance.formalityLevel;
  const displayCat = brief.typeGuidance.displayCategory;
  const bodyCat = brief.typeGuidance.bodyCategory;
  const brandHash = hashString(signals.domainName + (brief.brandName || ''));

  // Select display font
  const displayFont = selectFont(
    DISPLAY_FONTS[displayCat] || DISPLAY_FONTS['geometric_sans'],
    formality,
    brief.typeGuidance.suggestedDisplayFonts,
    undefined,
    brandHash
  );

  // Select body font — must differ from display
  const bodyFont = selectFont(
    BODY_FONTS[bodyCat] || BODY_FONTS['humanist_sans'],
    formality,
    brief.typeGuidance.suggestedBodyFonts,
    displayFont.name,
    brandHash + 7 // offset so body picks differently from display
  );

  // Select mono font based on formality
  const monoFont = selectFont(MONO_FONTS, formality, [], undefined, brandHash + 13);

  // Build type scale
  const scaleEntry = SCALE_RATIOS[String(formality)] || SCALE_RATIOS['3'];
  const baseSizePt = formality <= 2 ? 10 : formality <= 3 ? 11 : 12;
  const typeScale = buildTypeScale(displayFont.name, bodyFont.name, monoFont.name, scaleEntry.ratio, baseSizePt);

  // Build Google Fonts URL
  const fontFamilies = [
    `family=${displayFont.name.replace(/ /g, '+')}:wght@${displayFont.weights.join(';')}`,
    `family=${bodyFont.name.replace(/ /g, '+')}:wght@${bodyFont.weights.join(';')}`,
    `family=${monoFont.name.replace(/ /g, '+')}:wght@${monoFont.weights.join(';')}`,
  ];
  const googleFontsUrl = `https://fonts.googleapis.com/css2?${fontFamilies.join('&')}&display=swap`;

  const pairingRationale = `${displayFont.name} (${displayFont.personality}) paired with ${bodyFont.name} (${bodyFont.personality}). ` +
    `The display font's ${displayCat.replace(/_/g, ' ')} character expresses the brand tension "${brief.tensionPair}", ` +
    `while ${bodyFont.name} provides ${bodyCat.replace(/_/g, ' ')} readability. ` +
    `${monoFont.name} completes the system for technical contexts.`;

  return {
    heading: { name: displayFont.name, weights: displayFont.weights, cssFamily: displayFont.cssFamily },
    body: { name: bodyFont.name, weights: bodyFont.weights, cssFamily: bodyFont.cssFamily },
    mono: { name: monoFont.name, weights: monoFont.weights, cssFamily: monoFont.cssFamily },
    googleFontsUrl,
    pairingRationale,
    typeScale,
    scaleRatio: scaleEntry.ratio,
    scaleRatioName: scaleEntry.name,
  };
}

function selectFont(
  candidates: FontEntry[],
  formality: number,
  suggested: string[],
  excludeName?: string,
  brandHash?: number
): FontEntry {
  const base = candidates.filter(f => f.name !== excludeName && !OVERUSED.includes(f.name));

  // 1. Collect strategist-suggested fonts that exist in our library
  const suggestedMatches: FontEntry[] = [];
  for (const suggestion of suggested) {
    const match = base.find(f => f.name.toLowerCase() === suggestion.toLowerCase());
    if (match && !suggestedMatches.includes(match)) suggestedMatches.push(match);
  }

  // 2. Filter by formality range
  const formalityViable = base.filter(f =>
    formality >= f.formalityRange[0] && formality <= f.formalityRange[1]
  );

  // 3. Build a ranked pool: suggested fonts that also fit formality first,
  //    then remaining formality-viable, then all base candidates as fallback.
  //    Dedup so each font appears only once.
  const seen = new Set<string>();
  const ranked: FontEntry[] = [];
  const addUnique = (fonts: FontEntry[]) => {
    for (const f of fonts) {
      if (!seen.has(f.name)) { seen.add(f.name); ranked.push(f); }
    }
  };

  // Suggested + formality match = highest priority
  addUnique(suggestedMatches.filter(f => formalityViable.includes(f)));
  // Other formality-viable candidates
  addUnique(formalityViable);
  // Suggested fonts outside formality range (strategist override)
  addUnique(suggestedMatches);
  // Everything else
  addUnique(base);

  if (ranked.length === 0) return candidates[0]; // absolute fallback

  // 4. Use brand hash to rotate through the pool for variety
  if (brandHash !== undefined && ranked.length > 1) {
    return ranked[brandHash % ranked.length];
  }

  return ranked[0];
}

function buildTypeScale(
  displayFont: string,
  bodyFont: string,
  monoFont: string,
  ratio: number,
  baseSizePt: number
): TypeScaleLevel[] {
  const scale = (power: number) => Math.round(baseSizePt * Math.pow(ratio, power) * 10) / 10;

  return [
    { name: 'Display', font: displayFont, weight: 'Bold',     sizePt: scale(5), leadingPt: Math.round(scale(5) * 1.15), tracking: '-0.02em' },
    { name: 'H1',      font: displayFont, weight: 'Bold',     sizePt: scale(4), leadingPt: Math.round(scale(4) * 1.2),  tracking: '-0.01em' },
    { name: 'H2',      font: displayFont, weight: 'SemiBold', sizePt: scale(3), leadingPt: Math.round(scale(3) * 1.25), tracking: '0' },
    { name: 'H3',      font: displayFont, weight: 'Medium',   sizePt: scale(2), leadingPt: Math.round(scale(2) * 1.3),  tracking: '0' },
    { name: 'Body',    font: bodyFont,    weight: 'Regular',   sizePt: scale(0), leadingPt: Math.round(scale(0) * 1.5),  tracking: '0' },
    { name: 'Caption', font: bodyFont,    weight: 'Regular',   sizePt: scale(-1), leadingPt: Math.round(scale(-1) * 1.4), tracking: '+0.02em' },
    { name: 'Code',    font: monoFont,    weight: 'Regular',   sizePt: scale(-0.5), leadingPt: Math.round(scale(-0.5) * 1.5), tracking: '0' },
  ];
}
