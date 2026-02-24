'use client';

import { useState } from 'react';

const TIERS = [
  {
    id: 'LOGO_ONLY',
    label: 'Logo Only',
    price: '\u20AC12',
    description: 'One-time payment',
    features: ['PNG (transparent, 2000px)', 'SVG vector file', 'Favicon package (8 sizes + .ico)', 'Commercial license'],
  },
  {
    id: 'BRAND_KIT',
    label: 'Brand Kit',
    price: '\u20AC29',
    description: 'One-time payment',
    features: ['Everything in Logo Only', 'EPS + PDF source files', '20 social media assets', 'Color palette (CSS + JSON)', 'Font guide', 'Brand guidelines PDF'],
    highlight: true,
  },
  {
    id: 'BRAND_KIT_PRO',
    label: 'Brand Kit Pro',
    price: '\u20AC59',
    description: 'One-time payment',
    features: ['Everything in Brand Kit', '3 additional logo concepts fully processed', 'All source files for all 4 concepts'],
  },
];

interface BrandPricingModalProps {
  sessionId: string;
  selectedConceptId: string;
  domainName: string;
  onClose: () => void;
}

export function BrandPricingModal({ sessionId, selectedConceptId, domainName, onClose }: BrandPricingModalProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleCheckout = async (tierId: string) => {
    if (!email) { alert('Please enter your email to receive the download link.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/brand/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, conceptId: selectedConceptId, tier: tierId, email }),
      });
      const { checkoutUrl } = await res.json();
      window.location.href = checkoutUrl;
    } catch {
      alert('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Download your brand files</h2>
            <p className="text-gray-500 text-sm mt-1">One-time payment · Instant download · Commercial license included</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email address (for download link)</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((tier) => (
            <div key={tier.id} className={`border rounded-xl p-4 transition-all ${tier.highlight ? 'border-purple-500 ring-1 ring-purple-200 bg-purple-50/30' : 'border-gray-200 hover:border-gray-300'}`}>
              {tier.highlight && (
                <span className="text-[10px] font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Most popular</span>
              )}
              <div className="mt-2 mb-1">
                <span className="text-2xl font-bold text-gray-900">{tier.price}</span>
              </div>
              <div className="text-sm font-semibold text-gray-900 mb-0.5">{tier.label}</div>
              <div className="text-xs text-gray-400 mb-3">{tier.description}</div>
              <ul className="space-y-1 mb-4">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout(tier.id)}
                disabled={loading}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  tier.highlight
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-200/50'
                    : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                {loading ? 'Redirecting...' : 'Get files'}
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Secure payment via Stripe · Files delivered instantly to your email
        </p>
      </div>
    </div>
  );
}
