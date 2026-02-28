'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrandDownloadSuccess } from '@/components/brand/BrandDownloadSuccess';

function BrandSuccessContent() {
  const searchParams = useSearchParams();
  const stripeSessionId = searchParams.get('session_id');
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!stripeSessionId) return;

    async function findPurchase() {
      try {
        const res = await fetch(`/api/brand/download?stripeSessionId=${stripeSessionId}`);
        const data = await res.json();
        if (data.purchaseId) {
          setPurchaseId(data.purchaseId);
        } else if (data.downloadUrl) {
          setPurchaseId(stripeSessionId!);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
    }

    findPurchase();
  }, [stripeSessionId]);

  if (error) {
    return (
      <div className="text-center py-16 max-w-lg mx-auto px-6">
        <h2 className="text-xl font-semibold text-[#1A1A18] mb-2">Something went wrong</h2>
        <p className="text-[#585854] text-sm">We could not find your purchase. Please contact support.</p>
      </div>
    );
  }

  if (purchaseId) {
    return (
      <div className="max-w-lg mx-auto px-6">
        <BrandDownloadSuccess purchaseId={purchaseId} />
      </div>
    );
  }

  return (
    <div className="text-center py-16">
      <div className="w-12 h-12 mx-auto mb-4 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      <p className="text-[#585854] text-sm">Loading your purchase...</p>
    </div>
  );
}

export default function BrandSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-16">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#585854] text-sm">Loading...</p>
        </div>
      }
    >
      <BrandSuccessContent />
    </Suspense>
  );
}
