'use client';

import { useState, useEffect } from 'react';

const STEPS = [
  { label: 'Analyzing your domain and business...', duration: 3000 },
  { label: 'Extracting brand personality and tone...', duration: 2500 },
  { label: 'Running 4 logo style pipelines...', duration: 8000 },
  { label: 'Selecting best concepts...', duration: 3000 },
  { label: 'Preparing previews...', duration: 2000 },
];

export function BrandLoadingState() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((step, i) => {
      const timer = setTimeout(() => setCurrentStep(i), elapsed);
      timers.push(timer);
      elapsed += step.duration;
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="mt-8 border border-gray-100 rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-gray-700">Generating brand identity...</span>
      </div>
      <div className="space-y-2">
        {STEPS.map((step, i) => (
          <div key={i} className={`flex items-center gap-2 text-sm transition-opacity duration-500 ${i <= currentStep ? 'opacity-100' : 'opacity-30'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
              i < currentStep ? 'bg-green-500 text-white' : i === currentStep ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              {i < currentStep ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className={i <= currentStep ? 'text-gray-700' : 'text-gray-400'}>{step.label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-4">Usually takes 20-30 seconds</p>
    </div>
  );
}
