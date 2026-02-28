'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { BrandIdentityPanel } from '@/components/brand/BrandIdentityPanel';
import Link from 'next/link';

function BrandDomainContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const domainName = decodeURIComponent(params.domain as string);
  const tld = searchParams.get('tld') || '.com';
  const existingSession = searchParams.get('session');
  const autoStartParam = searchParams.get('autoStart');

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <Link
        href="/brand"
        className="inline-flex items-center gap-1 text-sm text-[#A1A1AA] hover:text-[#7C3AED] transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Brand Studio
      </Link>
      <h1 className="text-2xl sm:text-4xl font-bold text-[#1A1A18] mb-2">
        Brand identity for <span className="text-[#7C3AED]">{domainName}{tld}</span>
      </h1>
      <p className="text-[#585854] text-sm mb-4">
        AI-powered logo concepts, color system, typography, and production-ready files.
      </p>
      <BrandIdentityPanel
        domainName={domainName}
        tld={tld}
        searchQuery={domainName}
        anonymousId={anonymousId}
        initialSessionId={existingSession || undefined}
        autoStart={!existingSession || autoStartParam === 'true'}
      />
    </div>
  );
}

export default function BrandDomainPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BrandDomainContent />
    </Suspense>
  );
}
