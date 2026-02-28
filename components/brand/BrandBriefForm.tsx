'use client';

import { useState, useMemo } from 'react';

export interface BrandPreferences {
  businessDescription: string;
  logoDescription?: string;
  tone?: string;
  colorPreference?: string;
  iconStyle?: string;
  selectedStyles?: string[];
  personalitySliders?: {
    energy: number;
    tone: number;
    style: number;
    approach: number;
  };
  fontMood?: string;
  colorPalette?: {
    name: string;
    primary?: string;
    accent?: string;
  };
  colorsToAvoid?: string;
}

interface BrandBriefFormProps {
  domainName: string;
  tld: string;
  searchQuery: string;
  onSubmit: (preferences: BrandPreferences) => void;
  onBack: () => void;
}

const LOGO_STYLES = [
  { value: 'wordmark', label: 'Wordmark', desc: 'Typography only', icon: 'Aa' },
  { value: 'icon_wordmark', label: 'Icon + Text', desc: 'Icon beside name', icon: '◇' },
  { value: 'monogram', label: 'Monogram', desc: 'Stylized initials', icon: 'AB' },
  { value: 'abstract_mark', label: 'Abstract', desc: 'Geometric symbol', icon: '△' },
  { value: 'pictorial', label: 'Pictorial', desc: 'Recognizable icon', icon: '☀' },
  { value: 'mascot', label: 'Mascot', desc: 'Character illustration', icon: '🦊' },
  { value: 'emblem', label: 'Emblem', desc: 'Badge/crest design', icon: '⬡' },
  { value: 'dynamic', label: 'Dynamic', desc: 'Stacked icon + text', icon: '▣' },
];

const ALL_STYLE_VALUES = LOGO_STYLES.map(s => s.value);

const PERSONALITY_SPECTRUMS = [
  { key: 'energy' as const, left: 'Calm', right: 'Bold' },
  { key: 'tone' as const, left: 'Playful', right: 'Serious' },
  { key: 'style' as const, left: 'Classic', right: 'Modern' },
  { key: 'approach' as const, left: 'Minimal', right: 'Expressive' },
];

const FONT_MOODS = [
  { id: 'geometric_sans', label: 'Clean & Modern', representative: 'DM Sans', fallback: 'sans-serif' },
  { id: 'humanist_sans', label: 'Warm & Friendly', representative: 'Nunito Sans', fallback: 'sans-serif' },
  { id: 'high_contrast_serif', label: 'Elegant & Refined', representative: 'Playfair Display', fallback: 'serif' },
  { id: 'display_expressive', label: 'Bold & Impactful', representative: 'Syne', fallback: 'sans-serif' },
  { id: 'monospaced', label: 'Technical & Precise', representative: 'Space Mono', fallback: 'monospace' },
];

const COLOR_PALETTES = [
  { name: 'Warm Earth', colors: ['#C2703E', '#E8A87C', '#D9A564', '#8B5E3C'], primary: '#C2703E', accent: '#E8A87C' },
  { name: 'Cool Ocean', colors: ['#1A6B8A', '#4ECDC4', '#2C3E50', '#95E1D3'], primary: '#1A6B8A', accent: '#4ECDC4' },
  { name: 'Vibrant Pop', colors: ['#FF6B6B', '#FFE66D', '#4ECDC4', '#FF8E53'], primary: '#FF6B6B', accent: '#FFE66D' },
  { name: 'Muted Professional', colors: ['#34495E', '#7F8C8D', '#BDC3C7', '#2C3E50'], primary: '#34495E', accent: '#7F8C8D' },
  { name: 'Dark Tech', colors: ['#0F0F23', '#6C63FF', '#2D2B55', '#A0AEC0'], primary: '#6C63FF', accent: '#2D2B55' },
  { name: 'Fresh Nature', colors: ['#27AE60', '#6FCF97', '#F2C94C', '#2D9CDB'], primary: '#27AE60', accent: '#6FCF97' },
];

type BriefMode = 'quick' | 'custom';

