import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBrandSignals, BrandSignals } from '@/lib/brand/signals';
import { generateLogoConcepts } from '@/lib/brand/generate';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { domainName, tld, searchQuery, anonymousId, preferences } = await req.json();

  if (!domainName || !searchQuery) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const session = await prisma.brandSession.create({
    data: {
      domainName,
      tld: tld ?? '.com',
      searchQuery,
      anonymousId: anonymousId ?? null,
      signals: {},
      status: 'GENERATING',
      progress: 'extracting_signals',
    },
  });

  generateBrandPreview(session.id, domainName, searchQuery, preferences).catch(console.error);

  return NextResponse.json({ sessionId: session.id, status: 'GENERATING' });
}

async function generateBrandPreview(
  sessionId: string,
  domainName: string,
  searchQuery: string,
  preferences?: { businessDescription?: string; tone?: string; colorPreference?: string; iconStyle?: string }
) {
  try {
    const userPrefs: Partial<BrandSignals> = {};
    if (preferences?.tone) userPrefs.tone = preferences.tone as BrandSignals['tone'];
    if (preferences?.iconStyle) userPrefs.iconStyle = preferences.iconStyle as BrandSignals['iconStyle'];
    if (preferences?.colorPreference) {
      userPrefs.colorDirection = { primary: preferences.colorPreference, mood: '', avoid: '', paletteStyle: 'analogous' };
    }

    const description = preferences?.businessDescription || searchQuery;
    const signals = await extractBrandSignals(domainName, description, Object.keys(userPrefs).length > 0 ? userPrefs : undefined);

    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { signals: signals as any, progress: 'generating_logos' },
    });

    const concepts = await generateLogoConcepts(signals);

    // Store FAL URLs directly — no watermarking, no R2 upload for previews
    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i];
      await prisma.brandConcept.create({
        data: {
          brandSessionId: sessionId,
          style: concept.style,
          previewUrl: concept.imageUrl,
          originalUrl: concept.imageUrl,
          generationIndex: i,
          promptUsed: concept.prompt,
        },
      });
    }

    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { status: 'READY', progress: 'ready' },
    });
  } catch (error) {
    console.error('Brand preview generation failed:', error);
    await prisma.brandSession.update({
      where: { id: sessionId },
      data: { status: 'FAILED', progress: null },
    });
  }
}
