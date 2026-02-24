import OpenAI from "openai";

export interface KeywordExtraction {
  primaryKeywords: string[];
  emotionalTone: string;
  industryVertical: string;
  targetAudience: string;
}

export async function extractKeywords(
  businessIdea: string
): Promise<KeywordExtraction> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Analyze this business idea and extract semantic signals. Return ONLY valid JSON (no markdown, no code fences).

Business idea: "${businessIdea}"

Return this exact format:
{
  "primaryKeywords": ["keyword1", "keyword2", "keyword3"],
  "emotionalTone": "one word describing the emotional vibe (e.g. playful, professional, bold, calm, innovative)",
  "industryVertical": "the primary industry category (e.g. e-commerce, health, education, fintech)",
  "targetAudience": "brief description of target audience (e.g. young professionals, small businesses, developers)"
}`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content || "";
  try {
    return JSON.parse(text);
  } catch {
    return {
      primaryKeywords: [],
      emotionalTone: "professional",
      industryVertical: "general",
      targetAudience: "general audience",
    };
  }
}
