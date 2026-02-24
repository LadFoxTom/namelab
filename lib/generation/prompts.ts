import { ToneFilter, StructureFilter, LengthPreset } from "@/lib/types";

export const TONE_MODIFIERS: Record<ToneFilter, string> = {
  playful:
    "Names should feel fun, light, and approachable. Think quirky combinations, friendly sounds, and names that make people smile. Examples: Figma, Dribbble, Loom.",
  professional:
    "Names should feel established and reliable. Think clean, corporate-appropriate names that convey trust and authority. Examples: Stripe, Linear, Notion.",
  bold:
    "Names should feel powerful and forward-moving. Think strong consonants, short punchy words, and names that command attention. Examples: Bolt, Vercel, Forge.",
  calm:
    "Names should feel serene and premium. Think soft vowels, flowing syllables, and names that evoke tranquility. Examples: Calm, Aura, Breeze.",
  techy:
    "Names should feel modern and minimal. Think clean invented words, tech suffixes, and names that feel like cutting-edge software. Examples: Supabase, Deno, Bun.",
};

export const STRUCTURE_MODIFIERS: Record<StructureFilter, string> = {
  invented:
    "Generate entirely new invented words that don't exist in any dictionary. They should sound natural, be easy to pronounce, and feel like they could be real words. Examples: Spotify, Zillow, Hulu.",
  compound:
    "Combine two real, recognizable words into a single domain. Both words should be clearly identifiable. Examples: Mailchimp, Dropbox, Salesforce.",
  portmanteau:
    "Blend two words into smooth portmanteaus where parts of each word merge seamlessly. Examples: Pinterest (pin+interest), Groupon (group+coupon), Brandfetch (brand+fetch).",
  suffix:
    "Take real words and add suffixes like -ify, -ly, -io, -hub, -lab, -ful, -ness, -able. Examples: Shopify, Grammarly, Calendly.",
  prefix:
    "Take real words and add prefixes like re-, un-, co-, hyper-, meta-, super-, neo-. Examples: Codecov, Replit, Coinbase.",
};

export function resolveLengthPreset(
  preset: LengthPreset
): { min: number; max: number } | null {
  switch (preset) {
    case "short":
      return { min: 4, max: 6 };
    case "sweet-spot":
      return { min: 6, max: 9 };
    case "descriptive":
      return { min: 9, max: 12 };
    case "custom":
      return null; // use raw min/max from user
  }
}

export function buildTonePrompt(tones: ToneFilter[]): string {
  if (tones.length === 0) return "";
  const lines = tones.map((t) => TONE_MODIFIERS[t]);
  return `\nTONE GUIDANCE:\n${lines.join("\n")}\n`;
}

export function buildStructurePrompt(structures: StructureFilter[]): string {
  if (structures.length === 0) return "";
  const lines = structures.map((s) => STRUCTURE_MODIFIERS[s]);
  return `\nNAMING STRUCTURE CONSTRAINTS (ONLY use these strategies):\n${lines.join("\n")}\n`;
}
