import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface BrandSignals {
  domainName: string;
  tone: 'playful' | 'professional' | 'bold' | 'calm' | 'techy' | 'sophisticated';
  subTone: string;
  colorDirection: ColorDirection;
  iconStyle: 'minimal' | 'geometric' | 'organic' | 'abstract' | 'lettermark' | 'mascot';
  industry: string;
  targetAudience: string;
  brandPersonality: string;
  avoidElements: string[];
  suggestedKeywords: string[];
}

export interface ColorDirection {
  primary: string;
  mood: string;
  avoid: string;
  paletteStyle: 'monochromatic' | 'analogous' | 'complementary' | 'triadic';
}

export async function extractBrandSignals(
  domainName: string,
  searchQuery: string,
  userPreferences?: Partial<BrandSignals>
): Promise<BrandSignals> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a brand strategist. Extract brand signals from a domain name and business description to guide logo and visual identity creation. Return only valid JSON.`
      },
      {
        role: 'user',
        content: `
Domain name: "${domainName}"
Business description: "${searchQuery}"
${userPreferences ? `User style preferences: ${JSON.stringify(userPreferences)}` : ''}

Return a JSON object matching this TypeScript interface exactly:
{
  "domainName": string,
  "tone": "playful" | "professional" | "bold" | "calm" | "techy" | "sophisticated",
  "subTone": string,
  "colorDirection": {
    "primary": string,       // descriptive color (e.g. "deep ocean blue")
    "mood": string,
    "avoid": string,
    "paletteStyle": "monochromatic" | "analogous" | "complementary" | "triadic"
  },
  "iconStyle": "minimal" | "geometric" | "organic" | "abstract" | "lettermark" | "mascot",
  "industry": string,
  "targetAudience": string,
  "brandPersonality": string,
  "avoidElements": string[],
  "suggestedKeywords": string[]  // 3-5 visual metaphors for the brand
}

Be specific and opinionated. A domain like "flowmint" should suggest teal/mint colors, flowing geometric shapes, SaaS context.`
      }
    ]
  });

  const parsed = JSON.parse(response.choices[0].message.content!);
  return { ...parsed, domainName };
}
