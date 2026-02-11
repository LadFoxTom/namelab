"use client";

import { useState } from "react";
import { TldVariation } from "@/lib/types";
import { useCurrency } from "./CurrencyContext";
import { formatPrice } from "@/lib/currency";

interface TldVariationRowProps {
  variation: TldVariation;
  isOriginal?: boolean;
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
    // silent
  }
  window.open(affiliateUrl, "_blank", "noopener,noreferrer");
}

export default function TldVariationRow({
  variation,
  isOriginal,
}: TldVariationRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { currency } = useCurrency();

  return (
    <div
      className={`bg-white rounded-2xl border p-3 sm:p-5 transition-all duration-300 ${
        isOriginal
          ? "border-purple-300 ring-2 ring-purple-100"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap sm:flex-nowrap">
          <span className="font-mono text-sm sm:text-lg text-gray-900 truncate">
            {variation.domain}
          </span>
          <span
            className={`shrink-0 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium uppercase tracking-wider ${
              variation.available
                ? "bg-green-50 text-green-600"
                : "bg-red-50 text-red-500"
            }`}
          >
            {variation.available ? "Available" : "Taken"}
          </span>
          {isOriginal && (
            <span className="shrink-0 px-2 sm:px-2.5 py-0.5 rounded-full bg-purple-50 text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-purple-600">
              Original
            </span>
          )}
        </div>

        {variation.available && variation.cheapestProvider ? (
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="text-right">
              <span className="text-sm sm:text-lg font-light text-gray-900">
                {formatPrice(variation.cheapestProvider.price, currency)}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-400">/yr</span>
              <div className="text-[10px] text-gray-400 hidden sm:block">
                via {getRegistrarLabel(variation.cheapestProvider.registrar)}
              </div>
            </div>
            <button
              onClick={() =>
                trackClick(
                  variation.domain,
                  variation.cheapestProvider!.registrar,
                  variation.cheapestProvider!.affiliateUrl
                )
              }
              className="bg-black text-white rounded-full px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium hover:scale-105 transition-transform"
            >
              Buy
            </button>
          </div>
        ) : !variation.available ? (
          <div className="text-xs sm:text-sm text-gray-400 italic truncate max-w-[100px] sm:max-w-[200px] shrink-0">
            {variation.siteTitle || "In use"}
          </div>
        ) : null}
      </div>

      {/* Expandable registrar comparison */}
      {variation.available && variation.providers.length > 1 && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 transition-colors"
          >
            <span>
              {expanded ? "Hide" : "Compare"} {variation.providers.length}{" "}
              registrars
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
            <div className="space-y-2 mt-3">
              {variation.providers.map((provider, idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    trackClick(
                      variation.domain,
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
    </div>
  );
}
