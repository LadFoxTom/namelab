import { BrandSignals } from './signals';

export type LogoStyle = 'wordmark' | 'icon_wordmark' | 'monogram' | 'abstract_mark';

export function buildLogoPrompt(style: LogoStyle, signals: BrandSignals): string {
  const base = `
Professional logo design for "${signals.domainName}", white background, vector-style graphic,
clean edges, ${signals.colorDirection.primary} color scheme, ${signals.tone} aesthetic.
No photorealism. Flat design or minimal gradient only. Suitable for business cards and screens.
Centered composition. No drop shadows. High contrast.
Avoid: ${signals.avoidElements.join(', ')}, ${signals.colorDirection.avoid}.
`.trim();

  const styleInstructions: Record<LogoStyle, string> = {
    wordmark: `
${base}
Style: Clean typographic wordmark. The text "${signals.domainName}" rendered in a custom,
distinctive typeface. ${signals.subTone} character. No icon — typography only.
The letterforms should feel ${signals.tone}, with careful attention to spacing and weight.
Font style: ${signals.tone === 'techy' ? 'geometric sans-serif' : signals.tone === 'sophisticated' ? 'refined serif' : 'modern sans-serif'}.
    `.trim(),

    icon_wordmark: `
${base}
Style: Minimal icon mark placed to the left of or above the text "${signals.domainName}".
Icon concept: ${signals.suggestedKeywords.slice(0, 2).join(' or ')}, simplified to geometric shapes.
Icon must work as standalone symbol. Text in clean sans-serif.
${signals.iconStyle} icon style. Total composition should feel balanced and professional.
    `.trim(),

    monogram: `
${base}
Style: Monogram lettermark using the letters "${signals.domainName.slice(0, 2).toUpperCase()}".
Geometric interlocking or stacked letterforms. Bold, distinctive, memorable.
Works at small sizes. ${signals.tone} character. Single or two-color maximum.
    `.trim(),

    abstract_mark: `
${base}
Style: Abstract brand mark — a non-literal symbol that evokes ${signals.brandPersonality}.
Concepts to explore: ${signals.suggestedKeywords.join(', ')}.
${signals.iconStyle} approach. No text in the mark itself.
Should feel unique and ownable. Geometric or organic form.
    `.trim(),
  };

  return styleInstructions[style];
}
