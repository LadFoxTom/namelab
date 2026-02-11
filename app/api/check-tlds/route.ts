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
} from "@/lib/types";

const TLDS = [".com", ".io", ".ai", ".co", ".net", ".app", ".nl", ".dev", ".xyz", ".org"];

async function fetchSiteTitle(domain: string): Promise<string | null> {
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

    if (!response.ok) return null;

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim().substring(0, 100);
    }
    return null;
  } catch {
    return null;
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
      if (!isAvailable) {
        siteTitle = await fetchSiteTitle(domain);
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
      };
    })
  );

  return NextResponse.json({
    success: true,
    baseName,
    variations,
  } as TldCheckResponse);
}
