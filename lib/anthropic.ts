import OpenAI from "openai";
import { ClaudeResponse } from "./types";

export async function generateDomainSuggestions(
  businessIdea: string,
  maxSuggestions: number = 15
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
      "reasoning": "2-3 sentences explaining strategic value",
      "brandabilityScore": 85,
      "memorabilityScore": 90,
      "seoScore": 75
    }
  ]
}

Requirements:
- Mix different naming strategies
- Only .com domains
- Keep domains under 15 characters when possible
- Scores should be 0-100
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
