export default function FeaturesSection() {
  return (
    <section className="max-w-[1280px] mx-auto px-6 md:px-12 py-32 border-t border-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
        <div className="space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-pastel-purple/30 flex items-center justify-center text-purple-600 mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900">
            Semantic Understanding
          </h3>
          <p className="text-gray-500 font-light leading-relaxed">
            We don&apos;t just mash keywords. Our model understands the ethos of
            your project to suggest metaphors, idioms, and abstract concepts.
          </p>
        </div>

        <div className="space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-pastel-blue/30 flex items-center justify-center text-blue-600 mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900">
            Availability Guaranteed
          </h3>
          <p className="text-gray-500 font-light leading-relaxed">
            Every result is cross-referenced with global WHOIS databases in
            real-time. No more heartbreak after finding the perfect name.
          </p>
        </div>

        <div className="space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-pastel-mint/40 flex items-center justify-center text-green-600 mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900">
            Valuation Metrics
          </h3>
          <p className="text-gray-500 font-light leading-relaxed">
            Proprietary algorithms score each domain based on length,
            memorability, pronunciation, and branding potential.
          </p>
        </div>
      </div>
    </section>
  );
}
