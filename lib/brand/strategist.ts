import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Design Brief: the Strategist's output contract ──────────────────────────

export interface DesignBrief {
  brandName: string;
  tagline: string;
  sectorClassification: string;
  tensionPair: string;              // "X but Y"
  aestheticDirection: string;       // e.g. "Swiss Modernism with warm accents"
  memorableAnchor: string;          // the ONE thing to remember after 3 seconds
  brandPillars: { name: string; description: string }[];
  personalityTraits: { trait: string; counterbalance: string }[];
  targetAudienceSummary: string;
  themePreference: 'light' | 'dark' | 'either';
  typeGuidance: {
    displayCategory: string;        // e.g. "geometric_sans", "high_contrast_serif"
    bodyCategory: string;
    formalityLevel: number;         // 1-5
    suggestedDisplayFonts: string[];
    suggestedBodyFonts: string[];
  };
  colorGuidance: {
    temperature: 'warm' | 'cool' | 'neutral';
    saturationLevel: 'vibrant' | 'moderate' | 'muted' | 'desaturated';
    accentHueRange: string;         // e.g. "140-170 green"
    avoidHues: string[];
    suggestedPrimaryHex: string;    // specific hex suggestion
    suggestedAccentHex: string;
  };
  logoGuidance: {
    preferredStyles: string[];      // ordered preference from LogoStyle
    geometry: string;               // "circular", "angular", "organic", etc.
    strokeWeight: 'light' | 'medium' | 'bold';
    conceptSeeds: string[];         // 2-3 conceptual starting points
  };
  competitiveDifferentiation: string;
}

// ── Sector-Aesthetic Matrix (embedded for the prompt) ───────────────────────

const SECTOR_MATRIX = `
| Sector | Default Palette Temp | Default Type Style | Default Density | Where to Break |
|---|---|---|---|---|
| Technology / SaaS / AI | Cool (blue-purple) | Geometric sans | Sparse | Unexpected accent color, introduce a serif |
| Finance / Legal / Consulting | Warm neutral (navy+gold) | High-contrast serif | Moderate | Warmer backgrounds, oversized display serif |
| Healthcare / Biotech / Wellness | Warm (cream-green) | Humanist sans + serif | Airy | Sophisticated palette, angular logo geometry |
| Cybersecurity / Data / Enterprise | Cold (navy-black) | Technical/condensed sans | Dense | Warmer accent, softer body font |
| Creative / Agency / Lifestyle | Variable | Expressive display | Variable | Maximum restraint, minimal identity |
| Developer Tools / OSS | Dark (near-black) | Monospaced + grotesk | Dense | Color warmth, serif for branding |
| Luxury / Premium / Fashion | Warm or dark | Serif-forward | Sparse | Unexpected modernity, bold accent |
| Food / Restaurant / Hospitality | Warm (earth tones) | Friendly sans or display serif | Moderate | Refined minimalism |
| Education / Non-profit | Approachable warm | Humanist sans | Moderate | Confident boldness |
| E-commerce / Consumer / D2C | Variable bright | Clean geometric sans | Moderate | Restraint and sophistication |
`;

const AESTHETIC_DIRECTIONS = [
  'Precision Minimalism', 'Neo-Classical Luxury', 'Tactical Interface',
  'Organic Futurism', 'Terminal Brutalism', 'Editorial Restraint',
  'Geometric Warmth', 'Soft Industrial', 'Swiss Modernism',
  'Art Deco Revival', 'Nordic Simplicity', 'Warm Modernism',
  'Bold Geometric', 'Refined Heritage', 'Digital Naturalism',
];

// ── Main strategist function ────────────────────────────────────────────────

