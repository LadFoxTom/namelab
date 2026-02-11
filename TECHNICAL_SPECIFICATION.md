# AI Domain Name Generator - Technical Specification

## Project Overview

An AI-powered domain name generator that helps users find available, brandable domain names for their business ideas. The application uses Claude AI to generate creative suggestions and checks real-time availability across multiple domain registrars.

**Business Model:** Affiliate commissions (20% from Namecheap, 10-15% from GoDaddy)

---

## Tech Stack

```
Frontend:     Next.js 14 (App Router)
Backend:      Next.js API Routes
Database:     PostgreSQL (Neon/Supabase)
ORM:          Prisma
AI:           Anthropic Claude API
Hosting:      Vercel
Payments:     Stripe (freemium model)
```

---

## Application Architecture

### High-Level Flow

```
User Input (Business Idea)
    ↓
Next.js API Route (/api/generate)
    ↓
Claude API (generate 15 domain suggestions + reasoning)
    ↓
Multi-Provider Availability Check (parallel)
    ├── Namecheap API
    ├── GoDaddy API
    └── NameSilo API
    ↓
Combine Results + Find Cheapest Provider
    ↓
Save to Database
    ↓
Return Available Domains to Frontend
    ↓
User Clicks "Buy Now"
    ↓
Track Click → Redirect to Registrar (with affiliate ID)
```

---

## Database Schema

```prisma
// schema.prisma

model User {
  id            String         @id @default(cuid())
  email         String         @unique
  name          String?
  createdAt     DateTime       @default(now())
  searches      Search[]
  subscription  Subscription?
}

model Subscription {
  id                     String    @id @default(cuid())
  userId                 String    @unique
  user                   User      @relation(fields: [userId], references: [id])
  stripeCustomerId       String?
  stripeSubscriptionId   String?
  status                 String    // "active", "canceled", "past_due"
  currentPeriodEnd       DateTime?
  createdAt              DateTime  @default(now())
}

model Search {
  id            String              @id @default(cuid())
  userId        String?
  user          User?               @relation(fields: [userId], references: [id])
  businessIdea  String
  industry      String?
  createdAt     DateTime            @default(now())
  suggestions   DomainSuggestion[]
}

model DomainSuggestion {
  id                  String        @id @default(cuid())
  searchId            String
  search              Search        @relation(fields: [searchId], references: [id])
  domain              String
  available           Boolean
  reasoning           String
  namingStrategy      String
  brandabilityScore   Int
  memorabilityScore   Int
  seoScore            Int
  providers           DomainPrice[]
  createdAt           DateTime      @default(now())
}

model DomainPrice {
  id            String            @id @default(cuid())
  suggestionId  String
  suggestion    DomainSuggestion  @relation(fields: [suggestionId], references: [id])
  registrar     String            // "namecheap", "godaddy", "namesilo"
  price         Decimal
  currency      String            @default("USD")
  affiliateUrl  String
  available     Boolean
  isPremium     Boolean           @default(false)
  createdAt     DateTime          @default(now())
  
  @@unique([suggestionId, registrar])
}

model AffiliateClick {
  id           String    @id @default(cuid())
  userId       String?
  domain       String
  registrar    String
  affiliateUrl String
  clickedAt    DateTime  @default(now())
  convertedAt  DateTime?
}
```

---

## Core API Endpoints

### 1. `POST /api/generate`

**Purpose:** Main endpoint that generates domain suggestions

**Request Body:**
```json
{
  "businessIdea": "Platform for DIY workshops in Spain",
  "userId": "usr_123" // optional, for logged-in users
}
```

