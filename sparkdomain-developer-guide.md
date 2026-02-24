# Sparkdomain — Comprehensive Developer Upgrade Guide

> Version 2.0 | Full redesign of scoring, generation, filtering, trademark checking, white-label API, and extended feature set.

---

## Table of Contents

1. [Scoring System Redesign](#1-scoring-system-redesign)
2. [Generation Engine Redesign](#2-generation-engine-redesign)
3. [Filter System Redesign](#3-filter-system-redesign)
4. [Trademark Checking — Robust Implementation](#4-trademark-checking)
5. [White-Label API](#5-white-label-api)
6. [Additional Features & Recommendations](#6-additional-features)
7. [Information Architecture Upgrades](#7-information-architecture-upgrades)
8. [Tech Stack Recommendations](#8-tech-stack-recommendations)

---

## 1. Scoring System Redesign

### Problem

The current scoring system produces a narrow band of results (typically 75–85 for all domains), making it useless for differentiation. The root causes are:

- GPT-4o self-scoring its own output (inherent upward bias)
- Vague rubrics that don't map to measurable signals
- No calibration against real-world data

### Design Principles for New Scoring

- **Scores must be computed, not generated** — no AI should score its own output without external validation anchors
- **Distribution should spread across the full 0–100 range** — enforce histogram normalization within a result set
- **Each metric must be derived from a measurable signal**, not a subjective label
- **Show the user WHY the score is what it is** — surface the individual signal breakdown

---

### New Scoring Architecture

Replace the current three-metric system with **five independently computed signals**, each with sub-signals. The overall score is a weighted composite.

---

#### 1.1 Linguistic Quality Score (LQS) — replaces Memorability

Measures how natural and "typeable" the name is. Computed entirely with code — no AI needed.

**Sub-signals:**

| Signal | How to compute | Weight |
|--------|---------------|--------|
| **Character length** | Linear scale: ≤5 chars = 100, 6 = 90, 7 = 80, 8 = 65, 9 = 50, 10 = 35, 11+ = 20 | 25% |
| **Syllable count** | Use `syllable` npm package: 1–2 syllables = 100, 3 = 75, 4 = 50, 5+ = 25 | 20% |
| **Consonant cluster penalty** | Count consecutive consonant runs ≥3: subtract 15 per cluster | 15% |
| **Vowel ratio** | vowels / total_chars. Ideal range 0.35–0.50. Distance from ideal penalized. | 15% |
| **Double-letter penalty** | Each doubled letter at word boundary = -10 (e.g., "presssetup") | 10% |
| **Pronounceability** | Run against CMU Pronouncing Dictionary or use `pronouncing` npm package; words with clear phoneme mapping = high score | 15% |

```typescript
import syllable from 'syllable';
import pronouncing from 'pronouncing';

function computeLQS(name: string): { score: number; breakdown: Record<string, number> } {
  const clean = name.toLowerCase().replace(/[^a-z]/g, '');

  // Length score
  const lengthMap: Record<number, number> = { 1: 50, 2: 70, 3: 85, 4: 95, 5: 100, 6: 90, 7: 80, 8: 65, 9: 50, 10: 35 };
  const lengthScore = lengthMap[clean.length] ?? 20;

  // Syllable score
  const syllables = syllable(clean);
  const syllableScore = syllables <= 2 ? 100 : syllables === 3 ? 75 : syllables === 4 ? 50 : 25;

  // Consonant cluster penalty
  const clusters = (clean.match(/[^aeiou]{3,}/g) || []).length;
  const clusterScore = Math.max(0, 100 - clusters * 15);

  // Vowel ratio
  const vowelCount = (clean.match(/[aeiou]/g) || []).length;
  const vowelRatio = vowelCount / clean.length;
  const idealVowelDist = Math.abs(vowelRatio - 0.42);
  const vowelScore = Math.max(0, 100 - idealVowelDist * 300);

  // Double letter at boundaries
  const doublePenalty = (clean.match(/(.)\1/g) || []).length;
  const doubleScore = Math.max(0, 100 - doublePenalty * 10);

  // Pronounceability via phoneme lookup
  const phones = pronouncing.phonesForWord(clean);
  const pronounceScore = phones.length > 0 ? 100 : 55; // known word = 100, unknown but guessable = 55

  const score = Math.round(
    lengthScore * 0.25 +
    syllableScore * 0.20 +
    clusterScore * 0.15 +
    vowelScore * 0.15 +
    doubleScore * 0.10 +
    pronounceScore * 0.15
  );

  return {
    score,
    breakdown: { lengthScore, syllableScore, clusterScore, vowelScore, doubleScore, pronounceScore }
  };
}
```

---

#### 1.2 Brand Distinctiveness Score (BDS) — replaces Brandability

Measures how differentiated the name is in a real market context. Uses external data, not AI opinion.

**Sub-signals:**

| Signal | Data source | How to compute | Weight |
|--------|------------|----------------|--------|
| **Trademark density** | USPTO/EUIPO search (see Section 4) | Number of existing trademark hits for this term. 0 hits = 100, 1–2 = 70, 3–5 = 40, 6+ = 10 | 30% |
| **Search result uniqueness** | Google Search API (Custom Search) | Query exact name in quotes. 0–100 results = 95, 101–1k = 80, 1k–10k = 60, 10k–100k = 40, 100k+ = 20 | 25% |
| **Common word penalty** | Check against en-US wordlist (wordlist-english npm) | Full dictionary word = 30, partial match = 65, no match = 100 | 20% |
| **Competitor name similarity** | Levenshtein distance against top 200 domain names in category | Min distance < 2 = 10, 2–3 = 50, 4+ = 90 | 15% |
| **TLD squatting signal** | Check how many TLD variants (.com/.io/.ai/.co/.net) are already registered | All 5 taken = 20 (saturated brand space), 4 = 40, 3 = 55, 2 = 75, 0–1 = 95 | 10% |

```typescript
import Levenshtein from 'levenshtein';
import wordlist from 'wordlist-english';

async function computeBDS(name: string, searchResults: number, trademarkHits: number, takenTlds: number): Promise<{ score: number; breakdown: Record<string, number> }> {
  const clean = name.toLowerCase();
  const englishWords = wordlist['english/10'];

  // Trademark score
  const tmScore = trademarkHits === 0 ? 100 : trademarkHits <= 2 ? 70 : trademarkHits <= 5 ? 40 : 10;

  // Search uniqueness
  const searchScore = searchResults < 100 ? 95 : searchResults < 1000 ? 80 : searchResults < 10000 ? 60 : searchResults < 100000 ? 40 : 20;

  // Common word check
  const isCommonWord = englishWords.includes(clean);
  const isPartialWord = englishWords.some(w => w.includes(clean) || clean.includes(w));
  const wordScore = isCommonWord ? 30 : isPartialWord ? 65 : 100;

  // TLD squatting signal
  const tldScore = takenTlds >= 5 ? 20 : takenTlds === 4 ? 40 : takenTlds === 3 ? 55 : takenTlds === 2 ? 75 : 95;

  const score = Math.round(
    tmScore * 0.30 +
    searchScore * 0.25 +
    wordScore * 0.20 +
    tldScore * 0.10
  );

  return { score, breakdown: { tmScore, searchScore, wordScore, tldScore } };
}
```

---

#### 1.3 SEO Signal Score (SSS) — replaces SEO Potential

Uses real keyword data instead of a subjective judgment call.

**Sub-signals:**

| Signal | Data source | How to compute | Weight |
|--------|------------|----------------|--------|
| **Keyword search volume** | Google Keyword Planner API or DataForSEO | Monthly search volume for the name itself and its component words | 35% |
| **Keyword competition** | DataForSEO / Semrush API | CPC competition metric (0–1). Lower competition for a high-volume term = better opportunity | 25% |
| **TLD authority weight** | Static lookup | .com = 100, .io/.ai = 75, .co/.app = 65, .net = 60, .dev = 55, .xyz = 40 | 20% |
| **Exact match domain signal** | String match between name and query intent keywords user provided | Word-level intersection with user's business description | 20% |

> **Note:** DataForSEO offers a cost-effective alternative to the Google Keyword Planner API for server-side usage, at roughly $0.002 per request. For MVP, cache all keyword lookups in Redis with a 30-day TTL to reduce cost dramatically.

---

#### 1.4 Commercial Viability Score (CVS) — NEW metric

Answers: "Is this name commercially practical to build a business around?"

**Sub-signals:**

| Signal | How to compute |
|--------|---------------|
| **Social handle availability** | Check Instagram, X, LinkedIn, TikTok handles (see Section 6) — each available handle = +20 points |
| **App store name availability** | Query Apple App Store and Google Play for exact name match — available on both = 100, one = 60, neither = 10 |
| **Scalability flag** | Static heuristic: if name contains highly niche terms (e.g., a city name, a single product type), penalize by 20 |
| **Scam/phishing pattern flag** | Run against blacklist patterns: names ending in -secure, -pay, -wallet, -verify, etc. = penalize 30 |

---

#### 1.5 Extensibility Score (EXS) — NEW metric

Answers: "Can this brand grow without the name becoming a liability?"

**Sub-signals:**

| Signal | How to compute |
|--------|---------------|
| **Niche lock-in** | NLP classification: does the name contain a hyper-specific product/service term? If yes, penalize (e.g., "ReactTemplates" is locked in) |
| **Cultural neutrality** | Cross-check against multilingual negative connotation databases (see Section 6) |
| **Pronunciation in 3 major languages** | Check via TTS API (Google TTS in EN/ES/DE/FR) — if the name sounds confusing or offensive in another language, flag it |
| **Future product line fit** | Score based on semantic breadth: generic/evocative names score higher than product-specific names |

---

#### 1.6 Score Distribution Normalization

**Critical**: After computing all scores in a result set, apply min-max normalization across the result set so that scores always span a meaningful range:

```typescript
function normalizeScoresAcrossResultSet(results: DomainResult[]): DomainResult[] {
  const metrics: (keyof Scores)[] = ['lqs', 'bds', 'sss', 'cvs', 'exs'];
  
  for (const metric of metrics) {
    const values = results.map(r => r.scores[metric]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    if (range < 15) {
      // Force spread: if all scores are too close together, apply rank-based redistribution
      const sorted = [...results].sort((a, b) => b.scores[metric] - a.scores[metric]);
      sorted.forEach((result, i) => {
        const spread = 100 - (i / (sorted.length - 1)) * 60; // Force 40-point spread minimum
        results.find(r => r.domain === result.domain)!.scores[metric] = Math.round(spread);
      });
    }
  }
  
  return results;
}
```

---

#### 1.7 Composite Score & Weighting

Let users set their **strategy profile** which adjusts weights:

| Profile | LQS | BDS | SSS | CVS | EXS |
|---------|-----|-----|-----|-----|-----|
| **Brand-first** (default) | 20% | 35% | 10% | 25% | 10% |
| **SEO-first** | 15% | 15% | 40% | 20% | 10% |
| **Startup / VC** | 20% | 25% | 10% | 20% | 25% |
| **Local business** | 25% | 20% | 30% | 15% | 10% |
| **Custom** | User-defined sliders |

Surface these as a toggle in the UI — "What matters most to you?" — not as a settings panel.

---

## 2. Generation Engine Redesign

### Problem

- Names cluster in style and feel; too many compound words
- Not enough truly brandable invented words
- The retry loop doesn't learn from what failed
- User has no insight into why suggestions were made

### 2.1 Multi-Strategy Parallel Generation

Instead of one GPT-4o call generating all names, run **parallel generation pipelines** each targeting a specific naming strategy, then merge and deduplicate results. This ensures style diversity across every result set.

```
User Input
    │
    ├─── Pipeline A: Portmanteau Generator
    ├─── Pipeline B: Invented Word Generator  
    ├─── Pipeline C: Compound / Descriptive Generator
    ├─── Pipeline D: Metaphor / Evocative Generator
    └─── Pipeline E: Modified Real Word Generator
            │
            ▼
    Deduplication + Quality Filter
            │
            ▼
    Availability Check (batched)
            │
            ▼
    Scoring Engine
            │
            ▼
    Ranked Results
```

Each pipeline is a separate prompt with strict output constraints. Request 3–4 names per pipeline to generate 15–20 candidates for a target of 6–9 results (accounting for taken domains).

**Pipeline A — Portmanteau:**
```
System: You are a brand naming specialist focusing exclusively on portmanteau domain names.
A portmanteau blends two conceptually relevant words into a new word that sounds natural and is easy to pronounce.

Rules:
- The blend must feel smooth when spoken aloud — no harsh consonant collisions at the join
- The result must be 5–10 characters
- Output ONLY the name, no extension, one per line
- No hyphens, numbers, or special characters
- Never suggest names already in this list: {{usedNames}}

Business concept: {{userInput}}
Keywords extracted: {{keywords}}

Generate exactly {{count}} portmanteau domain names.
```

**Pipeline B — Invented Word:**
```
System: You are a brand naming specialist creating invented brand words.
These are words that don't exist in any language but sound natural, memorable, and feel related to the business concept without being literal.
Study: Spotify (spot + modify feel), Zillow (invented, sounds techy/homey), Figma (invented, feels precise), Notion (real word but repurposed evocatively).

Rules:
- Must pass the "radio test" — someone hearing it once can spell it
- 4–8 characters
- Mix vowels and consonants naturally
- Avoid ending in hard stops (k, t, p) unless very short
- No existing English words
- Output ONLY the name, one per line

Business concept: {{userInput}}
Keywords extracted: {{keywords}}
Avoid: {{usedNames}}

Generate exactly {{count}} invented brand names.
```

Implement this pattern for all 5 pipelines.

---

### 2.2 Keyword Extraction Pre-Processing

Before calling any generation pipeline, extract semantic signals from the user's input:

```typescript
async function extractSemanticSignals(userInput: string): Promise<SemanticSignals> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: `Analyze this business description and extract naming signals.
      
      Business description: "${userInput}"
      
      Return JSON with:
      {
        "primaryKeywords": ["word1", "word2"],       // 2-4 core concepts
        "emotionalTone": "trustworthy|playful|bold|calm|energetic|sophisticated",
        "targetAudience": "consumers|businesses|developers|creatives|etc",
        "industryVertical": "fintech|healthtech|saas|ecommerce|etc",
        "languageRoots": ["latin", "greek", "germanic"],  // suggest which roots suit the brand
        "avoidConnotations": ["word1", "word2"],     // what NOT to evoke
        "brandPersonality": "descriptive sentence",
        "namingStrategy": ["portmanteau", "invented", "compound", "modified", "metaphor"] // rank by fit
      }`
    }]
  });
  
  return JSON.parse(response.choices[0].message.content!);
}
```

Pass `signals` to each pipeline so they're working with enriched context, not just the raw input string.

---

### 2.3 Smart Retry with Memory

Replace the naive retry loop with a **failure-aware generator** that learns from what didn't work:

```typescript
interface GenerationState {
  usedNames: Set<string>;
  takenDomains: Set<string>;
  lowQualityRejects: string[];
  successfulStrategies: string[];
  failedStrategies: string[];
}

async function generateWithMemory(
  signals: SemanticSignals,
  targetCount: number,
  tlds: string[]
): Promise<DomainResult[]> {
  const state: GenerationState = {
    usedNames: new Set(),
    takenDomains: new Set(),
    lowQualityRejects: [],
    successfulStrategies: [],
    failedStrategies: [],
  };
  
  const results: DomainResult[] = [];
  let iteration = 0;
  const maxIterations = 5;
  
  while (results.length < targetCount && iteration < maxIterations) {
    iteration++;
    
    // Adjust strategy weights based on what worked
    const strategyWeights = computeStrategyWeights(state, signals);
    
    // Generate a fresh batch using the adjusted strategy mix
    const candidates = await runParallelPipelines(signals, strategyWeights, state.usedNames, targetCount - results.length + 3);
    
    // Quality filter
    const qualityFiltered = candidates.filter(name => passesQualityGate(name, signals));
    qualityFiltered.forEach(n => state.usedNames.add(n));
    
    // Availability check (batched)
    const availabilityResults = await checkAvailabilityBatch(qualityFiltered, tlds);
    
    // Score the available ones
    for (const domain of availabilityResults.available) {
      const scored = await scoreDomain(domain, signals);
      results.push(scored);
      state.successfulStrategies.push(domain.strategy);
    }
    
    // Track failures for next iteration
    availabilityResults.taken.forEach(d => state.takenDomains.add(d.name));
  }
  
  return normalizeScoresAcrossResultSet(results).slice(0, targetCount);
}
```

---

### 2.4 Quality Gate (Pre-availability Check)

Run a fast, synchronous quality filter before hitting registrar APIs — this saves API calls:

```typescript
function passesQualityGate(name: string, signals: SemanticSignals): boolean {
  const clean = name.toLowerCase().replace(/[^a-z]/g, '');
  
  // Hard rejections
  if (clean.length < 4 || clean.length > 14) return false;
  if (/(.)\1{2}/.test(clean)) return false; // triple repeated chars
  if (/[^aeiou]{4,}/.test(clean)) return false; // 4+ consonants in a row
  if (['get', 'my', 'the', 'best', 'top', 'go'].some(w => clean.startsWith(w))) return false;
  
  // Scam pattern check
  const scamPatterns = ['secure', 'verify', 'wallet', 'pay', 'bank', 'login', 'signin'];
  if (scamPatterns.some(p => clean.includes(p))) return false;
  
  // Competitor similarity check (load from Redis cache of known brand names)
  const competitors = getTopBrandsForVertical(signals.industryVertical);
  const tooSimilar = competitors.some(c => levenshtein(clean, c.toLowerCase()) < 2);
  if (tooSimilar) return false;
  
  return true;
}
```

---

### 2.5 Naming Reasoning — Upgraded for Users

Each domain must come with **structured reasoning**, not a prose blob. Store and display:

```typescript
interface DomainReasoning {
  namingStrategy: 'portmanteau' | 'invented' | 'compound' | 'modified' | 'metaphor';
  strategyExplanation: string;       // Why this strategy fits this business
  etymologyBreakdown: string[];      // e.g., ["craft" (skill/making) + "opia" (place of)]
  targetAudienceFit: string;         // How the name resonates with the intended audience
  brandPositioning: string;          // What the name signals about the brand
  potentialWeaknesses: string[];     // Honest callouts: hard to spell in Spanish, etc.
  similarBrands: string[];           // Names in adjacent spaces that have a similar feel
}
```

This structured data lets you build a beautiful "name breakdown" UI card without relying on verbose GPT prose.

---

## 3. Filter System Redesign

### Problem

The current filters (include/exclude words, length, TLD, count) are too generic. Users don't know what they want in abstract — they need opinionated, curated filter dimensions that match how people actually think about brand names.

### 3.1 New Filter Architecture

Group filters into **three tiers**: Style, Constraints, and Intelligence.

---

#### Tier 1 — Naming Style Filters (NEW)

Replace the vague "naming strategy" concept with user-facing style selectors. These directly map to the AI pipelines:

**Tone:**
- [ ] Playful & Energetic (e.g., Zap, Zippy, Wobble)
- [ ] Professional & Trusted (e.g., Forge, Summit, Crest)
- [ ] Bold & Disruptive (e.g., Slash, Volt, Blaze)
- [ ] Calm & Sophisticated (e.g., Lume, Vela, Halo)
- [ ] Techy & Minimal (e.g., Plix, Novu, Zest)

**Name Structure:**
- [ ] Single invented word (e.g., Uber, Zoom, Figma)
- [ ] Two-word compound (e.g., Mailchimp, Dropbox)
- [ ] Portmanteau blend (e.g., Pinterest, Groupon)
- [ ] Word with suffix (-ify, -ly, -io, -hub, -ify, -lab, -ai)
- [ ] Word with prefix (re-, un-, co-, hyper-, meta-)

Implementation: Map each tone + structure selection to a modifier string appended to the pipeline prompt:
```typescript
const toneModifiers: Record<string, string> = {
  'playful': 'Names should feel fun, light, and approachable. Think short punchy words with open vowels.',
  'professional': 'Names should feel established and reliable. Prefer solid consonants and grounded words.',
  'bold': 'Names should feel powerful and forward-moving. Single sharp syllables or dynamic compounds.',
  'calm': 'Names should feel serene and premium. Soft sounds, flowing vowel sequences.',
  'techy': 'Names should feel modern and minimal. Crisp, clipped, engineered-sounding.'
};
```

---

#### Tier 2 — Constraint Filters (Enhanced)

**Character Length:** Keep min/max but add **presets** with labels:
- Short & punchy (4–6 chars)
- Sweet spot (6–9 chars)
- Descriptive (9–12 chars)
- Custom range

**Language / Origin Filter (NEW):**
Choose which linguistic root the name should feel like it comes from:
- Latin/Romance (flows smoothly, global feel)
- Greek (scientific, credible, -ology/-ikos patterns)
- Germanic (short, strong, direct)
- Made-up / no root (fully invented)
- Descriptive English (real words combined)

**Letter Pattern Filter (NEW):**
- Ends in a vowel (more international, easier to say globally)
- Starts with a strong consonant (B, D, F, G, K, P, S, T, V, Z rank highest for recall)
- Contains a specific letter(s) — for user who wants e.g. a name with "x" or "z"
- Avoid ending in -er, -ing, -tion (sounds generic)

**Industry Fit Filter (NEW):**
Pre-built keyword exclusion + style profiles per vertical:
- SaaS / Dev Tools
- E-commerce
- Fintech / Payments
- Health & Wellness
- Agency / Creative
- Food & Beverage
- Legal / Professional Services

Each preset loads industry-appropriate quality rules (e.g., fintech gets stricter scam-pattern filtering).

---

#### Tier 3 — Intelligence Filters (NEW)

These use the scoring engine to filter results, giving users score-based controls:

**Minimum Score Gates:**
Sliders for each of the 5 scoring dimensions. Only show results that meet the threshold:
```
Linguistic Quality      ────●──────  ≥ 65
Brand Distinctiveness   ──────●────  ≥ 70
SEO Signal              ────●──────  ≥ 50
Commercial Viability    ──●────────  ≥ 45
Extensibility           ───────●───  ≥ 75
```

**Trademark Safety Gate (NEW):**
- [ ] Only show names with 0 trademark conflicts
- [ ] Show names with ≤2 conflicts (user accepts minor risk)
- [ ] Show all, flag conflicts (no filtering)

**Social Handle Gate (NEW):**
- [ ] Only show names where .com + at least 2 social handles are available
- [ ] Only show names where all major socials are available

**Price Cap Filter:**
Set maximum registration price. Filter out names priced above threshold. Useful for filtering out premium-priced domains.

---

#### 3.2 Filter State Persistence

Store filter state in URL params so users can share a filtered search and bookmark it. Use a compact serialization:

```typescript
// Serialize filter state to URL
function serializeFilters(filters: FilterState): string {
  const params = new URLSearchParams({
    t: filters.tone.join(','),
    s: filters.structure.join(','),
    l: `${filters.minLength}-${filters.maxLength}`,
    tlds: filters.tlds.join(','),
    inc: filters.includeWords.join(','),
    exc: filters.excludeWords.join(','),
    origin: filters.languageOrigin,
    tmSafe: filters.trademarkSafe ? '1' : '0',
    minLQS: String(filters.minLQS),
    minBDS: String(filters.minBDS),
  });
  return params.toString();
}
```

---

## 4. Trademark Checking

### Architecture Overview

A robust trademark checker must:
1. Check multiple jurisdictions (at minimum: US, EU, UK)
2. Handle both exact and fuzzy/phonetic matches
3. Not be a hard block — always surface context so users can make informed decisions
4. Be fast enough to run inline (target: <2s per check)
5. Cache aggressively to stay within API rate limits

---

### 4.1 Data Sources

| Source | Coverage | Access | Cost |
|--------|----------|--------|------|
| **USPTO TESS** | United States | REST API (free, no key required) | Free |
| **EUIPO TMview** | European Union | REST API | Free |
| **WIPO Global Brand Database** | International (180+ countries) | REST API | Free |
| **UK IPO** | United Kingdom | REST API | Free |
| **TrademarkNow API** | Global, AI-powered fuzzy matching | Commercial API | ~$0.05/check |
| **Markify** | US + EU, phonetic matching | Commercial API | Subscription |

**Recommendation for MVP:** Use WIPO + USPTO (both free), add TrademarkNow for phonetic matching. This gives you >90% of what a paid trademark attorney would check first.

---

### 4.2 Trademark Checker Implementation

```typescript
// types/trademark.ts
export interface TrademarkResult {
  name: string;
  jurisdiction: 'US' | 'EU' | 'UK' | 'INT';
  registrationNumber: string;
  owner: string;
  class: number;           // Nice Classification (1–45)
  className: string;       // e.g., "Computer software, SaaS"
  status: 'registered' | 'pending' | 'abandoned' | 'expired';
  filingDate: string;
  matchType: 'exact' | 'phonetic' | 'similar';
  similarity: number;      // 0–100
  conflictRisk: 'high' | 'medium' | 'low';
  trademarkUrl: string;    // direct link to official record
}

export interface TrademarkCheckResult {
  domain: string;
  checkedAt: string;
  isExactMatch: boolean;
  hasConflicts: boolean;
  riskLevel: 'clear' | 'caution' | 'conflict';
  results: TrademarkResult[];
  disclaimer: string;
}
```

```typescript
// lib/trademark/checker.ts
import { redis } from '../redis';

const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days — trademark data changes slowly

export async function checkTrademark(name: string, niceClasses: number[] = [9, 35, 42]): Promise<TrademarkCheckResult> {
  const cacheKey = `tm:${name.toLowerCase()}:${niceClasses.sort().join(',')}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const [usptoResults, wipoResults, euipoResults] = await Promise.allSettled([
    checkUSPTO(name, niceClasses),
    checkWIPO(name, niceClasses),
    checkEUIPO(name, niceClasses),
  ]);
  
  const allResults: TrademarkResult[] = [
    ...(usptoResults.status === 'fulfilled' ? usptoResults.value : []),
    ...(wipoResults.status === 'fulfilled' ? wipoResults.value : []),
    ...(euipoResults.status === 'fulfilled' ? euipoResults.value : []),
  ];
  
  const exactMatches = allResults.filter(r => r.matchType === 'exact' && r.status === 'registered');
  const phoneticMatches = allResults.filter(r => r.matchType === 'phonetic' && r.status === 'registered');
  
  const riskLevel = exactMatches.length > 0 ? 'conflict' : phoneticMatches.length > 0 ? 'caution' : 'clear';
  
  const result: TrademarkCheckResult = {
    domain: name,
    checkedAt: new Date().toISOString(),
    isExactMatch: exactMatches.length > 0,
    hasConflicts: allResults.some(r => r.status === 'registered'),
    riskLevel,
    results: allResults,
    disclaimer: 'This is not legal advice. Trademark availability should be confirmed by a qualified attorney before commercial use.',
  };
  
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
  return result;
}
```

---

### 4.3 USPTO API Integration

```typescript
async function checkUSPTO(name: string, classes: number[]): Promise<TrademarkResult[]> {
  // USPTO TESS search via the public search API
  // Endpoint: https://developer.uspto.gov/api-catalog/tmsearch
  
  const searchRequests = [
    // Exact word mark search
    fetch(`https://tsdrapi.uspto.gov/ts/cd/casesearchbyvalue/${encodeURIComponent(name)}/json`),
    // Contains search
    fetch(`https://developer.uspto.gov/ibd-api/v1/trademark/wordmark/${encodeURIComponent(name)}?rows=10&start=0`)
  ];
  
  const responses = await Promise.allSettled(searchRequests);
  const results: TrademarkResult[] = [];
  
  for (const response of responses) {
    if (response.status !== 'fulfilled' || !response.value.ok) continue;
    const data = await response.value.json();
    
    if (data.trademarkResponses) {
      for (const tm of data.trademarkResponses) {
        const niceClass = parseInt(tm.intlClass?.split(',')[0] || '0');
        if (!classes.includes(niceClass) && classes.length > 0) continue;
        
        results.push({
          name: tm.wordMark || tm.markVerbalElementText,
          jurisdiction: 'US',
          registrationNumber: tm.serialNumber || tm.registrationNumber,
          owner: tm.applicantName || tm.ownerName,
          class: niceClass,
          className: tm.goodsServicesDescription?.substring(0, 100),
          status: mapUSPTOStatus(tm.statusCode),
          filingDate: tm.filingDate,
          matchType: tm.wordMark?.toLowerCase() === name.toLowerCase() ? 'exact' : 'similar',
          similarity: tm.wordMark?.toLowerCase() === name.toLowerCase() ? 100 : calculateSimilarity(name, tm.wordMark),
          conflictRisk: determineConflictRisk(tm, name),
          trademarkUrl: `https://tsdr.uspto.gov/#caseNumber=${tm.serialNumber}&caseSearchType=US_APPLICATION&caseType=DEFAULT&searchType=statusSearch`,
        });
      }
    }
  }
  
  return results;
}
```

---

### 4.4 WIPO Global Brand Database Integration

```typescript
async function checkWIPO(name: string, classes: number[]): Promise<TrademarkResult[]> {
  const url = `https://branddb.wipo.int/api/search?query=${encodeURIComponent(name)}&_type=trademark&rows=20`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });
  
  if (!response.ok) return [];
  const data = await response.json();
  
  return (data.docs || []).map((doc: any) => ({
    name: doc.wm || doc.mark_text,
    jurisdiction: 'INT',
    registrationNumber: doc.an || doc.registrationnumber,
    owner: doc.holder_name || doc.applicant_name,
    class: parseInt(doc.vienna_code?.split('.')[0] || '0'),
    className: doc.gs || '',
    status: doc.status === 'REGISTERED' ? 'registered' : 'pending',
    filingDate: doc.app_date,
    matchType: (doc.wm || '').toLowerCase() === name.toLowerCase() ? 'exact' : 'similar',
    similarity: calculateSimilarity(name, doc.wm || ''),
    conflictRisk: 'medium',
    trademarkUrl: `https://branddb.wipo.int/en/showbrand?source=${doc.source}&id=${doc.id}`,
  }));
}
```

---

### 4.5 Phonetic Similarity for "Near Miss" Detection

Use the Double Metaphone algorithm to catch phonetically similar trademarks — e.g., "Spotifye" would still conflict with "Spotify":

```typescript
import { doubleMetaphone } from 'double-metaphone';
import { jellyfish } from 'jelly-fish'; // Jaro-Winkler distance

function calculatePhoneticSimilarity(name1: string, name2: string): number {
  const [primary1] = doubleMetaphone(name1);
  const [primary2] = doubleMetaphone(name2);
  
  // Exact phonetic match
  if (primary1 === primary2) return 100;
  
  // Jaro-Winkler on phonetic codes
  const phoneticSimilarity = jellyfish.jaroWinklerDistance(primary1, primary2) * 100;
  
  // Also check visual similarity
  const visualSimilarity = jellyfish.jaroWinklerDistance(name1.toLowerCase(), name2.toLowerCase()) * 100;
  
  return Math.max(phoneticSimilarity, visualSimilarity);
}
```

---

### 4.6 Trademark Risk UI Display

Do NOT just show a green/red indicator. Surface actionable context:

```
⚠️ CAUTION — 2 trademark results found

  ✗  SPOTIFY AB — "SPOTIFX" (Phonetically similar)
     Class 9 & 38 · Registered · US + EU · 2009
     Risk: Medium — different word, same sound
     [View official record ↗]

  ⚠  SPOTWISE INC — "SPOTWISE" (Contains "SPOT")  
     Class 42 · Pending · US only · 2023
     Risk: Low — different industry (consulting)
     [View official record ↗]

  This is not legal advice. Consult a trademark attorney before launch.
  [Find a trademark attorney ↗]  (affiliate or partner opportunity)
```

---

### 4.7 Nice Classification Auto-Detect

Automatically infer which trademark classes are relevant based on the user's business description:

```typescript
async function inferNiceClasses(businessDescription: string): Promise<number[]> {
  // Use GPT-4o to classify
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Use mini for cost savings on classification tasks
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: `Given this business description, return the most relevant Nice Classification trademark classes (1-45).
      Return JSON: { "classes": [9, 35, 42], "reasoning": "brief explanation" }
      
      Typical tech classes: 9 (software), 35 (business/advertising), 38 (telecom), 42 (SaaS/tech services)
      
      Business: "${businessDescription}"`
    }]
  });
  
  const { classes } = JSON.parse(response.choices[0].message.content!);
  return classes;
}
```

---

## 5. White-Label API

### Architecture

The white-label API should be a proper multi-tenant SaaS layer on top of the core Sparkdomain engine, with:
- Tenant isolation (each API key maps to a tenant with its own settings, branding, and rate limits)
- Configurable output (filter which fields are returned)
- Webhook support for async generation
- Usage metering for billing
- White-label widget embeds

---

### 5.1 Database Schema (Multi-Tenant)

```sql
-- Tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan ENUM('starter', 'growth', 'enterprise') NOT NULL DEFAULT 'starter',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}'
);

