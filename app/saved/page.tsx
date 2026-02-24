"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { useSavedDomains } from "@/components/SavedDomainsContext";
import DomainCard from "@/components/DomainCard";
import LoginModal from "@/components/LoginModal";
import Navbar from "@/components/Navbar";
import { DomainResult } from "@/lib/types";

type SortOption = "score" | "price" | "name" | "date";

function sortDomains(domains: DomainResult[], sortBy: SortOption): DomainResult[] {
  return [...domains].sort((a, b) => {
    if (sortBy === "score") {
      const lqsA = a.lqsScore ?? a.memorabilityScore;
      const lqsB = b.lqsScore ?? b.memorabilityScore;
      const scoreA = (a.brandabilityScore + lqsA + a.seoScore) / 3;
      const scoreB = (b.brandabilityScore + lqsB + b.seoScore) / 3;
      return scoreB - scoreA;
    }
    if (sortBy === "price") {
      const priceA = a.cheapestProvider?.price ?? Infinity;
      const priceB = b.cheapestProvider?.price ?? Infinity;
      return priceA - priceB;
    }
    if (sortBy === "name") {
      return a.domain.localeCompare(b.domain);
    }
    // date: already sorted by savedAt desc from API
    return 0;
  });
}

export default function SavedPage() {
  const { user, loading } = useAuth();
  const { savedDomains } = useSavedDomains();
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [showLoginModal, setShowLoginModal] = useState(false);

  const sorted = sortDomains(savedDomains, sortBy);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white pt-20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 py-12 sm:py-24">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-6 sm:mb-10 gap-3 sm:gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-light text-gray-900 mb-2">
                Saved Domains
              </h1>
              <p className="text-gray-500 font-light">
                {savedDomains.length} domain{savedDomains.length !== 1 ? "s" : ""} saved
              </p>
            </div>

            {savedDomains.length > 0 && (
              <div className="flex gap-2">
                {([
                  { label: "Recent", value: "date" as SortOption, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
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
            )}
          </div>

          {/* Not logged in */}
          {!loading && !user && (
            <div className="text-center py-24">
              <svg className="w-16 h-16 text-gray-200 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <h2 className="text-xl font-light text-gray-900 mb-2">
                Sign in to save domains
              </h2>
              <p className="text-gray-400 font-light mb-6">
                Create an account to save your favorite domains and revisit them later.
              </p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full text-sm font-medium hover:shadow-lg hover:shadow-purple-200/50 hover:scale-105 transition-all duration-200"
              >
                Sign in or create account
              </button>
            </div>
          )}

          {/* Logged in but no saved domains */}
          {!loading && user && savedDomains.length === 0 && (
            <div className="text-center py-24">
              <svg className="w-16 h-16 text-gray-200 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <h2 className="text-xl font-light text-gray-900 mb-2">
                No saved domains yet
              </h2>
              <p className="text-gray-400 font-light">
                Click the heart icon on any domain to save it here.
              </p>
            </div>
          )}

          {/* Saved domains grid */}
          {user && sorted.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 xl:gap-8">
              {sorted.map((domain, index) => (
                <DomainCard
                  key={domain.id}
                  domain={domain}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          initialTab="signup"
        />
      )}
    </>
  );
}