**Process:**
1. Validate input
2. Check rate limits (3/day for free users)
3. Call Claude API to generate 15 domain suggestions
4. Check availability across all registrars (parallel)
5. Combine data and find cheapest provider per domain
6. Save to database
7. Return only available domains

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "sug_123",
      "domain": "craftspain.com",
      "reasoning": "Combines craft with Spain...",
      "namingStrategy": "keyword-rich",
      "brandabilityScore": 75,
      "memorabilityScore": 80,
      "seoScore": 88,
      "providers": [
        {
          "registrar": "namecheap",
          "price": 10.98,
          "affiliateUrl": "https://...",
          "isPremium": false
        },
        {
          "registrar": "godaddy",
          "price": 12.99,
          "affiliateUrl": "https://...",
          "isPremium": false
        }
      ],
      "cheapestProvider": {
        "registrar": "namecheap",
        "price": 10.98,
        "affiliateUrl": "https://..."
      }
    }
  ]
}
```

### 2. `POST /api/track-click`

**Purpose:** Track when users click affiliate links

**Request Body:**
```json
{
  "domain": "craftspain.com",
  "registrar": "namecheap",
  "affiliateUrl": "https://...",
  "userId": "usr_123" // optional
}
```

**Response:**
```json
{
  "success": true,
  "clickId": "click_123"
}
```

### 3. `POST /api/webhooks/stripe`

**Purpose:** Handle Stripe subscription webhooks

**Events to Handle:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## External API Integrations

### Claude API

**Model:** `claude-sonnet-4-20250514`

**Prompt Structure:**
```javascript
const prompt = `Generate 15 creative domain name suggestions for this business idea: "${businessIdea}"

Return ONLY valid JSON (no markdown) in this exact format:
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
`;
```

**Implementation Location:** `lib/anthropic.ts`

### Namecheap API

**Endpoint:** `https://api.namecheap.com/xml.response`  
**Sandbox:** `https://api.sandbox.namecheap.com/xml.response`

**Key Method:** `namecheap.domains.check`

**Request Format:**
```
GET https://api.namecheap.com/xml.response?
  ApiUser={API_USER}&
  ApiKey={API_KEY}&
  UserName={USERNAME}&
  ClientIp={YOUR_IP}&
  Command=namecheap.domains.check&
  DomainList=domain1.com,domain2.com,domain3.com
```

**Response Format:** XML
```xml
<DomainCheckResult Domain="example.com" Available="true" Price="10.98" IsPremiumName="false"/>
```

**Implementation Location:** `lib/namecheap.ts`

**Required Env Vars:**
- `NAMECHEAP_API_USER`
- `NAMECHEAP_API_KEY`
- `NAMECHEAP_CLIENT_IP` (your server IP, must be whitelisted)
- `NAMECHEAP_AFFILIATE_ID`

### GoDaddy API

**Endpoint:** `https://api.godaddy.com`  
**Docs:** https://developer.godaddy.com/

**Key Endpoint:** `GET /v1/domains/available?domain={domain}`

**Implementation Location:** `lib/godaddy.ts`

**Required Env Vars:**
- `GODADDY_API_KEY`
- `GODADDY_API_SECRET`
- `GODADDY_AFFILIATE_ID`

### NameSilo API

**Endpoint:** `https://www.namesilo.com/api/`  
**Docs:** https://www.namesilo.com/api-reference

**Implementation Location:** `lib/namesilo.ts`

**Required Env Vars:**
- `NAMESILO_API_KEY`
- `NAMESILO_AFFILIATE_ID`

---

## Key Implementation Files

### `lib/anthropic.ts`
```typescript
export async function generateDomainSuggestions(businessIdea: string) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `[PROMPT HERE]`
    }]
  });

  const responseText = message.content[0].type === 'text' 
    ? message.content[0].text 
    : '';
  
  return JSON.parse(responseText);
}
```

### `lib/namecheap.ts`
```typescript
export async function checkDomainAvailability(domains: string[]) {
  // Build XML API request
  // Parse XML response
  // Return normalized results
}
```

### `lib/affiliate.ts`
```typescript
export function generateAffiliateUrl(
  domain: string, 
  registrar: 'namecheap' | 'godaddy' | 'namesilo'
): string {
  const affiliateIds = {
    namecheap: process.env.NAMECHEAP_AFFILIATE_ID,
    godaddy: process.env.GODADDY_AFFILIATE_ID,
    namesilo: process.env.NAMESILO_AFFILIATE_ID,
  };

  const urls = {
    namecheap: `https://www.namecheap.com/domains/registration/results/?domain=${domain}&affid=${affiliateIds.namecheap}`,
    godaddy: `https://www.godaddy.com/domainsearch/find?domainToCheck=${domain}&affid=${affiliateIds.godaddy}`,
    namesilo: `https://www.namesilo.com/domain/details/${domain}?rid=${affiliateIds.namesilo}`,
  };

  return urls[registrar];
}
```

---

## Rate Limiting & Freemium Logic

### Free Tier
- 3 searches per day
- 10 domain suggestions per search
- Basic reasoning

### Pro Tier ($9/month)
- Unlimited searches
- 20 domain suggestions per search
- Extended reasoning

**Implementation:**
```typescript
// In /api/generate

