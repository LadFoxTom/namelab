'use client';

import { useState } from 'react';

export interface BrandPreferences {
  businessDescription: string;
  logoDescription?: string;
  tone?: string;
  colorPreference?: string;
  iconStyle?: string;
  selectedStyles?: string[];
}

interface BrandBriefFormProps {
  domainName: string;
  tld: string;
  searchQuery: string;
  onSubmit: (preferences: BrandPreferences) => void;
  onBack: () => void;
}

const TONES = [
  { value: 'playful', label: 'Playful' },
  { value: 'professional', label: 'Professional' },
  { value: 'bold', label: 'Bold' },
  { value: 'calm', label: 'Calm' },
  { value: 'techy', label: 'Techy' },
  { value: 'sophisticated', label: 'Sophisticated' },
];

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

export function BrandBriefForm({ domainName, tld, searchQuery, onSubmit, onBack }: BrandBriefFormProps) {
  const [businessDescription, setBusinessDescription] = useState(searchQuery);
  const [logoDescription, setLogoDescription] = useState('');
  const [tone, setTone] = useState<string | null>(null);
  const [colorPreference, setColorPreference] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(ALL_STYLE_VALUES);

  const toggleStyle = (value: string) => {
    setSelectedStyles(prev => {
      if (prev.includes(value)) {
        if (prev.length <= 1) return prev; // minimum 1
        return prev.filter(s => s !== value);
      }
      return [...prev, value];
    });
  };

  const handleSubmit = () => {
    onSubmit({
      businessDescription,
      logoDescription: logoDescription.trim() || undefined,
      tone: tone ?? undefined,
      colorPreference: colorPreference.trim() || undefined,
      selectedStyles,
    });
  };

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

      <div className="space-y-5">
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

        {/* Tone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand tone</label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTone(tone === t.value ? null : t.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  tone === t.value
                    ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color preference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Color preference</label>
          <input
            type="text"
            value={colorPreference}
            onChange={(e) => setColorPreference(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none"
            placeholder="e.g. blue and green, warm tones, dark and minimal"
          />
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
        onClick={handleSubmit}
        disabled={!businessDescription.trim()}
        className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-200/50 hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
      >
        Generate {selectedStyles.length} logo concept{selectedStyles.length !== 1 ? 's' : ''}
      </button>
    </div>
  );
}
