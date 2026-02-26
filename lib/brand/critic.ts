import { DesignBrief } from './strategist';
import { TypeSystem } from './typographer';
import { ColorSystem, AccessibilityCheck } from './colorist';
import { BrandSignals } from './signals';
import { FontPairing } from './typography';
import { BrandPalette } from './palette';

// ── QA Report output ────────────────────────────────────────────────────────

export interface QAReport {
  verdict: 'approve' | 'approve_with_warnings' | 'flagged';
  scores: {
    briefAlignment: number;       // 1-10
    internalConsistency: number;  // 1-10
    differentiation: number;      // 1-10
    technicalQuality: number;     // 1-10
    overall: number;              // 1-10
  };
  issues: QAIssue[];
  fixes: QAFix[];    // auto-fixes that were applied
  summary: string;
}

export interface QAIssue {
  severity: 'blocking' | 'warning' | 'suggestion';
  category: string;
  description: string;
}

export interface QAFix {
  category: string;
  description: string;
  before: string;
  after: string;
}

// ── Overused font/color blocklists ──────────────────────────────────────────

const OVERUSED_FONTS = ['inter', 'roboto', 'arial', 'open sans', 'montserrat', 'helvetica', 'poppins'];
const GENERIC_COLORS = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00'];

// ── Main critic function ────────────────────────────────────────────────────

