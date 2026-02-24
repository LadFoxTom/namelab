import { NextRequest } from "next/server";
import { generateDomainSuggestions } from "@/lib/anthropic";
import { checkDomainsAvailability, buildDomainResult } from "@/lib/check-availability";
import { generateAffiliateUrl } from "@/lib/affiliate";
import { checkRateLimit, getUserTier } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { qualityGate } from "@/lib/scoring/quality-gate";
import { computeLqs } from "@/lib/scoring/lqs";
import { extractKeywords } from "@/lib/generation/keyword-extract";
import { selectPipelines, runPipelines } from "@/lib/generation/pipelines";
import { resolveLengthPreset, buildTonePrompt } from "@/lib/generation/prompts";
import {
  GenerateRequest,
  DomainResult,
  DomainSuggestion,
  ProviderResult,
  StreamEvent,
} from "@/lib/types";

// Allow up to 180s on Vercel Pro (Hobby: 10s, Pro: 60s default, max 300s)
export const maxDuration = 180;

const TIME_LIMIT_MS = 180_000; // 3 minutes

function sseEncode(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as GenerateRequest;
  const {
    businessIdea, userId, count, tlds,
    includeWords, excludeWords,
    minLength, maxLength,
    tones, structures, lengthPreset,
    minBrandScore, minLinguisticScore, minSeoScore,
  } = body;

  if (!businessIdea || typeof businessIdea !== "string" || businessIdea.trim().length === 0) {
    return new Response(
      sseEncode({ type: "error", message: "Business idea is required." }),
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }
    );
  }

  // Check rate limits
  const { allowed } = await checkRateLimit(userId || null);
  if (!allowed) {
    return new Response(
      sseEncode({ type: "error", message: "Daily limit reached. Upgrade to Pro for unlimited searches." }),
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }
    );
  }

  const tier = await getUserTier(userId || null);
  const tierMax = tier === "free" ? 10 : 20;
  const desiredCount = count || tierMax;

  // Resolve length preset
  let resolvedMin = minLength;
  let resolvedMax = maxLength;
  if (lengthPreset && lengthPreset !== "custom") {
    const preset = resolveLengthPreset(lengthPreset);
    if (preset) {
      resolvedMin = preset.min;
      resolvedMax = preset.max;
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();

      function send(event: StreamEvent) {
        try {
          controller.enqueue(new TextEncoder().encode(sseEncode(event)));
        } catch {
          // Stream may be closed
        }
      }

      function elapsedSec(): number {
        return Math.round((Date.now() - startTime) / 1000);
      }

      try {
        // Extract keywords once
        let keywords;
        try {
          keywords = await extractKeywords(businessIdea);
          console.log("[Generate] Keywords extracted:", keywords);
        } catch (err) {
          console.error("[Generate] Keyword extraction failed:", err);
          keywords = {
            primaryKeywords: [],
            emotionalTone: "professional",
            industryVertical: "general",
            targetAudience: "general audience",
          };
        }

        const activePipelines = selectPipelines(structures);
        console.log(`[Generate] Active pipelines: ${activePipelines.map(p => p.id).join(", ")}`);

        const toneModifier = tones ? buildTonePrompt(tones) : "";

        const availableResults: DomainResult[] = [];
        const alreadyTried: string[] = [];
        const allSuggestions: DomainSuggestion[] = [];
        const allProviderMap = new Map<string, ProviderResult[]>();
        let industry: string | undefined;
        let iteration = 0;

        // Time-based loop: keep going until target met or 3 minutes elapsed
        while (availableResults.length < desiredCount && (Date.now() - startTime) < TIME_LIMIT_MS) {
          iteration++;
          const remainingNeeded = desiredCount - availableResults.length;
          const generateCount = Math.min(Math.max(remainingNeeded * 4, 15), 50);

          console.log(`[Generate] Iteration ${iteration}: need ${remainingNeeded} more, generating ${generateCount} suggestions (${alreadyTried.length} tried, ${elapsedSec()}s elapsed)`);

          // Send progress event
          send({
            type: "progress",
            found: availableResults.length,
            target: desiredCount,
            elapsed: elapsedSec(),
            timeLimit: TIME_LIMIT_MS / 1000,
            iteration,
          });

          let suggestions: DomainSuggestion[];

          // Use multi-pipeline for first iteration, single call for retries
          if (iteration === 1) {
            try {
              suggestions = await runPipelines(
                activePipelines, businessIdea, keywords, tlds || [],
                includeWords, excludeWords,
                alreadyTried.length > 0 ? alreadyTried : undefined,
                resolvedMin, resolvedMax, toneModifier
              );
              industry = keywords.industryVertical;
            } catch (err) {
              console.error("[Generate] Pipeline failed, falling back:", err);
              const aiResponse = await generateDomainSuggestions(
                businessIdea, generateCount, tlds,
                includeWords, excludeWords,
                alreadyTried.length > 0 ? alreadyTried : undefined,
                resolvedMin, resolvedMax, tones, structures
              );
              if (!industry) industry = aiResponse.industry;
              suggestions = aiResponse.suggestions;
            }
          } else {
            const aiResponse = await generateDomainSuggestions(
              businessIdea, generateCount, tlds,
              includeWords, excludeWords,
              alreadyTried.length > 0 ? alreadyTried : undefined,
              resolvedMin, resolvedMax, tones, structures
            );
            if (!industry) industry = aiResponse.industry;
            suggestions = aiResponse.suggestions;
          }

          // Quality gate + LQS scoring
          const gatedSuggestions: DomainSuggestion[] = [];
          for (const suggestion of suggestions) {
            if (alreadyTried.includes(suggestion.domain)) continue;

            const gate = qualityGate(suggestion.domain);
            if (!gate.passed) {
              console.log(`[QualityGate] Rejected "${suggestion.domain}": ${gate.reason}`);
              alreadyTried.push(suggestion.domain);
              continue;
            }

            const lqs = computeLqs(suggestion.domain);
            suggestion.memorabilityScore = lqs.total;
            suggestion.lqsScore = lqs.total;

            gatedSuggestions.push(suggestion);
            alreadyTried.push(suggestion.domain);
          }

          console.log(`[Generate] ${gatedSuggestions.length}/${suggestions.length} passed quality gate`);
          if (gatedSuggestions.length === 0) continue;

          allSuggestions.push(...gatedSuggestions);
          const domainNames = gatedSuggestions.map((s) => s.domain);

          // Check availability
          const providerMap = await checkDomainsAvailability(domainNames);
          providerMap.forEach((providers, key) => {
            allProviderMap.set(key, providers);
          });

          // Build results + score threshold filtering
          for (const suggestion of gatedSuggestions) {
            if (availableResults.length >= desiredCount) break;

            const result = buildDomainResult(suggestion, providerMap);
            if (!result) continue;

            // Apply score minimums
            const lqs = result.lqsScore ?? result.memorabilityScore;
            if (minBrandScore && result.brandabilityScore < minBrandScore) {
              console.log(`[ScoreFilter] "${result.domain}" brand ${result.brandabilityScore} < ${minBrandScore}`);
              continue;
            }
            if (minLinguisticScore && lqs < minLinguisticScore) {
              console.log(`[ScoreFilter] "${result.domain}" linguistic ${lqs} < ${minLinguisticScore}`);
              continue;
            }
            if (minSeoScore && result.seoScore < minSeoScore) {
              console.log(`[ScoreFilter] "${result.domain}" seo ${result.seoScore} < ${minSeoScore}`);
              continue;
            }

            availableResults.push(result);

            // Stream this domain to client immediately
            send({ type: "domain", domain: result });
          }

          console.log(`[Generate] Iteration ${iteration}: ${availableResults.length}/${desiredCount} available (${elapsedSec()}s)`);
        }

        // Final progress
        send({
          type: "progress",
          found: availableResults.length,
          target: desiredCount,
          elapsed: elapsedSec(),
          timeLimit: TIME_LIMIT_MS / 1000,
          iteration,
        });

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
                    lqsScore: s.lqsScore || null,
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

        // Send done
        send({
          type: "done",
          found: availableResults.length,
          target: desiredCount,
          elapsed: elapsedSec(),
          timeLimit: TIME_LIMIT_MS / 1000,
          iteration,
        });
      } catch (error) {
        console.error("Generate API error:", error);
        send({ type: "error", message: "Something went wrong. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
