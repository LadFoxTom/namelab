import { syllable } from "syllable";

export interface LqsBreakdown {
  charLength: number;
  syllableCount: number;
  consonantCluster: number;
  vowelRatio: number;
  doubleLetter: number;
  pronounceability: number;
}

export interface LqsResult {
  total: number;
  breakdown: LqsBreakdown;
}

function scoreCharLength(name: string): number {
  const len = name.length;
  if (len <= 5) return 100;
  if (len === 6) return 90;
  if (len === 7) return 80;
  if (len === 8) return 65;
  if (len === 9) return 50;
  if (len === 10) return 35;
  return 20;
}

function scoreSyllableCount(name: string): number {
  const count = syllable(name);
  if (count <= 2) return 100;
  if (count === 3) return 75;
  if (count === 4) return 50;
  return 25;
}

function scoreConsonantCluster(name: string): number {
  const clusters = name.toLowerCase().match(/[^aeiou]{3,}/g) || [];
  return Math.max(0, 100 - clusters.length * 15);
}

function scoreVowelRatio(name: string): number {
  const lower = name.toLowerCase();
  const vowels = (lower.match(/[aeiou]/g) || []).length;
  const ratio = vowels / lower.length;
  // Ideal range: 0.35 - 0.50
  if (ratio >= 0.35 && ratio <= 0.50) return 100;
  const deviation = ratio < 0.35 ? 0.35 - ratio : ratio - 0.50;
  return Math.max(0, Math.round(100 - deviation * 300));
}

function scoreDoubleLetter(name: string): number {
  const doubles = name.toLowerCase().match(/(.)\1/g) || [];
  return Math.max(0, 100 - doubles.length * 10);
}

function scorePronounceability(name: string): number {
  return syllable(name) > 0 ? 100 : 55;
}

export function computeLqs(domainName: string): LqsResult {
  // Extract just the name part (before the TLD)
  const name = domainName.split(".")[0].toLowerCase();

  const breakdown: LqsBreakdown = {
    charLength: scoreCharLength(name),
    syllableCount: scoreSyllableCount(name),
    consonantCluster: scoreConsonantCluster(name),
    vowelRatio: scoreVowelRatio(name),
    doubleLetter: scoreDoubleLetter(name),
    pronounceability: scorePronounceability(name),
  };

  const total = Math.round(
    breakdown.charLength * 0.25 +
    breakdown.syllableCount * 0.20 +
    breakdown.consonantCluster * 0.15 +
    breakdown.vowelRatio * 0.15 +
    breakdown.doubleLetter * 0.10 +
    breakdown.pronounceability * 0.15
  );

  return { total, breakdown };
}