export function runCriticQA(
  brief: DesignBrief,
  signals: BrandSignals,
  palette: BrandPalette,
  fonts: FontPairing,
  typeSystem?: TypeSystem,
  colorSystem?: ColorSystem
): { report: QAReport; fixedPalette: BrandPalette; fixedColorSystem?: ColorSystem } {
  const issues: QAIssue[] = [];
  const fixes: QAFix[] = [];

  let fixedPalette = { ...palette };
  let fixedColorSystem = colorSystem ? deepCloneColorSystem(colorSystem) : undefined;

  // ── 1. Brief Alignment ────────────────────────────────────────

  let briefScore = 10;

  // Check tension pair is reflected in type choice
  if (typeSystem) {
    const tensionWords = brief.tensionPair.toLowerCase().split(/\s+/);
    const typePersonality = typeSystem.pairingRationale?.toLowerCase() || '';
    const hasTensionRef = tensionWords.some(w => w.length > 3 && typePersonality.includes(w));
    if (!hasTensionRef) {
      briefScore -= 1;
      issues.push({
        severity: 'suggestion',
        category: 'Brief Alignment',
        description: `Typography rationale doesn't explicitly reference the brand tension "${brief.tensionPair}".`,
      });
    }
  }

  // Check aesthetic direction consistency
  const direction = brief.aestheticDirection.toLowerCase();
  if (direction.includes('minimal') || direction.includes('swiss')) {
    // Minimal aesthetics shouldn't use expressive display fonts
    if (fonts.heading.name.toLowerCase().includes('display') && !fonts.heading.name.toLowerCase().includes('playfair')) {
      briefScore -= 1;
      issues.push({
        severity: 'warning',
        category: 'Brief Alignment',
        description: `Expressive display font "${fonts.heading.name}" may conflict with "${brief.aestheticDirection}" aesthetic.`,
      });
    }
  }

  // Check sector alignment
  const sector = brief.sectorClassification.toLowerCase();
  if ((sector.includes('finance') || sector.includes('legal')) && !isSerif(fonts.heading.name) && brief.typeGuidance.formalityLevel >= 4) {
    briefScore -= 1;
    issues.push({
      severity: 'suggestion',
      category: 'Brief Alignment',
      description: `High-formality ${brief.sectorClassification} sector may benefit from a serif display font.`,
    });
  }

  // ── 2. Internal Consistency ───────────────────────────────────

  let consistencyScore = 10;

  // Font weight vs color contrast
  if (colorSystem) {
    const accentLuminance = getRelativeLuminance(palette.primary);
    const isVibrantAccent = accentLuminance > 0.15 && accentLuminance < 0.7;
    const hasHeavyType = fonts.heading.weights.some(w => w >= 700);

    if (isVibrantAccent && hasHeavyType) {
      // Good combo — vibrant accent + bold type creates impact
    } else if (!isVibrantAccent && !hasHeavyType) {
      consistencyScore -= 1;
      issues.push({
        severity: 'suggestion',
        category: 'Consistency',
        description: 'Both accent color and type weight are subtle. Consider bolder type or more vibrant accent for impact.',
      });
    }
  }

  // Check font pairing: display and body should differ
  if (fonts.heading.name === fonts.body.name) {
    consistencyScore -= 2;
    issues.push({
      severity: 'warning',
      category: 'Consistency',
      description: `Display and body fonts are the same (${fonts.heading.name}). Distinct fonts create better visual hierarchy.`,
    });
  }

  // Check palette internal harmony: primary and accent shouldn't clash
  if (palette.primary && palette.accent && palette.primary !== palette.accent) {
    const primaryHue = hexToHue(palette.primary);
    const accentHue = hexToHue(palette.accent);
    if (primaryHue !== null && accentHue !== null) {
      const hueDiff = Math.abs(primaryHue - accentHue);
      const normalizedDiff = hueDiff > 180 ? 360 - hueDiff : hueDiff;
      // Colors 30-60° or 120-180° apart are harmonious; 60-120° can clash
      if (normalizedDiff > 60 && normalizedDiff < 120) {
        consistencyScore -= 1;
        issues.push({
          severity: 'suggestion',
          category: 'Consistency',
          description: `Primary (${palette.primary}) and accent (${palette.accent}) hues are ${normalizedDiff}° apart — potentially clashing. Consider analogous or complementary pairing.`,
        });
      }
    }
  }

  // ── 3. Differentiation ────────────────────────────────────────

  let diffScore = 10;

  // Check for overused fonts
  if (OVERUSED_FONTS.includes(fonts.heading.name.toLowerCase())) {
    diffScore -= 2;
    issues.push({
      severity: 'warning',
      category: 'Differentiation',
      description: `Display font "${fonts.heading.name}" is commonly overused and may not differentiate the brand.`,
    });
  }
  if (OVERUSED_FONTS.includes(fonts.body.name.toLowerCase())) {
    diffScore -= 1;
    issues.push({
      severity: 'suggestion',
      category: 'Differentiation',
      description: `Body font "${fonts.body.name}" is very common. Consider a more distinctive alternative.`,
    });
  }

  // Check for generic colors
  if (GENERIC_COLORS.includes(palette.primary.toLowerCase())) {
    diffScore -= 2;
    issues.push({
      severity: 'warning',
      category: 'Differentiation',
      description: `Primary color ${palette.primary} is generic. A unique shade would improve brand distinctiveness.`,
    });
  }

  // Competitive differentiation from brief
  if (brief.competitiveDifferentiation) {
    // Just note it as context — actual checking would require competitor data
    const avoidPatterns = brief.competitiveDifferentiation.toLowerCase();
    if (avoidPatterns.includes('blue') && hexToHue(palette.primary) !== null) {
      const hue = hexToHue(palette.primary)!;
      if (hue >= 200 && hue <= 250) {
        diffScore -= 1;
        issues.push({
          severity: 'warning',
          category: 'Differentiation',
          description: `Primary color is blue (${palette.primary}), but brief notes competitors use blue. Consider differentiating.`,
        });
      }
    }
  }

  // ── 4. Technical Quality ──────────────────────────────────────

  let techScore = 10;

  // WCAG accessibility — auto-fix if needed
  if (colorSystem) {
    const failingChecks = colorSystem.accessibility.filter(c => !c.aaPass);
    if (failingChecks.length > 0) {
      techScore -= failingChecks.length;
      for (const check of failingChecks) {
        issues.push({
          severity: 'blocking',
          category: 'Accessibility',
          description: `${check.pair} contrast ratio ${check.ratio}:1 fails WCAG AA (minimum 4.5:1).`,
        });
      }

      // Auto-fix: adjust muted color if it fails
      if (fixedColorSystem) {
        const mutedCheck = failingChecks.find(c => c.pair.includes('muted'));
        if (mutedCheck && fixedColorSystem.system.muted) {
          const oldMuted = fixedColorSystem.system.muted.hex;
          const adjusted = adjustForContrast(
            oldMuted,
            fixedColorSystem.system.background.hex,
            4.5
          );
          if (adjusted !== oldMuted) {
            fixedColorSystem.system.muted = {
              ...fixedColorSystem.system.muted,
              hex: adjusted,
              rgb: hexToRgbStr(adjusted),
            };
            fixes.push({
              category: 'Accessibility',
              description: 'Auto-adjusted muted text color to pass WCAG AA contrast.',
              before: oldMuted,
              after: adjusted,
            });
            techScore += 1; // Partially recover score since we fixed it
          }
        }
      }
    }
  }

  // Check CMYK total ink coverage (< 300% for print safety)
  if (colorSystem) {
    const primaryCmyk = parseCmyk(colorSystem.system.accent.cmyk);
    if (primaryCmyk) {
      const totalInk = primaryCmyk.c + primaryCmyk.m + primaryCmyk.y + primaryCmyk.k;
      if (totalInk > 300) {
        techScore -= 1;
        issues.push({
          severity: 'warning',
          category: 'Technical',
          description: `Primary color CMYK total ink is ${totalInk}% (recommended < 300% for print).`,
        });
      }
    }
  }

  // Validate hex colors are valid
  const allHexes = [palette.primary, palette.secondary, palette.accent, palette.light, palette.dark];
  for (const hex of allHexes) {
    if (!isValidHex(hex)) {
      techScore -= 1;
      issues.push({
        severity: 'blocking',
        category: 'Technical',
        description: `Invalid hex color: "${hex}".`,
      });
    }
  }

  // Check type scale consistency (if typeSystem)
  if (typeSystem?.typeScale) {
    const sizes = typeSystem.typeScale.map(l => l.sizePt);
    for (let i = 1; i < sizes.length; i++) {
      if (sizes[i] >= sizes[i - 1]) {
        techScore -= 1;
        issues.push({
          severity: 'warning',
          category: 'Technical',
          description: `Type scale is not strictly descending: ${typeSystem.typeScale[i - 1].name} (${sizes[i - 1]}pt) → ${typeSystem.typeScale[i].name} (${sizes[i]}pt).`,
        });
        break;
      }
    }
  }

  // ── Compile report ────────────────────────────────────────────

  const clampScore = (s: number) => Math.max(1, Math.min(10, s));
  const scores = {
    briefAlignment: clampScore(briefScore),
    internalConsistency: clampScore(consistencyScore),
    differentiation: clampScore(diffScore),
    technicalQuality: clampScore(techScore),
    overall: 0,
  };
  scores.overall = clampScore(Math.round(
    (scores.briefAlignment * 0.25 + scores.internalConsistency * 0.25 +
     scores.differentiation * 0.2 + scores.technicalQuality * 0.3)
  ));

  const blockingCount = issues.filter(i => i.severity === 'blocking').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  let verdict: QAReport['verdict'];
  if (blockingCount > 0 && fixes.length < blockingCount) {
    verdict = 'flagged';
  } else if (warningCount > 0 || blockingCount > 0) {
    verdict = 'approve_with_warnings';
  } else {
    verdict = 'approve';
  }

  const summary = verdict === 'approve'
    ? `Brand system passed all quality checks. Overall score: ${scores.overall}/10.`
    : verdict === 'approve_with_warnings'
    ? `Brand system approved with ${warningCount} warning(s) and ${fixes.length} auto-fix(es). Overall score: ${scores.overall}/10.`
    : `Brand system has ${blockingCount} blocking issue(s) that need attention. Overall score: ${scores.overall}/10.`;

  // Update fixed palette's CSS vars if colorSystem was modified
  if (fixedColorSystem && fixes.length > 0) {
    fixedPalette = fixedColorSystem.brand;
  }

  return {
    report: { verdict, scores, issues, fixes, summary },
    fixedPalette,
    fixedColorSystem,
  };
}