-- API keys (each tenant can have multiple keys)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  key_hash VARCHAR(64) UNIQUE NOT NULL,   -- sha256 hash of the actual key
  key_prefix VARCHAR(12) NOT NULL,         -- e.g., "sk_live_aBc1" shown in UI
  label VARCHAR(255),
  scopes TEXT[] DEFAULT ARRAY['generate', 'check', 'score'],
  rate_limit_per_minute INT DEFAULT 60,
  rate_limit_per_day INT DEFAULT 1000,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Usage logs for billing
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  api_key_id UUID REFERENCES api_keys(id),
  endpoint VARCHAR(255),
  domains_generated INT DEFAULT 0,
  domains_checked INT DEFAULT 0,
  trademark_checks INT DEFAULT 0,
  latency_ms INT,
  status_code INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant branding config (for widget embed)
CREATE TABLE tenant_branding (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  logo_url TEXT,
  primary_color VARCHAR(7),
  font_family VARCHAR(100),
  custom_css TEXT,
  hide_sparkdomain_branding BOOLEAN DEFAULT FALSE,  -- enterprise only
  allowed_origins TEXT[]  -- CORS origins for widget embed
);
```

---

### 5.2 API Endpoint Design

**Base URL:** `https://api.sparkdomain.io/v1`

