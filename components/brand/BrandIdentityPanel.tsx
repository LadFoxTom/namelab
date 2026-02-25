'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LogoConceptGrid } from './LogoConceptGrid';
import { BrandLoadingState } from './BrandLoadingState';
import { BrandBriefForm, BrandPreferences } from './BrandBriefForm';

interface BrandIdentityPanelProps {
  domainName: string;
  tld: string;
  searchQuery: string;
  anonymousId: string;
  initialSessionId?: string;
  autoStart?: boolean;
}

type PanelState = 'idle' | 'restoring' | 'briefing' | 'initializing' | 'generating' | 'ready' | 'failed';

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
          setState('ready');
        } else if (data.status === 'GENERATING') {
          setSessionId(restoreId);
          setState('generating');
        } else {
          // Session failed or not found — start fresh
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
    setProgress('extracting_signals');
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

      if (!res.ok) {
        setState('failed');
        return;
      }

      // Read streaming response for progress updates
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let receivedSessionId: string | null = null;
      let finalStatus: string | null = null;

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const match = line.match(/^data: (.+)$/);
            if (!match) continue;
            try {
              const data = JSON.parse(match[1]);
              if (data.sessionId && !receivedSessionId) {
                receivedSessionId = data.sessionId;
                setSessionId(data.sessionId);
                localStorage.setItem(`${STORAGE_KEY_PREFIX}${domainName}${tld}`, data.sessionId);
              }
              if (data.progress) setProgress(data.progress);
              if (data.status) finalStatus = data.status;
            } catch {
              // Skip malformed events
            }
          }
        }
      }

      if (finalStatus === 'READY' && receivedSessionId) {
        // Fetch concepts from status endpoint
        const statusRes = await fetch(`/api/brand/status?sessionId=${receivedSessionId}`);
        const statusData = await statusRes.json();
        if (statusData.status === 'READY') {
          setConcepts(statusData.concepts);
          setSignals(statusData.signals);
          setState('ready');
          return;
        }
      }

      if (finalStatus === 'FAILED') {
        setState('failed');
        return;
      }

      // Fallback: if stream ended without READY, fall back to polling
      if (receivedSessionId) {
        setState('generating');
      } else {
        setState('failed');
      }
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

  if (state === 'restoring') {
    return (
      <div className="mt-8 flex items-center justify-center py-12">
        <svg className="animate-spin h-6 w-6 text-purple-500 mr-3" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm text-gray-500">Loading your brand...</span>
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
        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full uppercase tracking-wider font-medium">Preview</span>
      </div>

      <LogoConceptGrid
        concepts={concepts}
        selectedId={selectedConceptId}
        onSelect={setSelectedConceptId}
      />

      <div className="mt-6 space-y-3">
        <button
          onClick={handleDownloadKit}
          disabled={!selectedConceptId || buildingKit}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-200/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
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
        {kitError && (
          <p className="text-red-500 text-xs text-center">{kitError}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleDownloadLogo}
            disabled={!selectedConceptId || downloading}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {downloading ? 'Downloading...' : 'Download logo only'}
          </button>
          <button
            onClick={() => setState('briefing')}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors text-sm"
          >
            Regenerate
          </button>
        </div>
        {buildingKit && (
          <p className="text-xs text-gray-400 text-center">
            Removing background, vectorizing, generating assets... This takes about 30 seconds.
          </p>
        )}
      </div>
    </div>
  );
}
