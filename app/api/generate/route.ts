import { NextRequest, NextResponse } from "next/server";
import { generateDomainSuggestions } from "@/lib/anthropic";
import { checkNamecheapAvailability } from "@/lib/namecheap";
import { checkGoDaddyAvailability } from "@/lib/godaddy";
import { checkNameSiloAvailability } from "@/lib/namesilo";
import { generateAffiliateUrl } from "@/lib/affiliate";
import { checkRateLimit, getUserTier } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  GenerateRequest,
  DomainResult,
  ProviderResult,
  AffiliateProvider,
} from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateRequest;
    const { businessIdea, userId } = body;

    if (!businessIdea || typeof businessIdea !== "string" || businessIdea.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "INVALID_INPUT", message: "Business idea is required." },
        { status: 400 }
      );
    }

    // Check rate limits
    const { allowed } = await checkRateLimit(userId || null);
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "RATE_LIMIT_EXCEEDED",
          message: "Daily limit reached. Upgrade to Pro for unlimited searches.",
        },
        { status: 429 }
      );
    }

    // Determine max suggestions based on tier
    const tier = await getUserTier(userId || null);
    const maxSuggestions = tier === "free" ? 10 : 20;

    // Generate domain suggestions via Claude
    const aiResponse = await generateDomainSuggestions(businessIdea, maxSuggestions);
    const { industry, suggestions } = aiResponse;

    const domainNames = suggestions.map((s) => s.domain);

    // Check availability across all registrars in parallel
    const [namecheapResults, godaddyResults, namesiloResults] =
      await Promise.allSettled([
        checkNamecheapAvailability(domainNames),
        checkGoDaddyAvailability(domainNames),
        checkNameSiloAvailability(domainNames),
      ]);

    // Build a lookup map: domain -> provider results
    const providerMap = new Map<string, ProviderResult[]>();
    const allResults = [
      ...(namecheapResults.status === "fulfilled" ? namecheapResults.value : []),
      ...(godaddyResults.status === "fulfilled" ? godaddyResults.value : []),
      ...(namesiloResults.status === "fulfilled" ? namesiloResults.value : []),
    ];

    console.log("Total provider results:", allResults.length);
    console.log("Provider results:", allResults.map(r => `${r.domain}: ${r.available} (${r.registrar})`));

    for (const result of allResults) {
      const key = result.domain.toLowerCase();
      if (!providerMap.has(key)) {
        providerMap.set(key, []);
      }
      providerMap.get(key)!.push(result);
    }

    // Combine AI suggestions with availability data
    const results: DomainResult[] = [];

    for (const suggestion of suggestions) {
      const domainKey = suggestion.domain.toLowerCase();
      const providers = providerMap.get(domainKey) || [];

      // Determine if the domain is available from any provider
      const availableProviders = providers.filter((p) => p.available);
      const isAvailable = availableProviders.length > 0;

      if (!isAvailable) continue; // Only return available domains

      // Build provider list with affiliate URLs
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

      // Find cheapest provider
      const cheapest = affiliateProviders.reduce(
        (min, p) => (p.price < min.price ? p : min),
        affiliateProviders[0]
      );

      results.push({
        id: `sug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
      });
    }

    // Save to database
    try {
      await prisma.search.create({
        data: {
          userId: userId || null,
          businessIdea,
          industry: industry || null,
          suggestions: {
            create: suggestions.map((s) => {
              const domainKey = s.domain.toLowerCase();
              const providers = providerMap.get(domainKey) || [];
              const availableFromAny = providers.some((p) => p.available);

              return {
                domain: s.domain,
                available: availableFromAny,
                reasoning: s.reasoning,
                namingStrategy: s.namingStrategy,
                brandabilityScore: s.brandabilityScore,
                memorabilityScore: s.memorabilityScore,
                seoScore: s.seoScore,
                providers: {
                  create: providers.map((p) => ({
                    registrar: p.registrar,
                    price: p.price,
                    currency: "USD",
                    affiliateUrl: generateAffiliateUrl(
                      s.domain,
                      p.registrar as "namecheap" | "godaddy" | "namesilo"
                    ),
                    available: p.available,
                    isPremium: p.isPremium,
                  })),
                },
              };
            }),
          },
        },
      });
    } catch (dbError) {
      // Log but don't fail the request if DB save fails
      console.error("Database save error:", dbError);
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
