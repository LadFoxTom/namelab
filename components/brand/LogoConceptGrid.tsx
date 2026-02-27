'use client';

import { useState, useEffect, useCallback } from 'react';

interface Concept {
  id: string;
  style: string;
  previewUrl: string;
  isSelected: boolean;
  score?: number;
}

interface LogoConceptGridProps {
  concepts: Concept[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConceptRefined?: (conceptId: string, newPreviewUrl: string) => void;
}

const STYLE_LABELS: Record<string, string> = {
  wordmark: 'Wordmark',
  icon_wordmark: 'Icon + Text',
  monogram: 'Monogram',
  abstract_mark: 'Abstract Mark',
  pictorial: 'Pictorial',
  mascot: 'Mascot',
  emblem: 'Emblem',
  dynamic: 'Dynamic',
};

const QUICK_REFINEMENTS = [
  { label: 'Simplify', feedback: 'Make it simpler and more minimal, reduce detail' },
  { label: 'Change color', feedback: 'Try a different color palette' },
  { label: 'Bigger icon', feedback: 'Make the icon larger relative to the text' },
  { label: 'More contrast', feedback: 'Increase contrast, make the design bolder' },
];

const MOCKUP_TABS = [
  { key: 'logo', label: 'Logo' },
  { key: 'business-card', label: 'Business Card' },
  { key: 'website-header', label: 'Website' },
  { key: 'dark-background', label: 'Dark BG' },
] as const;

type MockupTab = typeof MOCKUP_TABS[number]['key'];

function ScoreBadge({ score }: { score: number }) {
  if (score >= 80) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Excellent
      </span>
    );
  }
  if (score >= 65) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        Good
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
      Fair
    </span>
  );
}

