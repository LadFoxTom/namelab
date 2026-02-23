"use client";

import { useState } from "react";
import Link from "next/link";
import { DomainResult } from "@/lib/types";
import { useCurrency } from "./CurrencyContext";
import { formatPrice } from "@/lib/currency";

interface DomainCardProps {
  domain: DomainResult;
  index: number;
  onMoreLikeThis?: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 90) return "bg-gradient-to-br from-purple-400 to-indigo-500";
  if (score >= 80) return "bg-gradient-to-br from-blue-400 to-cyan-400";
  if (score >= 70) return "bg-gradient-to-br from-pink-400 to-rose-400";
  if (score >= 60) return "bg-gradient-to-br from-green-400 to-emerald-500";
  return "bg-gradient-to-br from-orange-400 to-amber-500";
}

function getBarColor(score: number): string {
  if (score >= 90) return "from-purple-400 to-indigo-500";
  if (score >= 80) return "from-blue-400 to-cyan-400";
  if (score >= 70) return "from-pink-400 to-rose-400";
  if (score >= 60) return "from-green-400 to-emerald-500";
  return "from-orange-400 to-amber-500";
}

function ScoreBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-1 sm:gap-1.5 w-[70px] sm:w-[90px] shrink-0">
        <span className="text-gray-400">{icon}</span>
        <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium">{label}</span>
      </div>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getBarColor(score)} transition-all duration-700 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 w-7 text-right">{score}</span>
    </div>
  );
}

function getRegistrarLabel(registrar: string): string {
  const labels: Record<string, string> = {
    namecheap: "Namecheap",
    godaddy: "GoDaddy",
    namesilo: "NameSilo",
  };
  return labels[registrar] || registrar;
}

function getRegistrarInitial(registrar: string): string {
  const initials: Record<string, string> = {
    namecheap: "N",
    godaddy: "G",
    namesilo: "S",
  };
  return initials[registrar] || "?";
}

async function trackClick(
  domain: string,
  registrar: string,
  affiliateUrl: string
) {
  try {
    await fetch("/api/track-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, registrar, affiliateUrl }),
    });
  } catch {
    // Don't block the user if tracking fails
  }
  window.open(affiliateUrl, "_blank", "noopener,noreferrer");
}

export default function DomainCard({ domain, index, onMoreLikeThis }: DomainCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { currency } = useCurrency();

  const hasScores = domain.brandabilityScore > 0 || domain.memorabilityScore > 0 || domain.seoScore > 0;
  const avgScore = hasScores
    ? Math.round((domain.brandabilityScore + domain.memorabilityScore + domain.seoScore) / 3)
    : 0;
  const scoreColor = getScoreColor(avgScore);
  const tld = "." + domain.domain.split(".").pop()?.toUpperCase();
  const cheapest = domain.cheapestProvider;
  const baseName = domain.domain.split(".")[0];
  const detailUrl = `/domain/${encodeURIComponent(baseName)}?tld=.${domain.domain.split(".").pop()}&brand=${domain.brandabilityScore}&memory=${domain.memorabilityScore}&seo=${domain.seoScore}&strategy=${encodeURIComponent(domain.namingStrategy)}&reasoning=${encodeURIComponent(domain.reasoning)}`;

  return (
    <div
      className="group bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-4 sm:p-6 md:p-8 hover:border-purple-200 hover:shadow-floating transition-all duration-300 relative overflow-hidden animate-slide-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4 sm:mb-6 gap-3">
          <div className="min-w-0">
            <Link
              href={detailUrl}
              className="font-mono text-xl sm:text-2xl md:text-3xl text-gray-900 tracking-tight hover:text-purple-600 transition-colors block truncate"
            >
              {domain.domain}
            </Link>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex px-2.5 py-1 rounded-full bg-gray-100 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                {tld}
              </span>
              <span className="inline-flex px-2.5 py-1 rounded-full bg-green-50 text-[10px] font-medium uppercase tracking-wider text-green-600">
                Available
              </span>
              {hasScores && <span className="inline-flex px-2.5 py-1 rounded-full bg-purple-50 text-[10px] font-medium uppercase tracking-wider text-purple-600">
                {domain.namingStrategy}
              </span>}
              <Link
                href={detailUrl}
                className="inline-flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-600 transition-colors ml-1"
              >
                Check all TLDs
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
          {hasScores && <div className="flex flex-col items-center shrink-0">
            <div
              className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-2xl font-light text-white shadow-sm ${scoreColor}`}
            >
              <span>{avgScore}</span>
            </div>
            <Link href="/scoring" className="text-[10px] uppercase tracking-wider text-gray-400 mt-1 font-medium hover:text-purple-500 transition-colors cursor-pointer">
              Score
            </Link>
          </div>}
        </div>

        {hasScores && (
          <div className="mb-3 sm:mb-4 min-h-[48px] sm:min-h-[60px]">
            <p className="text-gray-600 text-xs sm:text-sm leading-relaxed font-light">
              {domain.reasoning}
            </p>
          </div>
        )}

        {/* Score breakdown */}
        {hasScores && (
          <div className="mb-4 sm:mb-6 space-y-2 p-3 sm:p-4 bg-gray-50/80 rounded-xl sm:rounded-2xl">
            <ScoreBar
              label="Brand"
              score={domain.brandabilityScore}
              icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
            />
            <ScoreBar
              label="Memory"
              score={domain.memorabilityScore}
              icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
            />
            <ScoreBar
              label="SEO"
              score={domain.seoScore}
              icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
            <div className="pt-1">
              <Link href="/scoring" className="text-[10px] text-gray-400 hover:text-purple-500 transition-colors">
                How are scores calculated?
              </Link>
            </div>
          </div>
        )}

        <div className="h-px w-full bg-gray-100 mb-4 sm:mb-6"></div>

        <div className="flex items-center justify-between gap-3">
          <div>
            {cheapest && (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-light text-gray-900">
                    {formatPrice(cheapest.price, currency)}
                  </span>
                  <span className="text-xs text-gray-400">/yr</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-400">
                    via {getRegistrarLabel(cheapest.registrar)}
                  </span>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => {
              if (cheapest) {
                trackClick(
                  domain.domain,
                  cheapest.registrar,
                  cheapest.affiliateUrl
                );
              }
            }}
            className="bg-black text-white rounded-full px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-medium hover:scale-105 transition-transform flex items-center gap-2 group-hover:shadow-lg shrink-0"
          >
            Buy Now
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </button>
        </div>

        {domain.providers.length > 1 && (
          <div className="mt-4 pt-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-900 transition-colors py-2"
            >
              <span>
                {expanded ? "Hide comparison" : "Compare registrars"}
              </span>
              <svg
                className={`w-3 h-3 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {expanded && (
              <div className="space-y-2 mt-4">
                {domain.providers.map((provider, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      trackClick(
                        domain.domain,
                        provider.registrar,
                        provider.affiliateUrl
                      )
                    }
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50/80 hover:bg-white border border-transparent hover:border-gray-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-[10px] font-medium">
                        {getRegistrarInitial(provider.registrar)}
                      </div>
                      <span className="text-sm text-gray-600">
                        {getRegistrarLabel(provider.registrar)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {formatPrice(provider.price, currency)}
                      </span>
                      <div className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white transition-colors">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {hasScores && onMoreLikeThis && (
          <div className="mt-4 pt-2 border-t border-gray-100">
            <button
              onClick={onMoreLikeThis}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-purple-400 hover:text-purple-600 transition-colors py-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>More like this</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
