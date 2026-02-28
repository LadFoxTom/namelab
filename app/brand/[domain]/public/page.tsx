import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

interface Props {
  params: { domain: string };
}

export default async function PublicBrandPage({ params }: Props) {
  const domainName = decodeURIComponent(params.domain);

  // Find the most recent READY session for this domain that is gallery-visible
  const session = await prisma.brandSession.findFirst({
    where: {
      domainName,
      status: 'READY',
      showInGallery: true,
    },
    include: {
      concepts: {
        where: { isSelected: true },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!session) return notFound();

  const signals = session.signals as any;
  const brief = signals?.brief;
  const colorGuidance = signals?.colorGuidance || brief?.colorGuidance;
  const typographyGuidance = signals?.typographyGuidance || brief?.typeGuidance;
  const selectedConcept = session.concepts[0];

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        {selectedConcept && (
          <img
            src={selectedConcept.previewUrl}
            alt={`${session.domainName} logo`}
            className="w-24 h-24 sm:w-32 sm:h-32 object-contain mx-auto mb-4"
          />
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A18]">
          {session.domainName}{session.tld}
        </h1>
        {brief?.tensionPair && (
          <p className="text-[#585854] italic mt-2">&ldquo;{brief.tensionPair}&rdquo;</p>
        )}
      </div>

      {/* Strategy */}
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
          {typographyGuidance.displayFont && (
            <div className="mb-3">
              <span className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider">Display</span>
              <p className="text-2xl font-bold text-[#1A1A18] mt-1">{session.domainName}</p>
              <p className="text-xs text-[#585854]">{typographyGuidance.displayFont}</p>
            </div>
          )}
          {typographyGuidance.bodyFont && (
            <div>
              <span className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider">Body</span>
              <p className="text-base text-[#585854] mt-1">{typographyGuidance.bodyFont}</p>
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="text-center mt-8">
        <p className="text-sm text-[#585854] mb-3">
          Built with BrandKitz &middot; AI-powered brand identity
        </p>
        <a
          href="/brand"
          className="inline-block bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          Create your own brand &rarr;
        </a>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E6E6E4]">
      <span className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider">{label}</span>
      <p className="text-sm text-[#1A1A18] mt-0.5">{value}</p>
    </div>
  );
}
