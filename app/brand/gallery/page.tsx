'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface GalleryItem {
  sessionId: string;
  domainName: string;
  tld: string;
  description: string;
  createdAt: string;
  topConcept: { id: string; style: string; previewUrl: string } | null;
}

function GalleryCard({ item }: { item: GalleryItem }) {
  const letter = item.domainName.charAt(0).toUpperCase();
  const colors = ['#7C3AED', '#0F4C81', '#D97706', '#064E3B', '#9333EA', '#166534', '#BE123C', '#0C4A6E', '#DB2777', '#292524'];
  const color = colors[letter.charCodeAt(0) % colors.length];

  return (
    <Link
      href={`/brand/gallery/${item.sessionId}`}
      className="w-[200px] h-[140px] bg-white rounded-2xl border border-[#E6E6E4] flex items-center justify-center flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.04)] hover:border-[#D4D4D8] transition-all duration-200 no-underline"
    >
      <div className="flex flex-col items-center gap-2.5">
        {item.topConcept?.previewUrl ? (
          <img
            src={item.topConcept.previewUrl}
            alt={`${item.domainName} logo`}
            className="w-11 h-11 object-contain rounded-lg"
          />
        ) : (
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <rect width="44" height="44" rx="10" fill={color} />
            <text x="22" y="29" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="700" fill="white">
              {letter}
            </text>
          </svg>
        )}
        <span className="text-[12px] font-semibold text-[#1A1A18]">
          {item.domainName}{item.tld}
        </span>
        {item.topConcept && (
          <span className="text-[10px] text-[#585854] tracking-[0.06em] uppercase">
            {item.topConcept.style}
          </span>
        )}
      </div>
    </Link>
  );
}

function PlaceholderCard({ name, letter, color, style }: { name: string; letter: string; color: string; style: string }) {
  return (
    <div className="w-[200px] h-[140px] bg-white rounded-2xl border border-[#E6E6E4] flex items-center justify-center flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex flex-col items-center gap-2.5">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="10" fill={color} />
          <text x="22" y="29" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="700" fill="white">
            {letter}
          </text>
        </svg>
        <span className="text-[12px] font-semibold text-[#1A1A18]">{name}</span>
        <span className="text-[10px] text-[#585854] tracking-[0.06em] uppercase">{style}</span>
      </div>
    </div>
  );
}

const PLACEHOLDERS = [
  { name: 'Godzilla Coffee', letter: 'G', color: '#1A1A18', style: 'Wordmark' },
  { name: 'Meridian Law', letter: 'M', color: '#0F4C81', style: 'Icon + Text' },
  { name: 'Volta Energy', letter: 'V', color: '#D97706', style: 'Abstract Mark' },
  { name: 'Clearline', letter: 'C', color: '#064E3B', style: 'Letterform' },
  { name: 'NovaBrew', letter: 'N', color: '#9333EA', style: 'Pictorial' },
  { name: 'TerraFirm', letter: 'T', color: '#166534', style: 'Emblem' },
  { name: 'Persona Studio', letter: 'P', color: '#7C3AED', style: 'Mascot' },
  { name: 'Apex Capital', letter: 'A', color: '#BE123C', style: 'Geometric' },
  { name: 'Wavefront', letter: 'W', color: '#0C4A6E', style: 'Emblem' },
  { name: 'Gridlock', letter: 'G', color: '#292524', style: 'Pattern Mark' },
  { name: 'SkyPulse', letter: 'S', color: '#0369A1', style: 'Abstract Mark' },
  { name: 'Bloom & Co', letter: 'B', color: '#DB2777', style: 'Wordmark' },
];

function GalleryColumn({ items, placeholders, direction }: {
  items: GalleryItem[];
  placeholders: typeof PLACEHOLDERS;
  direction: 'up' | 'down';
}) {
  // Use real items if available, otherwise fill with placeholders
  const cards: React.ReactNode[] = [];
  const cardsPerColumn = 6;

  for (let i = 0; i < cardsPerColumn; i++) {
    if (i < items.length) {
      cards.push(<GalleryCard key={items[i].sessionId} item={items[i]} />);
    } else {
      const p = placeholders[i % placeholders.length];
      cards.push(<PlaceholderCard key={`ph-${i}`} {...p} />);
    }
  }

  // Triple for seamless loop
  const tripled = [...cards, ...cards, ...cards];
  const animClass = direction === 'up' ? 'sparkdomain-scroll-up' : 'sparkdomain-scroll-down';

  return (
    <div className="h-[calc(100vh-160px)] overflow-hidden relative flex-shrink-0">
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#FAFAF8] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#FAFAF8] to-transparent z-10 pointer-events-none" />
      <div className={`flex flex-col gap-4 ${animClass}`}>
        {tripled.map((card, i) => (
          <div key={i}>{card}</div>
        ))}
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        const res = await fetch('/api/brand/gallery');
        if (!res.ok) throw new Error('Gallery fetch failed');
        const data = await res.json();
        if (!cancelled) {
          setItems(data.items || []);
        }
      } catch {
        // fail silently — show placeholders
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, []);

  // Distribute items across 5 columns
  const columnCount = 5;
  const columns: GalleryItem[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, i) => {
    columns[i % columnCount].push(item);
  });

  return (
    <div className="w-full px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1
          className="text-[40px] font-bold text-[#1A1A18] mb-2"
          style={{ letterSpacing: '-0.02em' }}
        >
          Brand Gallery
        </h1>
        <p className="text-[17px] text-[#585854]">
          Explore brand identities created by our community
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 mx-auto mb-4 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#585854]">Loading gallery...</p>
        </div>
      ) : (
        <>
          {/* Desktop: 5 vertical scrolling columns */}
          <div className="hidden lg:flex justify-center gap-4">
            {columns.map((colItems, i) => (
              <GalleryColumn
                key={i}
                items={colItems}
                placeholders={PLACEHOLDERS.slice(i * 2, i * 2 + 6)}
                direction={i % 2 === 0 ? 'up' : 'down'}
              />
            ))}
          </div>

          {/* Mobile: static grid */}
          <div className="lg:hidden grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-[700px] mx-auto">
            {items.length > 0 ? (
              items.map((item) => (
                <GalleryCard key={item.sessionId} item={item} />
              ))
            ) : (
              PLACEHOLDERS.map((p, i) => (
                <PlaceholderCard key={i} {...p} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
