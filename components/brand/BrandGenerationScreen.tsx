'use client';

import { useState, useEffect } from 'react';

interface DesignBrief {
  brandName?: string;
  sectorClassification?: string;
  tensionPair?: string;
  aestheticDirection?: string;
  memorableAnchor?: string;
  brandPillars?: Array<{ name: string; description: string } | string>;
  colorGuidance?: {
    suggestedPrimaryHex?: string;
    palette?: string[];
  };
  typeGuidance?: {
    displayCategory?: string;
    displayFont?: string;
  };
  personalityTraits?: string[];
  targetAudience?: string;
  competitiveDifferentiation?: string;
}

interface ConceptPreview {
  id: string;
  style: string;
  previewUrl: string;
  score?: number;
}

interface BrandGenerationScreenProps {
  progress: string | null;
  designBrief: DesignBrief | null;
  concepts: ConceptPreview[];
  onCancel: () => void;
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

function SkeletonLine({ width = '100%' }: { width?: string }) {
  return (
    <div
      className="h-4 bg-[#E6E6E4] rounded animate-pulse"
      style={{ width }}
    />
  );
}

function SkeletonBlock() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-3 bg-[#E6E6E4] rounded w-20" />
      <div className="h-5 bg-[#E6E6E4] rounded w-48" />
    </div>
  );
}

function BriefField({
  label,
  children,
  visible,
  delay,
}: {
  label: string;
  children: React.ReactNode;
  visible: boolean;
  delay: number;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setShow(true), delay);
      return () => clearTimeout(t);
    }
  }, [visible, delay]);

  if (!visible) {
    return <SkeletonBlock />;
  }

  return (
    <div
      className={`transition-all duration-500 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-sm text-[#1A1A18]">{children}</div>
    </div>
  );
}

export function StrategyPanel({ designBrief }: { designBrief: DesignBrief | null }) {
  const hasBrief = designBrief !== null;

  return (
    <div className="rounded-2xl border border-[#E6E6E4] bg-white p-6 space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-full bg-[#7C3AED] flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-[#1A1A18]">Brand Strategy</span>
        {!hasBrief && (
          <span className="text-xs text-[#A1A1AA] ml-auto">Analyzing...</span>
        )}
      </div>

      <BriefField label="Sector" visible={hasBrief && !!designBrief?.sectorClassification} delay={0}>
        <span className="inline-block px-2.5 py-0.5 bg-[#FAFAF8] border border-[#E6E6E4] rounded-full text-xs font-medium">
          {designBrief?.sectorClassification}
        </span>
      </BriefField>

      <BriefField label="Brand Tension" visible={hasBrief && !!designBrief?.tensionPair} delay={200}>
        <span className="italic text-[#585854]">&ldquo;{designBrief?.tensionPair}&rdquo;</span>
      </BriefField>

      <BriefField label="Aesthetic Direction" visible={hasBrief && !!designBrief?.aestheticDirection} delay={400}>
        {designBrief?.aestheticDirection}
      </BriefField>

      <BriefField label="Memorable Anchor" visible={hasBrief && !!designBrief?.memorableAnchor} delay={600}>
        <span className="italic">{designBrief?.memorableAnchor}</span>
      </BriefField>

      <BriefField
        label="Brand Pillars"
        visible={hasBrief && !!designBrief?.brandPillars && designBrief.brandPillars.length > 0}
        delay={800}
      >
        <div className="space-y-2">
          {designBrief?.brandPillars?.slice(0, 3).map((pillar, i) => {
            const name = typeof pillar === 'string' ? pillar : pillar.name;
            const desc = typeof pillar === 'string' ? null : pillar.description;
            return (
              <div key={i} className="p-2.5 bg-[#FAFAF8] rounded-lg border border-[#E6E6E4]">
                <div className="font-medium text-[#1A1A18] text-xs">{name}</div>
                {desc && <div className="text-[#585854] text-xs mt-0.5">{desc}</div>}
              </div>
            );
          })}
        </div>
      </BriefField>

      <BriefField label="Color Direction" visible={hasBrief && !!designBrief?.colorGuidance?.suggestedPrimaryHex} delay={1000}>
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-md border border-[#E6E6E4]"
            style={{ backgroundColor: designBrief?.colorGuidance?.suggestedPrimaryHex }}
          />
          <span className="text-xs font-mono text-[#585854]">
            {designBrief?.colorGuidance?.suggestedPrimaryHex}
          </span>
        </div>
      </BriefField>

      <BriefField label="Typography" visible={hasBrief && !!designBrief?.typeGuidance?.displayCategory} delay={1200}>
        {designBrief?.typeGuidance?.displayFont || designBrief?.typeGuidance?.displayCategory}
      </BriefField>

      {!hasBrief && (
        <div className="space-y-3">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      )}
    </div>
  );
}

function LogoPlaceholder() {
  return (
    <div className="aspect-square rounded-xl border border-[#E6E6E4] bg-[#FAFAF8] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#E6E6E4] border-t-[#7C3AED] rounded-full animate-spin" />
    </div>
  );
}

function LogoPreviewCard({ concept }: { concept: ConceptPreview }) {
  return (
    <div className="aspect-square rounded-xl border border-[#E6E6E4] bg-white overflow-hidden relative animate-in fade-in slide-in-from-bottom-2 duration-500">
      <img
        src={concept.previewUrl}
        alt={`${STYLE_LABELS[concept.style] || concept.style} concept`}
        className="w-full h-full object-contain"
      />
      <div className="absolute bottom-0 inset-x-0 p-2 flex items-center justify-between bg-gradient-to-t from-black/40 to-transparent">
        <span className="text-white text-[10px] font-medium">
          {STYLE_LABELS[concept.style] || concept.style}
        </span>
        {concept.score != null && concept.score >= 75 && (
          <span className="text-[9px] font-medium text-white bg-white/20 px-1.5 py-0.5 rounded-full">
            {concept.score >= 85 ? 'Top pick' : 'Strong'}
          </span>
        )}
      </div>
    </div>
  );
}

export function BrandGenerationScreen({
  progress,
  designBrief,
  concepts,
  onCancel,
}: BrandGenerationScreenProps) {
  const totalSlots = 8;
  const filledSlots = concepts.length;

  return (
    <div className="mt-8">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-5 h-5 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-[#1A1A18]">
          {progress === 'analyzing_brand'
            ? 'AI strategist analyzing your brand...'
            : progress === 'generating_logos'
              ? `Generating logo concepts (${filledSlots}/${totalSlots})...`
              : progress === 'processing_previews'
                ? 'Processing and preparing previews...'
                : 'Generating brand identity...'}
        </span>
        <button
          onClick={onCancel}
          className="ml-auto text-xs text-[#A1A1AA] hover:text-[#585854] transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Split screen: strategy left, logos right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Strategy panel */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <StrategyPanel designBrief={designBrief} />
        </div>

        {/* Right: Logo grid */}
        <div>
          <div className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-3">
            Logo Concepts
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: totalSlots }).map((_, i) => {
              const concept = concepts[i];
              return concept ? (
                <LogoPreviewCard key={concept.id} concept={concept} />
              ) : (
                <LogoPlaceholder key={`placeholder-${i}`} />
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-[#A1A1AA] text-center mt-4">
        This usually takes 15-30 seconds
      </p>
    </div>
  );
}
