'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LogoConceptGrid } from './LogoConceptGrid';
import { BrandGenerationScreen, StrategyPanel } from './BrandGenerationScreen';
import { BrandBriefForm, BrandPreferences } from './BrandBriefForm';
import { BrandKitPreview } from './BrandKitPreview';

interface BrandIdentityPanelProps {
  domainName: string;
  tld: string;
  searchQuery: string;
  anonymousId: string;
  initialSessionId?: string;
  autoStart?: boolean;
}

type PanelState = 'idle' | 'restoring' | 'briefing' | 'initializing' | 'generating' | 'ready' | 'kit-preview' | 'failed';

const STORAGE_KEY_PREFIX = 'brand_session_';

export function BrandIdentityPanel({
  domainName,
  tld,
  searchQuery,
  anonymousId,
  initialSessionId,
  autoStart,
}: BrandIdentityPanelProps) {
  const [state, setState] = useState<PanelState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<any[]>([]);
  const [signals, setSignals] = useState<any>(null);
  const [designBrief, setDesignBrief] = useState<any>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [buildingKit, setBuildingKit] = useState(false);
  const [kitError, setKitError] = useState<string | null>(null);
  const restoredRef = useRef(false);

  // Restore session on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const storageKey = `${STORAGE_KEY_PREFIX}${domainName}${tld}`;
    const restoreId = initialSessionId || localStorage.getItem(storageKey);

    if (!restoreId) {
      // Auto-start: skip idle, go directly to briefing
      if (autoStart) setState('briefing');
      return;
    }

    setState('restoring');
    fetch(`/api/brand/status?sessionId=${restoreId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 'READY') {
          setSessionId(restoreId);
          setConcepts(data.concepts);
          setSignals(data.signals);
          setDesignBrief(data.designBrief);
          setState('ready');
        } else if (data.status === 'GENERATING') {
          setSessionId(restoreId);
          if (data.designBrief) setDesignBrief(data.designBrief);
          if (data.concepts?.length) setConcepts(data.concepts);
          setState('generating');
        } else {
          localStorage.removeItem(storageKey);
          setState(autoStart ? 'briefing' : 'idle');
        }
      })
      .catch(() => {
        localStorage.removeItem(storageKey);
        setState(autoStart ? 'briefing' : 'idle');
      });
  }, [domainName, tld, initialSessionId, autoStart]);

  const handleDownloadLogo = useCallback(async () => {
    const concept = concepts.find((c: any) => c.id === selectedConceptId);
    if (!concept) return;
    setDownloading(true);
    try {
      const res = await fetch(concept.previewUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${domainName}${tld}-${concept.style}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(concept.previewUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  }, [concepts, selectedConceptId, domainName, tld]);

  const handleDownloadKit = useCallback(async () => {
    if (!sessionId || !selectedConceptId) return;
    setBuildingKit(true);
    setKitError(null);
    try {
      const res = await fetch('/api/brand/build-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, conceptId: selectedConceptId, tier: 'BRAND_KIT' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Build failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${domainName}${tld}-brand-kit.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setKitError(err.message || 'Failed to build brand kit');
    } finally {
      setBuildingKit(false);
    }
  }, [sessionId, selectedConceptId, domainName, tld]);

  const startGeneration = useCallback(async (preferences: BrandPreferences) => {
    setState('generating');
    setProgress('analyzing_brand');
    setConcepts([]);
    setDesignBrief(null);
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

      if (!res.ok || data.status === 'FAILED') {
        setState('failed');
        return;
      }

      setSessionId(data.sessionId);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${domainName}${tld}`, data.sessionId);
      setState('generating');
    } catch {
      setState('failed');
    }
  }, [domainName, tld, anonymousId]);

  // Polling effect — handles progressive data (brief + concepts during generation)
  useEffect(() => {
    if (!sessionId || state !== 'generating') return;

    const startedAt = Date.now();
    const TIMEOUT_MS = 360_000;

    const interval = setInterval(async () => {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        setState('failed');
        clearInterval(interval);
        return;
      }

      try {
        const res = await fetch(`/api/brand/status?sessionId=${sessionId}`);
        const data = await res.json();

        if (data.progress) setProgress(data.progress);
        if (data.designBrief) setDesignBrief(data.designBrief);
        if (data.concepts?.length) setConcepts(data.concepts);

        if (data.status === 'READY') {
          setConcepts(data.concepts);
          setSignals(data.signals);
          setDesignBrief(data.designBrief);
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

  /* ── Render states ── */

  if (state === 'idle') {
    return (
      <div className="mt-8 border border-dashed border-[#E6E6E4] rounded-2xl p-8 text-center bg-white">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#7C3AED] flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[#1A1A18] mb-1">
          Generate your brand identity
        </h3>
        <p className="text-[#585854] text-sm mb-4">
          AI-powered logo, color palette, social media kit — all matched to{' '}
          <span className="font-medium text-[#7C3AED]">{domainName}{tld}</span>
        </p>
        <button
          onClick={() => setState('briefing')}
          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
        >
          Generate brand identity — Free preview
        </button>
      </div>
    );
  }

  if (state === 'restoring') {
    return (
      <div className="mt-8 flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mr-3" />
        <span className="text-sm text-[#585854]">Loading your brand...</span>
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
    return (
      <BrandGenerationScreen
        progress={progress}
        designBrief={designBrief}
        concepts={concepts}
        onCancel={() => setState('briefing')}
      />
    );
  }

  if (state === 'failed') {
    return (
      <div className="mt-8 p-6 rounded-2xl border border-[#E6E6E4] bg-white text-center">
        <p className="text-red-600 text-sm">
          Brand generation failed.{' '}
          <button onClick={() => setState('briefing')} className="underline font-medium">
            Try again
          </button>
        </p>
      </div>
    );
  }

  if (state === 'kit-preview' && selectedConceptId) {
    const selectedConcept = concepts.find((c: any) => c.id === selectedConceptId);
    return (
      <BrandKitPreview
        sessionId={sessionId!}
        concept={selectedConcept}
        domainName={domainName}
        tld={tld}
        signals={signals}
        designBrief={designBrief}
        onBack={() => setState('ready')}
        onDownloadKit={handleDownloadKit}
        onDownloadLogo={handleDownloadLogo}
        buildingKit={buildingKit}
        downloading={downloading}
        kitError={kitError}
      />
    );
  }

  // State: ready — strategy-left, concepts-right (matching generation layout)
  return (
    <div className="mt-8">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6">
        {/* Left: Strategy panel (sticky) */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <StrategyPanel designBrief={designBrief} />
        </div>

        {/* Right: Logo grid + actions */}
        <div>
          <LogoConceptGrid
            concepts={concepts}
            selectedId={selectedConceptId}
            onSelect={setSelectedConceptId}
            designBrief={designBrief}
            onConceptRefined={(conceptId, newPreviewUrl) => {
              setConcepts((prev: any[]) =>
                prev.map((c: any) =>
                  c.id === conceptId ? { ...c, previewUrl: newPreviewUrl } : c
                )
              );
            }}
          />

          <div className="mt-6 space-y-3">
            {/* Free download buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleDownloadKit}
                disabled={!selectedConceptId || buildingKit}
                className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-3 rounded-xl font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {buildingKit ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Building brand kit...
                  </span>
                ) : 'Download brand kit'}
              </button>
              <button
                onClick={handleDownloadLogo}
                disabled={!selectedConceptId || downloading}
                className="px-6 py-3 border border-[#E6E6E4] rounded-xl text-[#585854] hover:bg-[#FAFAF8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {downloading ? 'Downloading...' : 'Download logo only'}
              </button>
            </div>

            {/* Continue to kit preview / purchase */}
            <button
              onClick={() => setState('kit-preview')}
              disabled={!selectedConceptId}
              className="w-full py-3 border border-[#E6E6E4] rounded-xl text-sm font-medium text-[#585854] hover:bg-[#FAFAF8] hover:border-[#D4D4D8] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Continue with this concept &rarr; Full brand kit preview
            </button>

            <button
              onClick={() => setState('briefing')}
              className="w-full text-sm text-[#A1A1AA] hover:text-[#585854] transition-colors"
            >
              Regenerate with new settings
            </button>

            {kitError && (
              <p className="text-red-500 text-xs text-center">{kitError}</p>
            )}
            {buildingKit && (
              <p className="text-xs text-[#A1A1AA] text-center">
                Removing background, vectorizing, generating assets... This takes about 30 seconds.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

