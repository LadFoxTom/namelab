import Link from "next/link";

export const metadata = {
  title: "Scoring System — Sparkdomain",
  description: "How we evaluate domain names across brandability, memorability, and SEO potential.",
};

function ScoreExample({ score, label, color }: { score: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-6 rounded-full bg-gradient-to-r ${color} flex items-center justify-center text-white text-[10px] font-bold`}>
        {score}
      </div>
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}

export default function ScoringPage() {
  return (
    <div className="bg-white text-gray-800 font-sans min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
              S
            </div>
            <span className="font-medium text-lg tracking-tight">Sparkdomain</span>
          </Link>
          <Link
            href="/"
            className="px-5 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-black transition-colors"
          >
            Back to Generator
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6 md:px-12 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 text-purple-600 text-xs font-medium mb-6">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Scoring Methodology
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 mb-4">
            How We Score Domains
          </h1>
          <p className="text-lg text-gray-400 font-light max-w-xl mx-auto leading-relaxed">
            Every domain suggestion is evaluated across three dimensions.
            The overall score is the average of all three.
          </p>
        </div>

        {/* Score Scale */}
        <div className="mb-16 p-6 bg-gray-50 rounded-3xl">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Score Scale</h3>
          <div className="space-y-2.5">
            <ScoreExample score="90+" label="Exceptional — best-in-class for this metric" color="from-purple-400 to-indigo-500" />
            <ScoreExample score="80+" label="Strong — performs very well" color="from-blue-400 to-cyan-400" />
            <ScoreExample score="70+" label="Good — solid with minor trade-offs" color="from-pink-400 to-rose-400" />
            <ScoreExample score="60+" label="Decent — noticeable weaknesses" color="from-green-400 to-emerald-500" />
            <ScoreExample score="&lt;60" label="Weak — significant limitations in this area" color="from-orange-400 to-amber-500" />
          </div>
        </div>

        {/* Three metrics */}
        <div className="space-y-12">
          {/* Brandability */}
          <section className="group">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 shrink-0 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Brandability</h2>
                <p className="text-gray-400 text-sm font-light">How strong is this name as a brand?</p>
              </div>
            </div>
            <div className="ml-14 space-y-4">
              <p className="text-gray-600 text-sm leading-relaxed">
                Brandability measures how well a domain can serve as a distinctive, ownable brand identity.
                Names that are unique, invented, or cleverly constructed score highest. Generic dictionary words
                or commonly-used combinations score lower.
              </p>
              <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-medium text-gray-900 uppercase tracking-wider">What we evaluate</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">&#9679;</span>
                    <span><strong className="text-gray-700">Uniqueness</strong> — Is the name distinctive? Can it be trademarked?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">&#9679;</span>
                    <span><strong className="text-gray-700">Emotional resonance</strong> — Does it evoke the right feelings for the business?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">&#9679;</span>
                    <span><strong className="text-gray-700">Visual identity</strong> — How well does it lend itself to logo design and visual branding?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">&#9679;</span>
                    <span><strong className="text-gray-700">Market positioning</strong> — Does it differentiate from competitors?</span>
                  </li>
                </ul>
              </div>
              <div className="flex gap-4 text-xs text-gray-400">
                <span>High: <strong className="text-gray-600">Spotify, Zillow, Figma</strong></span>
                <span>Low: <strong className="text-gray-600">BestDeals, GetFood</strong></span>
              </div>
            </div>
          </section>

          <div className="h-px bg-gray-100" />

          {/* Memorability */}
          <section className="group">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Memorability</h2>
                <p className="text-gray-400 text-sm font-light">How easy is it to remember, spell, and share?</p>
              </div>
            </div>
            <div className="ml-14 space-y-4">
              <p className="text-gray-600 text-sm leading-relaxed">
                Memorability captures how easily someone can recall and correctly type the domain after hearing it once.
                Short, phonetically simple names with obvious spelling score highest. Longer names with unusual
                letter combinations or ambiguous pronunciation score lower.
              </p>
              <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-medium text-gray-900 uppercase tracking-wider">What we evaluate</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">&#9679;</span>
                    <span><strong className="text-gray-700">Length</strong> — Shorter names are easier to remember (under 8 characters is ideal)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">&#9679;</span>
                    <span><strong className="text-gray-700">Pronunciation</strong> — Can it be read aloud without confusion?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">&#9679;</span>
                    <span><strong className="text-gray-700">Spelling clarity</strong> — Only one obvious way to spell it? No hyphens or numbers?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">&#9679;</span>
                    <span><strong className="text-gray-700">Radio test</strong> — Could someone type it correctly after hearing it on a podcast?</span>
                  </li>
                </ul>
              </div>
              <div className="flex gap-4 text-xs text-gray-400">
                <span>High: <strong className="text-gray-600">Uber, Zoom, Stripe</strong></span>
                <span>Low: <strong className="text-gray-600">Xplorify, TechSolutnz</strong></span>
              </div>
            </div>
          </section>

          <div className="h-px bg-gray-100" />

          {/* SEO */}
          <section className="group">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">SEO Potential</h2>
                <p className="text-gray-400 text-sm font-light">How well does the domain signal relevance to search engines?</p>
              </div>
            </div>
            <div className="ml-14 space-y-4">
              <p className="text-gray-600 text-sm leading-relaxed">
                SEO Potential evaluates how much organic search advantage the domain name provides.
                Domains containing exact industry keywords rank more easily, while completely abstract
                names require more SEO investment to associate with their business category.
              </p>
              <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-medium text-gray-900 uppercase tracking-wider">What we evaluate</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">&#9679;</span>
                    <span><strong className="text-gray-700">Keyword presence</strong> — Does the domain contain industry-relevant keywords?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">&#9679;</span>
                    <span><strong className="text-gray-700">Semantic relevance</strong> — Does the name conceptually relate to the business?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">&#9679;</span>
                    <span><strong className="text-gray-700">TLD weight</strong> — .com generally ranks better; niche TLDs (.ai, .dev) suit specific industries</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">&#9679;</span>
                    <span><strong className="text-gray-700">Search intent match</strong> — Would someone searching for this business find this domain natural?</span>
                  </li>
                </ul>
              </div>
              <div className="flex gap-4 text-xs text-gray-400">
                <span>High: <strong className="text-gray-600">Hotels.com, Cars.io</strong></span>
                <span>Low: <strong className="text-gray-600">Zylph, Quorvo</strong></span>
              </div>
            </div>
          </section>
        </div>

        {/* Trade-offs note */}
        <div className="mt-16 p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Understanding Trade-offs</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            No single domain excels at everything. The best brand names are often invented words
            with low SEO scores (think &ldquo;Google&rdquo; or &ldquo;Spotify&rdquo;). Meanwhile,
            keyword-rich domains like &ldquo;CheapFlights.com&rdquo; score high on SEO but lower on
            brandability. Your ideal domain depends on your strategy:
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/80 rounded-2xl p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-1">Brand-first</h4>
              <p className="text-xs text-gray-500">Prioritize brandability + memorability. You&apos;ll build SEO through content and marketing.</p>
            </div>
            <div className="bg-white/80 rounded-2xl p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-1">SEO-first</h4>
              <p className="text-xs text-gray-500">Prioritize SEO potential. Great for niche sites and affiliate businesses.</p>
            </div>
            <div className="bg-white/80 rounded-2xl p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-1">Balanced</h4>
              <p className="text-xs text-gray-500">Look for high overall scores. A solid all-around choice for most startups.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3.5 rounded-full text-sm font-medium hover:shadow-lg hover:shadow-purple-200/50 hover:scale-105 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Generate Domain Names
          </Link>
        </div>
      </main>
    </div>
  );
}
