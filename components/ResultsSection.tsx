"use client";

import DomainCard from "./DomainCard";
import { DomainResult } from "@/lib/types";

interface ResultsSectionProps {
  domains: DomainResult[];
}

export default function ResultsSection({ domains }: ResultsSectionProps) {
  return (
    <section
      id="results"
      className="max-w-[1440px] mx-auto px-6 md:px-12 py-24 min-h-screen"
    >
      <div className="flex items-end justify-between mb-16">
        <div>
          <h2 className="text-4xl font-light text-gray-900 mb-2">
            Curated Results
          </h2>
          <p className="text-gray-500 font-light">
            AI-generated domains based on semantic availability.
          </p>
        </div>
        <div className="hidden md:flex gap-2">
          <button className="px-4 py-2 rounded-full border border-gray-200 text-sm hover:border-black transition-colors">
            Filter
          </button>
          <button className="px-4 py-2 rounded-full border border-gray-200 text-sm hover:border-black transition-colors">
            Sort by Value
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {domains.map((domain, index) => (
          <DomainCard key={domain.id} domain={domain} index={index} />
        ))}
      </div>
    </section>
  );
}