export async function generateDesignBrief(
  domainName: string,
  businessDescription: string,
  userPreferences?: {
    tone?: string;
    iconStyle?: string;
    colorPreference?: string;
    logoDescription?: string;
    businessDescription?: string;
  }
): Promise<DesignBrief> {
  const description = userPreferences?.businessDescription || businessDescription;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a senior brand strategist with 20 years of experience at top agencies (Pentagram, Wolff Olins, Landor). Your role is to convert a raw business brief into a structured design brief that specialist designers can execute.

You think through these steps IN ORDER:

**Step 1 — Sector Classification**
Map the business to its visual territory using this matrix:
${SECTOR_MATRIX}
Identify which sector fits, what the conventions are, and what ONE convention to break for memorability.

**Step 2 — Tension Identification**
The best brands live between two opposing qualities. Find the productive tension.
Examples: "technical but approachable", "exclusive but welcoming", "clinical but warm", "precise but playful".
IMPORTANT: Both sides must genuinely pull in different directions. "innovative and creative" is NOT a tension.

**Step 3 — Aesthetic Direction**
Choose ONE specific aesthetic direction. "Modern" and "clean" are NOT directions. Be specific.
Valid examples: ${AESTHETIC_DIRECTIONS.join(', ')}.

**Step 4 — Memorable Anchor**
Define the ONE thing someone should remember after seeing this brand for 3 seconds.
This could be: an unusual color choice, a typographic treatment, a logo concept, a naming device.
It must be ownable — distinctive from competitors.

**Step 5 — Design Brief Assembly**
Compile everything into a structured brief with specific, actionable guidance for:
- Typography: suggest specific Google Fonts that fit the direction
- Color: suggest specific hex values informed by the sector and tension
- Logo: suggest conceptual starting points, not just generic descriptions

Be opinionated. Generic briefs produce generic brands. Every field should narrow the design space.`
      },
      {
        role: 'user',
        content: `Create a design brief for:

Brand/Domain name: "${domainName}"
Business description: "${description}"
${userPreferences?.tone ? `Tone preference: ${userPreferences.tone}` : ''}
${userPreferences?.iconStyle ? `Icon style preference: ${userPreferences.iconStyle}` : ''}
${userPreferences?.colorPreference ? `Color preference: ${userPreferences.colorPreference}` : ''}
${userPreferences?.logoDescription ? `Logo concept/description: ${userPreferences.logoDescription}` : ''}

Return a JSON object with this exact structure:
{
  "brandName": "string (the display name, may differ from domain)",
  "tagline": "string (short brand tagline, 3-8 words)",
  "sectorClassification": "string (from the sector matrix)",
  "tensionPair": "string (format: 'X but Y')",
  "aestheticDirection": "string (specific named direction)",
  "memorableAnchor": "string (the one thing to remember)",
  "brandPillars": [{ "name": "string", "description": "string" }],
  "personalityTraits": [{ "trait": "string", "counterbalance": "string" }],
  "targetAudienceSummary": "string",
  "themePreference": "light | dark | either",
  "typeGuidance": {
    "displayCategory": "string (geometric_sans | humanist_sans | high_contrast_serif | transitional_serif | monospaced | condensed | display_expressive)",
    "bodyCategory": "string (humanist_sans | geometric_sans | serif | monospaced)",
    "formalityLevel": "number 1-5 (1=casual, 5=institutional)",
    "suggestedDisplayFonts": ["2-3 specific Google Font names"],
    "suggestedBodyFonts": ["2-3 specific Google Font names"]
  },
  "colorGuidance": {
    "temperature": "warm | cool | neutral",
    "saturationLevel": "vibrant | moderate | muted | desaturated",
    "accentHueRange": "string (e.g. '140-170 green')",
    "avoidHues": ["string"],
    "suggestedPrimaryHex": "#hex",
    "suggestedAccentHex": "#hex"
  },
  "logoGuidance": {
    "preferredStyles": ["ordered list from: wordmark, icon_wordmark, monogram, abstract_mark"],
    "geometry": "string (circular, angular, organic, geometric, freeform)",
    "strokeWeight": "light | medium | bold",
    "conceptSeeds": ["2-3 specific conceptual starting points for the logo"]
  },
  "competitiveDifferentiation": "string (what to avoid because competitors use it)"
}`
      }
    ]
  });

  const parsed = JSON.parse(response.choices[0].message.content!);

  // Validate and provide defaults for critical fields
  return {
    brandName: parsed.brandName || domainName,
    tagline: parsed.tagline || '',
    sectorClassification: parsed.sectorClassification || 'Technology / SaaS',
    tensionPair: parsed.tensionPair || 'professional but approachable',
    aestheticDirection: parsed.aestheticDirection || 'Precision Minimalism',
    memorableAnchor: parsed.memorableAnchor || '',
    brandPillars: parsed.brandPillars || [],
    personalityTraits: parsed.personalityTraits || [],
    targetAudienceSummary: parsed.targetAudienceSummary || '',
    themePreference: parsed.themePreference || 'either',
    typeGuidance: {
      displayCategory: parsed.typeGuidance?.displayCategory || 'geometric_sans',
      bodyCategory: parsed.typeGuidance?.bodyCategory || 'humanist_sans',
      formalityLevel: parsed.typeGuidance?.formalityLevel || 3,
      suggestedDisplayFonts: parsed.typeGuidance?.suggestedDisplayFonts || ['DM Sans', 'Outfit'],
      suggestedBodyFonts: parsed.typeGuidance?.suggestedBodyFonts || ['Source Sans 3', 'IBM Plex Sans'],
    },
    colorGuidance: {
      temperature: parsed.colorGuidance?.temperature || 'cool',
      saturationLevel: parsed.colorGuidance?.saturationLevel || 'moderate',
      accentHueRange: parsed.colorGuidance?.accentHueRange || '200-240 blue',
      avoidHues: parsed.colorGuidance?.avoidHues || [],
      suggestedPrimaryHex: parsed.colorGuidance?.suggestedPrimaryHex || '#2563EB',
      suggestedAccentHex: parsed.colorGuidance?.suggestedAccentHex || '#60A5FA',
    },
    logoGuidance: {
      preferredStyles: parsed.logoGuidance?.preferredStyles || ['wordmark', 'icon_wordmark', 'monogram', 'abstract_mark'],
      geometry: parsed.logoGuidance?.geometry || 'geometric',
      strokeWeight: parsed.logoGuidance?.strokeWeight || 'medium',
      conceptSeeds: parsed.logoGuidance?.conceptSeeds || [],
    },
    competitiveDifferentiation: parsed.competitiveDifferentiation || '',
  };
}

// ── Bridge: convert DesignBrief → BrandSignals for backward compatibility ───

import { BrandSignals, ColorDirection } from './signals';

export function briefToSignals(
  brief: DesignBrief,
  domainName: string,
  logoDescription?: string
): BrandSignals {
  // Map aesthetic direction / type guidance to a tone
  const toneMap: Record<string, BrandSignals['tone']> = {
    'geometric_sans': 'techy',
    'condensed': 'techy',
    'monospaced': 'techy',
    'humanist_sans': 'calm',
    'high_contrast_serif': 'sophisticated',
    'transitional_serif': 'professional',
    'display_expressive': 'bold',
  };
  const tone = toneMap[brief.typeGuidance.displayCategory] || mapTensionToTone(brief.tensionPair);

  // Map logo guidance geometry to icon style
  const iconStyleMap: Record<string, BrandSignals['iconStyle']> = {
    'circular': 'geometric',
    'angular': 'geometric',
    'geometric': 'geometric',
    'organic': 'organic',
    'freeform': 'abstract',
  };
  const iconStyle = iconStyleMap[brief.logoGuidance.geometry] || 'minimal';

  const colorDirection: ColorDirection = {
    primary: brief.colorGuidance.suggestedPrimaryHex,
    mood: `${brief.colorGuidance.temperature} ${brief.colorGuidance.saturationLevel}`,
    avoid: brief.colorGuidance.avoidHues.join(', '),
    paletteStyle: 'analogous',
  };

  return {
    domainName,
    tone,
    subTone: brief.tensionPair,
    colorDirection,
    iconStyle,
    industry: brief.sectorClassification,
    targetAudience: brief.targetAudienceSummary,
    brandPersonality: brief.personalityTraits.map(t => t.trait).join(', '),
    avoidElements: [brief.competitiveDifferentiation, ...brief.colorGuidance.avoidHues].filter(Boolean),
    suggestedKeywords: brief.logoGuidance.conceptSeeds,
    logoDescription,
  };
}

function mapTensionToTone(tension: string): BrandSignals['tone'] {
  const lower = tension.toLowerCase();
  if (lower.includes('playful') || lower.includes('fun') || lower.includes('friendly')) return 'playful';
  if (lower.includes('bold') || lower.includes('powerful') || lower.includes('strong')) return 'bold';
  if (lower.includes('calm') || lower.includes('serene') || lower.includes('gentle')) return 'calm';
  if (lower.includes('technical') || lower.includes('precise') || lower.includes('data')) return 'techy';
  if (lower.includes('elegant') || lower.includes('luxury') || lower.includes('premium')) return 'sophisticated';
  return 'professional';
}
