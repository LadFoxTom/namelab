'use client';

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
};

export function LogoConceptGrid({ concepts, selectedId, onSelect }: LogoConceptGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
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
  );
}