**Authentication:** Bearer token in `Authorization` header.

```
Authorization: Bearer sk_live_aBc123...
```

---

**POST /generate**

Generate available domain suggestions.

```typescript
// Request
{
  "query": "AI-powered project management tool for remote teams",
  "options": {
    "count": 6,                          // 1–20
    "tlds": [".com", ".io", ".ai"],
    "style": {
      "tone": ["professional", "techy"],
      "structure": ["invented", "portmanteau"]
    },
    "filters": {
      "minLength": 5,
      "maxLength": 10,
      "includeWords": ["flow"],
      "excludeWords": ["task"],
      "trademarkSafe": true,
      "minScores": {
        "lqs": 60,
        "bds": 65
      }
    },
    "scoringProfile": "startup",
    "includeScores": true,
    "includeReasoning": true,
    "includeTrademark": true,
    "includeSocialHandles": false
  }
}

// Response
{
  "requestId": "req_abc123",
  "generatedAt": "2025-02-24T12:00:00Z",
  "query": "AI-powered project management...",
  "results": [
    {
      "domain": "flowmint.io",
      "tld": ".io",
      "available": true,
      "pricing": {
        "registrar": "Namecheap",
        "price": 32.98,
        "currency": "USD",
        "registrationUrl": "https://namecheap.com/..."
      },
      "scores": {
        "lqs": 88,
        "bds": 74,
        "sss": 52,
        "cvs": 81,
        "exs": 79,
        "composite": 76,
        "profile": "startup"
      },
      "reasoning": {
        "namingStrategy": "portmanteau",
        "etymologyBreakdown": ["flow (movement, productivity)", "mint (fresh, create, perfect)"],
        "brandPositioning": "Signals smooth, effortless creation with a fresh energy.",
        "potentialWeaknesses": ["'mint' may evoke finance/money in some markets"]
      },
      "trademark": {
        "riskLevel": "clear",
        "results": [],
        "checkedAt": "2025-02-24T12:00:01Z"
      }
    }
  ],
  "usage": {
    "domainsGenerated": 6,
    "trademarkChecks": 6,
    "remainingDailyQuota": 994
  }
}
```

