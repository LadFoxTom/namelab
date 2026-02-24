'use client';

import { useState } from 'react';

export interface BrandPreferences {
  businessDescription: string;
  tone?: string;
  colorPreference?: string;
  iconStyle?: string;
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

const ICON_STYLES = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'geometric', label: 'Geometric' },
  { value: 'organic', label: 'Organic' },
  { value: 'abstract', label: 'Abstract' },
  { value: 'lettermark', label: 'Lettermark' },
  { value: 'mascot', label: 'Mascot' },
];

export function BrandBriefForm({ domainName, tld, searchQuery, onSubmit, onBack }: BrandBriefFormProps) {
  const [businessDescription, setBusinessDescription] = useState(searchQuery);
  const [tone, setTone] = useState<string | null>(null);
  const [colorPreference, setColorPreference] = useState('');
  const [iconStyle, setIconStyle] = useState<string | null>(null);

  const handleSubmit = () => {
    onSubmit({
      businessDescription,
      tone: tone ?? undefined,
      colorPreference: colorPreference.trim() || undefined,
      iconStyle: iconStyle ?? undefined,
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

        {/* Icon style */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Icon style</label>
          <div className="flex flex-wrap gap-2">
            {ICON_STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => setIconStyle(iconStyle === s.value ? null : s.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  iconStyle === s.value
                    ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.label}
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
        Generate 4 logo concepts
      </button>
    </div>
  );
}
