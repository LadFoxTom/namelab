# Sparkdomain — AI Domain Name Generator

Sparkdomain is an AI-powered domain name generator that uses semantic reasoning to suggest brandable, available domain names tailored to your business idea. Every suggestion is validated against registrar databases in real-time, so you never fall in love with a name that's already taken.

---

## How It Works

1. **Describe your project** — Enter a business idea, concept, or description in natural language.
2. **AI generates names** — GPT-4o analyzes your input and generates domain suggestions using proven naming strategies (portmanteaus, brandable invented words, descriptive compounds, modified real words, and evocative metaphors).
3. **Real-time availability check** — Every suggestion is cross-checked against multiple domain registrars simultaneously.
4. **Scored and ranked** — Each domain receives scores for brandability, memorability, and SEO potential.
5. **Buy with one click** — Available domains link directly to registrars for instant purchase.

### Iterative Generation

Sparkdomain uses an intelligent retry loop to maximize results. If the first batch of AI-generated names are mostly taken, it automatically generates more — up to 3 iterations — while tracking previously tried names to avoid duplicates. This ensures you consistently get the number of available domains you asked for.

### Direct Domain Lookup

If you type a specific domain name (like `coolshop.com`) instead of a business description, Sparkdomain switches to lookup mode — checking that exact name across all selected TLDs and showing availability and pricing from each registrar.

---

## Filters

### TLD Selection

Choose which top-level domains to include in your results. Supported TLDs:

| TLD   | Description         |
|-------|---------------------|
| .com  | Commercial (default, prioritized) |
| .io   | Tech / startups     |
| .ai   | Artificial intelligence |
| .co   | Company / Colombia  |
| .net  | Network             |
| .app  | Applications        |
| .nl   | Netherlands         |
| .dev  | Developers          |
| .xyz  | Generic / modern    |

By default, all TLDs are enabled. At least half of AI suggestions will use `.com` when it's in the selected list.

### Include Words

Force the AI to include specific words in every domain suggestion. The word can appear as a prefix (`CraftStudio`), suffix (`WallCraft`), root of a compound (`Craftify`), or blended into a portmanteau (`Craftopia`). Every suggestion must contain at least one of the specified words.

### Exclude Words

Prevent specific words (or close variations) from appearing in any suggestion. Useful for avoiding terms associated with competitors, unwanted connotations, or overused buzzwords.

### Name Length (Min / Max)

Set minimum and/or maximum character counts for the domain name (excluding the TLD). For example, setting min=4 and max=8 ensures all suggestions have names between 4 and 8 characters before the `.com` (or other extension).

### Domain Count

Choose how many available domains to generate: **3**, **6**, or **9** per search.

---

## Scoring System

Every AI-generated domain is scored on three dimensions, each rated 0–100. The overall score is the average of all three.

### Score Scale

| Range | Rating      | Meaning                               |
|-------|-------------|---------------------------------------|
| 90+   | Exceptional | Best-in-class for this metric         |
| 80+   | Strong      | Performs very well                     |
| 70+   | Good        | Solid with minor trade-offs           |
| 60+   | Decent      | Noticeable weaknesses                 |
| <60   | Weak        | Significant limitations               |

### Brandability (0–100)

*How strong is this name as a brand?*

Evaluates uniqueness, emotional resonance, visual identity, and market positioning.

- **90–100**: Unique invented word, highly distinctive, no existing associations (e.g., Spotify, Zillow, Figma)
- **70–89**: Strong brand potential, somewhat unique or clever combination
- **50–69**: Decent but generic-sounding, could be confused with other brands
- **30–49**: Very generic or hard to differentiate
- **0–29**: Completely generic dictionary words with no brand identity

### Memorability (0–100)

*How easy is it to remember, spell, and share?*

Evaluates name length (ideal: under 8 characters), pronunciation clarity, spelling intuitiveness, and the "radio test" — could someone type it correctly after hearing it once?

