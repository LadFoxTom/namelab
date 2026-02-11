"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TldVariationRow from "@/components/TldVariationRow";
import { TldVariation, TldCheckResponse } from "@/lib/types";

function ScoreBar({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 font-medium w-16 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 w-6 text-right">
        {score}
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-6 w-40 bg-gray-100 rounded-lg" />
              <div className="h-5 w-16 bg-gray-100 rounded-full" />
            </div>
            <div className="h-8 w-20 bg-gray-100 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DomainDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const name = params.name as string;

  // Retrieve original data from query params
  const originalTld = searchParams.get("tld");
  const reasoning = searchParams.get("reasoning");
  const namingStrategy = searchParams.get("strategy");
  const brandScore = searchParams.get("brand")
    ? parseInt(searchParams.get("brand")!)
    : null;
  const memoryScore = searchParams.get("memory")
    ? parseInt(searchParams.get("memory")!)
    : null;
  const seoScore = searchParams.get("seo")
    ? parseInt(searchParams.get("seo")!)
    : null;

  const hasScores =
    brandScore !== null && memoryScore !== null && seoScore !== null;
  const avgScore = hasScores
    ? Math.round((brandScore! + memoryScore! + seoScore!) / 3)
    : null;

  const [loading, setLoading] = useState(true);
  const [variations, setVariations] = useState<TldVariation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVariations() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/check-tlds?name=${encodeURIComponent(name)}`
        );
        const data: TldCheckResponse = await res.json();
        if (data.success) {
          // Sort: available first, then by TLD preference
          const tldOrder = [".com", ".io", ".ai", ".co", ".net", ".app", ".nl", ".dev", ".xyz", ".org"];
          const sorted = [...data.variations].sort((a, b) => {
            if (a.available !== b.available) return a.available ? -1 : 1;
            return tldOrder.indexOf(a.tld) - tldOrder.indexOf(b.tld);
          });
          setVariations(sorted);
        } else {
          setError(data.error || "Failed to check TLD variations");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (name) fetchVariations();
  }, [name]);

  const availableCount = variations.filter((v) => v.available).length;
  const takenCount = variations.filter((v) => !v.available).length;

  return (
    <div className="bg-white text-gray-800 font-sans min-h-screen selection:bg-pastel-purple selection:text-purple-900">
      <Navbar />

      <main className="pt-24 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 md:px-12 max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to results
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
            <div className="min-w-0 w-full sm:w-auto">
              <h1 className="font-mono text-2xl sm:text-4xl md:text-5xl text-gray-900 tracking-tight mb-2 break-all sm:break-normal">
                {name}
              </h1>
              {namingStrategy && (
                <span className="inline-flex px-3 py-1 rounded-full bg-purple-50 text-xs font-medium uppercase tracking-wider text-purple-600">
                  {namingStrategy}
                </span>
              )}
              {reasoning && (
                <p className="text-gray-500 text-sm font-light mt-4 max-w-2xl leading-relaxed">
                  {reasoning}
                </p>
              )}
            </div>

            {hasScores && (
              <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 w-full sm:w-64 shrink-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xl font-light text-white">
                    {avgScore}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Overall Score
                    </div>
                    <Link
                      href="/scoring"
                      className="text-[10px] text-gray-400 hover:text-purple-500 transition-colors"
                    >
                      How is this calculated?
                    </Link>
                  </div>
                </div>
                <div className="space-y-2">
                  <ScoreBar
                    label="Brand"
                    score={brandScore!}
                    color="from-purple-400 to-indigo-500"
                  />
                  <ScoreBar
                    label="Memory"
                    score={memoryScore!}
                    color="from-amber-400 to-orange-400"
                  />
                  <ScoreBar
                    label="SEO"
                    score={seoScore!}
                    color="from-blue-400 to-cyan-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TLD Variations Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                TLD Availability
              </h2>
              <p className="text-sm text-gray-400 font-light mt-1">
                Checking {name} across all major extensions
              </p>
            </div>
            {!loading && (
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-gray-500">
                    {availableCount} available
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-gray-500">{takenCount} taken</span>
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center mb-6">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <LoadingSkeleton />
          ) : (
            <div className="space-y-3">
              {variations.map((variation) => (
                <TldVariationRow
                  key={variation.domain}
                  variation={variation}
                  isOriginal={originalTld === variation.tld}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info box */}
        {!loading && takenCount > 0 && (
          <div className="p-6 bg-amber-50/50 border border-amber-100 rounded-2xl">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  Brand consideration
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {takenCount} TLD variation{takenCount > 1 ? "s are" : " is"}{" "}
                  already taken. If key extensions like .com are occupied by
                  established brands, this may impact your brand&apos;s
                  discoverability. Consider choosing a name where the .com is
                  available, or where taken extensions are unrelated to your
                  industry.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
