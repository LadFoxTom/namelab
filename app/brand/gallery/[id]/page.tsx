import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface Props {
  params: { id: string };
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E6E6E4]">
      <span className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider">{label}</span>
      <p className="text-sm text-[#1A1A18] mt-0.5">{value}</p>
    </div>
  );
}

export default async function BrandExamplePage({ params }: Props) {
  const session = await prisma.brandSession.findFirst({
    where: {
      id: params.id,
      status: 'READY',
      showInGallery: true,
    },
    include: {
      concepts: {
        orderBy: { score: 'desc' },
      },
    },
  });

  if (!session) return notFound();

  const signals = session.signals as any;
  const brief = signals?.brief;
  const colorGuidance = signals?.colorGuidance || brief?.colorGuidance;
  const typographyGuidance = signals?.typographyGuidance || brief?.typeGuidance;
  const primaryColor = colorGuidance?.suggestedPrimaryHex || '#7C3AED';
  const topConcept = session.concepts[0];

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 pb-8 sm:pb-16">
      {/* Back link */}
      <Link
        href="/brand/gallery"
        className="inline-flex items-center gap-1.5 text-sm text-[#585854] hover:text-[#1A1A18] transition-colors mb-6 no-underline"
      >
        &larr; Back to Gallery
      </Link>

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden mb-8" style={{ backgroundColor: primaryColor }}>
        <div className="flex flex-col items-center py-8 sm:py-12 px-4 sm:px-6">
          {topConcept && (
            <img
              src={topConcept.previewUrl}
              alt={`${session.domainName} logo`}
              className="w-28 h-28 object-contain mb-4 rounded-xl bg-white/10 p-2"
            />
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
            {session.domainName}{session.tld}
          </h1>
          {brief?.tensionPair && (
            <p className="text-white/80 italic text-base">&ldquo;{brief.tensionPair}&rdquo;</p>
          )}
        </div>
      </div>

      {/* Brand Strategy */}
      {brief && (
        <div className="rounded-2xl border border-[#E6E6E4] bg-white p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#1A1A18] mb-4">Brand Strategy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {brief.sectorClassification && (
              <InfoField label="Sector" value={brief.sectorClassification} />
            )}
            {brief.aestheticDirection && (
              <InfoField label="Aesthetic Direction" value={brief.aestheticDirection} />
            )}
            {brief.memorableAnchor && (
              <InfoField label="Memorable Anchor" value={brief.memorableAnchor} />
            )}
            {brief.competitiveDifferentiation && (
              <InfoField label="Differentiation" value={brief.competitiveDifferentiation} />
            )}
          </div>
          {brief.brandPillars?.length > 0 && (
            <div className="mt-4">
              <span className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider">Brand Pillars</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {brief.brandPillars.map((p: any, i: number) => (
                  <span key={i} className="px-3 py-1 bg-[#FAFAF8] border border-[#E6E6E4] rounded-full text-xs text-[#585854]">
                    {typeof p === 'string' ? p : p.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Logo Concepts */}
      {session.concepts.length > 0 && (
        <div className="rounded-2xl border border-[#E6E6E4] bg-white p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#1A1A18] mb-4">
            Logo Concepts
            <span className="text-sm font-normal text-[#A1A1AA] ml-2">
              {session.concepts.length} generated
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {session.concepts.map((concept) => (
              <div
                key={concept.id}
                className="relative rounded-xl border border-[#E6E6E4] bg-[#FAFAF8] p-3 flex flex-col items-center"
              >
                <img
                  src={concept.previewUrl}
                  alt={`${session.domainName} ${concept.style}`}
                  className="w-full aspect-square object-contain mb-2"
                />
                <span className="text-[10px] text-[#585854] tracking-[0.06em] uppercase">
                  {concept.style}
                </span>
                {concept.score && concept.score >= 85 && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#7C3AED] text-white text-[9px] font-semibold rounded-md">
                    Top pick
                  </span>
                )}
                {concept.score && concept.score >= 75 && concept.score < 85 && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#E6E6E4] text-[#585854] text-[9px] font-semibold rounded-md">
                    Strong
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Color Palette */}
      {colorGuidance?.suggestedPrimaryHex && (
        <div className="rounded-2xl border border-[#E6E6E4] bg-white p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#1A1A18] mb-4">Color Palette</h2>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl border border-[#E6E6E4]"
                style={{ backgroundColor: colorGuidance.suggestedPrimaryHex }}
              />
              <span className="text-[10px] font-mono text-[#585854]">{colorGuidance.suggestedPrimaryHex}</span>
              <span className="text-[9px] text-[#A1A1AA] uppercase">Primary</span>
            </div>
            {colorGuidance.palette?.map((hex: string, i: number) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl border border-[#E6E6E4]"
                  style={{ backgroundColor: hex }}
                />
                <span className="text-[10px] font-mono text-[#585854]">{hex}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Typography */}
      {typographyGuidance && (
        <div className="rounded-2xl border border-[#E6E6E4] bg-white p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#1A1A18] mb-4">Typography</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {typographyGuidance.displayFont && (
              <div>
                <span className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider">Display Font</span>
                <p className="text-2xl font-bold text-[#1A1A18] mt-1">{session.domainName}</p>
                <p className="text-xs text-[#585854] mt-1">{typographyGuidance.displayFont}</p>
              </div>
            )}
            {typographyGuidance.bodyFont && (
              <div>
                <span className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider">Body Font</span>
                <p className="text-base text-[#585854] mt-1">
                  The quick brown fox jumps over the lazy dog.
                </p>
                <p className="text-xs text-[#585854] mt-1">{typographyGuidance.bodyFont}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* What's Included */}
      <div className="rounded-2xl border border-[#E6E6E4] bg-white p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#1A1A18] mb-4">What&apos;s in the Brand Kit</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Logo Files', desc: 'PNG, SVG, 7 color variants' },
            { label: 'Social Media', desc: '18+ ready-to-use assets' },
            { label: 'Business Cards', desc: 'Print-ready designs' },
            { label: 'Brand Guidelines', desc: 'PDF documentation' },
            { label: 'Color System', desc: 'CSS + JSON palettes' },
            { label: 'Typography', desc: 'Font pairing system' },
            { label: 'Email Signatures', desc: 'HTML templates' },
            { label: 'Favicon Package', desc: 'All sizes included' },
          ].map((item, i) => (
            <div key={i} className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E6E6E4]">
              <p className="text-sm font-medium text-[#1A1A18]">{item.label}</p>
              <p className="text-[11px] text-[#A1A1AA] mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center mt-10">
        <p className="text-sm text-[#585854] mb-4">
          Create a brand identity like this one in 60 seconds
        </p>
        <Link
          href="/brand"
          className="inline-block bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-8 py-3 rounded-full text-base font-semibold transition-colors no-underline"
        >
          Generate your brand &rarr;
        </Link>
      </div>
    </div>
  );
}
