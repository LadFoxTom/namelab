"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BrandDownloadSuccess } from "@/components/brand/BrandDownloadSuccess";

function BrandSuccessContent() {
  const searchParams = useSearchParams();
  const stripeSessionId = searchParams.get("session_id");
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
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-500 text-sm">We could not find your purchase. Please contact support.</p>
      </div>
    );
  }

  if (purchaseId) {
    return <BrandDownloadSuccess purchaseId={purchaseId} />;
  }

  return (
    <div className="text-center py-16">
      <div className="w-12 h-12 mx-auto mb-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Loading your purchase...</p>
    </div>
  );
}

export default function BrandSuccessPage() {
  return (
    <div className="bg-white text-gray-800 font-sans min-h-screen selection:bg-pastel-purple selection:text-purple-900">
      <Navbar />
      <main className="pt-24 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 md:px-12 max-w-2xl mx-auto">
        <Suspense
          fallback={
            <div className="text-center py-16">
              <div className="w-12 h-12 mx-auto mb-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Loading...</p>
            </div>
          }
        >
          <BrandSuccessContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
