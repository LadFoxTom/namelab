import Link from 'next/link';

const FEATURES = [
  '8 AI-generated logo concepts',
  'Complete color system & palettes',
  'Typography pairing',
  '100+ production-ready files',
  'Business cards & letterhead',
  'Social media assets',
  'Brand guidelines PDF',
  'Commercial license included',
];

const FAQ = [
  {
    q: 'What file formats do I get?',
    a: 'PNG, SVG, PDF, and HTML. Logo files come in 7 color variants, optimized for print and digital.',
  },
  {
    q: 'Can I use it commercially?',
    a: 'Yes. Every brand kit includes a full commercial license for your business and products.',
  },
  {
    q: 'How long does it take?',
    a: 'About 60 seconds. Our AI generates 8 logo concepts, a color system, typography, and all brand files.',
  },
  {
    q: 'Can I make changes after?',
    a: 'Yes. Refine any concept with custom instructions, try different colors, or regenerate until satisfied.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-0">
      <div className="w-full max-w-[960px]">
        {/* Two-column: Pricing + FAQ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
          {/* Pricing Card */}
          <div className="rounded-2xl border border-[#E6E6E4] bg-white p-4 sm:p-6">
            <div className="text-center mb-5">
              <span className="text-[11px] font-semibold text-[#7C3AED] uppercase tracking-wider">Brand Kit</span>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span className="text-3xl sm:text-[44px] font-bold text-[#1A1A18]" style={{ letterSpacing: '-0.02em' }}>
                  &euro;24.99
                </span>
              </div>
              <p className="text-sm text-[#585854] mt-0.5">One-time payment &middot; Forever access</p>
            </div>

            <div className="border-t border-[#E6E6E4] pt-4 mb-5">
              <ul className="space-y-2.5">
                {FEATURES.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-[#7C3AED] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[13px] text-[#1A1A18]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/brand"
              className="block w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-center py-3 rounded-full text-sm font-semibold transition-colors no-underline"
            >
              Generate your brand &rarr;
            </Link>

            <p className="text-center text-xs text-[#A1A1AA] mt-2.5">
              Free preview &middot; No signup required
            </p>
          </div>

          {/* FAQ */}
          <div>
            <h2 className="text-base font-semibold text-[#1A1A18] mb-4">
              Frequently asked questions
            </h2>
            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <div key={i} className="rounded-xl border border-[#E6E6E4] bg-white p-4">
                  <h3 className="text-[13px] font-semibold text-[#1A1A18] mb-1">{item.q}</h3>
                  <p className="text-[13px] text-[#585854] leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
