'use client';

import { useState, useEffect, useCallback } from 'react';
import { LogoConceptGrid } from './LogoConceptGrid';
import { BrandLoadingState } from './BrandLoadingState';
import { BrandPricingModal } from './BrandPricingModal';
import { BrandBriefForm, BrandPreferences } from './BrandBriefForm';

interface BrandIdentityPanelProps {
  domainName: string;
  tld: string;
  searchQuery: string;
  anonymousId: string;
}

type PanelState = 'idle' | 'briefing' | 'initializing' | 'generating' | 'ready' | 'failed';

export function BrandIdentityPanel({ domainName, tld, searchQuery, anonymousId }: BrandIdentityPanelProps) {
  const [state, setState] = useState<PanelState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<any[]>([]);
  const [signals, setSignals] = useState<any>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const startGeneration = useCallback(async (preferences: BrandPreferences) => {
    setState('initializing');
    setProgress(null);
    try {
      const res = await fetch('/api/brand/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainName,
          tld,
          searchQuery: preferences.businessDescription,
          anonymousId,
          preferences,
        }),
      });
      const data = await res.json();
      setSessionId(data.sessionId);
      setState('generating');
    } catch {
      setState('failed');
    }
  }, [domainName, tld, anonymousId]);

  useEffect(() => {
    if (!sessionId || state !== 'generating') return;

    const startedAt = Date.now();
    const TIMEOUT_MS = 90_000; // 90 seconds

    const interval = setInterval(async () => {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        setState('failed');
        clearInterval(interval);
        return;
      }

      try {
        const res = await fetch(`/api/brand/status?sessionId=${sessionId}`);
        const data = await res.json();

        if (data.progress) {
          setProgress(data.progress);
        }

        if (data.status === 'READY') {
          setConcepts(data.concepts);
          setSignals(data.signals);
          setState('ready');
          clearInterval(interval);
        } else if (data.status === 'FAILED') {
          setState('failed');
          clearInterval(interval);
        }
      } catch {
        // Network error — keep polling
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [sessionId, state]);

  if (state === 'idle') {
    return (
      <div className="mt-8 border border-dashed border-purple-200 rounded-2xl p-8 text-center bg-purple-50/30">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Generate your brand identity
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          AI-powered logo, color palette, social media kit — all matched to <span className="font-medium text-purple-600">{domainName}{tld}</span>
        </p>
        <button
          onClick={() => setState('briefing')}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-200/50 hover:scale-105 transition-all duration-200"
        >
          Generate brand identity — Free preview
        </button>
      </div>
    );
  }

  if (state === 'briefing') {
    return (
      <BrandBriefForm
        domainName={domainName}
        tld={tld}
        searchQuery={searchQuery}
        onSubmit={startGeneration}
        onBack={() => setState('idle')}
      />
    );
  }

  if (state === 'initializing' || state === 'generating') {
    return <BrandLoadingState progress={progress} onCancel={() => setState('briefing')} />;
  }

  if (state === 'failed') {
    return (
      <div className="mt-8 p-6 bg-red-50 rounded-2xl text-center">
        <p className="text-red-600 text-sm">
          Brand generation failed.{' '}
          <button onClick={() => setState('briefing')} className="underline font-medium">Try again</button>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Brand identity for <span className="text-purple-600">{domainName}{tld}</span>
        </h3>
        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full uppercase tracking-wider font-medium">Preview — watermarked</span>
      </div>

      <LogoConceptGrid
        concepts={concepts}
        selectedId={selectedConceptId}
        onSelect={setSelectedConceptId}
      />

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => setShowPricing(true)}
          disabled={!selectedConceptId}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-200/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
        >
          Download files
        </button>
        <button
          onClick={() => setState('briefing')}
          className="px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors text-sm"
        >
          Regenerate
        </button>
      </div>

      {showPricing && (
        <BrandPricingModal
          sessionId={sessionId!}
          selectedConceptId={selectedConceptId!}
          domainName={`${domainName}${tld}`}
          onClose={() => setShowPricing(false)}
        />
      )}
    </div>
  );
}
