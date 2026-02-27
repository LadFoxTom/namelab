'use client';

import { useState, useEffect, useCallback } from 'react';

interface Concept {
  id: string;
  style: string;
  previewUrl: string;
  isSelected: boolean;
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

export function LogoConceptGrid({ concepts, selectedId, onSelect, onConceptRefined }: LogoConceptGridProps) {
  const [lightboxConcept, setLightboxConcept] = useState<Concept | null>(null);
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [refineError, setRefineError] = useState<string | null>(null);

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

  const closeLightbox = useCallback(() => setLightboxConcept(null), []);

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
              <span className="text-white text-xs font-medium">
                {STYLE_LABELS[concept.style] || concept.style}
              </span>
            </div>
            {/* Zoom button */}
            <div
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxConcept(concept);
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
            {onConceptRefined && refiningId !== concept.id && (
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
            {refiningId === concept.id && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-xl">
                <div className="flex flex-col items-center gap-2">
                  <svg className="animate-spin h-6 w-6 text-purple-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-xs text-purple-600 font-medium">Refining...</span>
                </div>
              </div>
            )}
          </button>
          {/* Feedback input for this concept */}
          {activeFeedbackId === concept.id && onConceptRefined && (
            <div className="mt-1" onClick={(e) => e.stopPropagation()}>
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
                <p className="text-[10px] text-red-500 mt-1">{refineError}</p>
              )}
            </div>
          )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
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
            {/* Image */}
            <div className="bg-gray-50 p-6">
              <img
                src={lightboxConcept.previewUrl}
                alt={`${STYLE_LABELS[lightboxConcept.style] || lightboxConcept.style} logo concept`}
                className="w-full h-auto object-contain max-h-[70vh]"
              />
            </div>
            {/* Label */}
            <div className="px-5 py-3 flex items-center justify-between border-t border-gray-100">
              <span className="text-sm font-medium text-gray-700">
                {STYLE_LABELS[lightboxConcept.style] || lightboxConcept.style}
              </span>
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
