"use client";

import { useState } from "react";
import DomainCard from "./DomainCard";
import { DomainResult } from "@/lib/types";

const TLD_FILTERS = [
  { label: "All", value: "all" },
  { label: ".com", value: ".com" },
  { label: ".io", value: ".io" },
  { label: ".ai", value: ".ai" },
  { label: ".co", value: ".co" },
  { label: ".nl", value: ".nl" },
  { label: ".net", value: ".net" },
  { label: ".app", value: ".app" },
];

type SortOption = "score" | "price" | "name";

interface ResultsSectionProps {
  domains: DomainResult[];
  loading: boolean;
  onRegenerate: () => void;
  onMoreLikeThis: (domain: DomainResult) => void;
}

export default function ResultsSection({
  domains,
  loading,
  onRegenerate,
  onMoreLikeThis,
}: ResultsSectionProps) {
  const [activeTld, setActiveTld] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("score");

  const filtered = domains
    .filter((d) => {
      if (activeTld === "all") return true;
      return d.domain.toLowerCase().endsWith(activeTld);
    })
    .sort((a, b) => {
      if (sortBy === "score") {
        const scoreA = (a.brandabilityScore + a.memorabilityScore + a.seoScore) / 3;
        const scoreB = (b.brandabilityScore + b.memorabilityScore + b.seoScore) / 3;
        return scoreB - scoreA;
      }
      if (sortBy === "price") {
        const priceA = a.cheapestProvider?.price ?? Infinity;
        const priceB = b.cheapestProvider?.price ?? Infinity;
        return priceA - priceB;
      }
      return a.domain.localeCompare(b.domain);
    });

  // Detect which TLDs actually exist in results
  const availableTlds = new Set(
    domains.map((d) => "." + d.domain.split(".").pop()?.toLowerCase())
  );

  return (
    <section
      id="results"
      className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 py-12 sm:py-24 min-h-screen"
    >
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-6 sm:mb-10 gap-3 sm:gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-gray-900 mb-2">
            Curated Results
          </h2>
          <p className="text-gray-500 font-light">
            {filtered.length} domain{filtered.length !== 1 ? "s" : ""} found
            {activeTld !== "all" ? ` for ${activeTld}` : ""}
          </p>
        </div>

        <button
          onClick={onRegenerate}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:border-black hover:text-black transition-all disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Regenerate
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 sm:mb-10">
        {/* TLD filters */}
        <div className="flex flex-wrap gap-2">
          {TLD_FILTERS.filter(
            (f) => f.value === "all" || availableTlds.has(f.value)
          ).map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveTld(filter.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeTld === filter.value
                  ? "bg-black text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden md:block h-6 w-px bg-gray-200"></div>

        {/* Sort options */}
        <div className="flex gap-2">
          {([
            { label: "Top Score", value: "score" as SortOption, icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
            { label: "Lowest Price", value: "price" as SortOption, icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            { label: "A-Z", value: "name" as SortOption, icon: "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" },
          ]).map((option) => (
            <button
              key={option.value}
              onClick={() => setSortBy(option.value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                sortBy === option.value
                  ? "bg-purple-50 text-purple-600 border border-purple-200"
                  : "text-gray-400 hover:text-gray-600 border border-transparent"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
              </svg>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 xl:gap-8">
        {filtered.map((domain, index) => (
          <DomainCard
            key={domain.id}
            domain={domain}
            index={index}
            onMoreLikeThis={() => onMoreLikeThis(domain)}
          />
        ))}
      </div>

      {filtered.length === 0 && domains.length > 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 font-light">
            No domains match the <span className="font-medium">{activeTld}</span> filter.
          </p>
          <button
            onClick={() => setActiveTld("all")}
            className="mt-4 text-sm text-purple-500 hover:text-purple-700 font-medium"
          >
            Clear filter
          </button>
        </div>
      )}
    </section>
  );
}