---

**POST /check**

Check availability of specific domains.

```typescript
// Request
{
  "domains": ["flowmint.com", "flowmint.io", "flowmint.ai"],
  "includeScores": true,
  "includePricing": true
}
```

---

**GET /score/{domain}**

Score any domain, even ones not generated by Sparkdomain.

```
GET /score/flowmint.io?profile=startup&businessDescription=AI project management
```

---

**POST /trademark/{name}**

Standalone trademark check.

```typescript
// Request
{
  "name": "flowmint",
  "jurisdictions": ["US", "EU"],
  "classes": [9, 35, 42]
}
```

---

**POST /webhooks**

Register a webhook for async generation jobs.

```typescript
{
  "url": "https://yourapp.com/webhooks/sparkdomain",
  "events": ["generation.completed", "trademark.checked"],
  "secret": "your_webhook_secret"
}
```

---

### 5.3 Authentication Middleware

```typescript
// middleware/apiAuth.ts
import { createHash } from 'crypto';
import { redis } from '../lib/redis';
import { db } from '../lib/db';

export async function apiAuthMiddleware(req: Request): Promise<{ tenantId: string; keyId: string; scopes: string[] } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const rawKey = authHeader.slice(7);
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  
  // Check Redis cache first (avoid DB on every request)
  const cacheKey = `apikey:${keyHash}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  // DB lookup
  const apiKey = await db.apiKey.findUnique({
    where: { keyHash, isActive: true },
    include: { tenant: true }
  });
  
  if (!apiKey || (apiKey.expiresAt && apiKey.expiresAt < new Date())) return null;
  
  const keyData = {
    tenantId: apiKey.tenantId,
    keyId: apiKey.id,
    scopes: apiKey.scopes,
    rateLimit: { perMinute: apiKey.rateLimitPerMinute, perDay: apiKey.rateLimitPerDay }
  };
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(keyData));
  
  // Update last used (fire and forget)
  db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  
  return keyData;
}
```

---

### 5.4 Rate Limiting

Use a sliding window rate limiter backed by Redis:

```typescript
// lib/rateLimiter.ts
export async function checkRateLimit(keyId: string, limits: { perMinute: number; perDay: number }): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const minuteKey = `rl:min:${keyId}:${Math.floor(now / 60000)}`;
  const dayKey = `rl:day:${keyId}:${Math.floor(now / 86400000)}`;
  
  const [minuteCount, dayCount] = await redis.mget(minuteKey, dayKey);
  
  const currentMinute = parseInt(minuteCount || '0');
  const currentDay = parseInt(dayCount || '0');
  
  if (currentMinute >= limits.perMinute || currentDay >= limits.perDay) {
    return {
      allowed: false,
      remaining: Math.max(0, limits.perMinute - currentMinute),
      resetAt: Math.ceil(now / 60000) * 60000
    };
  }
  
  // Increment counters
  const pipeline = redis.pipeline();
  pipeline.incr(minuteKey);
  pipeline.expire(minuteKey, 120);
  pipeline.incr(dayKey);
  pipeline.expire(dayKey, 172800);
  await pipeline.exec();
  
  return {
    allowed: true,
    remaining: limits.perMinute - currentMinute - 1,
    resetAt: Math.ceil(now / 60000) * 60000
  };
}
```

---

### 5.5 Embeddable Widget

Provide a drop-in JavaScript widget that white-label customers can embed on their own sites:

```html
<!-- Drop-in embed code (customer places on their site) -->
<div id="sparkdomain-widget"></div>
<script 
  src="https://cdn.sparkdomain.io/widget/v1/embed.js"
  data-key="pk_live_tenantPublicKey"
  data-theme="light"
  data-tlds=".com,.io,.ai"
  data-count="6"
  data-lang="en"
