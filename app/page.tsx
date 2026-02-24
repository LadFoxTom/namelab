"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ResultsSection from "@/components/ResultsSection";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";
import { DomainResult, GenerateResponse, ToneFilter, StructureFilter, LengthPreset, StreamEvent } from "@/lib/types";

const ALL_TLDS = [".com", ".io", ".ai", ".co", ".net", ".app", ".nl", ".dev", ".xyz"];
const SESSION_KEY = "sparkdomain-results";

export interface SearchProgress {
  found: number;
  target: number;
  elapsed: number;
  timeLimit: number;
  iteration: number;
}

/** Returns true when the input looks like a domain name rather than a business description */
function looksLikeDomain(input: string): boolean {
  const trimmed = input.trim();
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
  const [tones, setTones] = useState<ToneFilter[]>([]);
  const [structures, setStructures] = useState<StructureFilter[]>([]);
  const [lengthPreset, setLengthPreset] = useState<LengthPreset>("sweet-spot");
  const [minBrandScore, setMinBrandScore] = useState(0);
  const [minLinguisticScore, setMinLinguisticScore] = useState(0);
  const [minSeoScore, setMinSeoScore] = useState(0);
  const [searchProgress, setSearchProgress] = useState<SearchProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
    // Abort any existing stream
    if (abortRef.current) abortRef.current.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    setLoading(true);
    setError(null);
    setSearchProgress(null);

    try {
      const isDomain = looksLikeDomain(input);

      if (isDomain) {
        // Domain check mode — no streaming needed
        const response = await fetch("/api/check-domain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: input, tlds: selectedTlds }),
          signal: abortController.signal,
        });
        const data: GenerateResponse = await response.json();
        if (!response.ok) {
          setError(data.message || "Something went wrong. Please try again.");
          return;
        }
        if (data.success && data.results) {
          setDomains(data.results);
          setHasSearched(true);
          try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ prompt: input, domains: data.results, domainCount, selectedTlds }));
          } catch { /* ignore */ }
          setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 100);
        }
        return;
      }

      // Streaming generation mode
      setDomains([]);
      setHasSearched(true);

      const payload = {
        businessIdea: input,
        count: domainCount,
        tlds: selectedTlds,
        includeWords: includeWords.length > 0 ? includeWords : undefined,
        excludeWords: excludeWords.length > 0 ? excludeWords : undefined,
        minLength: lengthPreset === "custom" ? (minLength || undefined) : undefined,
        maxLength: lengthPreset === "custom" ? (maxLength || undefined) : undefined,
        tones: tones.length > 0 ? tones : undefined,
        structures: structures.length > 0 ? structures : undefined,
        lengthPreset: lengthPreset !== "sweet-spot" ? lengthPreset : undefined,
        minBrandScore: minBrandScore > 0 ? minBrandScore : undefined,
        minLinguisticScore: minLinguisticScore > 0 ? minLinguisticScore : undefined,
        minSeoScore: minSeoScore > 0 ? minSeoScore : undefined,
      };

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      if (!response.body) {
        setError("Streaming not supported.");
        return;
      }

      // Scroll to results area
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 100);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const collectedDomains: DomainResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event: StreamEvent = JSON.parse(jsonStr);

            if (event.type === "domain" && event.domain) {
              collectedDomains.push(event.domain);
              setDomains([...collectedDomains]);
            } else if (event.type === "progress") {
              setSearchProgress({
                found: event.found || 0,
                target: event.target || domainCount,
                elapsed: event.elapsed || 0,
                timeLimit: event.timeLimit || 180,
                iteration: event.iteration || 0,
              });
            } else if (event.type === "done") {
              setSearchProgress({
                found: event.found || collectedDomains.length,
                target: event.target || domainCount,
                elapsed: event.elapsed || 0,
                timeLimit: event.timeLimit || 180,
                iteration: event.iteration || 0,
              });
            } else if (event.type === "error") {
              setError(event.message || "Something went wrong. Please try again.");
            }
          } catch {
            // Malformed SSE line, skip
          }
        }
      }

      // Persist final results
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ prompt: input, domains: collectedDomains, domainCount, selectedTlds }));
      } catch { /* ignore */ }

    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const generateDomains = async () => {
    if (!prompt.trim() || loading) return;
    setHasSearched(false);
    setSearchProgress(null);
    await fetchDomains(prompt);
  };

  const handleRegenerate = () => {
    if (!prompt.trim() || loading) return;
    setSearchProgress(null);
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
          tones={tones}
          setTones={setTones}
          structures={structures}
          setStructures={setStructures}
          lengthPreset={lengthPreset}
          setLengthPreset={setLengthPreset}
          minBrandScore={minBrandScore}
          setMinBrandScore={setMinBrandScore}
          minLinguisticScore={minLinguisticScore}
          setMinLinguisticScore={setMinLinguisticScore}
          minSeoScore={minSeoScore}
          setMinSeoScore={setMinSeoScore}
        />

        {error && (
          <div className="max-w-2xl mx-auto px-6 py-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {(hasSearched || loading) && (domains.length > 0 || loading) && (
          <ResultsSection
            domains={domains}
            loading={loading}
            onRegenerate={handleRegenerate}
            onMoreLikeThis={handleMoreLikeThis}
            searchProgress={searchProgress}
          />
        )}

        {hasSearched && !loading && domains.length === 0 && !error && (
          <div className="max-w-2xl mx-auto px-6 py-24 text-center">
            <p className="text-gray-500 text-lg font-light">
              No available domains found. Try a different business idea or lower your score minimums.
            </p>
          </div>
        )}

        <FeaturesSection />
      </main>

      <Footer />
    </div>
  );
}
