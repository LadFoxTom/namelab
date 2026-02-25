'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthContext';

interface GalleryItem {
  sessionId: string;
  domainName: string;
  tld: string;
  description: string;
  createdAt: string;
  topConcept: { id: string; style: string; previewUrl: string } | null;
}

interface MyBrand {
  id: string;
  domainName: string;
  tld: string;
  searchQuery: string;
  createdAt: string;
  concepts: { id: string; style: string; previewUrl: string }[];
}

function HeroSection() {
  const [input, setInput] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = input.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleaned) return;
    const dotIndex = cleaned.lastIndexOf('.');
    if (dotIndex > 0) {
      const name = cleaned.substring(0, dotIndex);
      const ext = cleaned.substring(dotIndex + 1);
      router.push(`/brand/${encodeURIComponent(name)}?tld=.${ext}`);
    } else {
      router.push(`/brand/${encodeURIComponent(cleaned)}`);
    }
  };

  return (
    <section className="text-center py-16 sm:py-24">
      <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      </div>
      <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-4">
        Create a brand identity
      </h1>
      <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
        Enter any domain or brand name. Our AI generates logos, color palettes,
        and a full brand kit in seconds.
      </p>
      <form onSubmit={handleSubmit} className="max-w-md mx-auto flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="yourbrand.com"
          className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none"
        />
        <button
          type="submit"
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-200/50 transition-all"
        >
          Generate
        </button>
      </form>
    </section>
  );
}

function MyBrandsSection() {
  const [brands, setBrands] = useState<MyBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/brand/my-brands')
      .then((r) => r.json())
      .then((data) => setBrands(data.brands || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">My Brands</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-100 overflow-hidden">
              <div className="aspect-square bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-50 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (brands.length === 0) return null;

  return (
    <section className="mb-16">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">My Brands</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {brands.map((brand) => (
          <button
            key={brand.id}
            onClick={() =>
              router.push(
                `/brand/${encodeURIComponent(brand.domainName)}?tld=${encodeURIComponent(brand.tld)}&session=${brand.id}`
              )
            }
            className="group rounded-xl border border-gray-200 overflow-hidden hover:border-purple-300 hover:shadow-md transition-all text-left"
          >
            {brand.concepts[0] && (
              <div className="aspect-square bg-gray-50">
                <img
                  src={brand.concepts[0].previewUrl}
                  alt={`${brand.domainName} logo`}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="p-3">
              <p className="text-sm font-medium text-gray-900 truncate">
                {brand.domainName}{brand.tld}
              </p>
              <p className="text-xs text-gray-400 truncate">{brand.searchQuery}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function GallerySection() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMore = useCallback(async (cursor?: string) => {
    setLoading(true);
    try {
      const url = cursor ? `/api/brand/gallery?cursor=${cursor}` : '/api/brand/gallery';
      const res = await fetch(url);
      const data = await res.json();
      setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
      setNextCursor(data.nextCursor);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  if (!loading && items.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Brand Inspiration</h2>
      <p className="text-sm text-gray-400 mb-6">
        Logos generated by the community. Get inspired, then create your own.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map((item) =>
          item.topConcept ? (
            <div
              key={item.sessionId}
              className="rounded-xl border border-gray-100 overflow-hidden bg-white"
            >
              <div className="aspect-square bg-gray-50">
                <img
                  src={item.topConcept.previewUrl}
                  alt={`${item.domainName} logo`}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.domainName}{item.tld}
                </p>
                {item.description && (
                  <p className="text-xs text-gray-400 truncate">{item.description}</p>
                )}
              </div>
            </div>
          ) : null
        )}
      </div>
      {loading && (
        <div className="flex justify-center py-8">
          <svg className="animate-spin h-6 w-6 text-purple-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
      {!loading && nextCursor && (
        <div className="text-center mt-8">
          <button
            onClick={() => loadMore(nextCursor)}
            className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </section>
  );
}

export default function BrandStudioPage() {
  const { user, loading } = useAuth();

  return (
    <div className="bg-white text-gray-800 font-sans min-h-screen">
      <Navbar />
      <main className="pt-24 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 md:px-12 max-w-5xl mx-auto">
        <HeroSection />
        {!loading && user && <MyBrandsSection />}
        <GallerySection />
      </main>
      <Footer />
    </div>
  );
}
