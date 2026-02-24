import { NextRequest, NextResponse } from "next/server";
import { checkNamecheapAvailability } from "@/lib/namecheap";
import { checkGoDaddyAvailability } from "@/lib/godaddy";
import { checkNameSiloAvailability } from "@/lib/namesilo";
import { generateAffiliateUrl } from "@/lib/affiliate";
import {
  ProviderResult,
  AffiliateProvider,
  TldVariation,
  TldCheckResponse,
  SiteInfo,
  SiteStatus,
  SiteCategory,
} from "@/lib/types";

const TLDS = [".com", ".io", ".ai", ".co", ".net", ".app", ".nl", ".dev", ".xyz", ".org"];

const PARKING_PATTERNS = [
  /this domain is for sale/i,
  /buy this domain/i,
  /domain is available/i,
  /domain may be for sale/i,
  /domain parking/i,
  /parked free/i,
  /parked by/i,
  /hugedomains/i,
  /sedo\.com/i,
  /dan\.com/i,
  /afternic/i,
  /godaddy\s*parking/i,
  /undeveloped\.com/i,
  /domainlore/i,
  /this page is parked/i,
  /domain has expired/i,
  /renew this domain/i,
];

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim().substring(0, 100) || null;
}

function extractMetaDescription(html: string): string | null {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  return match?.[1]?.trim().substring(0, 200) || null;
}

function detectParked(html: string, title: string | null, description: string | null): boolean {
  const text = `${title || ""} ${description || ""} ${html.substring(0, 5000)}`.toLowerCase();
  return PARKING_PATTERNS.some((pattern) => pattern.test(text));
}

function classifySite(title: string | null, description: string | null): SiteCategory | null {
  const text = `${title || ""} ${description || ""}`.toLowerCase();

  const categories: { category: SiteCategory; keywords: string[] }[] = [
    { category: "saas", keywords: ["platform", "software", "saas", "dashboard", "api", "cloud service", "automation"] },
    { category: "ecommerce", keywords: ["shop", "store", "buy now", "cart", "products", "free shipping", "marketplace"] },
    { category: "agency", keywords: ["agency", "studio", "consulting", "services", "we build", "we create", "digital agency"] },
    { category: "blog", keywords: ["blog", "articles", "posts", "journal", "magazine", "news"] },
    { category: "portfolio", keywords: ["portfolio", "designer", "freelance", "my work", "creative"] },
    { category: "corporate", keywords: ["about us", "our team", "company", "enterprise", "solutions", "industries"] },
    { category: "community", keywords: ["forum", "community", "discussion", "members", "join us"] },
  ];

  for (const { category, keywords } of categories) {
    if (keywords.some((kw) => text.includes(kw))) return category;
  }
  return "other";
}

async function fetchSiteInfo(domain: string): Promise<SiteInfo> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`https://${domain}`, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DomainChecker/1.0)",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { status: "inactive", title: null, description: null, category: null };
    }

    const html = await response.text();
    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const isParked = detectParked(html, title, description);
    const status: SiteStatus = isParked ? "parked" : "active";
    const category = status === "active" ? classifySite(title, description) : null;

    return { status, title, description, category };
  } catch {
    return { status: "inactive", title: null, description: null, category: null };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name || !/^[a-zA-Z0-9-]+$/.test(name)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid domain name",
        baseName: "",
        variations: [],
      } as TldCheckResponse,
      { status: 400 }
    );
  }

  const baseName = name.toLowerCase();
  const domainNames = TLDS.map((tld) => `${baseName}${tld}`);

  // Check availability across all registrars in parallel
  const [namecheapResults, godaddyResults, namesiloResults] =
    await Promise.allSettled([
      checkNamecheapAvailability(domainNames),
      checkGoDaddyAvailability(domainNames),
      checkNameSiloAvailability(domainNames),
    ]);

  // Build provider map: domain -> ProviderResult[]
  const providerMap = new Map<string, ProviderResult[]>();
  const allResults: ProviderResult[] = [
    ...(namecheapResults.status === "fulfilled" ? namecheapResults.value : []),
    ...(godaddyResults.status === "fulfilled" ? godaddyResults.value : []),
    ...(namesiloResults.status === "fulfilled" ? namesiloResults.value : []),
  ];

  for (const result of allResults) {
    const key = result.domain.toLowerCase();
    if (!providerMap.has(key)) providerMap.set(key, []);
    providerMap.get(key)!.push(result);
  }

  // Build variations and fetch site titles for taken domains
  const variations: TldVariation[] = await Promise.all(
    domainNames.map(async (domain) => {
      const tld = "." + domain.split(".").pop()!;
      const providers = providerMap.get(domain.toLowerCase()) || [];
      const availableProviders = providers.filter((p) => p.available);
      const isAvailable = availableProviders.length > 0;

      const affiliateProviders: AffiliateProvider[] = availableProviders.map(
        (p) => ({
          registrar: p.registrar,
          price: p.price,
          affiliateUrl: generateAffiliateUrl(
            domain,
            p.registrar as "namecheap" | "godaddy" | "namesilo"
          ),
          isPremium: p.isPremium,
          available: p.available,
        })
      );

      const cheapest =
        affiliateProviders.length > 0
          ? affiliateProviders.reduce((min, p) =>
              p.price < min.price ? p : min
            , affiliateProviders[0])
          : null;

      let siteTitle: string | null = null;
      let siteInfo: SiteInfo | null = null;
      if (!isAvailable) {
        siteInfo = await fetchSiteInfo(domain);
        siteTitle = siteInfo.title;
      }

      return {
        domain,
        tld,
        available: isAvailable,
        providers: affiliateProviders,
        cheapestProvider: cheapest
          ? {
              registrar: cheapest.registrar,
              price: cheapest.price,
              affiliateUrl: cheapest.affiliateUrl,
            }
          : null,
        siteTitle,
        siteInfo,
      };
    })
  );

  return NextResponse.json({
    success: true,
    baseName,
    variations,
  } as TldCheckResponse);
}
