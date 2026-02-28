'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';

interface GalleryItem {
  sessionId: string;
  domainName: string;
  tld: string;
  description: string;
  createdAt: string;
  topConcept: { id: string; style: string; previewUrl: string } | null;
}

/* ── Placeholder brand cards ── */
const PLACEHOLDER_CARDS_LEFT = [
  { id: 'p1', name: 'Godzilla Coffee', type: 'Wordmark', color: '#1A1A18', letter: 'G' },
  { id: 'p2', name: 'Meridian Law', type: 'Icon + Text', color: '#0F4C81', letter: 'M' },
  { id: 'p3', name: 'Volta Energy', type: 'Abstract Mark', color: '#D97706', letter: 'V' },
  { id: 'p4', name: 'Clearline', type: 'Letterform', color: '#064E3B', letter: 'C' },
  { id: 'p5', name: 'NovaBrew', type: 'Pictorial', color: '#9333EA', letter: 'N' },
  { id: 'p6', name: 'TerraFirm', type: 'Emblem', color: '#166534', letter: 'T' },
];

const PLACEHOLDER_CARDS_RIGHT = [
  { id: 'p7', name: 'Persona Studio', type: 'Mascot', color: '#7C3AED', letter: 'P' },
  { id: 'p8', name: 'Apex Capital', type: 'Geometric', color: '#BE123C', letter: 'A' },
  { id: 'p9', name: 'Wavefront', type: 'Emblem', color: '#0C4A6E', letter: 'W' },
  { id: 'p10', name: 'Gridlock', type: 'Pattern Mark', color: '#292524', letter: 'G' },
  { id: 'p11', name: 'SkyPulse', type: 'Abstract Mark', color: '#0369A1', letter: 'S' },
  { id: 'p12', name: 'Bloom & Co', type: 'Wordmark', color: '#DB2777', letter: 'B' },
];

function PlaceholderIcon({ color, letter }: { color: string; letter: string }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <rect width="44" height="44" rx="10" fill={color} />
      <text x="22" y="29" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="700" fill="white">
        {letter}
      </text>
    </svg>
  );
}

function VerticalBrandCard({ name, type, children }: { name: string; type: string; children: React.ReactNode }) {
  return (
    <div className="w-[200px] h-[140px] bg-white rounded-2xl border border-[#E6E6E4] flex items-center justify-center flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.04)] hover:border-[#D4D4D8] transition-all duration-200 cursor-default">
      <div className="flex flex-col items-center gap-2.5">
        {children}
        <span className="text-[12px] font-semibold text-[#1A1A18]">{name}</span>
        <span className="text-[10px] text-[#585854] tracking-[0.06em] uppercase">{type}</span>
      </div>
    </div>
  );
}

