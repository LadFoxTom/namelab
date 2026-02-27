import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { downloadToBuffer, ensurePng, removeWhiteBackground, compositeOnBackground } from '@/lib/brand/postprocess';
import { downloadFromR2 } from '@/lib/brand/storage';

export const runtime = 'nodejs';

// In-memory cache for mockups (cleared on restart)
const mockupCache = new Map<string, { buffer: Buffer; createdAt: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

type MockupType = 'business-card' | 'phone-app' | 'website-header' | 'dark-background';

export async function GET(req: NextRequest) {
  const conceptId = req.nextUrl.searchParams.get('conceptId');
  const type = req.nextUrl.searchParams.get('type') as MockupType;

  if (!conceptId || !type) {
    return NextResponse.json({ error: 'Missing conceptId or type' }, { status: 400 });
  }

  const validTypes: MockupType[] = ['business-card', 'phone-app', 'website-header', 'dark-background'];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  // Check cache
  const cacheKey = `${conceptId}-${type}`;
  const cached = mockupCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL) {
    return new NextResponse(new Uint8Array(cached.buffer), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=900' },
    });
  }

  try {
    const concept = await prisma.brandConcept.findUniqueOrThrow({ where: { id: conceptId } });
    const session = await prisma.brandSession.findUniqueOrThrow({ where: { id: concept.brandSessionId } });

    // Download logo
    let logoPng: Buffer;
    try {
      logoPng = await ensurePng(await downloadFromR2(concept.originalUrl));
    } catch {
      logoPng = await ensurePng(await downloadToBuffer(concept.previewUrl));
    }

    const transparentLogo = await removeWhiteBackground(logoPng);
    const rawSignals = session.signals as any;
    const palette = rawSignals?.brief?.colorGuidance;
    const darkColor = palette?.suggestedPrimaryHex || '#1a1a2e';

    let mockupBuffer: Buffer;

    switch (type) {
      case 'business-card':
        mockupBuffer = await generateBusinessCardMockup(transparentLogo, session.domainName);
        break;
      case 'phone-app':
        mockupBuffer = await generatePhoneAppMockup(transparentLogo);
        break;
      case 'website-header':
        mockupBuffer = await generateWebsiteHeaderMockup(transparentLogo, session.domainName);
        break;
      case 'dark-background':
        mockupBuffer = await compositeOnBackground(transparentLogo, darkColor, 1200);
        break;
      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }

    // Cache result
    mockupCache.set(cacheKey, { buffer: mockupBuffer, createdAt: Date.now() });

    return new NextResponse(new Uint8Array(mockupBuffer), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=900' },
    });
  } catch (err: any) {
    console.error('Mockup generation failed:', err);
    return NextResponse.json({ error: 'Mockup generation failed', details: err.message }, { status: 500 });
  }
}

async function generateBusinessCardMockup(logo: Buffer, brandName: string): Promise<Buffer> {
  const width = 1050;
  const height = 600;
  const logoSize = 180;

  const resizedLogo = await sharp(logo)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();

  // Card with shadow effect
  const cardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="4" stdDeviation="12" flood-opacity="0.15"/>
      </filter>
    </defs>
    <rect x="60" y="40" width="930" height="520" rx="12" fill="white" filter="url(#shadow)"/>
    <text x="525" y="440" font-family="system-ui, sans-serif" font-size="18" fill="#64748b" text-anchor="middle">${brandName.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>
    <text x="525" y="470" font-family="system-ui, sans-serif" font-size="13" fill="#94a3b8" text-anchor="middle">www.${brandName.toLowerCase().replace(/\s+/g, '')}.com</text>
  </svg>`;

  const bg = await sharp(Buffer.from(cardSvg)).png().toBuffer();

  return sharp(bg)
    .composite([{
      input: resizedLogo,
      top: Math.round((height - logoSize) / 2) - 40,
      left: Math.round((width - logoSize) / 2),
    }])
    .png().toBuffer();
}

async function generatePhoneAppMockup(logo: Buffer): Promise<Buffer> {
  const width = 400;
  const height = 400;
  const iconSize = 120;
  const iconRadius = 27; // iOS-style rounded corners

  const resizedLogo = await sharp(logo)
    .resize(iconSize, iconSize, { fit: 'cover', background: { r: 255, g: 255, b: 255, alpha: 255 } })
    .png().toBuffer();

  // Create rounded mask
  const mask = Buffer.from(`<svg width="${iconSize}" height="${iconSize}"><rect width="${iconSize}" height="${iconSize}" rx="${iconRadius}" ry="${iconRadius}" fill="white"/></svg>`);
  const maskedIcon = await sharp(resizedLogo)
    .composite([{ input: await sharp(mask).png().toBuffer(), blend: 'dest-in' }])
    .png().toBuffer();

  // Phone frame background
  const phoneSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#f1f5f9"/>
    <rect x="${(width - iconSize) / 2 - 2}" y="${(height - iconSize) / 2 - 2}" width="${iconSize + 4}" height="${iconSize + 4}" rx="${iconRadius + 1}" fill="#e2e8f0"/>
  </svg>`;

  const bg = await sharp(Buffer.from(phoneSvg)).png().toBuffer();

  return sharp(bg)
    .composite([{
      input: maskedIcon,
      top: Math.round((height - iconSize) / 2),
      left: Math.round((width - iconSize) / 2),
    }])
    .png().toBuffer();
}

async function generateWebsiteHeaderMockup(logo: Buffer, brandName: string): Promise<Buffer> {
  const width = 1200;
  const height = 400;
  const logoHeight = 36;
  const navY = 24;

  const resizedLogo = await sharp(logo)
    .resize(null, logoHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();

  const { width: logoWidth } = await sharp(resizedLogo).metadata();

  // Website header with nav elements
  const headerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="80" fill="white"/>
    <line x1="0" y1="80" x2="${width}" y2="80" stroke="#e5e7eb" stroke-width="1"/>
    <rect y="80" width="${width}" height="${height - 80}" fill="#f8fafc"/>
    <text x="${(logoWidth || 100) + 80}" y="${navY + logoHeight / 2 + 5}" font-family="system-ui, sans-serif" font-size="14" fill="#64748b">Products</text>
    <text x="${(logoWidth || 100) + 160}" y="${navY + logoHeight / 2 + 5}" font-family="system-ui, sans-serif" font-size="14" fill="#64748b">About</text>
    <text x="${(logoWidth || 100) + 220}" y="${navY + logoHeight / 2 + 5}" font-family="system-ui, sans-serif" font-size="14" fill="#64748b">Contact</text>
    <rect x="${width - 140}" y="${navY}" width="100" height="36" rx="8" fill="#7c3aed"/>
    <text x="${width - 90}" y="${navY + 23}" font-family="system-ui, sans-serif" font-size="13" fill="white" text-anchor="middle">Sign up</text>
    <text x="${width / 2}" y="220" font-family="system-ui, sans-serif" font-size="36" font-weight="bold" fill="#0f172a" text-anchor="middle">Welcome to ${brandName.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>
    <text x="${width / 2}" y="260" font-family="system-ui, sans-serif" font-size="16" fill="#64748b" text-anchor="middle">Your next-generation brand experience</text>
  </svg>`;

  const bg = await sharp(Buffer.from(headerSvg)).png().toBuffer();

  return sharp(bg)
    .composite([{
      input: resizedLogo,
      top: navY,
      left: 40,
    }])
    .png().toBuffer();
}
