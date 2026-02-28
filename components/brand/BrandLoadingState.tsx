'use client';

interface BrandLoadingStateProps {
  progress: string | null;
  onCancel: () => void;
}

const STEPS = [
  { key: 'analyzing_brand', label: 'Strategist analyzing brand positioning...' },
  { key: 'generating_logos', label: 'Generating 4 logo concepts...' },
  { key: 'processing_previews', label: 'Processing and preparing previews...' },
];

export function BrandLoadingState({ progress, onCancel }: BrandLoadingStateProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === progress);

  return (
    <div className="mt-8 border border-gray-100 rounded-2xl p-4 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-gray-700">Generating brand identity...</span>
      </div>
      <div className="space-y-2">
        {STEPS.map((step, i) => (
          <div key={step.key} className={`flex items-center gap-2 text-sm transition-opacity duration-500 ${i <= currentIndex ? 'opacity-100' : 'opacity-30'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
              i < currentIndex ? 'bg-green-500 text-white' : i === currentIndex ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              {i < currentIndex ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className={i <= currentIndex ? 'text-gray-700' : 'text-gray-400'}>{step.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-gray-400">This usually takes 15-30 seconds</p>
        <button
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