function VerticalColumn({ cards, direction }: { cards: typeof PLACEHOLDER_CARDS_LEFT; direction: 'up' | 'down' }) {
  // Triple the cards for seamless infinite loop
  const tripled = [...cards, ...cards, ...cards];
  const animClass = direction === 'up' ? 'sparkdomain-scroll-up' : 'sparkdomain-scroll-down';

  return (
    <div className="h-[600px] overflow-hidden relative">
      {/* Fade masks top and bottom */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#FAFAF8] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#FAFAF8] to-transparent z-10 pointer-events-none" />
      <div className={`flex flex-col gap-4 ${animClass}`}>
        {tripled.map((card, i) => (
          <VerticalBrandCard key={`${card.id}-${i}`} name={card.name} type={card.type}>
            <PlaceholderIcon color={card.color} letter={card.letter} />
          </VerticalBrandCard>
        ))}
      </div>
    </div>
  );
}

function HeroSection() {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = input.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleaned) return;
    const dotIndex = cleaned.lastIndexOf('.');
    if (dotIndex > 0) {
      const name = cleaned.substring(0, dotIndex);
      const ext = cleaned.substring(dotIndex + 1);
      router.push(`/brand/${encodeURIComponent(name)}?tld=.${ext}&autoStart=true`);
    } else {
      router.push(`/brand/${encodeURIComponent(cleaned)}?autoStart=true`);
    }
  };

  return (
    <div className="flex flex-col items-center text-center max-w-[780px] mx-auto relative z-10">
      <h1
        className="sparkdomain-hero-headline text-[32px] sm:text-[42px] lg:text-[52px] leading-[1.1] mb-5 text-[#1A1A18] font-bold"
        style={{ letterSpacing: '-0.02em' }}
      >
        Your brand identity,{' '}
        <span className="hidden sm:inline"><br /></span>
        from strategy to files,{' '}
        <span className="hidden sm:inline"><br /></span>
        in 60 seconds.
      </h1>

      <p className="text-sm sm:text-[17px] text-[#585854] mb-8 max-w-[680px] font-normal leading-relaxed">
        Enter your brand name. Get a brand strategy, 8 logo concepts, a complete color system, typography, and 100+ production-ready files.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-[560px] mb-6">
        <div
          className={`sparkdomain-input-group relative flex items-center bg-white rounded-[999px] p-2 border transition-all duration-200 ${
            isFocused
              ? 'border-[#7C3AED] shadow-[0_0_0_4px_rgba(124,58,237,0.1)]'
              : 'border-[#E6E6E4] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_2px_4px_-1px_rgba(0,0,0,0.02)]'
          }`}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Enter your brand or company name"
            aria-label="Brand Name"
            className="sparkdomain-hero-input flex-1 border-none outline-none px-4 sm:px-6 text-base sm:text-lg text-[#1A1A18] bg-transparent h-12 sm:h-14 placeholder:text-[#A1A1AA]"
          />
          <button
            type="submit"
            className="sparkdomain-hero-button bg-[#7C3AED] hover:bg-[#6D28D9] text-white border-none rounded-[999px] h-12 sm:h-14 px-5 sm:px-8 text-sm sm:text-base font-semibold cursor-pointer transition-colors whitespace-nowrap"
          >
            Generate brand &rarr;
          </button>
        </div>
      </form>

      <div className="sparkdomain-trust-row flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-[#585854]">
        <span>Free preview</span>
        <span className="sparkdomain-trust-dot w-1 h-1 bg-[#D4D4D8] rounded-full" />
        <span>No signup required</span>
        <span className="sparkdomain-trust-dot w-1 h-1 bg-[#D4D4D8] rounded-full" />
        <span>8 AI concepts in 30 seconds</span>
      </div>
    </div>
  );
}

function MyBrandsSection() {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/brand/my-brands')
      .then((r) => r.json())
      .then((data) => setBrands(data.brands || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || brands.length === 0) return null;

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 mb-16">
      <h2 className="text-xl font-semibold text-[#1A1A18] mb-6">My Brands</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {brands.map((brand: any) => (
          <button
            key={brand.id}
            onClick={() =>
              router.push(
                `/brand/${encodeURIComponent(brand.domainName)}?tld=${encodeURIComponent(brand.tld)}&session=${brand.id}`
              )
            }
            className="group rounded-2xl border border-[#E6E6E4] overflow-hidden hover:border-[#D4D4D8] hover:shadow-md transition-all text-left bg-white"
          >
            {brand.concepts?.[0] && (
              <div className="aspect-square bg-[#FAFAF8]">
                <img
                  src={brand.concepts[0].previewUrl}
                  alt={`${brand.domainName} logo`}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="p-3">
              <p className="text-sm font-medium text-[#1A1A18] truncate">
                {brand.domainName}{brand.tld}
              </p>
              <p className="text-xs text-[#A1A1AA] truncate">{brand.searchQuery}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function BrandStudioPage() {
  const { user, loading } = useAuth();

  return (
    <>
      {/* Full-width hero with vertical brand columns on sides */}
      <div className="w-full min-h-[calc(100vh-80px)] flex items-center justify-center px-4 overflow-hidden">
        <div className="flex items-center gap-8 w-full max-w-[1400px]">
          {/* Left column — scrolls UP */}
          <div className="hidden lg:block flex-shrink-0">
            <VerticalColumn cards={PLACEHOLDER_CARDS_LEFT} direction="up" />
          </div>

          {/* Center — Hero */}
          <div className="flex-1 min-w-0 py-8 sm:py-12">
            <HeroSection />
          </div>

          {/* Right column — scrolls DOWN */}
          <div className="hidden lg:block flex-shrink-0">
            <VerticalColumn cards={PLACEHOLDER_CARDS_RIGHT} direction="down" />
          </div>
        </div>
      </div>

      {!loading && user && <MyBrandsSection />}
    </>
  );
}