export function BrandBriefForm({ domainName, tld, searchQuery, onSubmit, onBack }: BrandBriefFormProps) {
  const [mode, setMode] = useState<BriefMode>('quick');
  const [businessDescription, setBusinessDescription] = useState(searchQuery !== domainName ? searchQuery : '');
  const [logoDescription, setLogoDescription] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(ALL_STYLE_VALUES);
  const [sliders, setSliders] = useState({ energy: 3, tone: 3, style: 3, approach: 3 });
  const [fontMood, setFontMood] = useState<string | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<typeof COLOR_PALETTES[number] | null>(null);
  const [customColor, setCustomColor] = useState('');
  const [colorsToAvoid, setColorsToAvoid] = useState('');
  const [showSummary, setShowSummary] = useState(false);

  const updateSlider = (key: keyof typeof sliders, value: number) => {
    setSliders(prev => ({ ...prev, [key]: value }));
  };

  const toggleStyle = (value: string) => {
    setSelectedStyles(prev => {
      if (prev.includes(value)) {
        if (prev.length <= 1) return prev;
        return prev.filter(s => s !== value);
      }
      return [...prev, value];
    });
  };

  const derivedTone = useMemo(() => {
    if (sliders.tone >= 4 && sliders.energy >= 4) return 'bold';
    if (sliders.tone >= 4 && sliders.style <= 2) return 'sophisticated';
    if (sliders.tone <= 2 && sliders.energy <= 2) return 'calm';
    if (sliders.tone <= 2) return 'playful';
    if (sliders.style >= 4) return 'techy';
    return 'professional';
  }, [sliders]);

  const personalitySummary = useMemo(() => {
    const parts: string[] = [];
    if (sliders.energy !== 3) parts.push(sliders.energy <= 2 ? 'Calm' : 'Bold');
    if (sliders.tone !== 3) parts.push(sliders.tone <= 2 ? 'Playful' : 'Serious');
    if (sliders.style !== 3) parts.push(sliders.style <= 2 ? 'Classic' : 'Modern');
    if (sliders.approach !== 3) parts.push(sliders.approach <= 2 ? 'Minimal' : 'Expressive');
    return parts.length > 0 ? parts.join(', ') : 'Balanced';
  }, [sliders]);

  const handleSubmit = () => {
    const colorPref = selectedPalette
      ? selectedPalette.name
      : customColor.trim() || undefined;

    onSubmit({
      businessDescription,
      logoDescription: logoDescription.trim() || undefined,
      tone: mode === 'custom' ? derivedTone : undefined,
      colorPreference: mode === 'custom' ? colorPref : undefined,
      selectedStyles: mode === 'custom' ? selectedStyles : ALL_STYLE_VALUES,
      personalitySliders: mode === 'custom' ? sliders : undefined,
      fontMood: mode === 'custom' ? (fontMood ?? undefined) : undefined,
      colorPalette: mode === 'custom'
        ? selectedPalette
          ? { name: selectedPalette.name, primary: selectedPalette.primary, accent: selectedPalette.accent }
          : customColor.trim()
            ? { name: 'Custom', primary: customColor.trim() }
            : undefined
        : undefined,
      colorsToAvoid: mode === 'custom' && colorsToAvoid.trim() ? colorsToAvoid.trim() : undefined,
    });
  };

  /* ── Summary review card ── */
  if (showSummary && mode === 'custom') {
    return (
      <div className="mt-8 rounded-2xl border border-[#E6E6E4] bg-white p-6">
        <h3 className="text-lg font-semibold text-[#1A1A18] mb-4">Review your brief</h3>
        <div className="space-y-3 text-sm">
          <SummaryRow label="Brand" value={`${domainName}${tld}`} />
          <SummaryRow label="Description" value={businessDescription} />
          {logoDescription && <SummaryRow label="Logo idea" value={logoDescription} />}
          <SummaryRow label="Personality" value={personalitySummary} />
          <SummaryRow label="Font mood" value={fontMood ? FONT_MOODS.find(f => f.id === fontMood)?.label || 'Auto' : 'Auto'} />
          <div className="flex items-start gap-3 p-3 bg-[#FAFAF8] rounded-xl">
            <span className="font-medium text-[#585854] w-24 shrink-0">Colors</span>
            <span className="text-[#1A1A18] flex items-center gap-2">
              {selectedPalette ? (
                <>
                  {selectedPalette.colors.map((c, i) => (
                    <span key={i} className="w-4 h-4 rounded-full inline-block border border-[#E6E6E4]" style={{ backgroundColor: c }} />
                  ))}
                  <span>{selectedPalette.name}</span>
                </>
              ) : customColor ? customColor : 'Auto'}
            </span>
          </div>
          <SummaryRow label="Styles" value={`${selectedStyles.length} selected`} />
          {colorsToAvoid && <SummaryRow label="Avoid" value={colorsToAvoid} />}
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowSummary(false)}
            className="flex-1 px-4 py-3 border border-[#E6E6E4] rounded-xl text-[#585854] hover:bg-[#FAFAF8] transition-colors text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-3 rounded-xl font-medium transition-colors"
          >
            Generate {selectedStyles.length} concepts &rarr;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex bg-[#FAFAF8] rounded-xl p-1 border border-[#E6E6E4]">
          <button
            onClick={() => setMode('quick')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'quick'
                ? 'bg-white text-[#1A1A18] shadow-sm'
                : 'text-[#585854] hover:text-[#1A1A18]'
            }`}
          >
            Quick Generate
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'custom'
                ? 'bg-white text-[#1A1A18] shadow-sm'
                : 'text-[#585854] hover:text-[#1A1A18]'
            }`}
          >
            Customize Brief
          </button>
        </div>
        <button onClick={onBack} className="text-sm text-[#A1A1AA] hover:text-[#585854] transition-colors">
          Cancel
        </button>
      </div>

      {/* Brand name display */}
      <div className="rounded-2xl border border-[#E6E6E4] bg-white p-6">
        <div className="mb-1">
          <span className="text-sm font-medium text-[#585854]">Brand name</span>
        </div>
        <h3 className="text-2xl font-bold text-[#1A1A18]">{domainName}{tld}</h3>
      </div>

      {/* Business description — shared between both modes */}
      <div className="rounded-2xl border border-[#E6E6E4] bg-white p-6">
        <label className="block text-sm font-medium text-[#1A1A18] mb-2">
          What does your business do?
        </label>
        <textarea
          value={businessDescription}
          onChange={(e) => setBusinessDescription(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-[#E6E6E4] px-4 py-3 text-sm text-[#1A1A18] placeholder:text-[#A1A1AA] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] focus:outline-none resize-none"
          placeholder="Describe your business in 2-3 sentences. This helps our AI strategist create a tailored brand identity."
        />
      </div>

      {/* Quick mode: just description + generate button */}
      {mode === 'quick' && (
        <>
          <button
            onClick={handleSubmit}
            disabled={!businessDescription.trim()}
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-4 rounded-xl font-semibold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Generate 8 concepts &rarr;
          </button>
          <button
            onClick={() => setMode('custom')}
            className="w-full text-sm text-[#585854] hover:text-[#7C3AED] transition-colors"
          >
            Want more control? Customize your brief &rarr;
          </button>
        </>
      )}

      {/* Custom mode: all the advanced fields */}
      {mode === 'custom' && (
        <>
          {/* Logo description */}
          <div className="rounded-2xl border border-[#E6E6E4] bg-white p-6">
            <label className="block text-sm font-medium text-[#1A1A18] mb-2">
              Logo idea <span className="text-[#A1A1AA] font-normal">(optional)</span>
            </label>
            <textarea
              value={logoDescription}
              onChange={(e) => setLogoDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-[#E6E6E4] px-4 py-3 text-sm text-[#1A1A18] placeholder:text-[#A1A1AA] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] focus:outline-none resize-none"
              placeholder="e.g. A lightning bolt combined with a leaf, modern and clean"
            />
          </div>

          {/* Personality sliders */}
          <div className="rounded-2xl border border-[#E6E6E4] bg-white p-6">
            <label className="block text-sm font-medium text-[#1A1A18] mb-4">Brand personality</label>
            <div className="space-y-4">
              {PERSONALITY_SPECTRUMS.map((spectrum) => (
                <div key={spectrum.key} className="flex items-center gap-4">
                  <span className="text-xs text-[#585854] w-16 text-right shrink-0">{spectrum.left}</span>
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={sliders[spectrum.key]}
                      onChange={(e) => updateSlider(spectrum.key, parseInt(e.target.value))}
                      className="w-full h-1.5 bg-[#E6E6E4] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1A1A18] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md"
                    />
                    <div className="flex justify-between mt-1">
                      {[1, 2, 3, 4, 5].map(v => (
                        <span
                          key={v}
                          className={`w-1 h-1 rounded-full ${v === sliders[spectrum.key] ? 'bg-[#1A1A18]' : 'bg-[#D4D4D8]'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-[#585854] w-16 shrink-0">{spectrum.right}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Font mood tiles */}
          <div className="rounded-2xl border border-[#E6E6E4] bg-white p-6">
            <label className="block text-sm font-medium text-[#1A1A18] mb-3">Font mood</label>
            <div className="grid grid-cols-5 gap-2">
              {FONT_MOODS.map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => setFontMood(fontMood === mood.id ? null : mood.id)}
                  className={`p-3 rounded-xl border text-center transition-all duration-150 ${
                    fontMood === mood.id
                      ? 'border-[#7C3AED] bg-[#7C3AED]/5 ring-1 ring-[#7C3AED]/30'
                      : 'border-[#E6E6E4] hover:border-[#D4D4D8] hover:bg-[#FAFAF8]'
                  }`}
                >
                  <span
                    className="block text-base font-medium text-[#1A1A18] truncate"
                    style={{ fontFamily: `${mood.representative}, ${mood.fallback}` }}
                  >
                    {domainName.slice(0, 8)}
                  </span>
                  <span className="block text-[10px] text-[#585854] mt-1 leading-tight">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color palette picker */}
          <div className="rounded-2xl border border-[#E6E6E4] bg-white p-6">
            <label className="block text-sm font-medium text-[#1A1A18] mb-3">Color palette</label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PALETTES.map((palette) => (
                <button
                  key={palette.name}
                  onClick={() => setSelectedPalette(selectedPalette?.name === palette.name ? null : palette)}
                  className={`p-3 rounded-xl border transition-all duration-150 ${
                    selectedPalette?.name === palette.name
                      ? 'border-[#7C3AED] bg-[#7C3AED]/5 ring-1 ring-[#7C3AED]/30'
                      : 'border-[#E6E6E4] hover:border-[#D4D4D8]'
                  }`}
                >
                  <div className="flex gap-1 mb-2">
                    {palette.colors.map((color, i) => (
                      <span
                        key={i}
                        className="flex-1 h-6 rounded-md first:rounded-l-lg last:rounded-r-lg"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-[#585854] font-medium">{palette.name}</span>
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customColor}
              onChange={(e) => { setCustomColor(e.target.value); setSelectedPalette(null); }}
              className="mt-2 w-full rounded-xl border border-[#E6E6E4] px-4 py-2.5 text-sm text-[#1A1A18] placeholder:text-[#A1A1AA] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] focus:outline-none"
              placeholder="Or type custom colors, e.g. #2563EB, warm blue tones"
            />
          </div>

          {/* Colors to avoid */}
          <div className="rounded-2xl border border-[#E6E6E4] bg-white p-6">
            <label className="block text-sm font-medium text-[#1A1A18] mb-2">
              Colors to avoid <span className="text-[#A1A1AA] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={colorsToAvoid}
              onChange={(e) => setColorsToAvoid(e.target.value)}
              className="w-full rounded-xl border border-[#E6E6E4] px-4 py-2.5 text-sm text-[#1A1A18] placeholder:text-[#A1A1AA] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] focus:outline-none"
              placeholder="e.g. red, orange, neon colors"
            />
          </div>

          {/* Logo styles */}
          <div className="rounded-2xl border border-[#E6E6E4] bg-white p-6">
            <label className="block text-sm font-medium text-[#1A1A18] mb-3">Logo styles to generate</label>
            <div className="flex flex-wrap gap-2">
              {LOGO_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => toggleStyle(s.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 border ${
                    selectedStyles.includes(s.value)
                      ? 'border-[#7C3AED] bg-[#7C3AED]/5 text-[#7C3AED]'
                      : 'border-[#E6E6E4] text-[#585854] hover:border-[#D4D4D8] hover:bg-[#FAFAF8]'
                  }`}
                >
                  <span className="mr-1.5 text-xs">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Review + Generate */}
          <button
            onClick={() => setShowSummary(true)}
            disabled={!businessDescription.trim()}
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-4 rounded-xl font-semibold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Review & generate {selectedStyles.length} concepts &rarr;
          </button>
        </>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-[#FAFAF8] rounded-xl">
      <span className="font-medium text-[#585854] w-24 shrink-0">{label}</span>
      <span className="text-[#1A1A18] line-clamp-2">{value}</span>
    </div>
  );
}
