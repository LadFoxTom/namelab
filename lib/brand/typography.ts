import { BrandSignals } from './signals';

export interface FontPairing {
  heading: FontSpec;
  body: FontSpec;
  mono: FontSpec;
  googleFontsUrl: string;
}

export interface FontSpec {
  name: string;
  weights: number[];
  cssFamily: string;
}

const PAIRINGS: Record<BrandSignals['tone'], FontPairing> = {
  techy: {
    heading: { name: 'Space Grotesk', weights: [400, 500, 700], cssFamily: "'Space Grotesk', sans-serif" },
    body:    { name: 'DM Sans', weights: [400, 500], cssFamily: "'DM Sans', sans-serif" },
    mono:    { name: 'JetBrains Mono', weights: [400], cssFamily: "'JetBrains Mono', monospace" },
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=DM+Sans:wght@400;500&family=JetBrains+Mono&display=swap',
  },
  professional: {
    heading: { name: 'Inter', weights: [400, 600, 700], cssFamily: "'Inter', sans-serif" },
    body:    { name: 'Source Serif 4', weights: [400, 600], cssFamily: "'Source Serif 4', serif" },
    mono:    { name: 'IBM Plex Mono', weights: [400], cssFamily: "'IBM Plex Mono', monospace" },
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Source+Serif+4:wght@400;600&family=IBM+Plex+Mono&display=swap',
  },
  bold: {
    heading: { name: 'Syne', weights: [700, 800], cssFamily: "'Syne', sans-serif" },
    body:    { name: 'Manrope', weights: [400, 500], cssFamily: "'Manrope', sans-serif" },
    mono:    { name: 'Fira Code', weights: [400], cssFamily: "'Fira Code', monospace" },
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Manrope:wght@400;500&family=Fira+Code&display=swap',
  },
  playful: {
    heading: { name: 'Nunito', weights: [700, 800], cssFamily: "'Nunito', sans-serif" },
    body:    { name: 'Quicksand', weights: [400, 500], cssFamily: "'Quicksand', sans-serif" },
    mono:    { name: 'Space Mono', weights: [400], cssFamily: "'Space Mono', monospace" },
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=Quicksand:wght@400;500&family=Space+Mono&display=swap',
  },
  calm: {
    heading: { name: 'Outfit', weights: [400, 600], cssFamily: "'Outfit', sans-serif" },
    body:    { name: 'Lato', weights: [400, 300], cssFamily: "'Lato', sans-serif" },
    mono:    { name: 'Roboto Mono', weights: [400], cssFamily: "'Roboto Mono', monospace" },
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&family=Lato:wght@300;400&family=Roboto+Mono&display=swap',
  },
  sophisticated: {
    heading: { name: 'Playfair Display', weights: [400, 700], cssFamily: "'Playfair Display', serif" },
    body:    { name: 'Cormorant', weights: [400, 500], cssFamily: "'Cormorant', serif" },
    mono:    { name: 'Courier Prime', weights: [400], cssFamily: "'Courier Prime', monospace" },
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Cormorant:wght@400;500&family=Courier+Prime&display=swap',
  },
};

export function getFontPairing(tone: BrandSignals['tone']): FontPairing {
  return PAIRINGS[tone] ?? PAIRINGS.professional;
}
