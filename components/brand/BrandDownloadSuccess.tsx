'use client';

import { useState, useEffect } from 'react';

interface BrandDownloadSuccessProps {
  purchaseId: string;
}

export function BrandDownloadSuccess({ purchaseId }: BrandDownloadSuccessProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'error'>('loading');

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/brand/download?purchaseId=${purchaseId}`);
        const data = await res.json();

        if (data.downloadUrl) {
          setDownloadUrl(data.downloadUrl);
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

  if (status === 'loading' || status === 'processing') {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 mx-auto mb-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Preparing your brand files...</h2>
        <p className="text-gray-500 text-sm">This usually takes 1-2 minutes. Do not close this page.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-500 text-sm">Please contact support if this persists. Your payment is safe.</p>
      </div>
    );
  }

  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Your brand files are ready!</h2>
      <p className="text-gray-500 text-sm mb-6">We also sent a download link to your email.</p>
      <a
        href={downloadUrl!}
        className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-200/50 transition-all duration-200"
      >
        Download ZIP
      </a>
      <p className="text-xs text-gray-400 mt-4">This link expires in 7 days</p>
    </div>
  );
}