></script>
```

The widget is a self-contained React bundle that calls the tenant's Sparkdomain API key, respects tenant branding, and can fire events that the host site can listen to:

```javascript
// Host site can listen to widget events
window.addEventListener('sparkdomain:domainSelected', (e) => {
  console.log('User selected:', e.detail.domain, e.detail.pricing);
  // Redirect to your checkout, pre-fill a form, etc.
});
```

---

### 5.6 API Developer Portal

Build a dedicated developer portal at `developers.sparkdomain.io` with:
- Interactive API playground (request builder + live responses)
- Auto-generated SDK documentation (use openapi-typescript-codegen)
- Usage dashboard with daily/monthly charts
- Webhook event log
- API key management

Generate an OpenAPI 3.1 spec and use it to auto-generate SDKs for Node.js, Python, and PHP:

```bash
npx openapi-typescript-codegen \
  --input ./openapi.yaml \
  --output ./sdk/node \
  --client fetch \
  --name SparkdomainClient
```

---

## 6. Additional Features

### 6.1 Social Handle Availability Checker

Check username availability across major platforms simultaneously. Since most social platforms don't offer official APIs for this, use a reliable head-request check against profile URLs with respectful rate limiting:

```typescript
const platforms = [
  { name: 'Instagram', url: (h: string) => `https://www.instagram.com/${h}/`, selector: 'meta[property="og:title"]' },
  { name: 'X / Twitter', url: (h: string) => `https://x.com/${h}`, selector: 'meta[name="twitter:title"]' },
  { name: 'TikTok', url: (h: string) => `https://www.tiktok.com/@${h}`, selector: 'title' },
  { name: 'LinkedIn', url: (h: string) => `https://www.linkedin.com/company/${h}`, selector: 'title' },
  { name: 'YouTube', url: (h: string) => `https://www.youtube.com/@${h}`, selector: 'title' },
  { name: 'GitHub', url: (h: string) => `https://github.com/${h}`, apiCheck: true }, // GitHub has a public API
];

