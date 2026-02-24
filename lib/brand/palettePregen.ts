import { BrandSignals } from './signals';

export interface GeneratedPalette {
  primary: string;    // hex, e.g. "#2E7D8C"
  secondary: string;
  accent: string;
  dark: string;
  light: string;
}

// Map tone + color direction to a curated palette
// Runs BEFORE image generation so we can inject hex values into prompts
export function pregeneratePalette(signals: BrandSignals): GeneratedPalette {
  const colorMaps: Record<string, GeneratedPalette> = {
    // Techy palettes
    'techy_blue':    { primary: '#2563EB', secondary: '#1E3A8A', accent: '#60A5FA', dark: '#0F172A', light: '#EFF6FF' },
    'techy_teal':    { primary: '#0D9488', secondary: '#134E4A', accent: '#2DD4BF', dark: '#0F172A', light: '#F0FDFA' },
    'techy_purple':  { primary: '#7C3AED', secondary: '#4C1D95', accent: '#A78BFA', dark: '#0F172A', light: '#F5F3FF' },
    'techy_gray':    { primary: '#374151', secondary: '#111827', accent: '#6B7280', dark: '#030712', light: '#F9FAFB' },
    // Professional palettes
    'professional_navy':  { primary: '#1E3A5F', secondary: '#0F1F35', accent: '#2E86AB', dark: '#0A0F1A', light: '#F0F4F8' },
    'professional_green': { primary: '#166534', secondary: '#14532D', accent: '#22C55E', dark: '#052E16', light: '#F0FDF4' },
    'professional_slate': { primary: '#334155', secondary: '#1E293B', accent: '#3B82F6', dark: '#020617', light: '#F8FAFC' },
    'professional_blue':  { primary: '#1D4ED8', secondary: '#1E3A8A', accent: '#3B82F6', dark: '#0F172A', light: '#EFF6FF' },
    // Bold palettes
    'bold_red':      { primary: '#DC2626', secondary: '#7F1D1D', accent: '#F87171', dark: '#1A0505', light: '#FEF2F2' },
    'bold_orange':   { primary: '#EA580C', secondary: '#7C2D12', accent: '#FB923C', dark: '#1A0A05', light: '#FFF7ED' },
    'bold_black':    { primary: '#111827', secondary: '#030712', accent: '#6366F1', dark: '#000000', light: '#F9FAFB' },
    'bold_blue':     { primary: '#1D4ED8', secondary: '#1E3A8A', accent: '#EF4444', dark: '#0F172A', light: '#EFF6FF' },
    // Playful palettes
    'playful_pink':   { primary: '#DB2777', secondary: '#831843', accent: '#F472B6', dark: '#1A0510', light: '#FDF2F8' },
    'playful_yellow': { primary: '#D97706', secondary: '#78350F', accent: '#FCD34D', dark: '#1A0D03', light: '#FFFBEB' },
    'playful_mint':   { primary: '#059669', secondary: '#064E3B', accent: '#34D399', dark: '#022C22', light: '#ECFDF5' },
    'playful_blue':   { primary: '#3B82F6', secondary: '#1D4ED8', accent: '#F59E0B', dark: '#0F172A', light: '#EFF6FF' },
    // Calm palettes
    'calm_lavender':  { primary: '#7C3AED', secondary: '#4C1D95', accent: '#C4B5FD', dark: '#1E1B4B', light: '#F5F3FF' },
    'calm_sage':      { primary: '#4D7C5F', secondary: '#1F4A32', accent: '#86EFAC', dark: '#052E16', light: '#F0FDF4' },
    'calm_sky':       { primary: '#0284C7', secondary: '#0C4A6E', accent: '#38BDF8', dark: '#0C1A2E', light: '#F0F9FF' },
    'calm_blue':      { primary: '#3B82F6', secondary: '#1E40AF', accent: '#93C5FD', dark: '#172554', light: '#EFF6FF' },
    // Sophisticated palettes
    'sophisticated_gold':    { primary: '#92400E', secondary: '#451A03', accent: '#D97706', dark: '#1A0A02', light: '#FFFBEB' },
    'sophisticated_burgundy':{ primary: '#881337', secondary: '#4C0519', accent: '#F43F5E', dark: '#1A0208', light: '#FFF1F2' },
    'sophisticated_charcoal':{ primary: '#374151', secondary: '#111827', accent: '#9CA3AF', dark: '#030712', light: '#F9FAFB' },
    'sophisticated_blue':    { primary: '#1E3A5F', secondary: '#0F1F35', accent: '#60A5FA', dark: '#0A0F1A', light: '#F0F4F8' },
  };

  const colorKeyword = signals.colorDirection.primary.toLowerCase();
  const tone = signals.tone;

  const keywordMap: Record<string, string> = {
    blue: `${tone}_blue`, teal: `${tone}_teal`, purple: `${tone}_purple`,
    navy: 'professional_navy', green: `${tone}_green`, slate: 'professional_slate',
    red: 'bold_red', orange: 'bold_orange', black: 'bold_black',
    pink: 'playful_pink', yellow: 'playful_yellow', mint: 'playful_mint',
    lavender: 'calm_lavender', sage: 'calm_sage', sky: 'calm_sky',
    gold: 'sophisticated_gold', burgundy: 'sophisticated_burgundy',
    charcoal: 'sophisticated_charcoal', gray: `${tone}_gray`,
  };

  for (const [keyword, paletteKey] of Object.entries(keywordMap)) {
    if (colorKeyword.includes(keyword) && colorMaps[paletteKey]) {
      return colorMaps[paletteKey];
    }
  }

  // Default fallback based on tone only
  const toneDefaults: Record<string, string> = {
    techy: 'techy_teal', professional: 'professional_navy', bold: 'bold_black',
    playful: 'playful_mint', calm: 'calm_sky', sophisticated: 'sophisticated_charcoal',
  };

  return colorMaps[toneDefaults[tone]] ?? colorMaps['techy_teal'];
}
