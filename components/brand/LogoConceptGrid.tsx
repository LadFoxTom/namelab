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
  designBrief?: any;
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
  { label: 'Bolder', feedback: 'Make it bolder and more impactful, increase weight' },
  { label: 'Different color', feedback: 'Try a different color palette' },
  { label: 'Bigger icon', feedback: 'Make the icon larger relative to the text' },
  { label: 'Bigger text', feedback: 'Make the text larger and more prominent' },
  { label: 'More abstract', feedback: 'Make the design more abstract and geometric' },
  { label: 'Different concept', feedback: 'Try a completely different visual concept' },
  { label: 'Change layout', feedback: 'Try a different layout arrangement' },
];

const MOCKUP_TABS = [
  { key: 'logo', label: 'Logo' },
  { key: 'business-card', label: 'Business Card' },
  { key: 'website-header', label: 'Website' },
  { key: 'social-media', label: 'Social Media' },
  { key: 'dark-background', label: 'Dark BG' },
  { key: 'storefront', label: 'Storefront' },
] as const;

type MockupTab = typeof MOCKUP_TABS[number]['key'];

function ScoreBadge({ score }: { score: number }) {
  if (score >= 85) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
        Top pick
      </span>
    );
  }
  if (score >= 75) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200">
        Strong
      </span>
    );
  }
  return null;
}

function generateRationale(concept: Concept, designBrief?: any): string | null {
  if (!designBrief) return null;
  const style = STYLE_LABELS[concept.style] || concept.style;
  const anchor = designBrief.memorableAnchor;
  const aesthetic = designBrief.aestheticDirection;
  const tension = designBrief.tensionPair;

  if (anchor && aesthetic) {
    return `This ${style.toLowerCase()} design channels the ${aesthetic.toLowerCase()} aesthetic through ${anchor.toLowerCase()}.`;
  }
  if (tension) {
    return `A ${style.toLowerCase()} approach balancing the tension of "${tension}".`;
  }
  if (aesthetic) {
    return `${style} concept aligned with the ${aesthetic.toLowerCase()} direction.`;
  }
  return null;
}

