export const BRAND_UI = {
  bg: '#FAFAF8',
  surface: '#FFFFFF',
  text: '#1A1A18',
  textMuted: '#585854',
  textLight: '#A1A1AA',
  accent: '#7C3AED',
  accentHover: '#6D28D9',
  border: '#E6E6E4',
  borderHover: '#D4D4D8',
  radius: { sm: '8px', md: '12px', lg: '16px', full: '999px' },
} as const;

export interface BrandTier {
  id: string;
  label: string;
  price: string;
  highlight?: boolean;
  features: string[];
}

export const BRAND_TIERS: BrandTier[] = [
  {
    id: 'LOGO_ONLY',
    label: 'Logo Pack',
    price: '\u20AC12',
    features: [
      'Logo PNG + SVG',
      '7 color variants',
      'Favicon package',
      'Commercial license',
    ],
  },
  {
    id: 'BRAND_KIT',
    label: 'Brand Kit',
    price: '\u20AC29',
    highlight: true,
    features: [
      'Everything in Logo Pack',
      '30 logo variation files',
      '18+ social media assets',
      'Color palette (CSS + JSON)',
      'Typography system',
      'Brand guidelines PDF',
      'Business cards + letterhead',
      'Email signature templates',
    ],
  },
  {
    id: 'BRAND_KIT_PRO',
    label: 'Brand Kit Pro',
    price: '\u20AC59',
    features: [
      'Everything in Brand Kit',
      '3 additional concepts',
      'All source files',
      'Priority support',
    ],
  },
];