- **90–100**: Short (6 characters or fewer), phonetically simple, one obvious spelling (e.g., Uber, Zoom, Stripe)
- **70–89**: Short-to-medium length, easy to spell, sounds catchy
- **50–69**: Medium length, mostly intuitive spelling but might need repeating
- **30–49**: Long or awkward to spell/pronounce
- **0–29**: Very long, confusing spelling, easy to mistype

### SEO Potential (0–100)

*How well does the domain signal relevance to search engines?*

Evaluates keyword presence, semantic relevance, TLD weight (`.com` ranks higher; niche TLDs like `.ai` and `.dev` suit specific industries), and search intent match.

- **90–100**: Contains exact industry keyword in domain (e.g., Hotels.com)
- **70–89**: Contains partial keyword or strong semantic signal
- **50–69**: Loosely related to the business concept
- **30–49**: Abstract name, requires significant SEO effort
- **0–29**: Completely unrelated to the business domain

### Trade-offs

No single domain excels at all three metrics. Scores are designed to vary:

- A **brandable invented word** (like "Zillow") scores high on brandability but low on SEO.
- A **keyword-rich domain** (like "PetSupplies.com") scores high on SEO but lower on brandability.
- Users can choose their strategy: **brand-first**, **SEO-first**, or **balanced**.

---

## Registrar Integrations

Sparkdomain checks availability and pricing across three registrars simultaneously:

| Registrar | Method | Notes |
|-----------|--------|-------|
| **Namecheap** | RDAP (Registration Data Access Protocol) | Free, no authentication required |
| **GoDaddy** | GoDaddy API v1 | Batch availability check with individual fallback |
| **NameSilo** | NameSilo XML API | Parsed via XML |

For each available domain, the cheapest registrar is highlighted. Users can expand a "Compare registrars" view to see all providers with pricing, and click through to purchase via affiliate links.

---

## Naming Strategies

The AI uses five proven naming strategies and mixes at least three per generation:

| Strategy | Description | Examples |
|----------|-------------|----------|
| **Portmanteau** | Blend two relevant words into a smooth new word | Pinterest (pin + interest), Groupon (group + coupon) |
| **Brandable invented word** | A new word that sounds good and is easy to say | Spotify, Zillow, Hulu |
| **Descriptive compound** | Two clear words that describe the offering | Mailchimp, Dropbox, Salesforce |
| **Modified real word** | A real word with a short prefix/suffix or tweak | Shopify, Grammarly, Calendly |
| **Evocative / metaphorical** | A word that evokes the right feeling | Slack, Notion, Compass |

---

## Quality Rules

Every suggested domain must pass these quality checks:

- **Standard letters only** — no hyphens, numbers, underscores, or special characters
- **Short** — under 15 characters (without TLD) when possible
- **Easy to spell and pronounce** — no creative misspellings (no "kandles", "kwik", "xtreme")
- **No filler words** — avoids "my", "the", "best", "top", "get", "go" unless they add genuine meaning
- **No keyword stuffing** — favors brand quality over exact-match keywords
- **No double letters at word boundaries** — avoids typo-prone combinations like "presssetup"
- **Business card test** — every name should look professional enough to print on a business card
- **Future-proof** — avoids names that lock the business into a narrow niche
- **No scammy vibes** — nothing that looks like spam or phishing

---

## Domain Detail Page

Clicking on any domain opens a detail page showing:

- Full domain name with naming strategy badge
- AI reasoning explaining the strategic value
- Score breakdown with visual bars for all three metrics
- **TLD availability matrix** — the same base name checked across all major TLDs (.com, .io, .ai, .co, .net, .app, .nl, .dev, .xyz, .org), showing which extensions are available and their pricing
- Purchase links for each available TLD variant

---

## Sort and Filter Results

After generation, results can be filtered and sorted:

- **Filter by TLD** — show only `.com`, `.io`, `.ai`, etc.
- **Sort by Top Score** — highest overall score first (default)
- **Sort by Lowest Price** — cheapest registration first
- **Sort by A–Z** — alphabetical order
- **Regenerate** — get a fresh set of suggestions for the same prompt
- **More like this** — generate new domains in the style of a specific result
