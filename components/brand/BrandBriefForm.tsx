'use client';

import { useState, useMemo } from 'react';

export interface BrandPreferences {
  businessDescription: string;
  logoDescription?: string;
  tone?: string;
  colorPreference?: string;
  iconStyle?: string;
  selectedStyles?: string[];
  // Phase 2: Enhanced inputs
  personalitySliders?: {
    energy: number;   // 1=Calm, 5=Bold
    tone: number;     // 1=Playful, 5=Serious
    style: number;    // 1=Classic, 5=Modern
    approach: number; // 1=Minimal, 5=Expressive
  };
  fontMood?: string;
  colorPalette?: {
    name: string;
    primary?: string;
    accent?: string;
  };
}

interface BrandBriefFormProps {
  domainName: string;
  tld: string;
  searchQuery: string;
  onSubmit: (preferences: BrandPreferences) => void;
  onBack: () => void;
}

const LOGO_STYLES = [
  { value: 'wordmark', label: 'Wordmark', desc: 'Typography only' },
  { value: 'icon_wordmark', label: 'Icon + Text', desc: 'Icon beside name' },
  { value: 'monogram', label: 'Monogram', desc: 'Stylized initials' },
  { value: 'abstract_mark', label: 'Abstract', desc: 'Geometric symbol' },
  { value: 'pictorial', label: 'Pictorial', desc: 'Recognizable icon' },
  { value: 'mascot', label: 'Mascot', desc: 'Character illustration' },
  { value: 'emblem', label: 'Emblem', desc: 'Badge/crest design' },
  { value: 'dynamic', label: 'Dynamic', desc: 'Stacked icon + text' },
];

const ALL_STYLE_VALUES = LOGO_STYLES.map(s => s.value);

// Personality spectrum sliders
const PERSONALITY_SPECTRUMS = [
  { key: 'energy' as const, left: 'Calm', right: 'Bold' },
  { key: 'tone' as const, left: 'Playful', right: 'Serious' },
  { key: 'style' as const, left: 'Classic', right: 'Modern' },
  { key: 'approach' as const, left: 'Minimal', right: 'Expressive' },
];

// Font mood tiles
const FONT_MOODS = [
  { id: 'geometric_sans', label: 'Clean & Modern', representative: 'DM Sans', fallback: 'sans-serif' },
  { id: 'humanist_sans', label: 'Warm & Friendly', representative: 'Nunito Sans', fallback: 'sans-serif' },
  { id: 'high_contrast_serif', label: 'Elegant & Refined', representative: 'Playfair Display', fallback: 'serif' },
  { id: 'display_expressive', label: 'Bold & Impactful', representative: 'Syne', fallback: 'sans-serif' },
  { id: 'monospaced', label: 'Technical & Precise', representative: 'Space Mono', fallback: 'monospace' },
];

// Color palette presets
const COLOR_PALETTES = [
  { name: 'Warm Earth', colors: ['#C2703E', '#E8A87C', '#D9A564', '#8B5E3C'], primary: '#C2703E', accent: '#E8A87C' },
  { name: 'Cool Ocean', colors: ['#1A6B8A', '#4ECDC4', '#2C3E50', '#95E1D3'], primary: '#1A6B8A', accent: '#4ECDC4' },
  { name: 'Vibrant Pop', colors: ['#FF6B6B', '#FFE66D', '#4ECDC4', '#FF8E53'], primary: '#FF6B6B', accent: '#FFE66D' },
  { name: 'Muted Professional', colors: ['#34495E', '#7F8C8D', '#BDC3C7', '#2C3E50'], primary: '#34495E', accent: '#7F8C8D' },
  { name: 'Dark Tech', colors: ['#0F0F23', '#6C63FF', '#2D2B55', '#A0AEC0'], primary: '#6C63FF', accent: '#2D2B55' },
  { name: 'Fresh Nature', colors: ['#27AE60', '#6FCF97', '#F2C94C', '#2D9CDB'], primary: '#27AE60', accent: '#6FCF97' },
];

