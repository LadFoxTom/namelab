import OpenAI from "openai";
import { ClaudeResponse } from "./types";

export async function generateDomainSuggestions(
  businessIdea: string,
  maxSuggestions: number = 15,
  tlds?: string[],
  includeWords?: string[],
  excludeWords?: string[],
  alreadyTried?: string[],
  minLength?: number,
  maxLength?: number
): Promise<ClaudeResponse> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `You are a world-class brand naming expert. Generate ${maxSuggestions} strong, professional domain name suggestions for this business idea: "${businessIdea}"

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "industry": "string",
  "suggestions": [
    {
      "domain": "example.com",
      "namingStrategy": "portmanteau|brandable|descriptive|keyword-rich|creative",
      "reasoning": "2-3 sentences explaining strategic value and what makes this name work for the business",
      "brandabilityScore": 85,
      "memorabilityScore": 90,
      "seoScore": 75
    }
  ]
}

DOMAIN NAME QUALITY RULES (CRITICAL — follow strictly):

1. USE ONLY STANDARD LETTERS. Never use hyphens, numbers, underscores, special characters, or accented characters in the domain name. Only a-z letters are allowed.
2. Keep it SHORT. Aim for under 15 characters (without TLD). Shorter is better — think "Stripe", "Notion", "Vercel", not "BestOnlineStore247".
3. EASY TO SPELL AND PRONOUNCE. If someone heard it on a podcast, they should be able to type it correctly on the first try. No creative misspellings (no "kandles", "jewlz", "kwik", "xtreme"). Use real, recognizable words or clean invented words.
4. AVOID FILLER WORDS. Do not use "my", "the", "our", "best", "top", "get", "go" as prefixes/suffixes unless they genuinely add meaning.
5. NO KEYWORD STUFFING. Never cram multiple keywords together like "BestPetGroomingInTown" or "CheapFlightsBookNow". Favor brand quality over exact-match keywords.
6. AVOID DOUBLE LETTERS at word boundaries (e.g., "presssetup", "teammedia"). These cause typos and confusion.
7. BRANDABLE AND MEMORABLE. Each suggestion should feel like a real brand name — something you'd see on a professional website, business card, or app store. Think "Shopify", "Canva", "NordVPN", "Figma" — not "xZyph" or "qwkbiz".
8. CLEAR AND THEMATICALLY RELEVANT. The name should give a sense of what the business does, or at least feel thematically aligned. A hint at the category or benefit is ideal (e.g., "FreshMeals" for meal delivery, "BredaInteriors" for a Breda-based interior designer).
9. FUTURE-PROOF. Avoid names that lock the business into a narrow niche, single city, or single product if the business might grow.
10. NO SCAMMY OR LOW-TRUST VIBES. Avoid names that look like spam, phishing, or throwaway sites. If a name looks like something you'd see in a suspicious email, don't suggest it.

NAMING STRATEGIES TO USE:
- Portmanteau: Blend two relevant words into a smooth new word (e.g., "Pinterest" = pin + interest, "Groupon" = group + coupon)
- Brandable invented word: Create a new word that sounds good and is easy to say (e.g., "Spotify", "Zillow", "Hulu")
- Descriptive compound: Combine two clear words that describe the offering (e.g., "Mailchimp", "Dropbox", "Salesforce")
- Modified real word: Take a real word and add a short prefix/suffix or tweak it slightly (e.g., "Shopify", "Grammarly", "Calendly")
- Evocative/metaphorical: Use a word that evokes the right feeling or metaphor (e.g., "Slack", "Notion", "Compass")

SCORING CRITERIA (be strict and varied — avoid clustering all scores between 75-85):

Brandability (0-100) — How strong is this as a brand?
- 90-100: Unique invented word, highly distinctive, no existing associations (e.g. "Spotify", "Zillow")
- 70-89: Strong brand potential, somewhat unique or clever combination
- 50-69: Decent but generic-sounding, could be confused with other brands
- 30-49: Very generic or hard to differentiate
- 0-29: Completely generic dictionary words with no brand identity

Memorability (0-100) — How easy to remember and type?
- 90-100: Short (≤6 chars), phonetically simple, one obvious spelling (e.g. "Uber", "Zoom")
- 70-89: Short-to-medium length, easy to spell, sounds catchy
- 50-69: Medium length, mostly intuitive spelling but might need repeating
- 30-49: Long or awkward to spell/pronounce
- 0-29: Very long, confusing spelling, easy to mistype

SEO Potential (0-100) — How well does it signal relevance to search engines?
- 90-100: Contains exact industry keyword in domain (e.g. "Hotels.com")
- 70-89: Contains partial keyword or strong semantic signal
- 50-69: Loosely related to the business concept
- 30-49: Abstract name, requires significant SEO effort
- 0-29: Completely unrelated to the business domain

IMPORTANT: Scores MUST vary significantly across suggestions. A brandable invented word should score high on brandability but low on SEO. A keyword-rich domain should score high on SEO but lower on brandability. Be honest and critical — not every domain deserves 80+.

${includeWords && includeWords.length > 0 ? `INCLUDE WORDS (MANDATORY — this is the most important rule):
Every single domain suggestion MUST contain at least one of the following words: ${includeWords.join(", ")}
The word must appear clearly in the domain — as a prefix (e.g., "CraftStudio"), suffix (e.g., "WallCraft"), root of a compound (e.g., "Craftify"), or naturally blended into a portmanteau (e.g., "Craftopia").
Do NOT generate any domain that does not contain one of these words. If a suggestion doesn't include one of these words, replace it with one that does. This is non-negotiable.` : ""}
${excludeWords && excludeWords.length > 0 ? `EXCLUDE WORDS (strict): NEVER use any of the following words (or close variations of them) in any domain suggestion: ${excludeWords.join(", ")}` : ""}
${minLength || maxLength ? `DOMAIN NAME LENGTH (strict — this applies to the name part ONLY, excluding the TLD dot and extension):${minLength ? `\n- Minimum ${minLength} characters (do NOT suggest any domain name shorter than ${minLength} characters before the TLD)` : ""}${maxLength ? `\n- Maximum ${maxLength} characters (do NOT suggest any domain name longer than ${maxLength} characters before the TLD)` : ""}` : ""}

Requirements:
- Mix different naming strategies (use at least 3 different strategies across suggestions)
- ONLY use these TLDs: ${tlds && tlds.length > 0 ? tlds.join(", ") : ".com, .io, .ai, .co, .net, .app, .nl, .dev, .xyz"}
- Strongly prioritize .com — at least half of suggestions should use .com${tlds && tlds.includes(".com") ? "" : " (if .com is in the allowed list)"}
- Keep domain names (without TLD) under 15 characters when possible
- Generate exactly ${maxSuggestions} suggestions
- Every suggestion must pass the "business card test" — would you be proud to print this domain on a professional business card?
${alreadyTried && alreadyTried.length > 0 ? `\nALREADY TRIED (do NOT suggest any of these again — they are taken or were already rejected): ${alreadyTried.join(", ")}` : ""}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText = completion.choices[0]?.message?.content || "";

  return JSON.parse(responseText);
}
