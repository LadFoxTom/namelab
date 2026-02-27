# Sparkdomain Brand Studio — Complete Reference

> Full technical and UX documentation of the AI-powered brand identity platform.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Workflow](#2-user-workflow)
3. [Frontend Components](#3-frontend-components)
4. [API Endpoints](#4-api-endpoints)
5. [AI Agent Pipeline](#5-ai-agent-pipeline)
6. [Brand Kit Contents](#6-brand-kit-contents)
7. [Database Schema](#7-database-schema)
8. [External Services](#8-external-services)
9. [File Architecture](#9-file-architecture)

---

## 1. Product Overview

Sparkdomain Brand Studio is an AI-powered brand identity generator that creates professional logo concepts, color palettes, typography systems, social media kits, and brand guidelines — all from a domain name and a brief description.

### Core Value Proposition

- Enter a domain/brand name → get up to 8 AI-generated logo concepts in ~30 seconds
- Select a concept → instantly build a 100+ file brand kit (ZIP download)
- Refine concepts with text feedback or one-click presets
- Purchase tiers: Logo Only (€12), Brand Kit (€29), Brand Kit Pro (€59)

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL via Prisma ORM |
| Image Generation | fal.ai (Flux Schnell for generation, Flux Kontext for refinement) |
| AI Evaluation | OpenAI GPT-4o-mini (vision) |
| AI Strategy | OpenAI GPT-4o |
| Image Processing | Sharp (Node.js) |
| Storage | Cloudflare R2 (S3-compatible) |
| Payments | Stripe Checkout |
| Background Jobs | Inngest |
| Email | Resend |
| Styling | Tailwind CSS |

---

## 2. User Workflow

### 2.1 End-to-End Flow

```
┌─────────────────┐
│  /brand          │  Landing page: input field + my brands + gallery
│  Enter domain    │
└───────┬─────────┘
        ↓
┌─────────────────┐
│  /brand/{domain} │  Brand detail page
│  State: idle     │  CTA: "Generate brand identity — Free preview"
└───────┬─────────┘
        ↓ click
┌─────────────────┐
│  State: briefing │  BrandBriefForm — user fills in preferences
│  Form inputs     │  Business description, personality sliders,
│                  │  font mood, color palette, logo styles
└───────┬─────────┘
        ↓ submit
┌─────────────────┐
│  State: generating│  BrandLoadingState — 3-step progress
│  ~15-30 seconds  │  1. Strategist analyzing brand positioning
│                  │  2. Generating logo concepts
│                  │  3. Processing and preparing previews
└───────┬─────────┘
        ↓ complete
┌─────────────────┐
│  State: ready    │  LogoConceptGrid — up to 8 logo cards
│  Select & refine │  Lightbox with mockup tabs
│                  │  Refinement tools + regenerate
└───────┬─────────┘
        ↓ select concept
┌─────────────────┐
│  Download        │  Direct ZIP download (free preview tier)
│  or Purchase     │  BrandPricingModal → Stripe Checkout
└───────┬─────────┘
        ↓ payment
┌─────────────────┐
│  /brand/success  │  BrandDownloadSuccess
│  Download ZIP    │  Polls for asset generation, then download link
└─────────────────┘
```

### 2.2 Session Persistence

- Sessions stored in localStorage with key `brand_session_{domain}{tld}`
- On revisit, the panel restores the previous session automatically
- Sessions also stored server-side in the BrandSession database table
- 6-minute generation timeout with auto-failure

### 2.3 Polling Mechanism

During generation, the frontend polls `GET /api/brand/status` every **2.5 seconds**. The progress field cycles through:
1. `analyzing_brand` — Strategist agent running
2. `generating_logos` — Flux generating images + evaluation
3. `processing_previews` — Uploading to R2 and saving to database
4. `ready` — All concepts available

---

## 3. Frontend Components

### 3.1 Component Map

```
components/brand/
├── BrandIdentityPanel.tsx    Main orchestrator (327 lines)
├── BrandBriefForm.tsx        User input form (373 lines)
├── LogoConceptGrid.tsx       Logo display & refinement (394 lines)
├── BrandLoadingState.tsx     Generation progress (53 lines)
├── BrandDownloadSuccess.tsx  Post-purchase display (83 lines)
└── BrandPricingModal.tsx     Pricing tiers (122 lines)

app/brand/
├── page.tsx                  Landing page with hero + gallery (242 lines)
├── [domain]/page.tsx         Per-brand detail page (79 lines)
└── success/page.tsx          Post-purchase page (79 lines)
```

---

### 3.2 BrandIdentityPanel — Main Orchestrator

**File:** `components/brand/BrandIdentityPanel.tsx`

#### Props
| Prop | Type | Description |
|------|------|-------------|
| `domainName` | `string` | e.g., "mycompany" |
| `tld` | `string` | e.g., ".com" |
| `searchQuery` | `string` | Initial search query |
| `anonymousId` | `string` | User tracking ID |
| `initialSessionId` | `string?` | Restore existing session |
| `autoStart` | `boolean?` | Auto-start generation |

#### State Machine

| State | UI Rendered | User Actions |
|-------|------------|--------------|
| `idle` | CTA card with purple gradient button | Click "Generate brand identity" |
| `restoring` | Loading spinner | Wait |
| `briefing` | BrandBriefForm | Fill form, back button |
| `initializing` / `generating` | BrandLoadingState | Cancel button |
| `ready` | LogoConceptGrid + 3 action buttons | Select, download, regenerate |
| `failed` | Error card | "Try again" button |

#### Action Buttons (ready state)

| Button | Style | Behavior |
|--------|-------|----------|
| "Download brand kit" | Purple gradient, disabled until concept selected | POST `/api/brand/build-kit` → ZIP download |
| "Download logo only" | Outline | Fetches `concept.previewUrl` → blob download |
| "Regenerate" | Outline | Returns to briefing state |

---

### 3.3 BrandBriefForm — User Input

**File:** `components/brand/BrandBriefForm.tsx`

Two-phase form: **Input → Review Summary → Submit**

#### Form Fields

**1. Business Description** (required)
- Textarea, 2 rows
- Placeholder: "What does your business do?"

**2. Logo Description** (optional)
- Textarea, 2 rows
- Placeholder: "e.g. A lightning bolt combined with a leaf, modern and clean"

**3. Brand Personality — 4 Spectrum Sliders**

| Slider | Left (1) | Right (5) | Default |
|--------|----------|-----------|---------|
| Energy | Calm | Bold | 3 |
| Tone | Playful | Serious | 3 |
| Style | Classic | Modern | 3 |
| Approach | Minimal | Expressive | 3 |

Visual: Range input with 5 dot indicators. Purple accent for selected position.

Slider values derive the `tone` field:
- Bold: energy ≥ 4 && tone ≥ 4
- Sophisticated: tone ≥ 4 && style ≤ 2
- Calm: tone ≤ 2 && energy ≤ 2
- Playful: tone ≤ 2
- Techy: style ≥ 4
- Professional: default

**4. Font Mood — 5 Tile Buttons** (single-select, optional)

| Tile | Font Family | Internal ID |
|------|-------------|-------------|
| Clean & Modern | DM Sans | `geometric_sans` |
| Warm & Friendly | Nunito Sans | `humanist_sans` |
| Elegant & Refined | Playfair Display | `high_contrast_serif` |
| Bold & Impactful | Syne | `display_expressive` |
| Technical & Precise | Space Mono | `monospaced` |

Shows sample text rendered in the font. Selected: purple border + ring.

**5. Color Palette — 6 Preset Palettes + Custom** (single-select, optional)

| Palette | Colors | Primary Hex | Accent Hex |
|---------|--------|-------------|------------|
| Warm Earth | 4 swatches | `#B45309` | `#DC2626` |
| Cool Ocean | 4 swatches | `#0369A1` | `#0E7490` |
| Vibrant Pop | 4 swatches | `#7C3AED` | `#EC4899` |
| Muted Professional | 4 swatches | `#475569` | `#6366F1` |
| Dark Tech | 4 swatches | `#1E293B` | `#06B6D4` |
| Fresh Nature | 4 swatches | `#15803D` | `#A3E635` |

Custom input: free text hex input (e.g., "#2563EB, warm blue tones").

**6. Logo Styles — 8 Multi-Select Chips** (at least 1 required)

| Style | Label | Description |
|-------|-------|-------------|
| `wordmark` | Wordmark | Typography only |
| `icon_wordmark` | Icon + Text | Icon beside name |
| `monogram` | Monogram | Stylized initials |
| `abstract_mark` | Abstract | Geometric symbol |
| `pictorial` | Pictorial | Recognizable icon |
| `mascot` | Mascot | Character illustration |
| `emblem` | Emblem | Badge/crest design |
| `dynamic` | Dynamic | Stacked icon + text |

All 8 selected by default. Selected: purple bg. Unselected: gray.

#### Review Summary (Phase 2)

Before submitting, shows a summary card with all selections:
- Brand name, business description, logo idea
- Personality summary (from slider positions)
- Font mood, color palette with swatches
- Number of selected styles
- **"Edit"** button → back to form
- **"Generate N concepts"** button → submits

---

### 3.4 LogoConceptGrid — Logo Display & Refinement

**File:** `components/brand/LogoConceptGrid.tsx`

#### Grid Layout
- 2 columns (mobile) / 4 columns (desktop)
- Each card: square aspect ratio, bg-gray-50

#### Per-Card Elements

| Element | Position | Behavior |
|---------|----------|----------|
| Logo image | Center, object-contain | — |
| Style label | Bottom-left overlay | e.g., "Wordmark" |
| Score badge | Bottom-right overlay | Green (≥80), Blue (≥65), Orange (<65) |
| Zoom button | Top-left (on hover) | Opens lightbox |
| Refine button | Top-right (on hover) | Opens refinement UI |
| Selection check | Top-right (if selected) | Purple circle with checkmark |
| Loading overlay | Full card | Spinner + "Refining..." / "Regenerating..." |

#### Refinement UI (expands below card)

**Quick Refinement Presets:**

| Button | Sends Feedback |
|--------|---------------|
| Simplify | "Make it simpler and more minimal, reduce detail" |
| Change color | "Try a different color palette" |
| Bigger icon | "Make the icon larger relative to the text" |
| More contrast | "Increase contrast, make the design bolder" |

**Regenerate button:** Calls `POST /api/brand/regenerate-style` to generate a completely new logo for that style.

**Free-text input:** Max 500 chars. Enter key or "Refine" button submits to `POST /api/brand/refine-concept`.

**Refinement API:** Uses Flux Kontext (img2img editing) to modify the existing logo based on feedback, preserving the overall design.

**Regeneration API:** Generates a completely new logo for that style from scratch using the original signals/brief.

#### Lightbox Modal

Opens on zoom button click. Fixed overlay with backdrop blur.

**Tab bar with 4 tabs:**

| Tab | Content | Source |
|-----|---------|--------|
| Logo | Full-size original | `concept.previewUrl` |
| Business Card | Logo on white card mockup | `GET /api/brand/mockup?type=business-card` |
| Website | Logo in navbar header mockup | `GET /api/brand/mockup?type=website-header` |
| Dark BG | Logo on dark background | `GET /api/brand/mockup?type=dark-background` |

Mockups lazy-load on tab switch and are cached per concept.

**Footer:** Style label, score badge, "Select this logo" button.

**Keyboard:** Escape closes lightbox.

---

### 3.5 BrandLoadingState — Progress Display

**File:** `components/brand/BrandLoadingState.tsx`

3-step progress indicator:

| Step | Key | Label |
|------|-----|-------|
| 1 | `analyzing_brand` | Strategist analyzing brand positioning... |
| 2 | `generating_logos` | Generating 4 logo concepts... |
| 3 | `processing_previews` | Processing and preparing previews... |

Visual: Green checkmark (completed), purple number (current), gray (future).

Footer: "This usually takes 15-30 seconds" + cancel button.

---

### 3.6 BrandPricingModal — Purchase Tiers

**File:** `components/brand/BrandPricingModal.tsx`

| Tier | Price | Features |
|------|-------|----------|
| Logo Only | €12 | PNG transparent 2000px, SVG vector, favicon package (8 sizes + .ico), commercial license |
| **Brand Kit** (highlighted) | €29 | Everything in Logo Only + EPS/PDF source, 20 social media assets, color palette (CSS + JSON), font guide, brand guidelines PDF |
| Brand Kit Pro | €59 | Everything in Brand Kit + 3 additional concepts fully processed, all source files for all 4 concepts |

Requires email input. "Get files" button redirects to Stripe Checkout.

---

### 3.7 BrandDownloadSuccess — Post-Purchase

**File:** `components/brand/BrandDownloadSuccess.tsx`

Polls `GET /api/brand/download` every 3 seconds until assets are ready.

| State | Display |
|-------|---------|
| `loading` / `processing` | Spinner + "Preparing your brand files..." |
| `ready` | Green checkmark + "Download ZIP" button |
| `error` | Error message + support contact |

Download link expires in 7 days.

---

### 3.8 Pages

**`/brand`** — Landing page
- Hero section: domain/brand name input → navigates to `/brand/{name}`
- My Brands section: grid of user's previous brand sessions (requires auth)
- Gallery section: community-generated logos with infinite scroll pagination

**`/brand/{domain}`** — Brand detail page
- Renders `BrandIdentityPanel` with domain from URL params
- TLD from query params (default: `.com`)
- Generates anonymous ID from localStorage
- Auto-starts if no existing session

**`/brand/success`** — Post-purchase page
- Reads Stripe `session_id` from URL
- Renders `BrandDownloadSuccess` when purchase confirmed

---

## 4. API Endpoints

### 4.1 Brand Generation

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/brand/initialize` | Create session, trigger generation via Inngest |
| `GET` | `/api/brand/status?sessionId=` | Poll generation progress and retrieve concepts |

**POST /api/brand/initialize**

```typescript
// Request
{
  domainName: string;
  tld?: string;
  searchQuery: string;
  anonymousId?: string;
  preferences?: {
    businessDescription?: string;
    logoDescription?: string;
    tone?: string;
    colorPreference?: string;
    iconStyle?: string;
    selectedStyles?: LogoStyle[];
    personalitySliders?: { energy, tone, style, approach }; // each 1-5
    fontMood?: string;          // displayCategory ID
    colorPalette?: { name, primary?, accent? };
  };
}

// Response
{ sessionId: string; status: 'GENERATING' }
```

**GET /api/brand/status**

```typescript
// Response
{
  status: 'PENDING' | 'GENERATING' | 'READY' | 'FAILED';
  progress: 'analyzing_brand' | 'generating_logos' | 'processing_previews' | 'ready' | null;
  signals: { brief: DesignBrief; derived: BrandSignals } | null;
  concepts: { id, style, previewUrl, isSelected, score }[];
}
```

Auto-fails sessions stale for >5 minutes.

### 4.2 Concept Refinement

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/brand/refine-concept` | Edit concept via Flux Kontext (img2img) |
| `POST` | `/api/brand/regenerate-style` | Generate new concept for a style from scratch |

**POST /api/brand/refine-concept**

```typescript
// Request
{ conceptId: string; feedback: string }  // feedback: 1-500 chars

// Response
{ success: true; previewUrl: string }
```

Uses `fal-ai/flux-kontext/dev` for image-to-image editing. The original image is sent along with the user's text feedback, and Flux Kontext modifies the image while preserving the overall design.

**POST /api/brand/regenerate-style**

```typescript
// Request
{ conceptId: string }

// Response
{ success: true; previewUrl: string; score: number }
```

Loads session signals/brief, calls `generateLogoConcepts()` for just that one style, uploads to R2, updates the concept record.

### 4.3 Mockups

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/brand/mockup?conceptId=&type=` | Generate context mockup |

**Types:** `business-card`, `phone-app`, `website-header`, `dark-background`

Returns PNG image buffer. 15-minute in-memory cache per concept+type.

Mockup generation uses Sharp to composite the logo onto SVG templates:
- **Business card:** Logo centered on white card with shadow, brand name + URL below
- **Phone app:** Logo as iOS-style rounded app icon on gray background
- **Website header:** Logo in navbar with nav items + hero section
- **Dark background:** Logo on brand dark color using `compositeOnBackground()`

### 4.4 Brand Kit Building

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/brand/build-kit` | Synchronous ZIP generation (300s timeout) |
| `POST` | `/api/brand/rebuild-kit` | Rebuild with user feedback on colors/fonts |

**POST /api/brand/build-kit**

```typescript
// Request
{ sessionId: string; conceptId: string; tier?: 'BRAND_KIT' }

// Response: ZIP binary
// Content-Type: application/zip
// Content-Disposition: attachment; filename="{domain}-brand-kit.zip"
```

The build pipeline (in order):
1. Download original image from R2
2. Vectorize to SVG
3. Remove white background → transparent PNG
4. Extract color palette from image
5. Select typography (Typographer agent)
6. Build color system (Colorist agent)
7. Run QA checks (Critic agent)
8. Generate logo-with-text composites
9. Generate logo color variants (white, black, grayscale, on-dark, on-brand, 4000px hi-res)
10. Generate logo variation matrix (6 variations × 5 color versions)
11. Generate favicons (8 sizes + .ico + webmanifest)
12. Generate social media kit (18+ assets)
13. Generate business cards
14. Generate letterhead
15. Generate email signature templates
16. Generate brand guidelines PDF
17. Assemble ZIP

Each step wrapped in try/catch for resilience — individual failures don't crash the build.

### 4.5 Purchase & Download

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/brand/checkout` | Create Stripe checkout session |
| `POST` | `/api/brand/webhook` | Stripe webhook handler |
| `GET` | `/api/brand/download?purchaseId=` | Get download URL |
| `POST` | `/api/brand/select` | Mark concept as selected |

**POST /api/brand/checkout**

```typescript
// Request
{ sessionId: string; conceptId: string; tier: PurchaseTier; email: string }

// Response
{ checkoutUrl: string }  // Redirect to Stripe
```

**Stripe Webhook** (`checkout.session.completed`):
1. Creates BrandPurchase record (status: PROCESSING)
2. Marks concept as selected
3. Triggers `brand/generate.assets` Inngest event

**GET /api/brand/download**:
- Returns 202 while processing
- Returns `{ downloadUrl }` when ready
- Auto-regenerates signed URL if expired (7-day expiration)

### 4.6 Gallery & User Brands

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/brand/gallery?cursor=` | Public gallery with pagination |
| `GET` | `/api/brand/my-brands` | User's brand sessions (auth required) |

---

## 5. AI Agent Pipeline

### 5.1 Overview

The brand studio uses a multi-agent architecture where specialized AI agents handle different aspects of brand creation:

```
User Input
    ↓
┌──────────────┐
│  Strategist  │  GPT-4o — generates DesignBrief
│  (5-10s)     │  Sector classification, brand pillars, aesthetic direction,
│              │  typography guidance, color guidance, logo guidance
└──────┬───────┘
       ↓
┌──────────────┐
│  Style       │  Pure function — recommends best styles based on brief
│  Recommender │  Rules: name length, sector, aesthetic preferences
└──────┬───────┘
       ↓
┌──────────────────────────────────────────────────────┐
│  Logo Generation Loop (per style, 2 concurrent)      │
│                                                       │
│  ┌─────────────┐   ┌──────────────┐   ┌───────────┐ │
│  │ Prompt      │ → │ Flux Schnell │ → │ Evaluation│ │
│  │ Builder     │   │ (fal.ai)     │   │ Agent     │ │
│  │             │   │ 1024×1024    │   │ GPT-4o-   │ │
│  │ Style-      │   │              │   │ mini      │ │
│  │ specific    │   │              │   │ vision    │ │
│  └─────────────┘   └──────────────┘   └─────┬─────┘ │
│                                              ↓       │
│                         ┌────────────────────────┐   │
│                         │ Text Reviewer          │   │
│                         │ GPT-4o-mini vision OCR │   │
│                         │ (text-bearing styles)  │   │
│                         └────────────┬───────────┘   │
│                                      ↓               │
│                    score ≥ 65 AND text correct?       │
│                    YES → accept  /  NO → refine      │
│                                      ↓               │
│                         ┌────────────────────────┐   │
│                         │ Prompt Refinement      │   │
│                         │ Flag-based fixes       │   │
│                         │ GPT rewrite (attempt 3)│   │
│                         └────────────────────────┘   │
│                                                       │
│  Max attempts: 2 (icon-only) / 3 (text-bearing)     │
└──────────────────────────────────────────────────────┘
       ↓
┌──────────────┐
│  Palette     │  Extracts colors from logo image
│  Extractor   │  Vibrant.js-style quantization
└──────┬───────┘
       ↓
┌──────────────┐
│  Typographer │  Sector-aware font selection
│              │  Based on DesignBrief typeGuidance
│              │  Produces FontPairing + TypeScale
└──────┬───────┘
       ↓
┌──────────────┐
│  Colorist    │  HSL-based systematic palette
│              │  WCAG accessibility checks
│              │  CMYK conversion, CSS variables
└──────┬───────┘
       ↓
┌──────────────┐
│  Critic QA   │  Validates brand system
│              │  Auto-fixes contrast issues
│              │  Checks accessibility compliance
└──────────────┘
```

### 5.2 Strategist Agent

**File:** `lib/brand/strategist.ts`
**Model:** GPT-4o
**Purpose:** Generate a rich DesignBrief from domain name, search context, and user preferences.

**Output — DesignBrief:**

| Field | Type | Example |
|-------|------|---------|
| `brandName` | string | "Sliddering" |
| `tagline` | string | "Slither into success" |
| `sectorClassification` | string | "SaaS / Developer Tools" |
| `tensionPair` | string | "Technical precision but playful approachability" |
| `aestheticDirection` | string | "Swiss Modernism with warm accents" |
| `memorableAnchor` | string | "A snake forming an infinity loop" |
| `brandPillars` | array | `[{ name, description }]` |
| `personalityTraits` | array | `[{ trait, counterbalance }]` |
| `targetAudienceSummary` | string | "Tech-savvy developers aged 25-40" |
| `typeGuidance.displayCategory` | string | "geometric_sans" |
| `typeGuidance.suggestedDisplayFonts` | string[] | ["DM Sans", "Inter"] |
| `colorGuidance.temperature` | string | "cool" |
| `colorGuidance.suggestedPrimaryHex` | string | "#7C3AED" |
| `logoGuidance.geometry` | string | "organic" |
| `logoGuidance.conceptSeeds` | string[] | ["snake", "code brackets", "flow"] |
| `competitiveDifferentiation` | string | "Avoid generic tech blues..." |

### 5.3 Style Recommender

**File:** `lib/brand/styleRecommender.ts`
**Type:** Pure function (no AI call)

Rules-based selection:
- Brand name >12 chars → deprioritize wordmark, boost monogram
- Brand name <5 chars → boost wordmark
- Tech/SaaS sector → boost abstract mark, icon+wordmark
- Food/hospitality → boost mascot, emblem, pictorial
- Luxury/fashion → boost wordmark, lettermark
- Enterprise/B2B → deprioritize mascot
- Minimal aesthetic → deprioritize emblem

Returns ordered list of recommended `LogoStyle` values.

### 5.4 Prompt Builder

**File:** `lib/brand/prompts.ts`
**Type:** Pure functions

8 style-specific prompt builders, each producing a `{ prompt, negativePrompt }` pair:

| Style | Key Prompt Elements |
|-------|-------------------|
| `wordmark` | Typography only, brand name in distinctive typeface, NO icons |
| `icon_wordmark` | Icon LEFT + brand name RIGHT, horizontal layout |
| `monogram` | 1-3 derived initials, interlocking letterforms |
| `abstract_mark` | NO TEXT, abstract geometric symbol |
| `pictorial` | NO TEXT, recognizable literal icon |
| `mascot` | NO TEXT, character illustration |
| `emblem` | Unified badge/crest with brand name integrated |
| `dynamic` | Icon ABOVE brand name, vertical stack |

All prompts include:
- Color from pre-generated palette
- Aesthetic direction from DesignBrief
- Global negative prompt (no photos, no shadows, no gradients, white bg)
- Typography guidance from brief

**Monogram initials derivation:** Splits camelCase words, uses first letters of each word. Single word: first letter + prominent mid-consonant.

### 5.5 Evaluation Agent

**File:** `lib/brand/evaluationAgent.ts`
**Model:** GPT-4o-mini (vision)
**Threshold:** Score ≥ 65 to pass

Each style has a dedicated rubric scoring 4 dimensions (0-25 each):

| Dimension | What It Checks |
|-----------|---------------|
| 1 | Style-specific quality (typography, icon, character, etc.) |
| 2 | Secondary quality (scalability, composition, simplification) |
| 3 | Style compliance (correct format, no wrong elements) |
| 4 | Technical quality (background, shadows, scaling) |

**13 Evaluation Flags:**

| Flag | Meaning |
|------|---------|
| `photorealistic` | Photo-like rendering instead of vector |
| `too_complex` | Too detailed for logo use |
| `bad_typography` | Unclear, pixelated, or poorly kerned text |
| `wrong_style` | Doesn't match requested style category |
| `dark_background` | Non-white background |
| `drop_shadows` | 3D effects present |
| `text_in_abstract` | Text in abstract/pictorial/mascot (should have none) |
| `no_text_in_wordmark` | Missing text in text-bearing style |
| `cluttered` | Too many elements |
| `gradient_heavy` | Heavy gradient usage |
| `low_contrast` | Poor color contrast |
| `wrong_aspect_ratio` | Off-center or bad framing |
| `wrong_text` | Brand name misspelled in logo |

### 5.6 Text Reviewer

**File:** `lib/brand/textReviewer.ts`
**Model:** GPT-4o-mini (vision)
**Purpose:** OCR check — verify the text rendered in the logo matches the brand name.

| Style | Expected Text | Verification |
|-------|--------------|--------------|
| `wordmark` | Full brand name | Levenshtein ≤ 1 |
| `icon_wordmark` | Full brand name | Levenshtein ≤ 1 |
| `monogram` | 1-3 initials | Subsequence match |
| `emblem` | Full brand name | Levenshtein ≤ 1 |
| `dynamic` | Full brand name | Levenshtein ≤ 1 |
| `abstract_mark` | None | Skipped |
| `pictorial` | None | Skipped |
| `mascot` | None | Skipped |

When text is wrong: adds `wrong_text` flag, refines prompt with letter-by-letter spelling (e.g., "S-l-i-d-d-e-r-i-n-g"), retries up to 3 attempts for text-bearing styles.

### 5.7 Prompt Refinement Agent

**File:** `lib/brand/promptRefinementAgent.ts`
**Model:** GPT-4o-mini (for attempt 3+ full rewrite)

Attempts 1-2: Injects flag-specific fixes into prompt prefix and negative prompt.
Attempt 3+: GPT-4o-mini full prompt rewrite from scratch.

Each flag maps to specific prompt additions (e.g., `wrong_text` → "CRITICAL: spell the brand name EXACTLY correct").

### 5.8 Typographer

**File:** `lib/brand/typographer.ts`
**Type:** Pure function

Selects font pairing based on DesignBrief's `typeGuidance.displayCategory`:

| Category | Heading Font | Body Font |
|----------|-------------|-----------|
| `geometric_sans` | DM Sans / Inter | Inter / DM Sans |
| `humanist_sans` | Nunito Sans / Source Sans 3 | Source Sans 3 |
| `high_contrast_serif` | Playfair Display / DM Serif | Source Sans 3 |
| `transitional_serif` | Libre Baskerville | Source Sans 3 |
| `monospaced` | Space Mono / JetBrains Mono | Inter |
| `condensed` | Barlow Condensed | Barlow |
| `display_expressive` | Syne / Space Grotesk | Inter |

Also generates a TypeScale with sizes from `caption` to `display`, using a modular scale ratio.

### 5.9 Colorist

**File:** `lib/brand/colorist.ts`
**Type:** Pure function

Builds a systematic color palette from the DesignBrief and extracted image palette:
- Brand palette: primary, secondary, accent, light, dark
- System palette: background, surface, foreground, muted, border, accent-dim
- Functional colors: success, warning, error, info
- Each color provided as: hex, RGB, HSL, CMYK
- WCAG accessibility checks (AA and AAA) for all foreground/background pairs
- CSS custom property export
- Light/dark theme support

### 5.10 Critic QA

**File:** `lib/brand/critic.ts`
**Type:** Pure function

Validates the complete brand system:
- Contrast ratio checks (WCAG AA minimum 4.5:1)
- Auto-fixes failing contrast by adjusting lightness
- Validates palette completeness
- Checks font availability
- Returns QAReport with issues, fixes, and summary

### 5.11 Social Director

**File:** `lib/brand/socialDirector.ts`
**Model:** GPT-4o-mini
**Purpose:** Generate platform-specific social media strategy based on brand brief.

Provides tone, color, and layout guidance for social media asset generation.

---

## 6. Brand Kit Contents

### 6.1 ZIP Structure

```
{brand-name}/
├── logo/
│   ├── primary-lockup/          6 variations × 5 color versions
│   │   ├── full-color.png
│   │   ├── white.png
│   │   ├── black.png
│   │   ├── on-dark.png
│   │   └── on-brand.png
│   ├── stacked/
│   ├── icon/
│   ├── wordmark/
│   ├── monogram/
│   ├── tagline-lockup/
│   ├── logo.svg                 Vector format
│   ├── logo-transparent.png     No background
│   ├── logo-with-name.png       Logo + brand name (white bg)
│   ├── logo-with-name-transparent.png
│   ├── name-only.png            Brand name text only
│   ├── name-only-transparent.png
│   ├── logo-white.png           White colorized
│   ├── logo-black.png           Black colorized
│   ├── logo-grayscale.png
│   ├── logo-on-dark.png         On brand dark color
│   ├── logo-on-brand.png        On brand primary color
│   ├── logo-4000px-transparent.png   High-res
│   └── logo-with-name-4000px.png     High-res with name
│
├── favicons/
│   ├── favicon.ico
│   ├── apple-touch-icon.png     180×180
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── favicon-48x48.png
│   ├── favicon-192x192.png
│   ├── favicon-512x512.png
│   └── site.webmanifest
│
├── social/
│   ├── instagram-profile.png    320×320
│   ├── instagram-post.png       1080×1080
│   ├── instagram-story.png      1080×1920
│   ├── facebook-cover.png       820×312
│   ├── facebook-profile.png     170×170
│   ├── twitter-header.png       1500×500
│   ├── twitter-profile.png      400×400
│   ├── linkedin-banner.png      1584×396
│   ├── linkedin-profile.png     300×300
│   ├── youtube-banner.png       2560×1440
│   ├── youtube-profile.png      800×800
│   ├── tiktok-profile.png       200×200
│   ├── pinterest-profile.png    165×165
│   ├── email-header.png         600×200
│   ├── og-image.png             1200×630
│   ├── slack-icon.png           512×512
│   ├── app-icon-1024.png        1024×1024
│   └── discord-icon.png         512×512
│
├── print/
│   ├── business-card-front.png
│   ├── business-card-back.png
│   └── letterhead.png
│
├── email/
│   ├── email-signature.html     Ready-to-paste HTML
│   └── email-signature.txt      Plain text version
│
├── brand-guidelines.pdf         Multi-page brand book
│
├── palette.json                 Full color system with hex/RGB/HSL/CMYK
├── palette.css                  CSS custom properties
├── typography.json              Font pairing + type scale
└── README.txt                   Kit overview and usage instructions
```

### 6.2 Logo Variation Matrix

Generated by `lib/brand/variationGenerator.ts`:

| Variation | Description | How Generated |
|-----------|-------------|---------------|
| Primary lockup | Icon + brand name horizontal | Sharp composite |
| Stacked | Icon above brand name | Sharp composite |
| Icon only | Extracted symbol | Connected component analysis |
| Wordmark only | Brand name text | `renderBrandText()` |
| Monogram | 1-3 initials | `renderBrandText()` with initials |
| Tagline lockup | Stacked + tagline below | Sharp composite |

Each variation × 5 color versions:
- **Full-color** (transparent background)
- **White** (colorized to white, transparent bg)
- **Black** (colorized to black, transparent bg)
- **On dark** (on brand dark color background)
- **On brand** (on brand primary color background)

= **30 logo files** from the variation system alone.

### 6.3 Brand Guidelines PDF

Generated by `lib/brand/brandPdf.ts` using `pdfkit`.

Multi-page document containing:
1. Cover page with logo
2. Logo usage guidelines (clear space, minimum size)
3. Color palette with hex, RGB, HSL, CMYK values
4. Typography system with font specimens and scale
5. Do's and don'ts
6. Brand voice guidelines

### 6.4 Image Processing Pipeline

**File:** `lib/brand/postprocess.ts`

Key functions:

| Function | Purpose |
|----------|---------|
| `downloadToBuffer(url)` | Download image from URL |
| `ensurePng(buffer)` | Convert any image format to PNG |
| `removeWhiteBackground(buffer)` | 2-pass algorithm: border-connected white removal + tiny enclosed region clearing (letter counters) |
| `vectorizeToSvg(buffer)` | Convert PNG to SVG via Vectorizer.ai API |
| `compositeLogoWithText(logo, name, primary, dark)` | Logo + brand name side by side (white bg) |
| `compositeLogoWithTextTransparent(logo, name, dark)` | Logo + brand name (transparent bg) |
| `generateNameImages(name, color)` | Brand name text only images |
| `colorizeToWhite(buffer)` | Make all non-transparent pixels white |
| `colorizeToBlack(buffer)` | Make all non-transparent pixels black |
| `toGrayscale(buffer)` | Convert to grayscale |
| `compositeOnBackground(buffer, color, size?)` | Place logo on colored background |
| `renderBrandText(text, color, options)` | Render text as PNG using SVG |

**White background removal algorithm:**
- Pass 1: BFS flood fill from all border pixels. Any white pixel (min RGB ≥ 250) connected to the border is made transparent.
- Pass 2: Find remaining enclosed white regions. Only clear regions smaller than 0.15% of total image area (catches letter counters in d, e, g). Larger white regions (design fills, animal bodies) are preserved.

---

## 7. Database Schema

### 7.1 Models

**BrandSession**
```
id              String        @id @default(cuid())
domainName      String
tld             String
searchQuery     String
userId          String?       (nullable — anonymous allowed)
anonymousId     String?
signals         Json          (stores { brief: DesignBrief, derived: BrandSignals })
progress        String?       (generation step indicator)
status          BrandStatus   (PENDING | GENERATING | READY | FAILED)
showInGallery   Boolean       @default(true)
concepts        BrandConcept[]
purchases       BrandPurchase[]
createdAt       DateTime
updatedAt       DateTime

Indexes: domainName, anonymousId, userId, (showInGallery + status)
```

**BrandConcept**
```
id              String        @id @default(cuid())
brandSessionId  String        (FK → BrandSession, cascade delete)
style           String        (LogoStyle enum value)
previewUrl      String        (public R2 signed URL)
originalUrl     String        (R2 key for unwatermarked original)
isSelected      Boolean       @default(false)
generationIndex Int
promptUsed      String        @db.Text
score           Int           @default(0)   (0-100)
evaluationFlags String[]
attemptCount    Int           @default(1)
passedEvaluation Boolean      @default(false)
createdAt       DateTime

Index: brandSessionId
```

**BrandPurchase**
```
id                    String          @id @default(cuid())
brandSessionId        String          (FK → BrandSession)
tier                  PurchaseTier    (LOGO_ONLY | BRAND_KIT | BRAND_KIT_PRO)
stripePaymentIntentId String          @unique
stripeSessionId       String?         @unique
status                PurchaseStatus  (PENDING | PROCESSING | COMPLETED | FAILED | REFUNDED)
downloadUrl           String?         (signed R2 URL, 7-day expiry)
downloadExpiresAt     DateTime?
zipR2Key              String?
email                 String?
createdAt             DateTime
updatedAt             DateTime

Index: stripePaymentIntentId
```

### 7.2 Enums

```
BrandStatus:    PENDING | GENERATING | READY | FAILED
PurchaseTier:   LOGO_ONLY | BRAND_KIT | BRAND_KIT_PRO
PurchaseStatus: PENDING | PROCESSING | COMPLETED | FAILED | REFUNDED
```

---

## 8. External Services

| Service | Purpose | API/SDK | Key Env Var |
|---------|---------|---------|-------------|
| **fal.ai** | Logo generation (Flux Schnell), concept refinement (Flux Kontext) | `@fal-ai/client` | `FAL_KEY` |
| **OpenAI** | Strategist (GPT-4o), evaluation (GPT-4o-mini vision), text review, social strategy | `openai` SDK | `OPENAI_API_KEY` |
| **Cloudflare R2** | Image & ZIP storage, signed URLs | `@aws-sdk/client-s3` | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` |
| **Stripe** | Payment processing, checkout sessions, webhooks | `stripe` SDK | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Inngest** | Background job orchestration | `inngest` SDK | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` |
| **Resend** | Transactional email (download links) | `resend` SDK | `RESEND_API_KEY` |
| **Vectorizer.ai** | PNG → SVG vectorization | HTTP API | `VECTORIZER_AI_API_ID`, `VECTORIZER_AI_API_SECRET` |

### 8.1 fal.ai Models Used

| Model | Endpoint | Use Case |
|-------|----------|----------|
| Flux Schnell | `fal-ai/flux/schnell` | Logo generation (1024×1024, 1 image per call) |
| Flux Kontext | `fal-ai/flux-kontext/dev` | Concept refinement (img2img editing with text feedback) |

### 8.2 OpenAI Models Used

| Model | Use Case | Approx Cost/Call |
|-------|----------|-----------------|
| GPT-4o | Strategist (DesignBrief generation) | ~$0.03 |
| GPT-4o-mini | Evaluation (vision), text review (vision), prompt refinement, social strategy, prompt revision | ~$0.001 |

---

## 9. File Architecture

### 9.1 Backend Modules

```
lib/brand/
├── strategist.ts          GPT-4o design brief generation
├── signals.ts             BrandSignals type definition
├── generate.ts            Logo generation orchestrator (Flux + evaluation loop)
├── prompts.ts             8 style-specific prompt builders
├── palettePregen.ts       Pre-generation palette from signals
├── evaluationAgent.ts     GPT-4o-mini vision scoring + flags
├── textReviewer.ts        GPT-4o-mini vision OCR text verification
├── promptRefinementAgent.ts  Flag-based prompt fixes + GPT rewrite
├── styleRecommender.ts    Rules-based style recommendation
├── postprocess.ts         Sharp image processing (bg removal, composites, colorize)
├── iconExtractor.ts       Connected component analysis for icon extraction
├── variationGenerator.ts  6 logo variations × 5 color versions
├── palette.ts             Color palette extraction (Vibrant-style)
├── colorist.ts            Systematic HSL color system + accessibility
├── typographer.ts         Sector-aware font pairing + type scale
├── typography.ts          Font pairing definitions
├── critic.ts              QA validation + auto-fix
├── socialKit.ts           18+ social media asset generation
├── socialDirector.ts      GPT-4o-mini social strategy
├── favicons.ts            Favicon package (8 sizes + manifest)
├── brandPdf.ts            Brand guidelines PDF (pdfkit)
├── businessCards.ts       Business card templates
├── letterhead.ts          Letterhead templates
├── emailSignature.ts      HTML/text email signatures
├── packaging.ts           ZIP assembly (archiver)
└── storage.ts             R2 upload/download helpers
```

### 9.2 API Routes

```
app/api/brand/
├── initialize/route.ts       Create session + trigger generation
├── status/route.ts           Poll generation progress
├── select/route.ts           Mark concept as selected
├── refine-concept/route.ts   Flux Kontext img2img editing
├── regenerate-style/route.ts Generate new concept for style
├── mockup/route.ts           Context mockup generation
├── build-kit/route.ts        Synchronous ZIP generation
├── rebuild-kit/route.ts      Rebuild with feedback
├── checkout/route.ts         Stripe checkout session
├── webhook/route.ts          Stripe webhook handler
├── download/route.ts         Get download URL
├── gallery/route.ts          Public gallery
└── my-brands/route.ts        User's brands
```

### 9.3 Background Jobs

```
inngest/
├── client.ts                       Inngest client (id: 'sparkdomain')
└── functions/
    ├── generateBrandPreviews.ts    Logo generation pipeline (10m timeout)
    └── generateBrandAssets.ts      Full asset generation after purchase (10m timeout)
```

### 9.4 Frontend Components

```
components/brand/
├── BrandIdentityPanel.tsx    State machine orchestrator
├── BrandBriefForm.tsx        2-phase input form with sliders/tiles/palette
├── LogoConceptGrid.tsx       Logo grid + lightbox + refinement + mockups
├── BrandLoadingState.tsx     3-step progress indicator
├── BrandDownloadSuccess.tsx  Post-purchase download polling
└── BrandPricingModal.tsx     3-tier pricing with Stripe checkout
```

---

*Document generated 2026-02-27. Covers all features as of commit `d63ed47`.*
