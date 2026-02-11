"use client";

import { useState } from "react";
import { DomainResult } from "@/lib/types";

interface DomainCardProps {
  domain: DomainResult;
  index: number;
}

function getScoreColor(score: number): string {
  if (score >= 90) return "bg-gradient-to-br from-purple-400 to-indigo-500";
  if (score >= 80) return "bg-gradient-to-br from-blue-400 to-cyan-400";
  if (score >= 70) return "bg-gradient-to-br from-pink-400 to-rose-400";
  if (score >= 60) return "bg-gradient-to-br from-green-400 to-emerald-500";
  return "bg-gradient-to-br from-orange-400 to-amber-500";
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

export default function DomainCard({ domain, index }: DomainCardProps) {
  const [expanded, setExpanded] = useState(false);

  const avgScore = Math.round(
    (domain.brandabilityScore + domain.memorabilityScore + domain.seoScore) / 3
  );
  const scoreColor = getScoreColor(avgScore);
  const tld = "." + domain.domain.split(".").pop()?.toUpperCase();
  const cheapest = domain.cheapestProvider;

  return (
    <div
      className="group bg-white rounded-3xl border border-gray-200 p-8 hover:border-purple-200 hover:shadow-floating transition-all duration-300 relative overflow-hidden animate-slide-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-mono text-3xl text-gray-900 tracking-tight">
              {domain.domain}
            </h3>
            <div className="flex gap-2 mt-2">
              <span className="inline-flex px-2.5 py-1 rounded-full bg-gray-100 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                {tld}
              </span>
              <span className="inline-flex px-2.5 py-1 rounded-full bg-green-50 text-[10px] font-medium uppercase tracking-wider text-green-600">
                Available
              </span>
              <span className="inline-flex px-2.5 py-1 rounded-full bg-purple-50 text-[10px] font-medium uppercase tracking-wider text-purple-600">
                {domain.namingStrategy}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-light text-white shadow-sm ${scoreColor}`}
            >
              <span>{avgScore}</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 mt-1 font-medium">
              Score
            </span>
          </div>
        </div>

        <div className="mb-8 min-h-[80px]">
          <p className="text-gray-600 text-sm leading-relaxed font-light">
            {domain.reasoning}
          </p>
        </div>

        <div className="h-px w-full bg-gray-100 mb-6"></div>

        <div className="flex items-center justify-between">
          <div>
            {cheapest && (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-light text-gray-900">
                    ${cheapest.price.toFixed(2)}
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
            className="bg-black text-white rounded-full px-6 py-3 text-sm font-medium hover:scale-105 transition-transform flex items-center gap-2 group-hover:shadow-lg"
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
                        ${provider.price.toFixed(2)}
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
      </div>
    </div>
  );
}
