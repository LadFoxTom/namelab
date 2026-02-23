"use client";

import { useState, useRef, useEffect } from "react";

interface HeroSectionProps {
  prompt: string;
  setPrompt: (value: string) => void;
  loading: boolean;
  onGenerate: () => void;
  domainCount: number;
  setDomainCount: (value: number) => void;
  selectedTlds: string[];
  setSelectedTlds: (value: string[]) => void;
  allTlds: string[];
  includeWords: string[];
  setIncludeWords: (value: string[]) => void;
  excludeWords: string[];
  setExcludeWords: (value: string[]) => void;
  minLength: number | undefined;
  setMinLength: (value: number | undefined) => void;
  maxLength: number | undefined;
  setMaxLength: (value: number | undefined) => void;
  isDomainMode: boolean;
}

const textGradientStyle = {
  background: "linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
} as React.CSSProperties;

const COUNT_OPTIONS = [3, 6, 9];

export default function HeroSection({
  prompt,
  setPrompt,
  loading,
  onGenerate,
  domainCount,
  setDomainCount,
  selectedTlds,
  setSelectedTlds,
  allTlds,
  includeWords,
  setIncludeWords,
  excludeWords,
  setExcludeWords,
  minLength,
  setMinLength,
  maxLength,
  setMaxLength,
  isDomainMode,
}: HeroSectionProps) {
  const [tldDropdownOpen, setTldDropdownOpen] = useState(false);
  const [includeInput, setIncludeInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");
  const [keywordsOpen, setKeywordsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTldDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTld = (tld: string) => {
    if (selectedTlds.includes(tld)) {
      // Don't allow deselecting all
      if (selectedTlds.length <= 1) return;
      setSelectedTlds(selectedTlds.filter((t) => t !== tld));
    } else {
      setSelectedTlds([...selectedTlds, tld]);
    }
  };

  const addIncludeWord = () => {
    const word = includeInput.trim().toLowerCase();
    if (word && !includeWords.includes(word)) {
      setIncludeWords([...includeWords, word]);
    }
    setIncludeInput("");
  };

  const addExcludeWord = () => {
    const word = excludeInput.trim().toLowerCase();
    if (word && !excludeWords.includes(word)) {
      setExcludeWords([...excludeWords, word]);
    }
    setExcludeInput("");
  };

  const allSelected = selectedTlds.length === allTlds.length;

  return (
    <section className="relative min-h-[70vh] sm:min-h-[85vh] flex flex-col items-center justify-center px-4 sm:px-6 md:px-12 py-12 sm:py-20 bg-gradient-to-b from-gray-50 to-white overflow-x-clip">
      <div className="absolute top-20 left-[10%] w-96 h-96 bg-pastel-purple/30 rounded-full blur-[100px] pointer-events-none mix-blend-multiply"></div>
      <div className="absolute bottom-20 right-[10%] w-[500px] h-[500px] bg-pastel-blue/30 rounded-full blur-[120px] pointer-events-none mix-blend-multiply"></div>

      <div className="relative z-10 w-full max-w-4xl mx-auto text-center space-y-8">
        <h1
          className="text-3xl sm:text-5xl md:text-7xl font-light tracking-tight leading-[1.1] text-gray-900 animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          Craft the perfect <br />
          <span style={textGradientStyle} className="font-normal">
            digital identity.
          </span>
        </h1>

        <p
          className="text-base sm:text-lg md:text-xl text-gray-500 font-light max-w-2xl mx-auto leading-relaxed animate-slide-up"
          style={{ animationDelay: "200ms" }}
        >
          {isDomainMode
            ? "We'll check availability and pricing across multiple registrars."
            : "Describe your project, and our AI will generate available, premium domain names with semantic reasoning."}
        </p>

        <div
          className="w-full max-w-2xl mx-auto mt-12 relative animate-slide-up"
          style={{ animationDelay: "300ms" }}
        >
          <div className="relative group">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-28 sm:h-36 p-4 sm:p-6 pr-10 sm:pr-12 text-base sm:text-lg bg-white border-2 border-gray-200 rounded-2xl sm:rounded-3xl resize-none focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-50 transition-all duration-300 shadow-soft group-hover:shadow-lg placeholder:text-gray-300 font-light"
              placeholder={isDomainMode
                ? "e.g. coolshop.com"
                : "e.g. A minimalist coffee shop in Tokyo that also sells vintage vinyl records..."
              }
            />

            <div
              className={`absolute top-4 right-4 sm:top-6 sm:right-6 text-purple-400 pointer-events-none transition-transform duration-500 ${prompt.length > 0 ? "scale-110 rotate-12 text-purple-600" : "opacity-50"}`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            </div>
          </div>

          {/* Controls row: TLD filter, Generate button, Count selector */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mt-4 sm:mt-6 flex-wrap">
            {/* TLD filter dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setTldDropdownOpen(!tldDropdownOpen)}
                className="flex items-center gap-2 px-4 py-3 rounded-full border border-gray-200 bg-white text-sm text-gray-600 hover:border-gray-300 transition-all"
              >
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                <span>
                  {allSelected
                    ? "All TLDs"
                    : `${selectedTlds.length} TLD${selectedTlds.length !== 1 ? "s" : ""}`}
                </span>
                <svg
                  className={`w-3 h-3 text-gray-400 transition-transform ${tldDropdownOpen ? "rotate-180" : ""}`}
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

              {tldDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-2xl shadow-lg py-2 z-50">
                  {/* Select/deselect all */}
                  <button
                    onClick={() =>
                      setSelectedTlds(allSelected ? [allTlds[0]] : [...allTlds])
                    }
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        allSelected
                          ? "bg-purple-500 border-purple-500"
                          : "border-gray-300"
                      }`}
                    >
                      {allSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium">Select all</span>
                  </button>
                  <div className="h-px bg-gray-100 my-1" />
                  {allTlds.map((tld) => {
                    const isSelected = selectedTlds.includes(tld);
                    return (
                      <button
                        key={tld}
                        onClick={() => toggleTld(tld)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-purple-500 border-purple-500"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="font-mono">{tld}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Keywords toggle */}
            {!isDomainMode && <button
              onClick={() => setKeywordsOpen(!keywordsOpen)}
              className={`flex items-center gap-2 px-4 py-3 rounded-full border text-sm transition-all ${
                includeWords.length > 0 || excludeWords.length > 0 || minLength || maxLength
                  ? "border-purple-300 bg-purple-50 text-purple-600"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>
                {includeWords.length + excludeWords.length > 0 || minLength || maxLength
                  ? "Filters active"
                  : "Filters"}
              </span>
              <svg
                className={`w-3 h-3 text-gray-400 transition-transform ${keywordsOpen ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>}

            {/* Generate button — fixed width */}
            <button
              onClick={onGenerate}
              disabled={loading || prompt.length === 0}
              className="flex items-center justify-center gap-2 bg-black text-white w-full sm:w-56 py-3 sm:py-4 rounded-full text-sm sm:text-base font-medium transition-all duration-300 hover:bg-gray-800 hover:scale-105 hover:shadow-lifted disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none order-first sm:order-none"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>{isDomainMode ? "Checking availability..." : "Finding domains..."}</span>
                </>
              ) : (
                <>
                  <span>{isDomainMode ? "Check Availability" : "Generate Domains"}</span>
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
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </>
              )}
            </button>

            {/* Count selector */}
            {!isDomainMode && <div className="flex items-center bg-white border border-gray-200 rounded-full p-1">
              {COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setDomainCount(n)}
                  className={`px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    domainCount === n
                      ? "bg-black text-white"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>}
          </div>

          {/* Keywords panel */}
          {!isDomainMode && keywordsOpen && (
            <div className="w-full max-w-xl mx-auto mt-4 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm animate-slide-up">
              {/* Character length filters */}
              <div className="flex items-center gap-3 mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Name length
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={minLength ?? ""}
                    onChange={(e) => setMinLength(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Min"
                    className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 font-light text-center"
                  />
                  <span className="text-gray-400 text-sm">—</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={maxLength ?? ""}
                    onChange={(e) => setMaxLength(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Max"
                    className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 font-light text-center"
                  />
                  <span className="text-xs text-gray-400">chars</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Include words */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                    Include words
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={includeInput}
                      onChange={(e) => setIncludeInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIncludeWord())}
                      placeholder="e.g. craft"
                      className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 font-light"
                    />
                    <button
                      onClick={addIncludeWord}
                      className="px-3 py-2 text-sm bg-green-50 text-green-600 border border-green-200 rounded-xl hover:bg-green-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  {includeWords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {includeWords.map((word) => (
                        <span
                          key={word}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200"
                        >
                          {word}
                          <button
                            onClick={() => setIncludeWords(includeWords.filter((w) => w !== word))}
                            className="hover:text-green-900 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Exclude words */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                    Exclude words
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={excludeInput}
                      onChange={(e) => setExcludeInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addExcludeWord())}
                      placeholder="e.g. cheap"
                      className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 font-light"
                    />
                    <button
                      onClick={addExcludeWord}
                      className="px-3 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  {excludeWords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {excludeWords.map((word) => (
                        <span
                          key={word}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 text-xs rounded-full border border-red-200"
                        >
                          {word}
                          <button
                            onClick={() => setExcludeWords(excludeWords.filter((w) => w !== word))}
                            className="hover:text-red-900 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="hidden sm:flex items-center justify-center gap-8 mt-8 opacity-70">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              <span className="text-sm text-gray-500 font-light">
                .com available
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span className="text-sm text-gray-500 font-light">
                Instant Check
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span className="text-sm text-gray-500 font-light">
                Value Appraisal
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
