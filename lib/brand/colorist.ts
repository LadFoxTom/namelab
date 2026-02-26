import { DesignBrief } from './strategist';
import { BrandPalette } from './palette';

// ── Extended palette with systematic HSL-derived colors ─────────────────────

export interface ColorSystem {
  // Core brand palette (backward compatible with BrandPalette)
  brand: BrandPalette;

  // Systematic UI/design-system colors
  system: {
    accent: ColorSpec;
    background: ColorSpec;
    surface: ColorSpec;
    foreground: ColorSpec;
    muted: ColorSpec;
    border: ColorSpec;
    accentDim: string; // accent with alpha for hover states
  };

  // Functional colors
  functional: {
    success: ColorSpec;
    warning: ColorSpec;
    error: ColorSpec;
    info: ColorSpec;
  };

  // Accessibility checks
  accessibility: AccessibilityCheck[];
  allAaPass: boolean;

  // Usage proportions
  proportions: {
    background: number;
    surface: number;
    foreground: number;
    accent: number;
  };

  // Theme
  theme: 'light' | 'dark';
}

export interface ColorSpec {
  hex: string;
  rgb: string;
  hsl: string;
  cmyk: string;
}

export interface AccessibilityCheck {
  pair: string;
  ratio: number;
  aaPass: boolean;
  aaaPass: boolean;
}