async function checkSocialHandles(handle: string): Promise<SocialHandleResult[]> {
  const results = await Promise.allSettled(
    platforms.map(async (platform) => {
      // Use GitHub API for GitHub
      if (platform.apiCheck) {
        const res = await fetch(`https://api.github.com/users/${handle}`);
        return { platform: platform.name, available: res.status === 404, handle };
      }
      
      // For others, HEAD request check
      const res = await fetch(platform.url(handle), { method: 'HEAD', redirect: 'follow' });
      return { platform: platform.name, available: res.status === 404, handle };
    })
  );
  
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as PromiseFulfilledResult<SocialHandleResult>).value);
}
```

> **Note:** Social platform URL-based checks are fragile and may break. Consider using Checkr API or namecheckr as a managed alternative. Always cache results aggressively (24h TTL) and build a fallback.

---

### 6.2 Multilingual Connotation Checker

Names that sound great in English can mean something offensive or awkward in other languages. This is a real brand risk (see: Mitsubishi Pajero in Spanish-speaking markets).

```typescript
const offensiveTermsByLanguage: Record<string, string[]> = {
  es: ['puta', 'mierda', 'culo', 'pedo', 'caca', 'polla', 'coño', /* etc */],
  de: ['fick', 'scheiß', 'arsch', /* etc */],
  fr: ['merde', 'con', 'bite', 'cul', /* etc */],
  nl: ['kut', 'lul', 'fuck', 'klote', /* etc */],
  pt: ['porra', 'merda', 'foda', /* etc */],
};

