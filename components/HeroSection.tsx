"use client";

interface HeroSectionProps {
  prompt: string;
  setPrompt: (value: string) => void;
  loading: boolean;
  onGenerate: () => void;
}

const textGradientStyle = {
  background: "linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
} as React.CSSProperties;

export default function HeroSection({
  prompt,
  setPrompt,
  loading,
  onGenerate,
}: HeroSectionProps) {
  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 md:px-12 py-20 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      <div className="absolute top-20 left-[10%] w-96 h-96 bg-pastel-purple/30 rounded-full blur-[100px] pointer-events-none mix-blend-multiply"></div>
      <div className="absolute bottom-20 right-[10%] w-[500px] h-[500px] bg-pastel-blue/30 rounded-full blur-[120px] pointer-events-none mix-blend-multiply"></div>

      <div className="relative z-10 w-full max-w-4xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-4 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Claude AI Powered
          </span>
        </div>

        <h1
          className="text-5xl md:text-7xl font-light tracking-tight leading-[1.1] text-gray-900 animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          Craft the perfect <br />
          <span style={textGradientStyle} className="font-normal">
            digital identity.
          </span>
        </h1>

        <p
          className="text-lg md:text-xl text-gray-500 font-light max-w-2xl mx-auto leading-relaxed animate-slide-up"
          style={{ animationDelay: "200ms" }}
        >
          Describe your project, and our AI will generate available, premium
          domain names with semantic reasoning.
        </p>

        <div
          className="w-full max-w-2xl mx-auto mt-12 relative animate-slide-up"
          style={{ animationDelay: "300ms" }}
        >
          <div className="relative group">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-36 p-6 pr-12 text-lg bg-white border-2 border-gray-200 rounded-3xl resize-none focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-50 transition-all duration-300 shadow-soft group-hover:shadow-lg placeholder:text-gray-300 font-light"
              placeholder="e.g. A minimalist coffee shop in Tokyo that also sells vintage vinyl records..."
            />

            <div
              className={`absolute top-6 right-6 text-purple-400 pointer-events-none transition-transform duration-500 ${prompt.length > 0 ? "scale-110 rotate-12 text-purple-600" : "opacity-50"}`}
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

          <div className="flex justify-center mt-6">
            <button
              onClick={onGenerate}
              disabled={loading || prompt.length === 0}
              className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-full font-medium transition-all duration-300 hover:bg-gray-800 hover:scale-105 hover:shadow-lifted disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {!loading && (
                <>
                  <span>Generate Domains</span>
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

              {loading && (
                <svg
                  className="animate-spin h-5 w-5 text-white"
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
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-8 mt-8 opacity-70">
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