export function LogoConceptGrid({ concepts, selectedId, onSelect, onConceptRefined }: LogoConceptGridProps) {
  const [lightboxConcept, setLightboxConcept] = useState<Concept | null>(null);
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MockupTab>('logo');
  const [mockupUrls, setMockupUrls] = useState<Record<string, string>>({});
  const [loadingMockup, setLoadingMockup] = useState(false);

  const handleRefine = useCallback(async (conceptId: string) => {
    const text = feedbackText[conceptId]?.trim();
    if (!text || !onConceptRefined) return;
    setRefiningId(conceptId);
    setRefineError(null);
    try {
      const res = await fetch('/api/brand/refine-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId, feedback: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refinement failed');
      onConceptRefined(conceptId, data.previewUrl);
      setFeedbackText((prev) => ({ ...prev, [conceptId]: '' }));
      setActiveFeedbackId(null);
    } catch (err: any) {
      setRefineError(err.message || 'Refinement failed');
    } finally {
      setRefiningId(null);
    }
  }, [feedbackText, onConceptRefined]);

  const handleRegenerate = useCallback(async (conceptId: string) => {
    if (!onConceptRefined) return;
    setRegeneratingId(conceptId);
    try {
      const res = await fetch('/api/brand/regenerate-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Regeneration failed');
      onConceptRefined(conceptId, data.previewUrl);
    } catch (err: any) {
      setRefineError(err.message || 'Regeneration failed');
    } finally {
      setRegeneratingId(null);
    }
  }, [onConceptRefined]);

  const handleQuickRefine = useCallback((conceptId: string, feedback: string) => {
    setFeedbackText(prev => ({ ...prev, [conceptId]: feedback }));
    setActiveFeedbackId(conceptId);
  }, []);

  // Load mockup when tab changes in lightbox
  useEffect(() => {
    if (!lightboxConcept || activeTab === 'logo') return;
    const key = `${lightboxConcept.id}-${activeTab}`;
    if (mockupUrls[key]) return;

    setLoadingMockup(true);
    fetch(`/api/brand/mockup?conceptId=${lightboxConcept.id}&type=${activeTab}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed');
        return res.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        setMockupUrls(prev => ({ ...prev, [key]: url }));
      })
      .catch(() => {})
      .finally(() => setLoadingMockup(false));
  }, [lightboxConcept, activeTab, mockupUrls]);

  const closeLightbox = useCallback(() => {
    setLightboxConcept(null);
    setActiveTab('logo');
  }, []);

  useEffect(() => {
    if (!lightboxConcept) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [lightboxConcept, closeLightbox]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {concepts.map((concept) => (
          <div key={concept.id}>
          <button
            onClick={() => onSelect(concept.id)}
            className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-200 w-full ${
              selectedId === concept.id
                ? 'border-purple-500 ring-2 ring-purple-200 scale-[1.02]'
                : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            <div className="aspect-square bg-gray-50">
              <img
                src={concept.previewUrl}
                alt={`${STYLE_LABELS[concept.style] || concept.style} logo concept`}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <div className="flex items-center justify-between">
                <span className="text-white text-xs font-medium">
                  {STYLE_LABELS[concept.style] || concept.style}
                </span>
                {concept.score != null && concept.score > 0 && (
                  <ScoreBadge score={concept.score} />
                )}
              </div>
            </div>
            {/* Zoom button */}
            <div
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxConcept(concept);
                setActiveTab('logo');
              }}
              className="absolute top-2 left-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/70"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </div>
            {selectedId === concept.id && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {/* Refine button */}
            {onConceptRefined && refiningId !== concept.id && regeneratingId !== concept.id && (
              <div
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFeedbackId(activeFeedbackId === concept.id ? null : concept.id);
                  setRefineError(null);
                }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/70"
                style={selectedId === concept.id ? { right: '2.25rem' } : undefined}
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
            )}
            {/* Loading overlay */}
            {(refiningId === concept.id || regeneratingId === concept.id) && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-xl">
                <div className="flex flex-col items-center gap-2">
                  <svg className="animate-spin h-6 w-6 text-purple-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-xs text-purple-600 font-medium">
                    {regeneratingId === concept.id ? 'Regenerating...' : 'Refining...'}
                  </span>
                </div>
              </div>
            )}
          </button>
          {/* Feedback input + quick actions for this concept */}
          {activeFeedbackId === concept.id && onConceptRefined && (
            <div className="mt-1.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
              {/* Quick refinement buttons */}
              <div className="flex flex-wrap gap-1">
                {QUICK_REFINEMENTS.map((qr) => (
                  <button
                    key={qr.label}
                    onClick={() => handleQuickRefine(concept.id, qr.feedback)}
                    className="px-2 py-1 text-[10px] bg-gray-100 text-gray-600 rounded-md hover:bg-purple-100 hover:text-purple-700 transition-colors"
                  >
                    {qr.label}
                  </button>
                ))}
                <button
                  onClick={() => handleRegenerate(concept.id)}
                  disabled={regeneratingId === concept.id}
                  className="px-2 py-1 text-[10px] bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 transition-colors disabled:opacity-40"
                >
                  Regenerate
                </button>
              </div>
              {/* Free text input */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={feedbackText[concept.id] || ''}
                  onChange={(e) => setFeedbackText((prev) => ({ ...prev, [concept.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRefine(concept.id); }}
                  placeholder="e.g. make the icon blue"
                  className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-300"
                  maxLength={500}
                  disabled={refiningId === concept.id}
                />
                <button
                  onClick={() => handleRefine(concept.id)}
                  disabled={!feedbackText[concept.id]?.trim() || refiningId === concept.id}
                  className="px-2.5 py-1.5 bg-purple-500 text-white text-xs rounded-lg hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Refine
                </button>
              </div>
              {refineError && refiningId === null && (
                <p className="text-[10px] text-red-500">{refineError}</p>
              )}
            </div>
          )}
          </div>
        ))}
      </div>

      {/* Lightbox with mockup tabs */}
      {lightboxConcept && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-2xl w-full mx-4 bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Tab bar */}
            <div className="flex border-b border-gray-100 px-4 pt-3">
              {MOCKUP_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-purple-500 text-purple-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Image area */}
            <div className="bg-gray-50 p-6 min-h-[300px] flex items-center justify-center">
              {activeTab === 'logo' ? (
                <img
                  src={lightboxConcept.previewUrl}
                  alt={`${STYLE_LABELS[lightboxConcept.style] || lightboxConcept.style} logo concept`}
                  className="w-full h-auto object-contain max-h-[70vh]"
                />
              ) : loadingMockup ? (
                <div className="flex flex-col items-center gap-2">
                  <svg className="animate-spin h-6 w-6 text-purple-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-xs text-gray-400">Loading mockup...</span>
                </div>
              ) : mockupUrls[`${lightboxConcept.id}-${activeTab}`] ? (
                <img
                  src={mockupUrls[`${lightboxConcept.id}-${activeTab}`]}
                  alt={`${activeTab} mockup`}
                  className="w-full h-auto object-contain max-h-[70vh]"
                />
              ) : (
                <span className="text-sm text-gray-400">Mockup unavailable</span>
              )}
            </div>

            {/* Label + actions */}
            <div className="px-5 py-3 flex items-center justify-between border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {STYLE_LABELS[lightboxConcept.style] || lightboxConcept.style}
                </span>
                {lightboxConcept.score != null && lightboxConcept.score > 0 && (
                  <ScoreBadge score={lightboxConcept.score} />
                )}
              </div>
              <button
                onClick={() => {
                  onSelect(lightboxConcept.id);
                  closeLightbox();
                }}
                className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors ${
                  selectedId === lightboxConcept.id
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                {selectedId === lightboxConcept.id ? 'Selected' : 'Select this logo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