async function checkMultilingualConnotations(name: string): Promise<ConnotationWarning[]> {
  const warnings: ConnotationWarning[] = [];
  const nameLower = name.toLowerCase();
  
  // Static offensive pattern check
  for (const [lang, terms] of Object.entries(offensiveTermsByLanguage)) {
    for (const term of terms) {
      if (nameLower.includes(term)) {
        warnings.push({ language: lang, term, severity: 'high', type: 'offensive' });
      }
    }
  }
  
  // AI-powered check for subtle issues (run only if static check passes)
  if (warnings.length === 0) {
    const aiCheck = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `Check if the word "${name}" has any negative, offensive, or awkward connotations in Spanish, French, German, Dutch, Portuguese, Italian, or Japanese.
        Return JSON: { "warnings": [{ "language": "es", "concern": "brief description", "severity": "low|medium|high" }] }
        Return empty warnings array if no issues found.`
      }]
    });
    const { warnings: aiWarnings } = JSON.parse(aiCheck.choices[0].message.content!);
    warnings.push(...aiWarnings);
  }
  
  return warnings;
}
```

---

### 6.3 Name History & Collections

Let users build and manage collections of favorite domains across sessions:

**Schema:**
```sql
CREATE TABLE user_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE collection_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES user_collections(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  tld VARCHAR(20),
  scores JSONB,
  trademark_status VARCHAR(20),
  pricing JSONB,
  notes TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ
);
```

**Features:**
- Share a collection via public link (`sparkdomain.io/c/aBc123`)
- Compare 2–5 saved domains side-by-side in a comparison table
- Set a "watch" on a domain — get email notification if a taken domain becomes available (requires WHOIS expiry monitoring)
- Export collection to CSV/PDF for client presentations

---

### 6.4 Domain Expiry Monitoring

Many valuable domains are simply not renewed and drop. Monitor expiry for taken domains:

```typescript
// Use WhoisXML API or DomainTools for expiry data
async function getExpiryDate(domain: string): Promise<Date | null> {
  const response = await fetch(
    `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${process.env.WHOISXML_KEY}&domainName=${domain}&outputFormat=JSON`
  );
  const data = await response.json();
  const expiryDate = data.WhoisRecord?.registryData?.expiresDate;
  return expiryDate ? new Date(expiryDate) : null;
}

// Cron job: daily check of watched domains
async function checkWatchedDomains() {
  const watched = await db.watchedDomain.findMany({
    where: { isAvailable: false, notifyOnAvailable: true }
  });
  
  for (const domain of watched) {
    const available = await checkAvailability(domain.domain);
    if (available) {
      await sendAvailabilityNotification(domain);
      await db.watchedDomain.update({
        where: { id: domain.id },
        data: { isAvailable: true, becameAvailableAt: new Date() }
      });
    }
  }
}
```

---

### 6.5 AI Domain Consultant Mode

Add a conversational mode where users can refine results through dialogue, not just filters. This is a full chat interface alongside the results:

```
User: "I like 'flowmint' but I want something less nature-y and more techy"
AI:   "Got it — removing nature words, pushing more toward clipped tech syllables. 
       Generating in the style of 'flowmint' but with a sharper, more engineered feel..."
       
       → plixa.io, vortiq.ai, nexlo.io
