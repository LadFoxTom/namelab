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

export function LogoConceptGrid({ concepts, selectedId, onSelect }: LogoConceptGridProps) {
  const [lightboxConcept, setLightboxConcept] = useState<Concept | null>(null);

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
          <button
            key={concept.id}
            onClick={() => onSelect(concept.id)}
            className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-200 ${
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
          </button>
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
