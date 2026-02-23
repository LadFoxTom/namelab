import { NextRequest, NextResponse } from "next/server";
import { generateDomainSuggestions } from "@/lib/anthropic";
import { checkDomainsAvailability, buildDomainResult } from "@/lib/check-availability";
import { generateAffiliateUrl } from "@/lib/affiliate";
import { checkRateLimit, getUserTier } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  GenerateRequest,
  DomainResult,
  DomainSuggestion,
  ProviderResult,
} from "@/lib/types";

const MAX_ITERATIONS = 3;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateRequest;
    const { businessIdea, userId, count, tlds, includeWords, excludeWords } = body;

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

    const tier = await getUserTier(userId || null);
    const tierMax = tier === "free" ? 10 : 20;
    const desiredCount = count || tierMax;

    // Iterative generate-check loop
    const availableResults: DomainResult[] = [];
    const alreadyTried: string[] = [];
    const allSuggestions: DomainSuggestion[] = [];
    const allProviderMap = new Map<string, ProviderResult[]>();
    let industry: string | undefined;

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const remainingNeeded = desiredCount - availableResults.length;
      const generateCount = Math.min(Math.max(remainingNeeded * 3, 6), 30);

      console.log(`[Generate] Iteration ${iteration + 1}/${MAX_ITERATIONS}: need ${remainingNeeded} more, generating ${generateCount} suggestions (${alreadyTried.length} already tried)`);

      // Generate domain suggestions via AI
      const aiResponse = await generateDomainSuggestions(
        businessIdea,
        generateCount,
        tlds,
        includeWords,
        excludeWords,
        alreadyTried.length > 0 ? alreadyTried : undefined
      );

      if (!industry) {
        industry = aiResponse.industry;
      }

      const { suggestions } = aiResponse;
      allSuggestions.push(...suggestions);

      const domainNames = suggestions.map((s) => s.domain);

      // Check availability across all registrars
      const providerMap = await checkDomainsAvailability(domainNames);

      // Merge into allProviderMap for DB save
      providerMap.forEach((providers, key) => {
        allProviderMap.set(key, providers);
      });

      // Build results, filter to available only
      for (const suggestion of suggestions) {
        alreadyTried.push(suggestion.domain);

        const result = buildDomainResult(suggestion, providerMap);
        if (result) {
          availableResults.push(result);
        }
      }

      console.log(`[Generate] Iteration ${iteration + 1}: found ${availableResults.length}/${desiredCount} available domains`);

      if (availableResults.length >= desiredCount) {
        break;
      }
    }

    // Save to database
    try {
      await prisma.search.create({
        data: {
          userId: userId || null,
          businessIdea,
          industry: industry || null,
          suggestions: {
            create: allSuggestions.map((s) => {
              const domainKey = s.domain.toLowerCase();
              const providers = allProviderMap.get(domainKey) || [];
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
      console.error("Database save error:", dbError);
    }

    // Trim to the user's desired count
    const finalResults = availableResults.slice(0, desiredCount);

    return NextResponse.json({ success: true, results: finalResults });
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