const userTier = await getUserTier(userId);

if (userTier === 'free') {
  const searchesToday = await db.search.count({
    where: {
      userId,
      createdAt: { gte: startOfDay(new Date()) }
    }
  });
  
  if (searchesToday >= 3) {
    return Response.json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Daily limit reached. Upgrade to Pro for unlimited searches.'
    }, { status: 429 });
  }
}

const maxSuggestions = userTier === 'free' ? 10 : 20;
```

---

## Environment Variables

```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Namecheap
NAMECHEAP_API_USER=
NAMECHEAP_API_KEY=
NAMECHEAP_CLIENT_IP=
NAMECHEAP_AFFILIATE_ID=

# GoDaddy
GODADDY_API_KEY=
GODADDY_API_SECRET=
GODADDY_AFFILIATE_ID=

# NameSilo
NAMESILO_API_KEY=
NAMESILO_AFFILIATE_ID=

# Database
DATABASE_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## Deployment Checklist

### Before Launch

1. **Namecheap Setup:**
   - Create sandbox account
   - Enable API access (requires $50+ balance)
   - Whitelist server IP
   - Test API calls
   - Join affiliate program (Impact Radius)

2. **GoDaddy Setup:**
   - Sign up for developer account
   - Get API credentials
   - Test in OTE environment
   - Join affiliate program

3. **Database:**
   - Deploy PostgreSQL (Neon/Supabase)
   - Run Prisma migrations: `npx prisma migrate deploy`
   - Seed test data (optional)

4. **Stripe:**
   - Create products/prices
   - Set up webhook endpoint
   - Test subscription flow in test mode

5. **Vercel:**
   - Connect repository
   - Add all environment variables
   - Configure custom domain
   - Enable Edge Functions (optional)

### Post-Launch

- Monitor API costs (Claude, registrar APIs)
- Track affiliate conversions
- Set up error monitoring (Sentry)
- Configure analytics (PostHog/Vercel Analytics)

---

## Important Technical Notes

### XML Parsing for Namecheap
Namecheap returns XML responses. Use a lightweight XML parser or the native browser `DOMParser` (if server-side, use a package like `fast-xml-parser`).

### Parallel API Calls
Check all registrars in parallel using `Promise.all()` to minimize latency:
```typescript
const [namecheap, godaddy, namesilo] = await Promise.all([
  checkNamecheap(domains),
  checkGoDaddy(domains),
  checkNameSilo(domains)
]);
```

### Caching Strategy
Consider caching domain availability results for 5-10 minutes to reduce API costs. Domains change availability slowly.

### Error Handling
- If one registrar API fails, continue with others
- Log errors but don't fail entire request
- Show partial results to user

### Security
- Never expose API keys in frontend
- Validate all user input
- Rate limit by IP and user ID
- Use Vercel's edge config for API key rotation (optional)

---

## Optional Enhancements (Future)

1. **Social media handle check** (Instagram, Twitter APIs)
2. **Bulk domain check** (upload CSV)
3. **Domain history/analytics** (age, previous ownership)
4. **Email export** of results
5. **Saved favorites** per user
6. **Premium domain marketplace** integration
7. **WhatsApp/email notifications** when price drops

---

## Contact & Support

For questions during development:
- Technical docs: This document
- API docs: See respective provider documentation
- Design: Provided separately (React components)

**Key Resources:**
- Namecheap API: https://www.namecheap.com/support/api/
- GoDaddy API: https://developer.godaddy.com/
- Anthropic API: https://docs.anthropic.com/
- Prisma docs: https://www.prisma.io/docs
