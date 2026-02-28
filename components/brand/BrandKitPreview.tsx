'use client';

import { useState, useEffect } from 'react';
import { BRAND_TIERS } from '@/lib/brand/designTokens';

interface BrandKitPreviewProps {
  sessionId: string;
  concept: any;
  domainName: string;
  tld: string;
  signals: any;
  designBrief: any;
  onBack: () => void;
  onDownloadKit: () => void;
  onDownloadLogo: () => void;
  buildingKit: boolean;
  downloading: boolean;
  kitError: string | null;
}

const MOCKUP_TYPES = [
  { type: 'business-card', label: 'Business Card' },
  { type: 'website-header', label: 'Website Header' },
  { type: 'social-media', label: 'Social Media' },
  { type: 'dark-background', label: 'Dark Background' },
  { type: 'storefront', label: 'Storefront' },
];

export function BrandKitPreview({
  sessionId,
  concept,
  domainName,
  tld,
  signals,
  designBrief,
  onBack,
  onDownloadKit,
  onDownloadLogo,
  buildingKit,
  downloading,
  kitError,
}: BrandKitPreviewProps) {
  const [mockupUrls, setMockupUrls] = useState<Record<string, string>>({});
  const [loadingMockup, setLoadingMockup] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  // Load first mockup on mount
  useEffect(() => {
    if (concept?.id) {
      loadMockup('business-card');
    }
  }, [concept?.id]);

  const loadMockup = async (type: string) => {
    if (!concept?.id || mockupUrls[type]) return;
    setLoadingMockup(type);
    try {
      const res = await fetch(`/api/brand/mockup?conceptId=${concept.id}&type=${type}`);
      if (res.ok) {
        const blob = await res.blob();
        setMockupUrls(prev => ({ ...prev, [type]: URL.createObjectURL(blob) }));
      }
    } catch {}
    setLoadingMockup(null);
  };

  const handleCheckout = async (tierId: string) => {
    if (!email) { alert('Please enter your email to receive the download link.'); return; }
    setCheckingOut(true);
    try {
      const res = await fetch('/api/brand/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          conceptId: concept.id,
          tier: tierId,
          email,
        }),
      });
      const { checkoutUrl } = await res.json();
      window.location.href = checkoutUrl;
    } catch {
      alert('Something went wrong. Please try again.');
      setCheckingOut(false);
    }
  };

  const colorPalette = signals?.colorGuidance || designBrief?.colorGuidance;
  const typography = signals?.typographyGuidance || designBrief?.typeGuidance;

  return (
    <div className="mt-8 space-y-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-[#585854] hover:text-[#1A1A18] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to concepts
      </button>

      {/* Section 1: Selected concept hero */}
      <div
        className="rounded-2xl overflow-hidden border border-[#E6E6E4]"
        style={{ backgroundColor: colorPalette?.suggestedPrimaryHex || '#1A1A18' }}
      >
        <div className="py-16 flex flex-col items-center justify-center">
          {concept && (
            <img
              src={concept.previewUrl}
              alt={`${domainName} logo`}
              className="w-48 h-48 object-contain mb-4"
            />
          )}
          <h2 className="text-2xl font-bold text-white">{domainName}{tld}</h2>
          {designBrief?.tensionPair && (
            <p className="text-white/70 text-sm mt-1 italic">&ldquo;{designBrief.tensionPair}&rdquo;</p>
          )}
        </div>
      </div>

      {/* Section 2: Brand Strategy Card */}
      {designBrief && (
        <div className="rounded-2xl border border-[#E6E6E4] bg-white p-6">
          <h3 className="text-lg font-semibold text-[#1A1A18] mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#7C3AED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Brand Strategy
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {designBrief.sectorClassification && (
              <StrategyField label="Sector" value={designBrief.sectorClassification} />
            )}
            {designBrief.aestheticDirection && (
              <StrategyField label="Aesthetic Direction" value={designBrief.aestheticDirection} />
            )}
            {designBrief.tensionPair && (
              <StrategyField label="Brand Tension" value={`"${designBrief.tensionPair}"`} />
            )}
            {designBrief.memorableAnchor && (
              <StrategyField label="Memorable Anchor" value={designBrief.memorableAnchor} />
            )}
            {designBrief.competitiveDifferentiation && (
              <StrategyField label="Differentiation" value={designBrief.competitiveDifferentiation} className="md:col-span-2" />
            )}
          </div>
          {designBrief.brandPillars?.length > 0 && (
            <div className="mt-4">
              <span className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider">Brand Pillars</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                {designBrief.brandPillars.slice(0, 4).map((pillar: any, i: number) => {
                  const name = typeof pillar === 'string' ? pillar : pillar.name;
                  const desc = typeof pillar === 'string' ? null : pillar.description;
                  return (
                    <div key={i} className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E6E6E4]">
                      <div className="font-medium text-sm text-[#1A1A18]">{name}</div>
                      {desc && <div className="text-xs text-[#585854] mt-0.5">{desc}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 3: Color System */}
      {colorPalette && (
        <div className="rounded-2xl border border-[#E6E6E4] bg-white p-6">
          <h3 className="text-lg font-semibold text-[#1A1A18] mb-4">Color System</h3>
          <div className="flex gap-2 mb-4">
            {colorPalette.suggestedPrimaryHex && (
              <ColorSwatch color={colorPalette.suggestedPrimaryHex} label="Primary" />
            )}
            {colorPalette.palette?.map((hex: string, i: number) => (
              <ColorSwatch key={i} color={hex} label={`Color ${i + 1}`} />
            ))}
          </div>
          {/* WCAG accessibility hint */}
          <p className="text-xs text-[#A1A1AA]">
            Full accessibility matrix with WCAG contrast scores included in the brand kit.
          </p>
        </div>
      )}

      {/* Section 4: Typography Preview */}
      {typography && (
        <div className="rounded-2xl border border-[#E6E6E4] bg-white p-6">
          <h3 className="text-lg font-semibold text-[#1A1A18] mb-4">Typography</h3>
          <div className="space-y-4">
            {typography.displayFont && (
              <div>
                <span className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider">Display</span>
                <p className="text-3xl font-bold text-[#1A1A18] mt-1">{domainName}</p>
                <p className="text-xs text-[#585854] mt-1">{typography.displayFont} &middot; {typography.displayCategory || 'Sans-serif'}</p>
              </div>
            )}
            {typography.bodyFont && (
              <div>
                <span className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider">Body</span>
                <p className="text-base text-[#585854] mt-1">
                  The quick brown fox jumps over the lazy dog. Brand identity that speaks volumes through every touchpoint.
                </p>
                <p className="text-xs text-[#585854] mt-1">{typography.bodyFont}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 5: Asset Preview Carousel */}
      <div className="rounded-2xl border border-[#E6E6E4] bg-white p-6">
        <h3 className="text-lg font-semibold text-[#1A1A18] mb-4">Asset Previews</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {MOCKUP_TYPES.map((m) => (
            <div
              key={m.type}
              className="flex-shrink-0 w-[280px] cursor-pointer"
              onClick={() => loadMockup(m.type)}
            >
              <div className="aspect-[4/3] rounded-xl border border-[#E6E6E4] bg-[#FAFAF8] overflow-hidden flex items-center justify-center">
                {mockupUrls[m.type] ? (
                  <img src={mockupUrls[m.type]} alt={m.label} className="w-full h-full object-contain" />
                ) : loadingMockup === m.type ? (
                  <div className="w-5 h-5 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-xs text-[#A1A1AA]">Click to preview</span>
                )}
              </div>
              <p className="text-xs font-medium text-[#585854] mt-2 text-center">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Free download section */}
      <div className="rounded-2xl border border-[#E6E6E4] bg-white p-6">
        <h3 className="text-base font-semibold text-[#1A1A18] mb-3">Free Preview Download</h3>
        <div className="flex gap-3">
          <button
            onClick={onDownloadKit}
            disabled={buildingKit}
            className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-3 rounded-xl font-medium disabled:opacity-40 transition-colors text-sm"
          >
            {buildingKit ? 'Building kit...' : 'Download brand kit'}
          </button>
          <button
            onClick={onDownloadLogo}
            disabled={downloading}
            className="px-6 py-3 border border-[#E6E6E4] rounded-xl text-[#585854] hover:bg-[#FAFAF8] disabled:opacity-40 transition-colors text-sm"
          >
            {downloading ? 'Downloading...' : 'Download logo only'}
          </button>
        </div>
        {kitError && <p className="text-red-500 text-xs mt-2">{kitError}</p>}
        {buildingKit && (
          <p className="text-xs text-[#A1A1AA] mt-2">
            Removing background, vectorizing, generating assets... This takes about 30 seconds.
          </p>
        )}
      </div>

      {/* Section 6: Pricing tiers */}
      <div className="rounded-2xl border border-[#E6E6E4] bg-white p-6">
        <h3 className="text-lg font-semibold text-[#1A1A18] mb-2">Get the full brand kit</h3>
        <p className="text-sm text-[#585854] mb-4">One-time payment · Instant download · Commercial license included</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1A1A18] mb-1">Email address (for download link)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-[#E6E6E4] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] placeholder:text-[#A1A1AA]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BRAND_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`border rounded-xl p-4 transition-all ${
                tier.highlight
                  ? 'border-[#7C3AED] ring-1 ring-[#7C3AED]/20 bg-[#7C3AED]/[0.02]'
                  : 'border-[#E6E6E4] hover:border-[#D4D4D8]'
              }`}
            >
              {tier.highlight && (
                <span className="text-[10px] font-semibold text-[#7C3AED] bg-[#7C3AED]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Recommended
                </span>
              )}
              <div className="mt-2 mb-1">
                <span className="text-2xl font-bold text-[#1A1A18]">{tier.price}</span>
              </div>
              <div className="text-sm font-semibold text-[#1A1A18] mb-0.5">{tier.label}</div>
              <div className="text-xs text-[#A1A1AA] mb-3">One-time payment</div>
              <ul className="space-y-1.5 mb-4">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-[#585854]">
                    <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout(tier.id)}
                disabled={checkingOut}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tier.highlight
                    ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white'
                    : 'border border-[#E6E6E4] text-[#585854] hover:bg-[#FAFAF8]'
                } disabled:opacity-50`}
              >
                {checkingOut ? 'Redirecting...' : 'Get files'}
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-[#A1A1AA] text-center mt-4">
          Secure payment via Stripe · Files delivered instantly to your email
        </p>
      </div>
    </div>
  );
}

function StrategyField({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`p-3 bg-[#FAFAF8] rounded-xl border border-[#E6E6E4] ${className}`}>
      <span className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider">{label}</span>
      <p className="text-sm text-[#1A1A18] mt-0.5">{value}</p>
    </div>
  );
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-16 h-16 rounded-xl border border-[#E6E6E4]"
        style={{ backgroundColor: color }}
      />
      <span className="text-[10px] font-mono text-[#585854]">{color}</span>
      <span className="text-[10px] text-[#A1A1AA]">{label}</span>
    </div>
  );
}
