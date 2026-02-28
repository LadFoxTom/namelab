'use client';

import { useState, useEffect } from 'react';

interface BrandDownloadSuccessProps {
  purchaseId: string;
}

const STEPS = [
  { key: 'payment', label: 'Payment confirmed' },
  { key: 'vectorize', label: 'Vectorizing your logo to SVG' },
  { key: 'variations', label: 'Generating 30 logo variations' },
  { key: 'social', label: 'Building social media kit' },
  { key: 'cards', label: 'Creating business cards' },
  { key: 'pdf', label: 'Generating brand guidelines PDF' },
  { key: 'zip', label: 'Assembling your brand kit' },
];

export function BrandDownloadSuccess({ purchaseId }: BrandDownloadSuccessProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'error'>('loading');
  const [currentStep, setCurrentStep] = useState(0);

  // Animate steps during processing
  useEffect(() => {
    if (status !== 'processing' && status !== 'loading') return;

    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= STEPS.length - 2) return prev; // Don't advance past "assembling"
        return prev + 1;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/brand/download?purchaseId=${purchaseId}`);
        const data = await res.json();

        if (data.downloadUrl) {
          setDownloadUrl(data.downloadUrl);
          setCurrentStep(STEPS.length - 1);
          setStatus('ready');
          return true;
        } else if (res.status === 202) {
          setStatus('processing');
          return false;
        } else {
          setStatus('error');
          return true;
        }
      } catch {
        setStatus('error');
        return true;
      }
    };

    const interval = setInterval(async () => {
      const done = await poll();
      if (done) clearInterval(interval);
    }, 3000);

    poll();
    return () => clearInterval(interval);
  }, [purchaseId]);

  if (status === 'error') {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[#1A1A18] mb-2">Something went wrong</h2>
        <p className="text-[#585854] text-sm">Please contact support if this persists. Your payment is safe.</p>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-16 max-w-lg mx-auto px-4 sm:px-0">
      {/* Header */}
      <div className="text-center mb-8">
        {status === 'ready' ? (
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#7C3AED]/10 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <h2 className="text-xl font-semibold text-[#1A1A18] mb-1">
          {status === 'ready' ? 'Your brand files are ready!' : 'Preparing your brand files...'}
        </h2>
        <p className="text-[#585854] text-sm">
          {status === 'ready'
            ? 'We also sent a download link to your email.'
            : 'This usually takes 1-2 minutes. Do not close this page.'}
        </p>
      </div>

      {/* Progress steps */}
      <div className="rounded-2xl border border-[#E6E6E4] bg-white p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const isComplete = status === 'ready' || i < currentStep;
            const isCurrent = status !== 'ready' && i === currentStep;
            const isPending = !isComplete && !isCurrent;

            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                  isPending ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <div className="flex-shrink-0">
                  {isComplete ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : isCurrent ? (
                    <div className="w-5 h-5 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-[#E6E6E4]" />
                  )}
                </div>
                <span className={isComplete ? 'text-[#1A1A18]' : isCurrent ? 'text-[#7C3AED] font-medium' : 'text-[#A1A1AA]'}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Download button */}
      {status === 'ready' && downloadUrl && (
        <div className="text-center space-y-3">
          <a
            href={downloadUrl}
            className="inline-block bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-8 py-3 rounded-xl font-medium transition-colors"
          >
            Download your brand kit
          </a>
          <p className="text-xs text-[#A1A1AA]">This link expires in 7 days</p>
        </div>
      )}
    </div>
  );
}
