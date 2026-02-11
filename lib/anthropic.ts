import OpenAI from "openai";
import { ClaudeResponse } from "./types";

export async function generateDomainSuggestions(
  businessIdea: string,
  maxSuggestions: number = 15,
  tlds?: string[]
): Promise<ClaudeResponse> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `Generate ${maxSuggestions} creative domain name suggestions for this business idea: "${businessIdea}"

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

Requirements:
- Mix different naming strategies
- ONLY use these TLDs: ${tlds && tlds.length > 0 ? tlds.join(", ") : ".com, .io, .ai, .co, .net, .app, .nl, .dev, .xyz"}
- Distribute suggestions across the allowed TLDs${tlds && tlds.includes(".com") ? ", prioritizing .com" : ""}
- Keep domain names (without TLD) under 15 characters when possible
- Generate exactly ${maxSuggestions} suggestions`;

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
