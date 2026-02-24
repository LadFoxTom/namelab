import OpenAI from "openai";
import { DomainSuggestion, StructureFilter } from "@/lib/types";
import { KeywordExtraction } from "./keyword-extract";

interface PipelineConfig {
  id: string;
  label: string;
  matchesStructure: StructureFilter[];
  count: number;
  promptFragment: string;
}

const PIPELINES: PipelineConfig[] = [
  {
    id: "portmanteau",
    label: "Portmanteau",
    matchesStructure: ["portmanteau"],
    count: 4,
    promptFragment:
      "Focus ONLY on portmanteau names: blend two relevant words into smooth new words where parts of each word merge seamlessly. Examples: Pinterest (pin+interest), Groupon (group+coupon).",
  },
  {
    id: "invented",
    label: "Invented Word",
    matchesStructure: ["invented"],
    count: 4,
    promptFragment:
      "Focus ONLY on invented words: create entirely new words that don't exist in any dictionary but sound natural and easy to pronounce. Examples: Spotify, Zillow, Hulu.",
  },
  {
    id: "compound",
    label: "Compound/Descriptive",
    matchesStructure: ["compound"],
    count: 4,
    promptFragment:
      "Focus ONLY on compound/descriptive names: combine two real, recognizable words into a single domain. Both words should be clearly identifiable. Examples: Mailchimp, Dropbox, Salesforce.",
  },
  {
    id: "metaphor",
    label: "Metaphor/Evocative",
    matchesStructure: [],
    count: 3,
    promptFragment:
      "Focus ONLY on metaphorical/evocative names: use real words that evoke the right feeling or metaphor for the business. Examples: Slack, Notion, Compass, Bloom.",
  },
  {
    id: "modified",
    label: "Modified Real Word",
    matchesStructure: ["suffix", "prefix"],
    count: 3,
    promptFragment:
      "Focus ONLY on modified real words: take real words and add suffixes (-ify, -ly, -io, -hub, -lab) or prefixes (re-, un-, co-, hyper-, meta-). Examples: Shopify, Grammarly, Calendly.",
  },
];

function buildPipelinePrompt(
  pipeline: PipelineConfig,
  businessIdea: string,
  keywords: KeywordExtraction,
  tlds: string[],
  includeWords?: string[],
  excludeWords?: string[],
  alreadyTried?: string[],
  minLength?: number,
  maxLength?: number,
  toneModifier?: string
): string {
  const tldList = tlds.length > 0 ? tlds.join(", ") : ".com, .io, .ai, .co, .net, .app, .nl, .dev, .xyz";

  return `You are a world-class brand naming expert. Generate ${pipeline.count} domain name suggestions for this business idea: "${businessIdea}"

CONTEXT (extracted from the business description):
- Primary keywords: ${keywords.primaryKeywords.join(", ") || "N/A"}
- Emotional tone: ${keywords.emotionalTone}
- Industry: ${keywords.industryVertical}
- Target audience: ${keywords.targetAudience}

${pipeline.promptFragment}
${toneModifier || ""}

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "suggestions": [
    {
      "domain": "example.com",
      "namingStrategy": "${pipeline.label.toLowerCase()}",
      "reasoning": "2-3 sentences explaining strategic value",
      "brandabilityScore": 85,
      "seoScore": 75
    }
  ]
}

DOMAIN NAME QUALITY RULES:
1. Only a-z letters, no hyphens, numbers, special characters
2. Keep under 15 characters (without TLD)
3. Easy to spell and pronounce
4. No filler words (my, the, our, best, top, get, go)
5. Brandable and memorable
6. No scam patterns (secure, verify, wallet, pay, bank, login)

SCORING (Brandability 0-100, SEO 0-100 — be strict and varied):
- Brandability: How distinctive as a brand? Invented words score high. Generic words score low.
- SEO: How well does it signal relevance to search engines?

${includeWords && includeWords.length > 0 ? `INCLUDE WORDS (MANDATORY): Every domain MUST contain at least one of: ${includeWords.join(", ")}` : ""}
${excludeWords && excludeWords.length > 0 ? `EXCLUDE WORDS: NEVER use: ${excludeWords.join(", ")}` : ""}
${minLength ? `Minimum ${minLength} characters (before TLD)` : ""}
${maxLength ? `Maximum ${maxLength} characters (before TLD)` : ""}

ONLY use these TLDs: ${tldList}
Prioritize .com — at least half should use .com.
${alreadyTried && alreadyTried.length > 0 ? `ALREADY TRIED (do NOT reuse): ${alreadyTried.join(", ")}` : ""}`;
}

export function selectPipelines(structures?: StructureFilter[]): PipelineConfig[] {
  if (!structures || structures.length === 0) return PIPELINES;

  return PIPELINES.filter(
    (p) =>
      p.matchesStructure.length === 0 ||
      p.matchesStructure.some((s) => structures.includes(s))
  );
}

export async function runPipelines(
  activePipelines: PipelineConfig[],
  businessIdea: string,
  keywords: KeywordExtraction,
  tlds: string[],
  includeWords?: string[],
  excludeWords?: string[],
  alreadyTried?: string[],
  minLength?: number,
  maxLength?: number,
  toneModifier?: string
): Promise<DomainSuggestion[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const promises = activePipelines.map(async (pipeline) => {
    const prompt = buildPipelinePrompt(
      pipeline,
      businessIdea,
      keywords,
      tlds,
      includeWords,
      excludeWords,
      alreadyTried,
      minLength,
      maxLength,
      toneModifier
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0]?.message?.content || "";
    const parsed = JSON.parse(text);
    const suggestions: DomainSuggestion[] = (parsed.suggestions || []).map(
      (s: Record<string, unknown>) => ({
        domain: s.domain as string,
        namingStrategy: (s.namingStrategy as string) || pipeline.label.toLowerCase(),
        reasoning: s.reasoning as string,
        brandabilityScore: (s.brandabilityScore as number) || 70,
        memorabilityScore: 0, // will be set by LQS
        seoScore: (s.seoScore as number) || 50,
      })
    );
    return suggestions;
  });

  const results = await Promise.allSettled(promises);
  const allSuggestions: DomainSuggestion[] = [];
  const seenDomains = new Set<string>();

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const suggestion of result.value) {
        const key = suggestion.domain.toLowerCase();
        if (!seenDomains.has(key)) {
          seenDomains.add(key);
          allSuggestions.push(suggestion);
        }
      }
    } else {
      console.error("[Pipeline] Failed:", result.reason);
    }
  }

  return allSuggestions;
}
