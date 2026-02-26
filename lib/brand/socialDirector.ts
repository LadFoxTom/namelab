import OpenAI from 'openai';
import { DesignBrief } from './strategist';
import { BrandSignals } from './signals';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SocialStrategy {
  platformStrategies: {
    platform: string;
    mood: string;
    taglineUsage: boolean;
    domainUsage: boolean;
  }[];
  contentThemes: {
    category: 'profile' | 'banner' | 'post' | 'og';
    approach: string;
    backgroundStyle: string;
  }[];
  typographyOverlay: {
    taglineOnBanners: boolean;
    domainOnOgImages: boolean;
    taglineText: string;
    textPlacement: 'bottom-left' | 'center' | 'bottom-center';
    textStyle: 'bold' | 'light' | 'caps';
  };
  backgroundTreatments: {
    profile: 'solid';
    banner: string;
    post: string;
    og: string;
  };
}

export async function generateSocialStrategy(
  brief: DesignBrief,
  signals: BrandSignals
): Promise<SocialStrategy> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a social media brand director. Given a brand brief, output a JSON social media strategy that drives visual consistency across platforms.

Return JSON with this exact structure:
{
  "platformStrategies": [
    { "platform": "instagram|twitter|linkedin|facebook|youtube|tiktok", "mood": "string", "taglineUsage": boolean, "domainUsage": boolean }
  ],
  "contentThemes": [
    { "category": "profile|banner|post|og", "approach": "string describing the visual approach", "backgroundStyle": "solid|gradient|pattern|editorial" }
  ],
  "typographyOverlay": {
    "taglineOnBanners": boolean,
    "domainOnOgImages": boolean,
    "taglineText": "the brand tagline to overlay",
    "textPlacement": "bottom-left|center|bottom-center",
    "textStyle": "bold|light|caps"
  },
  "backgroundTreatments": {
    "profile": "solid",
    "banner": "gradient|pattern|editorial|minimal",
    "post": "gradient|pattern|editorial|minimal",
    "og": "gradient|pattern|editorial"
  }
}

Rules:
- Profile icons ALWAYS use "solid" background (logo must be recognizable at tiny sizes)
- Banners should feel expansive and brand-rich — gradient or pattern work well
- OG images need strong contrast for link previews — gradient or editorial
- Posts vary by platform mood
- taglineText should be the brand's tagline (from the brief)
- Be opinionated — every choice should reinforce the brand aesthetic`
        },
        {
          role: 'user',
          content: `Brand: "${brief.brandName}"
Tagline: "${brief.tagline}"
Sector: ${brief.sectorClassification}
Aesthetic: ${brief.aestheticDirection}
Tension: ${brief.tensionPair}
Target audience: ${brief.targetAudienceSummary}
Personality: ${signals.brandPersonality}
Industry: ${signals.industry}`
        }
      ]
    });

    const parsed = JSON.parse(response.choices[0].message.content!);

    return {
      platformStrategies: parsed.platformStrategies || [],
      contentThemes: parsed.contentThemes || [],
      typographyOverlay: {
        taglineOnBanners: parsed.typographyOverlay?.taglineOnBanners ?? true,
        domainOnOgImages: parsed.typographyOverlay?.domainOnOgImages ?? true,
        taglineText: parsed.typographyOverlay?.taglineText || brief.tagline || '',
        textPlacement: parsed.typographyOverlay?.textPlacement || 'bottom-left',
        textStyle: parsed.typographyOverlay?.textStyle || 'bold',
      },
      backgroundTreatments: {
        profile: 'solid',
        banner: parsed.backgroundTreatments?.banner || 'gradient',
        post: parsed.backgroundTreatments?.post || 'gradient',
        og: parsed.backgroundTreatments?.og || 'editorial',
      },
    };
  } catch (error) {
    console.error('Social strategy generation failed, using defaults:', error);
    return {
      platformStrategies: [],
      contentThemes: [],
      typographyOverlay: {
        taglineOnBanners: true,
        domainOnOgImages: true,
        taglineText: brief.tagline || '',
        textPlacement: 'bottom-left',
        textStyle: 'bold',
      },
      backgroundTreatments: {
        profile: 'solid',
        banner: 'gradient',
        post: 'gradient',
        og: 'editorial',
      },
    };
  }
}
