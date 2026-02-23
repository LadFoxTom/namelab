import { checkNamecheapAvailability } from "@/lib/namecheap";
import { checkGoDaddyAvailability } from "@/lib/godaddy";
import { checkNameSiloAvailability } from "@/lib/namesilo";
import { generateAffiliateUrl } from "@/lib/affiliate";
import {
  ProviderResult,
  AffiliateProvider,
  DomainResult,
  DomainSuggestion,
} from "@/lib/types";

/**
 * Check domain availability across all registrars in parallel.
 * Returns a map of domain -> ProviderResult[].
 */
export async function checkDomainsAvailability(
  domainNames: string[]
): Promise<Map<string, ProviderResult[]>> {
  const [namecheapResults, godaddyResults, namesiloResults] =
    await Promise.allSettled([
      checkNamecheapAvailability(domainNames),
      checkGoDaddyAvailability(domainNames),
      checkNameSiloAvailability(domainNames),
    ]);

  const providerMap = new Map<string, ProviderResult[]>();
  const allResults: ProviderResult[] = [
    ...(namecheapResults.status === "fulfilled" ? namecheapResults.value : []),
    ...(godaddyResults.status === "fulfilled" ? godaddyResults.value : []),
    ...(namesiloResults.status === "fulfilled" ? namesiloResults.value : []),
  ];

  for (const result of allResults) {
    const key = result.domain.toLowerCase();
    if (!providerMap.has(key)) {
      providerMap.set(key, []);
    }
    providerMap.get(key)!.push(result);
  }

  return providerMap;
}

/**
 * Build a DomainResult from an AI suggestion + provider results.
 * Returns null if the domain is not available from any provider.
 */
export function buildDomainResult(
  suggestion: DomainSuggestion,
  providerMap: Map<string, ProviderResult[]>,
  idPrefix: string = "sug"
): DomainResult | null {
  const domainKey = suggestion.domain.toLowerCase();
  const providers = providerMap.get(domainKey) || [];
  const availableProviders = providers.filter((p) => p.available);

  if (availableProviders.length === 0) return null;

  const affiliateProviders: AffiliateProvider[] = availableProviders.map(
    (p) => ({
      registrar: p.registrar,
      price: p.price,
      affiliateUrl: generateAffiliateUrl(
        suggestion.domain,
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

  return {
    id: `${idPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    domain: suggestion.domain,
    reasoning: suggestion.reasoning,
    namingStrategy: suggestion.namingStrategy,
    brandabilityScore: suggestion.brandabilityScore,
    memorabilityScore: suggestion.memorabilityScore,
    seoScore: suggestion.seoScore,
    providers: affiliateProviders,
    cheapestProvider: cheapest
      ? {
          registrar: cheapest.registrar,
          price: cheapest.price,
          affiliateUrl: cheapest.affiliateUrl,
        }
      : null,
  };
}