export function BrandBriefForm({ domainName, tld, searchQuery, onSubmit, onBack }: BrandBriefFormProps) {
  const [businessDescription, setBusinessDescription] = useState(searchQuery);
  const [logoDescription, setLogoDescription] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(ALL_STYLE_VALUES);
  const [showSummary, setShowSummary] = useState(false);

  // Phase 2: Enhanced state
  const [sliders, setSliders] = useState({ energy: 3, tone: 3, style: 3, approach: 3 });
  const [fontMood, setFontMood] = useState<string | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<typeof COLOR_PALETTES[number] | null>(null);
  const [customColor, setCustomColor] = useState('');

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

  // Derive tone from sliders for backward compatibility
  const derivedTone = useMemo(() => {
    if (sliders.tone >= 4 && sliders.energy >= 4) return 'bold';
    if (sliders.tone >= 4 && sliders.style <= 2) return 'sophisticated';
    if (sliders.tone <= 2 && sliders.energy <= 2) return 'calm';
    if (sliders.tone <= 2) return 'playful';
    if (sliders.style >= 4) return 'techy';
    return 'professional';
  }, [sliders]);

  // Summary text for personality
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
      tone: derivedTone,
      colorPreference: colorPref,
      selectedStyles,
      personalitySliders: sliders,
      fontMood: fontMood ?? undefined,
      colorPalette: selectedPalette
        ? { name: selectedPalette.name, primary: selectedPalette.primary, accent: selectedPalette.accent }
        : customColor.trim()
          ? { name: 'Custom', primary: customColor.trim() }
          : undefined,
    });
  };

  // Summary card view
  if (showSummary) {
    return (
      <div className="mt-8 border border-gray-200 rounded-2xl p-6 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Review your brief</h3>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="font-medium text-gray-500 w-24 shrink-0">Brand</span>
            <span className="text-gray-900">{domainName}{tld}</span>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="font-medium text-gray-500 w-24 shrink-0">Description</span>
            <span className="text-gray-900 line-clamp-2">{businessDescription}</span>
          </div>
          {logoDescription && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <span className="font-medium text-gray-500 w-24 shrink-0">Logo idea</span>
              <span className="text-gray-900 line-clamp-2">{logoDescription}</span>
            </div>
          )}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="font-medium text-gray-500 w-24 shrink-0">Personality</span>
            <span className="text-gray-900">{personalitySummary}</span>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="font-medium text-gray-500 w-24 shrink-0">Font mood</span>
            <span className="text-gray-900">{fontMood ? FONT_MOODS.find(f => f.id === fontMood)?.label : 'Auto'}</span>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="font-medium text-gray-500 w-24 shrink-0">Colors</span>
            <span className="text-gray-900 flex items-center gap-2">
              {selectedPalette ? (
                <>
                  {selectedPalette.colors.map((c, i) => (
                    <span key={i} className="w-4 h-4 rounded-full inline-block border border-gray-200" style={{ backgroundColor: c }} />
                  ))}
                  <span>{selectedPalette.name}</span>
                </>
              ) : customColor ? customColor : 'Auto'}
            </span>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="font-medium text-gray-500 w-24 shrink-0">Styles</span>
            <span className="text-gray-900">{selectedStyles.length} selected</span>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowSummary(false)}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-200/50 hover:scale-[1.01] transition-all duration-200"
          >
            Generate {selectedStyles.length} concept{selectedStyles.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 border border-gray-200 rounded-2xl p-6 bg-white">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Brand brief for <span className="text-purple-600">{domainName}{tld}</span>
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">Tell us about your brand to get better results. All optional.</p>
        </div>
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          Cancel
        </button>
      </div>

      <div className="space-y-6">
        {/* Business description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Business description</label>
          <textarea
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none resize-none"
            placeholder="What does your business do?"
          />
        </div>

        {/* Logo description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo description</label>
          <textarea
            value={logoDescription}
            onChange={(e) => setLogoDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none resize-none"
            placeholder="e.g. A lightning bolt combined with a leaf, modern and clean"
          />
        </div>

        {/* Personality spectrum sliders */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Brand personality</label>
          <div className="space-y-3">
            {PERSONALITY_SPECTRUMS.map((spectrum) => (
              <div key={spectrum.key} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16 text-right shrink-0">{spectrum.left}</span>
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={sliders[spectrum.key]}
                    onChange={(e) => updateSlider(spectrum.key, parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-purple-500 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md"
                  />
                  <div className="flex justify-between mt-0.5">
                    {[1, 2, 3, 4, 5].map(v => (
                      <span
                        key={v}
                        className={`w-1 h-1 rounded-full ${v === sliders[spectrum.key] ? 'bg-purple-400' : 'bg-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-16 shrink-0">{spectrum.right}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Font mood tiles */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Font mood</label>
          <div className="grid grid-cols-5 gap-2">
            {FONT_MOODS.map((mood) => (
              <button
                key={mood.id}
                onClick={() => setFontMood(fontMood === mood.id ? null : mood.id)}
                className={`p-2.5 rounded-xl border text-center transition-all duration-150 ${
                  fontMood === mood.id
                    ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-300'
                    : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                }`}
              >
                <span
                  className="block text-base font-medium text-gray-800 truncate"
                  style={{ fontFamily: `${mood.representative}, ${mood.fallback}` }}
                >
                  {domainName.slice(0, 8)}
                </span>
                <span className="block text-[10px] text-gray-500 mt-1 leading-tight">{mood.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color palette picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Color palette</label>
          <div className="grid grid-cols-3 gap-2">
            {COLOR_PALETTES.map((palette) => (
              <button
                key={palette.name}
                onClick={() => setSelectedPalette(selectedPalette?.name === palette.name ? null : palette)}
                className={`p-2.5 rounded-xl border transition-all duration-150 ${
                  selectedPalette?.name === palette.name
                    ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-300'
                    : 'border-gray-200 hover:border-purple-200'
                }`}
              >
                <div className="flex gap-1 mb-1.5">
                  {palette.colors.map((color, i) => (
                    <span
                      key={i}
                      className="flex-1 h-5 rounded-md first:rounded-l-lg last:rounded-r-lg"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-gray-600 font-medium">{palette.name}</span>
              </button>
            ))}
          </div>
          <div className="mt-2">
            <input
              type="text"
              value={customColor}
              onChange={(e) => { setCustomColor(e.target.value); setSelectedPalette(null); }}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none"
              placeholder="Or type custom colors, e.g. #2563EB, warm blue tones"
            />
          </div>
        </div>

        {/* Logo styles (multi-select) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo styles to generate</label>
          <div className="flex flex-wrap gap-2">
            {LOGO_STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => toggleStyle(s.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  selectedStyles.includes(s.value)
                    ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.label} <span className="text-[11px] opacity-60">— {s.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowSummary(true)}
        disabled={!businessDescription.trim()}
        className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-200/50 hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
      >
        Review & generate {selectedStyles.length} logo concept{selectedStyles.length !== 1 ? 's' : ''}
      </button>
    </div>
  );
}
