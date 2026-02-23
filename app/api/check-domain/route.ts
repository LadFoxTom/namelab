import { NextRequest, NextResponse } from "next/server";
import { checkNamecheapAvailability } from "@/lib/namecheap";
import { checkGoDaddyAvailability } from "@/lib/godaddy";
import { checkNameSiloAvailability } from "@/lib/namesilo";
import { generateAffiliateUrl } from "@/lib/affiliate";
import {
  DomainResult,
  ProviderResult,
  AffiliateProvider,
} from "@/lib/types";

const ALL_TLDS = [".com", ".io", ".ai", ".co", ".net", ".app", ".nl", ".dev", ".xyz"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, tlds } = body as { domain: string; tlds?: string[] };

    if (!domain || typeof domain !== "string" || domain.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "INVALID_INPUT", message: "Domain name is required." },
        { status: 400 }
      );
    }

    const input = domain.trim().toLowerCase();

    // Parse domain: could be "coolshop" or "coolshop.com"
    let baseName: string;
    let domainsToCheck: string[];

    const dotIndex = input.lastIndexOf(".");
    const hasTld = dotIndex > 0 && dotIndex < input.length - 1;

    if (hasTld) {
      // User specified a full domain like "coolshop.com"
      baseName = input.substring(0, dotIndex);
      const specifiedTld = input.substring(dotIndex);
      const selectedTlds = tlds || ALL_TLDS;

      // Always check the specified TLD + any other selected TLDs
      const tldsToCheck = new Set([specifiedTld, ...selectedTlds]);
      domainsToCheck = Array.from(tldsToCheck).map((tld) => `${baseName}${tld}`);
    } else {
      // Just a name like "coolshop" — check across selected TLDs
      baseName = input;
      const selectedTlds = tlds || ALL_TLDS;
      domainsToCheck = selectedTlds.map((tld) => `${baseName}${tld}`);
    }

    // Check availability across all registrars in parallel
    const [namecheapResults, godaddyResults, namesiloResults] =
      await Promise.allSettled([
        checkNamecheapAvailability(domainsToCheck),
        checkGoDaddyAvailability(domainsToCheck),
        checkNameSiloAvailability(domainsToCheck),
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

    // Build results in DomainResult format for UI compatibility
    const results: DomainResult[] = [];

    for (const domainName of domainsToCheck) {
      const key = domainName.toLowerCase();
      const providers = providerMap.get(key) || [];
      const availableProviders = providers.filter((p) => p.available);
      const isAvailable = availableProviders.length > 0;

      if (!isAvailable) continue;

      const affiliateProviders: AffiliateProvider[] = availableProviders.map(
        (p) => ({
          registrar: p.registrar,
          price: p.price,
          affiliateUrl: generateAffiliateUrl(
            domainName,
            p.registrar as "namecheap" | "godaddy" | "namesilo"
          ),
          isPremium: p.isPremium,
          available: p.available,
        })
      );

      const cheapest = affiliateProviders.reduce(
        (min, p) => (p.price < min.price ? p : min),
        affiliateProviders[0]
      );

      const tld = "." + domainName.split(".").pop()!;

      results.push({
        id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        domain: domainName,
        reasoning: `Direct availability check for ${baseName}${tld}`,
        namingStrategy: "Specific lookup",
        brandabilityScore: 0,
        memorabilityScore: 0,
        seoScore: 0,
        providers: affiliateProviders,
        cheapestProvider: cheapest
          ? {
              registrar: cheapest.registrar,
              price: cheapest.price,
              affiliateUrl: cheapest.affiliateUrl,
            }
          : null,
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Check domain API error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
