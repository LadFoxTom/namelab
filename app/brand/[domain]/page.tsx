'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { BrandIdentityPanel } from '@/components/brand/BrandIdentityPanel';
import Link from 'next/link';

function BrandDomainContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const domainName = decodeURIComponent(params.domain as string);
  const tld = searchParams.get('tld') || '.com';
  const existingSession = searchParams.get('session');

  const [anonymousId, setAnonymousId] = useState('');

  useEffect(() => {
    let anonId = localStorage.getItem('sparkdomain_anon_id');
    if (!anonId) {
      anonId = crypto.randomUUID();
      localStorage.setItem('sparkdomain_anon_id', anonId);
    }
    setAnonymousId(anonId);
  }, []);

  if (!anonymousId) return null;

  return (
    <>
      <Link
        href="/brand"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-purple-600 transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Brand Studio
      </Link>
      <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">
        Brand identity for <span className="text-purple-600">{domainName}{tld}</span>
      </h1>
      <p className="text-gray-500 text-sm mb-4">
        Generate logos, color palettes, and a complete brand kit.
      </p>
      <BrandIdentityPanel
        domainName={domainName}
        tld={tld}
        searchQuery={domainName}
        anonymousId={anonymousId}
        initialSessionId={existingSession || undefined}
        autoStart={!existingSession}
      />
    </>
  );
}

export default function BrandDomainPage() {
  return (
    <div className="bg-white text-gray-800 font-sans min-h-screen">
      <Navbar />
      <main className="pt-24 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 md:px-12 max-w-3xl mx-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-6 w-6 text-purple-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        }>
          <BrandDomainContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