```

Implement by maintaining a `refinementHistory` array and injecting it into the generation prompt, along with the domain results the user has reacted to.

---

### 6.6 Premium Aftermarket Domain Search

Integrate GoDaddy Auctions and Afternic APIs to surface premium/expired domains that exactly match quality criteria, alongside freshly registered ones. Users often don't know expired domains are an option.

```typescript
async function searchAftermarket(keywords: string[], budget: number): Promise<AftermarketDomain[]> {
  const [godaddyResults, afternicResults, sedoResults] = await Promise.allSettled([
    searchGoDaddyAuctions(keywords, budget),
    searchAfternic(keywords, budget),
    searchSedo(keywords, budget)
  ]);
  
  // Merge, deduplicate, and sort by value score
  const all = [
    ...(godaddyResults.status === 'fulfilled' ? godaddyResults.value : []),
    ...(afternicResults.status === 'fulfilled' ? afternicResults.value : []),
    ...(sedoResults.status === 'fulfilled' ? sedoResults.value : []),
  ];
  
  return all
    .filter((d, i, arr) => arr.findIndex(x => x.domain === d.domain) === i) // deduplicate
    .sort((a, b) => b.valueScore - a.valueScore);
}
```

---

### 6.7 Bulk Generation for Agencies

Allow agency users to generate domains for multiple clients/projects in a single session:

- **Project mode**: Each search is saved as a named "project" with its own search history
- **Batch export**: Generate a branded PDF report of domain options for client delivery
- **Client sharing**: Share a read-only results page with client (no login required)
- **Markup pricing**: Agency can set a custom price markup on shown domain prices

---

### 6.8 Analytics Dashboard (for White-Label customers)

```typescript
// API endpoint for analytics
GET /v1/analytics/summary?from=2025-01-01&to=2025-02-01

{
  "generationsTotal": 1240,
  "uniqueSearches": 892,
  "domainsGenerated": 7440,
  "domainsClicked": 342,       // click-through to registrar
  "clickThroughRate": "4.6%",
  "topSearchedIndustries": ["saas", "ecommerce", "fintech"],
  "topTLDs": [".com", ".io", ".ai"],
  "averageScoreByTLD": { ".com": 71, ".io": 68, ".ai": 74 },
  "trademarkConflictRate": "8.2%",
  "affiliateRevenue": 142.50    // enterprise plan only
}
```

---

## 7. Information Architecture Upgrades

### 7.1 Result Card Redesign

Each domain card should communicate more information at a glance. New card anatomy:

```
┌─────────────────────────────────────────────────────┐
│  flowmint.io                          [Save] [Buy →] │
│  ──────────────────────────────────────────────────  │
│  Portmanteau  ·  Techy  ·  $32.98/yr               │
│                                                     │
│  ████████░░  LQS  88    ████████░░  CVS  81         │
│  ███████░░░  BDS  74    ███████░░░  EXS  79         │
│  █████░░░░░  SSS  52                                │
│                                                     │
│  ✅ Trademark clear  ·  📱 3/5 socials free         │
│  ⚠️  .com is taken — see TLD matrix                 │
└─────────────────────────────────────────────────────┘
```

### 7.2 Score Explanation Tooltips

Every score bar should have a tooltip explaining exactly why it scored that way:

```
LQS: 88 — "6 characters, 2 syllables, easy vowel-consonant balance, clean phonetics"
BDS: 74 — "0 trademark hits, 340 Google results (unique space), not a dictionary word"
SSS: 52 — "No exact keyword match, .io TLD reduces SEO weight, moderate semantic fit"
```

### 7.3 Generation Progress Transparency

Show users what's happening during generation — not just a spinner:

```
Analyzing your business description...       ✅
Extracting semantic signals...               ✅
Running 5 naming strategy pipelines...       ✅ (generated 18 candidates)
Quality filtering...                         ✅ (12 passed)
Checking availability across 3 registrars... ✅ (7 available)
Running trademark checks...                  ✅ (6 clear, 1 caution)
Scoring with your Startup profile...         ✅
Normalizing results...                       ✅

Found 6 quality domains in 4.2 seconds
```

This transparency builds trust and reduces perceived wait time.

---

## 8. Tech Stack Recommendations

### Core Stack

| Layer | Recommended | Notes |
|-------|-------------|-------|
| **Framework** | Next.js 15 (App Router) | API routes for backend, React for UI |
| **Database** | PostgreSQL (via Neon or Supabase) | Serverless-compatible |
| **ORM** | Prisma | Type-safe, good migration tooling |
| **Cache / Rate limit** | Redis (Upstash) | Serverless Redis, generous free tier |
| **Auth** | Clerk or Auth.js v5 | Clerk for speed, Auth.js for control |
| **AI** | OpenAI SDK + Vercel AI SDK | Streaming support, easy model switching |
| **Queue** | Inngest | Reliable async jobs without infra (trademark checks, monitoring) |
| **Email** | Resend | Modern, developer-friendly |
| **Billing** | Stripe | For API tier subscriptions |
| **Analytics** | PostHog | Self-hostable, event tracking, feature flags |
| **Monitoring** | Sentry + Axiom | Error tracking + structured log search |
| **CDN** | Cloudflare | Also use for edge caching of RDAP/WHOIS calls |

### Key Third-Party APIs

| Purpose | Service | Est. cost |
|---------|---------|-----------|
| Domain availability | Namecheap RDAP (free), GoDaddy API, NameSilo | $0–5/mo |
| SEO keyword data | DataForSEO | ~$20/mo at moderate volume |
| Trademark (US) | USPTO (free) | $0 |
| Trademark (Global) | WIPO (free) | $0 |
| Trademark (Phonetic) | TrademarkNow | ~$50/mo |
| Social handle check | Checkr.io or namecheckr | $20–50/mo |
| WHOIS / expiry | WhoisXML API | $20/mo |
| Multilingual TTS | Google Cloud TTS | ~$5/mo |
| Custom Search (brand uniqueness) | Google Custom Search API | $5/1000 queries |

### Caching Strategy

| Data type | TTL | Store |
|-----------|-----|-------|
| Domain availability | 15 minutes | Redis |
| Trademark results | 7 days | Redis + PostgreSQL |
| Keyword/SEO scores | 30 days | PostgreSQL |
| Social handles | 24 hours | Redis |
| WHOIS expiry dates | 24 hours | Redis |
| API key lookups | 5 minutes | Redis |
| Score breakdowns | 1 hour | Redis |

---

## Summary — Priority Implementation Order

For maximum impact in minimum time, implement in this order:

1. **Scoring redesign** (LQS + BDS computed from code) — immediate visible quality improvement, no external APIs needed
2. **Filter system redesign** (Tone + Structure selectors) — directly reduces user frustration with output quality
3. **Multi-pipeline generation** (parallel strategies) — higher name diversity and quality
4. **Trademark checking** (USPTO + WIPO free tier) — high-value differentiator, no cost
5. **Social handle availability** — rounds out the "full brand namespace" check
6. **Score normalization + progress transparency** — polish that converts users
7. **Collections + history** — retention feature
8. **White-label API** — revenue expansion, build after core product is solid
9. **Aftermarket search** — high-margin affiliate opportunity
10. **Domain expiry monitoring** — engagement/retention feature

---

*This guide is intended as a living document. Each section maps to an independent development workstream and can be prioritized independently.*
