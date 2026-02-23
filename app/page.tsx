"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ResultsSection from "@/components/ResultsSection";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";
import { DomainResult, GenerateResponse } from "@/lib/types";

const ALL_TLDS = [".com", ".io", ".ai", ".co", ".net", ".app", ".nl", ".dev", ".xyz"];
const SESSION_KEY = "sparkdomain-results";

/** Returns true when the input looks like a domain name rather than a business description */
function looksLikeDomain(input: string): boolean {
  const trimmed = input.trim();
  // A domain-like input has no spaces and is a plausible domain (letters, digits, hyphens, optionally a dot+tld)
  return trimmed.length > 0 && !/\s/.test(trimmed) && /^[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})?$/.test(trimmed);
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      prompt: string;
      domains: DomainResult[];
      domainCount: number;
      selectedTlds: string[];
    };
  } catch {
    return null;
  }
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [domains, setDomains] = useState<DomainResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [domainCount, setDomainCount] = useState<number>(6);
  const [selectedTlds, setSelectedTlds] = useState<string[]>([...ALL_TLDS]);
  const [includeWords, setIncludeWords] = useState<string[]>([]);
  const [excludeWords, setExcludeWords] = useState<string[]>([]);
  const [minLength, setMinLength] = useState<number | undefined>(undefined);
  const [maxLength, setMaxLength] = useState<number | undefined>(undefined);

  // Restore results from sessionStorage on mount (e.g. after browser back)
  useEffect(() => {
    const saved = loadSession();
    if (saved && saved.domains.length > 0) {
      setPrompt(saved.prompt);
      setDomains(saved.domains);
      setDomainCount(saved.domainCount);
      setSelectedTlds(saved.selectedTlds);
      setHasSearched(true);
    }
  }, []);

  const isDomainMode = looksLikeDomain(prompt);

  const fetchDomains = async (input: string) => {
    setLoading(true);
    setError(null);

    try {
      const isDomain = looksLikeDomain(input);
      const url = isDomain ? "/api/check-domain" : "/api/generate";
      const payload = isDomain
        ? { domain: input, tlds: selectedTlds }
        : {
            businessIdea: input,
            count: domainCount,
            tlds: selectedTlds,
            includeWords: includeWords.length > 0 ? includeWords : undefined,
            excludeWords: excludeWords.length > 0 ? excludeWords : undefined,
            minLength: minLength || undefined,
            maxLength: maxLength || undefined,
          };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: GenerateResponse = await response.json();

      if (!response.ok) {
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }

      if (data.success && data.results) {
        setDomains(data.results);
        setHasSearched(true);

        // Persist to sessionStorage so results survive navigation
        try {
          sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ prompt: input, domains: data.results, domainCount, selectedTlds })
          );
        } catch { /* quota exceeded — ignore */ }

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

  const generateDomains = async () => {
    if (!prompt.trim() || loading) return;
    setHasSearched(false);
    await fetchDomains(prompt);
  };

  const handleRegenerate = () => {
    if (!prompt.trim() || loading) return;
    fetchDomains(prompt);
  };

  const handleMoreLikeThis = (domain: DomainResult) => {
    if (loading) return;
    const idea = `Generate domain names similar in style and feel to "${domain.domain}" (${domain.namingStrategy}). Original business idea: ${prompt}`;
    fetchDomains(idea);
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
          domainCount={domainCount}
          setDomainCount={setDomainCount}
          selectedTlds={selectedTlds}
          setSelectedTlds={setSelectedTlds}
          allTlds={ALL_TLDS}
          includeWords={includeWords}
          setIncludeWords={setIncludeWords}
          excludeWords={excludeWords}
          setExcludeWords={setExcludeWords}
          minLength={minLength}
          setMinLength={setMinLength}
          maxLength={maxLength}
          setMaxLength={setMaxLength}
          isDomainMode={isDomainMode}
        />

        {error && (
          <div className="max-w-2xl mx-auto px-6 py-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {hasSearched && domains.length > 0 && (
          <ResultsSection
            domains={domains}
            loading={loading}
            onRegenerate={handleRegenerate}
            onMoreLikeThis={handleMoreLikeThis}
          />
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
