import OpenAI from 'openai';
import { GeneratedConcept } from './generate';
import { LogoStyle } from './prompts';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ScoredConcept extends GeneratedConcept {
  score: number;
  reasoning: string;
}

export async function selectBestConcepts(
  candidates: GeneratedConcept[]
): Promise<GeneratedConcept[]> {
  const byStyle = candidates.reduce<Record<string, GeneratedConcept[]>>(
    (acc, c) => {
      if (!acc[c.style]) acc[c.style] = [];
      acc[c.style].push(c);
      return acc;
    },
    {}
  );

  const selected: GeneratedConcept[] = [];

  for (const [style, group] of Object.entries(byStyle)) {
    if (group.length === 1) {
      selected.push(group[0]);
      continue;
    }

    const scored = await scoreConceptsWithVision(group);
    const best = scored.sort((a, b) => b.score - a.score)[0];
    selected.push(best);
  }

  return selected;
}

async function scoreConceptsWithVision(
  concepts: GeneratedConcept[]
): Promise<ScoredConcept[]> {
  const imageContent = concepts.map((c, i) => ({
    type: 'image_url' as const,
    image_url: { url: c.imageUrl, detail: 'low' as const },
  }));

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are a professional brand designer. Score each of these ${concepts.length} logo concepts from 0-100 based on:
- Professional quality and clean execution
- Logo usability (would work at small sizes, clear edges, not photorealistic)
- Visual distinctiveness
- Design coherence

Return JSON array: [{"index": 0, "score": 85, "reasoning": "brief"}, ...]
Penalize heavily: photorealistic elements, complex scenes, unclear edges, overly detailed imagery.
Reward: clean vector-style, geometric clarity, scalable forms.`
          },
          ...imageContent,
        ],
      }
    ],
  });

  const content = response.choices[0].message.content!;
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return concepts.map(c => ({ ...c, score: 50, reasoning: '' }));

  const scores: Array<{ index: number; score: number; reasoning: string }> = JSON.parse(jsonMatch[0]);
  return concepts.map((c, i) => ({
    ...c,
    score: scores.find(s => s.index === i)?.score ?? 50,
    reasoning: scores.find(s => s.index === i)?.reasoning ?? '',
  }));
}