// ── Utility functions ───────────────────────────────────────────────────────

function isSerif(fontName: string): boolean {
  const serifs = ['playfair', 'cormorant', 'bodoni', 'garamond', 'baskerville', 'lora',
    'merriweather', 'source serif', 'literata', 'fraunces', 'instrument serif', 'newsreader'];
  return serifs.some(s => fontName.toLowerCase().includes(s));
}

function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

function hexToHue(hex: string): number | null {
  if (!isValidHex(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return Math.round(h * 360);
}

function getRelativeLuminance(hex: string): number {
  if (!isValidHex(hex)) return 0.5;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function adjustForContrast(foreground: string, background: string, targetRatio: number): string {
  const bgLum = getRelativeLuminance(background);
  const fgLum = getRelativeLuminance(foreground);

  // Determine if we need to lighten or darken
  const bgIsDark = bgLum < 0.5;

  let r = parseInt(foreground.slice(1, 3), 16);
  let g = parseInt(foreground.slice(3, 5), 16);
  let b = parseInt(foreground.slice(5, 7), 16);

  // Adjust in steps until we pass
  for (let step = 0; step < 30; step++) {
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    const lum = getRelativeLuminance(hex);
    const lighter = Math.max(lum, bgLum);
    const darker = Math.min(lum, bgLum);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    if (ratio >= targetRatio) return hex;

    // Move away from background
    const delta = bgIsDark ? 8 : -8;
    r = Math.max(0, Math.min(255, r + delta));
    g = Math.max(0, Math.min(255, g + delta));
    b = Math.max(0, Math.min(255, b + delta));
  }

  return foreground; // Give up after 30 steps
}

function hexToRgbStr(hex: string): string {
  return `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
}

function parseCmyk(cmyk: string): { c: number; m: number; y: number; k: number } | null {
  // Parse "C:70 M:0 Y:50 K:0" format
  const match = cmyk.match(/C:(\d+)\s*M:(\d+)\s*Y:(\d+)\s*K:(\d+)/);
  if (!match) return null;
  return { c: parseInt(match[1]), m: parseInt(match[2]), y: parseInt(match[3]), k: parseInt(match[4]) };
}

function deepCloneColorSystem(cs: ColorSystem): ColorSystem {
  return JSON.parse(JSON.stringify(cs));
}
