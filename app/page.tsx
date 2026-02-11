"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ResultsSection from "@/components/ResultsSection";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";
import { DomainResult, GenerateResponse } from "@/lib/types";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [domains, setDomains] = useState<DomainResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateDomains = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setHasSearched(false);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessIdea: prompt }),
      });

      const data: GenerateResponse = await response.json();

      if (!response.ok) {
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }

      if (data.success && data.results) {
        setDomains(data.results);
        setHasSearched(true);

        setTimeout(() => {
          document
            .getElementById("results")
            ?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white text-gray-800 font-sans selection:bg-pastel-purple selection:text-purple-900">
      <Navbar />

      <main className="pt-20">
        <HeroSection
          prompt={prompt}
          setPrompt={setPrompt}
          loading={loading}
          onGenerate={generateDomains}
        />

        {error && (
          <div className="max-w-2xl mx-auto px-6 py-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {hasSearched && domains.length > 0 && (
          <ResultsSection domains={domains} />
        )}

        {hasSearched && domains.length === 0 && !error && (
          <div className="max-w-2xl mx-auto px-6 py-24 text-center">
            <p className="text-gray-500 text-lg font-light">
              No available domains found. Try a different business idea.
            </p>
          </div>
        )}

        <FeaturesSection />
      </main>

      <Footer />
    </div>
  );
}
