"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTldPreferences } from "@/components/TldPreferencesContext";
import { TLD_CATEGORIES, TLD_REGISTRY, getTldsByCategory, DEFAULT_TLDS } from "@/lib/tlds";
import { useCurrency } from "@/components/CurrencyContext";
import { formatPrice } from "@/lib/currency";

export default function SettingsPage() {
  const { enabledTlds, toggleTld, setEnabledTlds, resetToDefaults } = useTldPreferences();
  const { currency } = useCurrency();
  const tldsByCategory = getTldsByCategory();

  const isDefault =
    enabledTlds.length === DEFAULT_TLDS.length &&
    enabledTlds.every((t) => DEFAULT_TLDS.includes(t));

  const toggleCategory = (categoryTlds: string[]) => {
    const allEnabled = categoryTlds.every((t) => enabledTlds.includes(t));
    if (allEnabled) {
      // Deselect all in category (but keep at least 1 TLD total)
      const remaining = enabledTlds.filter((t) => !categoryTlds.includes(t));
      if (remaining.length > 0) {
        setEnabledTlds(remaining);
      }
    } else {
      // Select all in category
      const merged = Array.from(new Set([...enabledTlds, ...categoryTlds]));
      setEnabledTlds(merged);
    }
  };

  return (
    <div className="bg-white text-gray-800 font-sans min-h-screen selection:bg-pastel-purple selection:text-purple-900">
      <Navbar />

      <main className="pt-24 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 md:px-12 max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to search
        </Link>

        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
            TLD Preferences
          </h1>
          <p className="text-sm text-gray-500 font-light leading-relaxed">
            Choose which domain extensions to check when generating and exploring domains.
            Your selection is saved automatically.
          </p>
        </div>

        {/* Summary bar */}
        <div className="flex items-center justify-between mb-8 p-4 bg-gray-50 rounded-2xl">
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{enabledTlds.length}</span>
            {" "}of{" "}
            <span className="font-medium text-gray-900">{TLD_REGISTRY.length}</span>
            {" "}TLDs enabled
            {enabledTlds.length > 15 && (
              <span className="ml-2 text-amber-600 text-xs">
                (many TLDs may slow down checks)
              </span>
            )}
          </div>
          {!isDefault && (
            <button
              onClick={resetToDefaults}
              className="text-xs text-purple-500 hover:text-purple-700 font-medium transition-colors"
            >
              Reset to defaults
            </button>
          )}
        </div>

        {/* Category sections */}
        <div className="space-y-8">
          {TLD_CATEGORIES.map(({ key, label }) => {
            const entries = tldsByCategory.get(key);
            if (!entries || entries.length === 0) return null;

            const categoryTlds = entries.map((e) => e.tld);
            const enabledCount = categoryTlds.filter((t) => enabledTlds.includes(t)).length;
            const allEnabled = enabledCount === categoryTlds.length;

            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      {label}
                    </h2>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {enabledCount}/{categoryTlds.length}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleCategory(categoryTlds)}
                    className="text-[10px] text-gray-400 hover:text-purple-500 font-medium uppercase tracking-wider transition-colors"
                  >
                    {allEnabled ? "Deselect all" : "Select all"}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {entries.map((entry) => {
                    const enabled = enabledTlds.includes(entry.tld);
                    return (
                      <button
                        key={entry.tld}
                        onClick={() => toggleTld(entry.tld)}
                        className={`group flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all duration-200 ${
                          enabled
                            ? "border-purple-200 bg-purple-50 text-purple-700"
                            : "border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600"
                        }`}
                      >
                        <span className="font-mono font-medium">{entry.tld}</span>
                        <span className={`text-[10px] ${enabled ? "text-purple-400" : "text-gray-300"}`}>
                          {formatPrice(entry.price, currency)}/yr
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info note */}
        <div className="mt-10 p-4 bg-gray-50 rounded-2xl">
          <p className="text-xs text-gray-400 leading-relaxed">
            These preferences affect domain generation, TLD availability checks, and the detail page.
            Pricing shown is approximate and may vary by registrar. Changes are saved to your browser automatically.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
