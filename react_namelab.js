import React, { useState, useEffect } from 'react';

const customStyles = {
  textGradient: {
    background: 'linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }
};

const Button = ({ children, onClick, disabled, className, ...props }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={className}
    {...props}
  >
    {children}
  </button>
);

const DomainCard = ({ domain, index }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="group bg-white rounded-3xl border border-gray-200 p-8 hover:border-purple-200 hover:shadow-floating transition-all duration-300 relative overflow-hidden animate-slide-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-mono text-3xl text-gray-900 tracking-tight">{domain.name}</h3>
            <div className="flex gap-2 mt-2">
              <span className="inline-flex px-2.5 py-1 rounded-full bg-gray-100 text-[10px] font-medium uppercase tracking-wider text-gray-500">{domain.tld}</span>
              <span className="inline-flex px-2.5 py-1 rounded-full bg-green-50 text-[10px] font-medium uppercase tracking-wider text-green-600">Available</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-light text-white shadow-sm ${domain.scoreColor}`}>
              <span>{domain.score}</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 mt-1 font-medium">Score</span>
          </div>
        </div>

        <div className="mb-8 min-h-[80px]">
          <p className="text-gray-600 text-sm leading-relaxed font-light">{domain.reasoning}</p>
        </div>

        <div className="h-px w-full bg-gray-100 mb-6"></div>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-light text-gray-900">{domain.price}</span>
              <span className="text-xs text-gray-400">/yr</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/GoDaddy_logo.svg/2560px-GoDaddy_logo.svg.png" className="h-3 opacity-50 grayscale hover:grayscale-0 transition-all" alt="GoDaddy" />
            </div>
          </div>
          <button className="bg-black text-white rounded-full px-6 py-3 text-sm font-medium hover:scale-105 transition-transform flex items-center gap-2 group-hover:shadow-lg">
            Buy Now
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>

        <div className="mt-4 pt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-900 transition-colors py-2"
          >
            <span>{expanded ? 'Hide comparison' : 'Compare registrars'}</span>
            <svg className={`w-3 h-3 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded && (
            <div className="space-y-2 mt-4">
              {domain.providers.map((provider, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 hover:bg-white border border-transparent hover:border-gray-200 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-[10px]">P</div>
                    <span className="text-sm text-gray-600">{provider.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{provider.price}</span>
                    <div className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [domains, setDomains] = useState([]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      ::-webkit-scrollbar {
        width: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #FAFAFA;
      }
      ::-webkit-scrollbar-thumb {
        background: #E5E7EB;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #D1D5DB;
      }

      .loading-shimmer {
        background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @keyframes fadeIn {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
      @keyframes slideUp {
        0% { opacity: 0; transform: translateY(20px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in {
        animation: fadeIn 0.5s ease-out forwards;
      }
      .animate-slide-up {
        animation: slideUp 0.6s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const mockAIResponse = (input) => {
    const keywords = input.split(' ').filter(w => w.length > 3);
    const base = keywords[0] || 'Venture';
    
    return [
      {
        name: base.toLowerCase() + 'lab.com',
        tld: '.COM',
        score: 98,
        scoreColor: 'bg-gradient-to-br from-purple-400 to-indigo-500',
        reasoning: 'Short, scientific, and implies experimentation. Perfect for a tech-forward brand.',
        price: '$12.99',
        providers: [
          { name: 'Namecheap', price: '$10.98' },
          { name: 'Google Domains', price: '$12.00' },
        ]
      },
      {
        name: 'get' + base.toLowerCase() + '.io',
        tld: '.IO',
        score: 92,
        scoreColor: 'bg-gradient-to-br from-blue-400 to-cyan-400',
        reasoning: 'Modern tech startup convention. Action-oriented prefix with popular I/O extension.',
        price: '$32.99',
        providers: [
          { name: 'Namecheap', price: '$29.98' },
          { name: 'Porkbun', price: '$31.50' },
        ]
      },
      {
        name: base.toLowerCase() + 'flow.ai',
        tld: '.AI',
        score: 89,
        scoreColor: 'bg-gradient-to-br from-pink-400 to-rose-400',
        reasoning: 'Combines the core concept with "flow", suggesting ease of use and AI capabilities.',
        price: '$65.00',
        providers: [
          { name: 'GoDaddy', price: '$75.00' },
          { name: 'Namecheap', price: '$62.98' },
        ]
      },
      {
        name: 'pure' + base.toLowerCase() + '.co',
        tld: '.CO',
        score: 85,
        scoreColor: 'bg-gradient-to-br from-green-400 to-emerald-500',
        reasoning: 'Minimalist prefix "Pure" elevates the brand perception. .CO is globally recognized.',
        price: '$24.99',
        providers: [
          { name: 'Namecheap', price: '$22.98' },
        ]
      },
      {
        name: base.toLowerCase() + 'hq.net',
        tld: '.NET',
        score: 78,
        scoreColor: 'bg-gradient-to-br from-orange-400 to-amber-500',
        reasoning: 'Establishes authority and a central hub for the industry.',
        price: '$14.99',
        providers: [
          { name: 'Namecheap', price: '$11.98' },
        ]
      },
      {
        name: 'ask' + base.toLowerCase() + '.app',
        tld: '.APP',
        score: 94,
        scoreColor: 'bg-gradient-to-br from-indigo-400 to-purple-600',
        reasoning: 'Conversational and service-oriented. Ideal for SaaS or mobile applications.',
        price: '$18.99',
        providers: [
          { name: 'Google Domains', price: '$14.00' },
        ]
      }
    ];
  };

  const generateDomains = () => {
    setLoading(true);
    setHasSearched(false);

    setTimeout(() => {
      setDomains(mockAIResponse(prompt));
      setLoading(false);
      setHasSearched(true);
      
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, 1500);
  };

  return (
    <div className="bg-white text-gray-800 font-sans selection:bg-pastel-purple selection:text-purple-900">
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">N</div>
            <span className="font-medium text-lg tracking-tight">Namer.ai</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
            <a href="#" className="hover:text-black transition-colors">Pricing</a>
            <a href="#" className="hover:text-black transition-colors">API</a>
            <a href="#" className="hover:text-black transition-colors">About</a>
            <a href="#" className="text-black hover:opacity-70 transition-opacity">Login</a>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 md:px-12 py-20 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
          <div className="absolute top-20 left-[10%] w-96 h-96 bg-pastel-purple/30 rounded-full blur-[100px] pointer-events-none mix-blend-multiply"></div>
          <div className="absolute bottom-20 right-[10%] w-[500px] h-[500px] bg-pastel-blue/30 rounded-full blur-[120px] pointer-events-none mix-blend-multiply"></div>

          <div className="relative z-10 w-full max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-4 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">GPT-4 Turbo Powered</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-light tracking-tight leading-[1.1] text-gray-900 animate-slide-up" style={{ animationDelay: '100ms' }}>
              Craft the perfect <br />
              <span style={customStyles.textGradient} className="font-normal">digital identity.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-500 font-light max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '200ms' }}>
              Describe your project, and our AI will hallucinate available, premium domain names with semantic reasoning.
            </p>

            <div className="w-full max-w-2xl mx-auto mt-12 relative animate-slide-up" style={{ animationDelay: '300ms' }}>
              <div className="relative group">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full h-36 p-6 pr-12 text-lg bg-white border-2 border-gray-200 rounded-3xl resize-none focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-50 transition-all duration-300 shadow-soft group-hover:shadow-lg placeholder:text-gray-300 font-light"
                  placeholder="e.g. A minimalist coffee shop in Tokyo that also sells vintage vinyl records..."
                />
                
                <div className={`absolute top-6 right-6 text-purple-400 pointer-events-none transition-transform duration-500 ${prompt.length > 0 ? 'scale-110 rotate-12 text-purple-600' : 'opacity-50'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>

                <div className="absolute bottom-4 right-4 z-20">
                  <button
                    onClick={generateDomains}
                    disabled={loading || prompt.length === 0}
                    className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-full font-medium transition-all duration-300 hover:bg-gray-800 hover:scale-105 hover:shadow-lifted disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                  >
                    {!loading && (
                      <>
                        <span>Generate Names</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                    
                    {loading && (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-8 mt-8 opacity-70">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  <span className="text-sm text-gray-500 font-light">.com available</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span className="text-sm text-gray-500 font-light">Instant Check</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span className="text-sm text-gray-500 font-light">Value Appraisal</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {hasSearched && (
          <section id="results" className="max-w-[1440px] mx-auto px-6 md:px-12 py-24 min-h-screen">
            <div className="flex items-end justify-between mb-16">
              <div>
                <h2 className="text-4xl font-light text-gray-900 mb-2">Curated Results</h2>
                <p className="text-gray-500 font-light">AI-generated domains based on semantic availability.</p>
              </div>
              <div className="hidden md:flex gap-2">
                <button className="px-4 py-2 rounded-full border border-gray-200 text-sm hover:border-black transition-colors">Filter</button>
                <button className="px-4 py-2 rounded-full border border-gray-200 text-sm hover:border-black transition-colors">Sort by Value</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {domains.map((domain, index) => (
                <DomainCard key={index} domain={domain} index={index} />
              ))}
            </div>
          </section>
        )}

        <section className="max-w-[1280px] mx-auto px-6 md:px-12 py-32 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-pastel-purple/30 flex items-center justify-center text-purple-600 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900">Semantic Understanding</h3>
              <p className="text-gray-500 font-light leading-relaxed">
                We don't just mash keywords. Our model understands the ethos of your project to suggest metaphors, idioms, and abstract concepts.
              </p>
            </div>

            <div className="space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-pastel-blue/30 flex items-center justify-center text-blue-600 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900">Availability Guaranteed</h3>
              <p className="text-gray-500 font-light leading-relaxed">
                Every result is cross-referenced with global WHOIS databases in real-time. No more heartbreak after finding the perfect name.
              </p>
            </div>

            <div className="space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-pastel-mint/40 flex items-center justify-center text-green-600 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900">Valuation Metrics</h3>
              <p className="text-gray-500 font-light leading-relaxed">
                Proprietary algorithms score each domain based on length, memorability, pronunciation, and branding potential.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-50 py-24 border-t border-gray-200">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-start gap-12">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 rounded bg-black text-white flex items-center justify-center text-xs font-bold">N</div>
              <span className="font-bold text-gray-900">Namer.ai</span>
            </div>
            <p className="text-gray-500 font-light text-sm max-w-xs">
              Design is intelligence made visible. We bring that philosophy to naming your next big thing.
            </p>
          </div>
          <div className="flex gap-16 text-sm">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Product</h4>
              <ul className="space-y-2 text-gray-500 font-light">
                <li><a href="#" className="hover:text-black">Features</a></li>
                <li><a href="#" className="hover:text-black">Pricing</a></li>
                <li><a href="#" className="hover:text-black">API</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Company</h4>
              <ul className="space-y-2 text-gray-500 font-light">
                <li><a href="#" className="hover:text-black">About</a></li>
                <li><a href="#" className="hover:text-black">Blog</a></li>
                <li><a href="#" className="hover:text-black">Careers</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Legal</h4>
              <ul className="space-y-2 text-gray-500 font-light">
                <li><a href="#" className="hover:text-black">Privacy</a></li>
                <li><a href="#" className="hover:text-black">Terms</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;