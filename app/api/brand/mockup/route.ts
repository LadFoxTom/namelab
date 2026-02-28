import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { downloadToBuffer, ensurePng, removeWhiteBackground, compositeOnBackground } from '@/lib/brand/postprocess';
import { downloadFromR2 } from '@/lib/brand/storage';

export const runtime = 'nodejs';

// In-memory cache for mockups (cleared on restart)
const mockupCache = new Map<string, { buffer: Buffer; createdAt: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

type MockupType = 'business-card' | 'phone-app' | 'website-header' | 'dark-background' | 'social-media' | 'storefront';

export async function GET(req: NextRequest) {
  const conceptId = req.nextUrl.searchParams.get('conceptId');
  const type = req.nextUrl.searchParams.get('type') as MockupType;

  if (!conceptId || !type) {
    return NextResponse.json({ error: 'Missing conceptId or type' }, { status: 400 });
  }

  const validTypes: MockupType[] = ['business-card', 'phone-app', 'website-header', 'dark-background', 'social-media', 'storefront'];
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
      case 'social-media':
        mockupBuffer = await generateSocialMediaMockup(transparentLogo, session.domainName);
        break;
      case 'storefront':
        mockupBuffer = await generateStorefrontMockup(transparentLogo, session.domainName);
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

async function generateSocialMediaMockup(logo: Buffer, brandName: string): Promise<Buffer> {
  const width = 1080;
  const height = 1080;
  const logoSize = 200;
  const avatarSize = 120;

  const resizedLogo = await sharp(logo)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();

  const avatarLogo = await sharp(logo)
    .resize(avatarSize, avatarSize, { fit: 'cover', background: { r: 255, g: 255, b: 255, alpha: 255 } })
    .png().toBuffer();

  // Create circular mask for avatar
  const circleMask = Buffer.from(`<svg width="${avatarSize}" height="${avatarSize}"><circle cx="${avatarSize / 2}" cy="${avatarSize / 2}" r="${avatarSize / 2}" fill="white"/></svg>`);
  const maskedAvatar = await sharp(avatarLogo)
    .composite([{ input: await sharp(circleMask).png().toBuffer(), blend: 'dest-in' }])
    .png().toBuffer();

  const safeName = brandName.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // Instagram-style profile mockup
  const socialSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#FAFAFA"/>
    <!-- Header bar -->
    <rect width="${width}" height="56" fill="white"/>
    <text x="540" y="36" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" fill="#1a1a1a" text-anchor="middle">${safeName}</text>
    <line x1="0" y1="56" x2="${width}" y2="56" stroke="#dbdbdb" stroke-width="1"/>
    <!-- Profile section -->
    <circle cx="160" cy="180" r="${avatarSize / 2 + 3}" fill="#dbdbdb"/>
    <!-- Stats -->
    <text x="400" y="165" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="#1a1a1a" text-anchor="middle">127</text>
    <text x="400" y="185" font-family="system-ui, sans-serif" font-size="13" fill="#8e8e8e" text-anchor="middle">Posts</text>
    <text x="580" y="165" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="#1a1a1a" text-anchor="middle">4.2K</text>
    <text x="580" y="185" font-family="system-ui, sans-serif" font-size="13" fill="#8e8e8e" text-anchor="middle">Followers</text>
    <text x="760" y="165" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="#1a1a1a" text-anchor="middle">892</text>
    <text x="760" y="185" font-family="system-ui, sans-serif" font-size="13" fill="#8e8e8e" text-anchor="middle">Following</text>
    <!-- Bio -->
    <text x="40" y="280" font-family="system-ui, sans-serif" font-size="15" font-weight="bold" fill="#1a1a1a">${safeName}</text>
    <text x="40" y="305" font-family="system-ui, sans-serif" font-size="14" fill="#1a1a1a">Official brand page</text>
    <text x="40" y="325" font-family="system-ui, sans-serif" font-size="14" fill="#00376b">www.${brandName.toLowerCase().replace(/\s+/g, '')}.com</text>
    <!-- Edit profile button -->
    <rect x="40" y="350" width="${width - 80}" height="36" rx="8" fill="none" stroke="#dbdbdb" stroke-width="1"/>
    <text x="${width / 2}" y="373" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#1a1a1a" text-anchor="middle">Edit Profile</text>
    <!-- Grid separator -->
    <line x1="0" y1="410" x2="${width}" y2="410" stroke="#dbdbdb" stroke-width="1"/>
    <!-- Grid photos (placeholders) -->
    <rect x="2" y="414" width="358" height="358" fill="#f0f0f0"/>
    <rect x="362" y="414" width="356" height="358" fill="#e8e8e8"/>
    <rect x="720" y="414" width="358" height="358" fill="#f0f0f0"/>
    <rect x="2" y="774" width="358" height="306" fill="#e8e8e8"/>
    <rect x="362" y="774" width="356" height="306" fill="#f0f0f0"/>
    <rect x="720" y="774" width="358" height="306" fill="#e8e8e8"/>
  </svg>`;

  const bg = await sharp(Buffer.from(socialSvg)).png().toBuffer();

  return sharp(bg)
    .composite([
      { input: maskedAvatar, top: 180 - avatarSize / 2, left: 160 - avatarSize / 2 },
      { input: resizedLogo, top: 414 + (358 - logoSize) / 2, left: 2 + (358 - logoSize) / 2 },
    ])
    .png().toBuffer();
}

async function generateStorefrontMockup(logo: Buffer, brandName: string): Promise<Buffer> {
  const width = 1200;
  const height = 800;
  const logoSize = 160;

  const resizedLogo = await sharp(logo)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();

  const safeName = brandName.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // Simple storefront / sign mockup
  const storefrontSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <!-- Sky -->
    <rect width="${width}" height="300" fill="#E8F0FE"/>
    <!-- Building facade -->
    <rect y="300" width="${width}" height="500" fill="#F5F0E8"/>
    <!-- Awning -->
    <rect x="150" y="250" width="900" height="80" rx="4" fill="#2D3748"/>
    <rect x="150" y="250" width="900" height="20" rx="4" fill="#4A5568"/>
    <!-- Awning stripes -->
    <rect x="150" y="310" width="112" height="20" fill="#2D3748"/>
    <rect x="262" y="310" width="113" height="20" fill="#1A202C"/>
    <rect x="375" y="310" width="112" height="20" fill="#2D3748"/>
    <rect x="487" y="310" width="113" height="20" fill="#1A202C"/>
    <rect x="600" y="310" width="112" height="20" fill="#2D3748"/>
    <rect x="712" y="310" width="113" height="20" fill="#1A202C"/>
    <rect x="825" y="310" width="112" height="20" fill="#2D3748"/>
    <rect x="937" y="310" width="113" height="20" fill="#1A202C"/>
    <!-- Store name on sign -->
    <rect x="350" y="195" width="500" height="60" rx="6" fill="white"/>
    <text x="600" y="233" font-family="system-ui, sans-serif" font-size="26" font-weight="bold" fill="#1a1a1a" text-anchor="middle">${safeName}</text>
    <!-- Window -->
    <rect x="250" y="380" width="300" height="300" rx="4" fill="#B8D4E8" opacity="0.5"/>
    <rect x="252" y="382" width="296" height="296" rx="3" fill="white" opacity="0.3"/>
    <!-- Door -->
    <rect x="650" y="380" width="200" height="420" rx="4" fill="#4A5568"/>
    <rect x="660" y="390" width="180" height="260" rx="3" fill="#87CEEB" opacity="0.4"/>
    <circle cx="820" cy="590" r="8" fill="#A0AEC0"/>
    <!-- Sidewalk -->
    <rect y="700" width="${width}" height="100" fill="#CBD5E0"/>
    <line x1="0" y1="700" x2="${width}" y2="700" stroke="#A0AEC0" stroke-width="2"/>
  </svg>`;

  const bg = await sharp(Buffer.from(storefrontSvg)).png().toBuffer();

  // Place logo in the store window
  return sharp(bg)
    .composite([{
      input: resizedLogo,
      top: 380 + (300 - logoSize) / 2,
      left: 250 + (300 - logoSize) / 2,
    }])
    .png().toBuffer();
}
