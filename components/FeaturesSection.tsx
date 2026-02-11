"use client";

const features = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
    title: "Semantic Understanding",
    description:
      "We don\u2019t just mash keywords. Our model understands the ethos of your project to suggest metaphors, idioms, and abstract concepts.",
    gradient: "from-purple-500 to-indigo-500",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-500",
    borderHover: "hover:border-purple-200",
    shadowHover: "hover:shadow-purple-100/50",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
    title: "Availability Guaranteed",
    description:
      "Every result is cross-referenced with registrar databases in real-time. No more heartbreak after finding the perfect name.",
    gradient: "from-blue-500 to-cyan-500",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    borderHover: "hover:border-blue-200",
    shadowHover: "hover:shadow-blue-100/50",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
    title: "Valuation Metrics",
    description:
      "Proprietary algorithms score each domain based on length, memorability, pronunciation, and branding potential.",
    gradient: "from-emerald-500 to-teal-500",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    borderHover: "hover:border-emerald-200",
    shadowHover: "hover:shadow-emerald-100/50",
  },
];

export default function FeaturesSection() {
  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-12 py-16 sm:py-32 border-t border-gray-100">
      <div className="text-center mb-10 sm:mb-20">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-gray-900 mb-4">
          Why Sparkdomain?
        </h2>
        <p className="text-gray-400 font-light max-w-lg mx-auto">
          More than a name generator. A strategic branding companion.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`group relative bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-6 sm:p-10 transition-all duration-500 ease-out cursor-default ${feature.borderHover} hover:shadow-2xl ${feature.shadowHover} hover:-translate-y-2`}
          >
            <div
              className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`}
            ></div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div
                className={`w-14 h-14 rounded-2xl ${feature.iconBg} ${feature.iconColor} flex items-center justify-center mb-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}
              >
                {feature.icon}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>

              <p className="text-sm text-gray-400 font-light leading-relaxed">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
