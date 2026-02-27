import { LogoStyle } from './prompts';
import { DesignBrief } from './strategist';

export interface StyleRecommendation {
  style: LogoStyle;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

const ALL_STYLES: LogoStyle[] = ['wordmark', 'icon_wordmark', 'monogram', 'abstract_mark', 'pictorial', 'mascot', 'emblem', 'dynamic'];

/**
 * Recommend logo styles based on brand name length, sector, and aesthetic.
 * Returns all 8 styles with priority rankings and reasons.
 */
export function recommendStyles(brief: DesignBrief): StyleRecommendation[] {
  const scores: Record<LogoStyle, { score: number; reasons: string[] }> = {} as any;
  for (const style of ALL_STYLES) {
    scores[style] = { score: 50, reasons: [] };
  }

  const nameLength = brief.brandName.length;
  const sector = brief.sectorClassification.toLowerCase();
  const aesthetic = brief.aestheticDirection.toLowerCase();

  // ── Brand name length rules ──
  if (nameLength > 12) {
    scores.wordmark.score -= 20;
    scores.wordmark.reasons.push('Long name (>12 chars) doesn\'t suit wordmarks');
    scores.monogram.score += 20;
    scores.monogram.reasons.push('Long name benefits from initials-based mark');
    scores.icon_wordmark.score += 10;
    scores.icon_wordmark.reasons.push('Icon adds recognition for long names');
    scores.abstract_mark.score += 10;
    scores.abstract_mark.reasons.push('Symbol-based mark works well with long names');
  } else if (nameLength <= 5) {
    scores.wordmark.score += 20;
    scores.wordmark.reasons.push('Short name (<6 chars) is ideal for wordmarks');
    scores.monogram.score -= 10;
    scores.monogram.reasons.push('Short name doesn\'t need abbreviation');
  } else {
    // 6-12 chars: neutral, slight wordmark boost
    scores.wordmark.score += 5;
    scores.wordmark.reasons.push('Medium-length name works well as wordmark');
  }

  // ── Sector rules ──
  if (sector.includes('tech') || sector.includes('saas') || sector.includes('ai') || sector.includes('developer')) {
    scores.abstract_mark.score += 15;
    scores.abstract_mark.reasons.push('Tech/SaaS sector suits abstract marks');
    scores.icon_wordmark.score += 10;
    scores.icon_wordmark.reasons.push('Icon+text is common in tech branding');
    scores.mascot.score -= 15;
    scores.mascot.reasons.push('Mascots are uncommon in tech/SaaS');
  }

  if (sector.includes('food') || sector.includes('restaurant') || sector.includes('hospitality')) {
    scores.mascot.score += 15;
    scores.mascot.reasons.push('Food/hospitality brands often use mascots');
    scores.emblem.score += 10;
    scores.emblem.reasons.push('Emblem/crest suits artisanal food brands');
    scores.pictorial.score += 10;
    scores.pictorial.reasons.push('Pictorial icons work well for food brands');
  }

  if (sector.includes('luxury') || sector.includes('premium') || sector.includes('fashion')) {
    scores.wordmark.score += 15;
    scores.wordmark.reasons.push('Luxury brands favor elegant wordmarks');
    scores.monogram.score += 10;
    scores.monogram.reasons.push('Monograms convey exclusivity');
    scores.mascot.score -= 20;
    scores.mascot.reasons.push('Mascots undermine luxury positioning');
    scores.emblem.score += 5;
    scores.emblem.reasons.push('Emblems can convey heritage for luxury');
  }

  if (sector.includes('enterprise') || sector.includes('b2b') || sector.includes('finance') || sector.includes('legal') || sector.includes('consulting')) {
    scores.mascot.score -= 15;
    scores.mascot.reasons.push('Mascots are inappropriate for enterprise/B2B');
    scores.wordmark.score += 10;
    scores.wordmark.reasons.push('Professional wordmarks suit enterprise brands');
    scores.abstract_mark.score += 5;
    scores.abstract_mark.reasons.push('Abstract marks work for enterprise identity');
  }

  if (sector.includes('education') || sector.includes('non-profit')) {
    scores.emblem.score += 10;
    scores.emblem.reasons.push('Emblems suit educational institutions');
    scores.pictorial.score += 5;
    scores.pictorial.reasons.push('Pictorial marks aid recognition in education');
  }

  if (sector.includes('creative') || sector.includes('agency') || sector.includes('lifestyle')) {
    scores.dynamic.score += 10;
    scores.dynamic.reasons.push('Creative brands benefit from dynamic layouts');
    scores.abstract_mark.score += 5;
    scores.abstract_mark.reasons.push('Abstract marks express creativity');
  }

  if (sector.includes('healthcare') || sector.includes('biotech') || sector.includes('wellness')) {
    scores.pictorial.score += 10;
    scores.pictorial.reasons.push('Pictorial marks communicate care/wellness');
    scores.abstract_mark.score += 5;
    scores.abstract_mark.reasons.push('Abstract marks suit biotech innovation');
    scores.mascot.score -= 10;
    scores.mascot.reasons.push('Mascots can undermine healthcare trust');
  }

  if (sector.includes('e-commerce') || sector.includes('consumer') || sector.includes('d2c')) {
    scores.icon_wordmark.score += 10;
    scores.icon_wordmark.reasons.push('Icon+text is effective for e-commerce brands');
    scores.pictorial.score += 5;
    scores.pictorial.reasons.push('Recognizable icons help consumer brands');
  }

  // ── Aesthetic rules ──
  if (aesthetic.includes('minimal') || aesthetic.includes('precision') || aesthetic.includes('nordic') || aesthetic.includes('swiss')) {
    scores.emblem.score -= 10;
    scores.emblem.reasons.push('Emblems are inherently detailed, conflicts with minimal aesthetic');
    scores.mascot.score -= 10;
    scores.mascot.reasons.push('Mascots conflict with minimal aesthetic');
    scores.wordmark.score += 5;
    scores.wordmark.reasons.push('Wordmarks align with minimal aesthetic');
    scores.abstract_mark.score += 5;
    scores.abstract_mark.reasons.push('Clean abstract marks fit minimal aesthetic');
  }

  if (aesthetic.includes('heritage') || aesthetic.includes('classical') || aesthetic.includes('art deco')) {
    scores.emblem.score += 10;
    scores.emblem.reasons.push('Emblems suit heritage/classical aesthetics');
    scores.wordmark.score += 5;
    scores.wordmark.reasons.push('Refined wordmarks work with classical style');
  }

  if (aesthetic.includes('brutalist') || aesthetic.includes('bold') || aesthetic.includes('industrial')) {
    scores.wordmark.score += 10;
    scores.wordmark.reasons.push('Bold wordmarks suit brutalist/industrial style');
    scores.monogram.score += 5;
    scores.monogram.reasons.push('Monograms can be impactful in bold style');
  }

  // ── Convert scores to priority levels ──
  return ALL_STYLES.map(style => {
    const { score, reasons } = scores[style];
    let priority: 'high' | 'medium' | 'low';
    if (score >= 60) priority = 'high';
    else if (score >= 40) priority = 'medium';
    else priority = 'low';

    return {
      style,
      priority,
      reason: reasons.length > 0 ? reasons[0] : 'Standard style option',
    };
  });
}

/**
 * Get recommended styles filtered by priority.
 * Returns styles ordered: high priority first, then medium.
 */
export function getRecommendedStyles(brief: DesignBrief): LogoStyle[] {
  const recs = recommendStyles(brief);
  const high = recs.filter(r => r.priority === 'high').map(r => r.style);
  const medium = recs.filter(r => r.priority === 'medium').map(r => r.style);
  return [...high, ...medium];
}