export function LogoConceptGrid({
  concepts,
  selectedId,
  onSelect,
  onConceptRefined,
  designBrief,
}: LogoConceptGridProps) {
  const [lightboxConcept, setLightboxConcept] = useState<Concept | null>(null);
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [refineModalId, setRefineModalId] = useState<string | null>(null);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MockupTab>('logo');
  const [mockupUrls, setMockupUrls] = useState<Record<string, string>>({});
  const [loadingMockup, setLoadingMockup] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

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

  const toggleCompare = useCallback((conceptId: string) => {
    setCompareIds(prev => {
      if (prev.includes(conceptId)) return prev.filter(id => id !== conceptId);
      if (prev.length >= 2) return [prev[1], conceptId];
      return [...prev, conceptId];
    });
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
    if (!lightboxConcept && !refineModalId) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (refineModalId) setRefineModalId(null);
        else closeLightbox();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [lightboxConcept, refineModalId, closeLightbox]);

  return (
    <>
      {/* Grid toolbar */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-[#1A1A18]">
          {concepts.length} concepts generated
        </h3>
        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg border transition-all ${
              darkMode
                ? 'bg-[#1A1A18] border-[#1A1A18] text-white'
                : 'bg-white border-[#E6E6E4] text-[#585854] hover:border-[#D4D4D8]'
            }`}
            title={darkMode ? 'Switch to light' : 'Switch to dark'}
          >
            {darkMode ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          {/* Compare toggle */}
          <button
            onClick={() => { setCompareMode(!compareMode); setCompareIds([]); }}
            className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
              compareMode
                ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                : 'bg-white border-[#E6E6E4] text-[#585854] hover:border-[#D4D4D8]'
            }`}
          >
            Compare
          </button>
        </div>
      </div>

      {/* Comparison view */}
      {compareMode && compareIds.length === 2 && (
        <ComparisonView
          concepts={concepts.filter(c => compareIds.includes(c.id))}
          darkMode={darkMode}
        />
      )}

      {/* Main grid */}
      <div className="grid grid-cols-2 gap-3">
        {concepts.map((concept) => {
          const rationale = generateRationale(concept, designBrief);
          const isComparing = compareMode && compareIds.includes(concept.id);

          return (
            <div key={concept.id}>
              <button
                onClick={() => {
                  if (compareMode) {
                    toggleCompare(concept.id);
                  } else {
                    onSelect(concept.id);
                  }
                }}
                className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-200 w-full ${
                  isComparing
                    ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/20'
                    : selectedId === concept.id
                      ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/20 scale-[1.02]'
                      : 'border-[#E6E6E4] hover:border-[#D4D4D8]'
                }`}
              >
                <div
                  className="aspect-square transition-colors duration-300"
                  style={{ backgroundColor: darkMode ? '#1A1A18' : '#FFFFFF' }}
                >
                  <img
                    src={concept.previewUrl}
                    alt={`${STYLE_LABELS[concept.style] || concept.style} logo concept`}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Bottom info bar */}
                <div className="p-2.5 bg-white border-t border-[#E6E6E4]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#1A1A18] uppercase tracking-wide">
                      {STYLE_LABELS[concept.style] || concept.style}
                    </span>
                    {concept.score != null && concept.score > 0 && (
                      <ScoreBadge score={concept.score} />
                    )}
                  </div>
                  {rationale && (
                    <p className="text-[10px] text-[#585854] mt-1 line-clamp-2 leading-relaxed">
                      {rationale}
                    </p>
                  )}
                </div>

                {/* Hover buttons */}
                <div className="absolute top-2 left-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxConcept(concept);
                      setActiveTab('logo');
                    }}
                    className="w-7 h-7 bg-black/50 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/70"
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </div>
                </div>

                {selectedId === concept.id && !compareMode && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-[#7C3AED] rounded-full flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {/* Loading overlay */}
                {(refiningId === concept.id || regeneratingId === concept.id) && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-xl">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-[#7C3AED] font-medium">
                        {regeneratingId === concept.id ? 'Regenerating...' : 'Refining...'}
                      </span>
                    </div>
                  </div>
                )}
              </button>

              {/* Edit button for selected concept */}
              {selectedId === concept.id && onConceptRefined && !compareMode && (
                <button
                  onClick={() => setRefineModalId(concept.id)}
                  className="mt-2 w-full py-2 text-xs font-medium text-[#7C3AED] border border-[#7C3AED]/30 rounded-xl hover:bg-[#7C3AED]/5 transition-colors"
                >
                  Refine this concept
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox with 6 mockup tabs */}
      {lightboxConcept && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-2xl w-full mx-4 bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex overflow-x-auto border-b border-[#E6E6E4] pt-3 scrollbar-hide">
              {MOCKUP_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 px-3 sm:px-4 py-2 text-xs font-medium text-center border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-[#7C3AED] text-[#7C3AED]'
                      : 'border-transparent text-[#585854] hover:text-[#1A1A18]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="bg-[#FAFAF8] p-4 sm:p-6 min-h-[250px] sm:min-h-[300px] flex items-center justify-center">
              {activeTab === 'logo' ? (
                <img
                  src={lightboxConcept.previewUrl}
                  alt={`${STYLE_LABELS[lightboxConcept.style] || lightboxConcept.style} logo concept`}
                  className="w-full h-auto object-contain max-h-[70vh]"
                />
              ) : loadingMockup ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-[#A1A1AA]">Loading mockup...</span>
                </div>
              ) : mockupUrls[`${lightboxConcept.id}-${activeTab}`] ? (
                <img
                  src={mockupUrls[`${lightboxConcept.id}-${activeTab}`]}
                  alt={`${activeTab} mockup`}
                  className="w-full h-auto object-contain max-h-[70vh]"
                />
              ) : (
                <span className="text-sm text-[#A1A1AA]">Mockup unavailable</span>
              )}
            </div>

            <div className="px-4 sm:px-5 py-3 flex items-center justify-between border-t border-[#E6E6E4]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#1A1A18]">
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
                className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
                  selectedId === lightboxConcept.id
                    ? 'bg-[#7C3AED]/10 text-[#7C3AED]'
                    : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]'
                }`}
              >
                {selectedId === lightboxConcept.id ? 'Selected' : 'Select this logo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refinement modal */}
      {refineModalId && (() => {
        const concept = concepts.find(c => c.id === refineModalId);
        if (!concept) return null;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setRefineModalId(null)}
            onKeyDown={(e) => { if (e.key === 'Escape') setRefineModalId(null); }}
          >
            <div
              className="relative max-w-md w-full mx-4 bg-white rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setRefineModalId(null)}
                className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Concept preview */}
              <div className="bg-[#FAFAF8] p-6 flex items-center justify-center">
                <img
                  src={concept.previewUrl}
                  alt={`${STYLE_LABELS[concept.style] || concept.style} logo concept`}
                  className="w-40 h-40 object-contain"
                />
              </div>

              {/* Refinement controls */}
              <div className="p-5 space-y-4">
                <div className="text-sm font-semibold text-[#1A1A18]">Refine this concept</div>

                {/* Quick refinement buttons — 2 columns */}
                <div className="grid grid-cols-2 gap-1.5">
                  {QUICK_REFINEMENTS.map((qr) => (
                    <button
                      key={qr.label}
                      onClick={() => {
                        setFeedbackText(prev => ({ ...prev, [concept.id]: qr.feedback }));
                        setActiveFeedbackId(concept.id);
                      }}
                      className="px-3 py-2 text-xs bg-[#FAFAF8] text-[#585854] rounded-lg border border-[#E6E6E4] hover:bg-[#7C3AED]/5 hover:text-[#7C3AED] hover:border-[#7C3AED]/30 transition-colors text-left"
                    >
                      {qr.label}
                    </button>
                  ))}
                </div>

                {/* Custom feedback input */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={feedbackText[concept.id] || ''}
                    onChange={(e) => setFeedbackText((prev) => ({ ...prev, [concept.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRefine(concept.id);
                        setRefineModalId(null);
                      }
                    }}
                    placeholder="Describe your change..."
                    className="flex-1 text-xs px-3 py-2.5 border border-[#E6E6E4] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] placeholder:text-[#A1A1AA]"
                    maxLength={500}
                    disabled={refiningId === concept.id}
                  />
                  <button
                    onClick={() => {
                      handleRefine(concept.id);
                      setRefineModalId(null);
                    }}
                    disabled={!feedbackText[concept.id]?.trim() || refiningId === concept.id}
                    className="px-4 py-2.5 bg-[#7C3AED] text-white text-xs rounded-lg hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Refine &rarr;
                  </button>
                </div>

                {refineError && refiningId === null && (
                  <p className="text-[10px] text-red-500">{refineError}</p>
                )}

                {/* Regenerate button */}
                <button
                  onClick={() => {
                    handleRegenerate(concept.id);
                    setRefineModalId(null);
                  }}
                  disabled={regeneratingId === concept.id}
                  className="w-full py-2.5 text-xs text-[#585854] border border-[#E6E6E4] rounded-lg hover:bg-[#FAFAF8] transition-colors disabled:opacity-40"
                >
                  Generate completely new concept in this style
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

function ComparisonView({ concepts, darkMode }: { concepts: Concept[]; darkMode: boolean }) {
  if (concepts.length < 2) return null;

  return (
    <div className="mb-4 grid grid-cols-2 gap-4 p-4 rounded-2xl border border-[#7C3AED]/20 bg-[#7C3AED]/5">
      {concepts.map((concept) => (
        <div key={concept.id} className="space-y-2">
          <div
            className="aspect-square rounded-xl overflow-hidden border border-[#E6E6E4] transition-colors duration-300"
            style={{ backgroundColor: darkMode ? '#1A1A18' : '#FFFFFF' }}
          >
            <img
              src={concept.previewUrl}
              alt={STYLE_LABELS[concept.style]}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-center">
            <span className="text-xs font-medium text-[#1A1A18]">
              {STYLE_LABELS[concept.style] || concept.style}
            </span>
            {concept.score != null && (
              <span className="ml-2 text-[10px] text-[#585854]">{concept.score}/100</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