// ── HSL utilities ───────────────────────────────────────────────────────────

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgbString(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToCmyk(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const k = 1 - Math.max(r, g, b);
  if (k === 1) return 'C:0 M:0 Y:0 K:100';
  const c = Math.round(((1 - r - k) / (1 - k)) * 100);
  const m = Math.round(((1 - g - k) / (1 - k)) * 100);
  const y = Math.round(((1 - b - k) / (1 - k)) * 100);
  return `C:${c} M:${m} Y:${y} K:${Math.round(k * 100)}`;
}

function hslString(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function makeColorSpec(hex: string): ColorSpec {
  const hsl = hexToHsl(hex);
  return {
    hex,
    rgb: hexToRgbString(hex),
    hsl: hslString(hsl.h, hsl.s, hsl.l),
    cmyk: hexToCmyk(hex),
  };
}

// ── WCAG contrast ratio calculation ─────────────────────────────────────────

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function checkAccessibility(fg: string, bg: string, label: string): AccessibilityCheck {
  const ratio = Math.round(contrastRatio(fg, bg) * 100) / 100;
  return {
    pair: label,
    ratio,
    aaPass: ratio >= 4.5,
    aaaPass: ratio >= 7,
  };
}

// ── Main colorist function ──────────────────────────────────────────────────

export function buildColorSystem(brief: DesignBrief, imagePalette: BrandPalette): ColorSystem {
  const accentHex = brief.colorGuidance.suggestedPrimaryHex || imagePalette.primary;
  const accentHsl = hexToHsl(accentHex);

  const isDark = brief.themePreference === 'dark' ||
    (brief.themePreference === 'either' && isDarkPreferred(brief));

  // Derive systematic palette from accent hue using HSL relationships
  const system = isDark
    ? deriveDarkTheme(accentHsl)
    : deriveLightTheme(accentHsl);

  // Functional colors — tuned to palette temperature
  const isWarm = brief.colorGuidance.temperature === 'warm';
  const functional = {
    success: makeColorSpec(hslToHex(142, isWarm ? 55 : 71, 45)),
    warning: makeColorSpec(hslToHex(38, isWarm ? 85 : 92, 50)),
    error: makeColorSpec(hslToHex(0, isWarm ? 75 : 84, 60)),
    info: makeColorSpec(hslToHex(217, isWarm ? 80 : 91, 60)),
  };

  // Accessibility checks
  const checks = [
    checkAccessibility(system.foreground.hex, system.background.hex, 'foreground/background'),
    checkAccessibility(system.foreground.hex, system.surface.hex, 'foreground/surface'),
    checkAccessibility(system.muted.hex, system.background.hex, 'muted/background'),
    checkAccessibility(system.accent.hex, system.background.hex, 'accent/background'),
  ];

  // Build backward-compatible BrandPalette
  const brand: BrandPalette = {
    primary: accentHex,
    secondary: system.surface.hex,
    accent: brief.colorGuidance.suggestedAccentHex || imagePalette.accent,
    light: isDark ? system.foreground.hex : system.background.hex,
    dark: isDark ? system.background.hex : system.foreground.hex,
    textOnPrimary: contrastRatio('#FFFFFF', accentHex) > contrastRatio('#000000', accentHex) ? '#FFFFFF' : '#000000',
    textOnLight: isDark ? system.background.hex : system.foreground.hex,
    cssVars: buildCssVars(accentHex, system, isDark),
  };

  // Proportions based on aesthetic density
  const isSparse = brief.aestheticDirection.toLowerCase().includes('minimal') ||
    brief.aestheticDirection.toLowerCase().includes('sparse') ||
    brief.aestheticDirection.toLowerCase().includes('editorial');

  return {
    brand,
    system,
    functional,
    accessibility: checks,
    allAaPass: checks.every(c => c.aaPass),
    proportions: {
      background: isSparse ? 65 : 55,
      surface: isSparse ? 15 : 25,
      foreground: 10,
      accent: 10,
    },
    theme: isDark ? 'dark' : 'light',
  };
}

function isDarkPreferred(brief: DesignBrief): boolean {
  const sector = brief.sectorClassification.toLowerCase();
  return sector.includes('tech') || sector.includes('developer') ||
    sector.includes('cyber') || sector.includes('ai') ||
    sector.includes('data') || sector.includes('gaming') ||
    brief.aestheticDirection.toLowerCase().includes('terminal') ||
    brief.aestheticDirection.toLowerCase().includes('brutal');
}

function deriveDarkTheme(accent: { h: number; s: number; l: number }) {
  const h = accent.h;
  return {
    accent: makeColorSpec(hslToHex(h, accent.s, accent.l)),
    background: makeColorSpec(hslToHex((h + 20) % 360, 6, 4)),
    surface: makeColorSpec(hslToHex((h + 20) % 360, 7, 7)),
    foreground: makeColorSpec(hslToHex((h + 20) % 360, 6, 95)),
    muted: makeColorSpec(hslToHex((h + 20) % 360, 5, 44)),
    border: makeColorSpec(hslToHex((h + 20) % 360, 8, 13)),
    accentDim: hslToHex(h, accent.s, accent.l) + '20',
  };
}

function deriveLightTheme(accent: { h: number; s: number; l: number }) {
  const h = accent.h;
  return {
    accent: makeColorSpec(hslToHex(h, accent.s, accent.l)),
    background: makeColorSpec(hslToHex((h + 10) % 360, 3, 98)),
    surface: makeColorSpec(hslToHex((h + 10) % 360, 8, 100)),
    foreground: makeColorSpec(hslToHex((h + 10) % 360, 3, 10)),
    muted: makeColorSpec(hslToHex((h + 10) % 360, 5, 44)),
    border: makeColorSpec(hslToHex((h + 10) % 360, 12, 90)),
    accentDim: hslToHex(h, accent.s, accent.l) + '15',
  };
}

function buildCssVars(
  primary: string,
  system: ColorSystem['system'],
  isDark: boolean
): string {
  return `
:root {
  --brand-primary: ${primary};
  --brand-accent: ${system.accent.hex};
  --brand-background: ${system.background.hex};
  --brand-surface: ${system.surface.hex};
  --brand-foreground: ${system.foreground.hex};
  --brand-muted: ${system.muted.hex};
  --brand-border: ${system.border.hex};
  --brand-accent-dim: ${system.accentDim};
  --brand-theme: ${isDark ? 'dark' : 'light'};
}`.trim();
}
