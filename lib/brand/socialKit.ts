import sharp from 'sharp';
import { BrandPalette } from './palette';
import { BrandSignals } from './signals';

export interface SocialAsset {
  platform: string;
  filename: string;
  width: number;
  height: number;
  buffer: Buffer;
}

type LayoutType = 'profile-icon' | 'wide-banner' | 'og-image';

interface SocialSize {
  platform: string;
  filename: string;
  w: number;
  h: number;
  logoPct: number;
  layout: LayoutType;
}

const SOCIAL_SIZES: SocialSize[] = [
  { platform: 'Instagram Profile',  filename: 'instagram-profile.png',   w: 320,  h: 320,  logoPct: 0.55, layout: 'profile-icon' },
  { platform: 'Instagram Post',     filename: 'instagram-post.png',       w: 1080, h: 1080, logoPct: 0.35, layout: 'og-image' },
  { platform: 'Instagram Story',    filename: 'instagram-story.png',      w: 1080, h: 1920, logoPct: 0.25, layout: 'wide-banner' },
  { platform: 'X Profile',          filename: 'x-profile.png',            w: 400,  h: 400,  logoPct: 0.55, layout: 'profile-icon' },
  { platform: 'X Banner',           filename: 'x-banner.png',             w: 1500, h: 500,  logoPct: 0.18, layout: 'wide-banner' },
  { platform: 'LinkedIn Profile',   filename: 'linkedin-profile.png',     w: 400,  h: 400,  logoPct: 0.55, layout: 'profile-icon' },
  { platform: 'LinkedIn Cover',     filename: 'linkedin-cover.png',       w: 1584, h: 396,  logoPct: 0.18, layout: 'wide-banner' },
  { platform: 'Facebook Profile',   filename: 'facebook-profile.png',     w: 196,  h: 196,  logoPct: 0.55, layout: 'profile-icon' },
  { platform: 'Facebook Cover',     filename: 'facebook-cover.png',       w: 820,  h: 312,  logoPct: 0.22, layout: 'wide-banner' },
  { platform: 'YouTube Channel Art',filename: 'youtube-channel-art.png',  w: 2560, h: 1440, logoPct: 0.08, layout: 'wide-banner' },
  { platform: 'YouTube Profile',    filename: 'youtube-profile.png',      w: 800,  h: 800,  logoPct: 0.55, layout: 'profile-icon' },
  { platform: 'TikTok Profile',     filename: 'tiktok-profile.png',       w: 200,  h: 200,  logoPct: 0.55, layout: 'profile-icon' },
  { platform: 'Pinterest Profile',  filename: 'pinterest-profile.png',    w: 165,  h: 165,  logoPct: 0.55, layout: 'profile-icon' },
  { platform: 'Email Signature',    filename: 'email-signature.png',      w: 300,  h: 100,  logoPct: 0.50, layout: 'wide-banner' },
  { platform: 'App Icon (iOS)',     filename: 'app-icon-ios.png',         w: 1024, h: 1024, logoPct: 0.50, layout: 'profile-icon' },
  { platform: 'App Icon (Android)', filename: 'app-icon-android.png',     w: 512,  h: 512,  logoPct: 0.50, layout: 'profile-icon' },
  { platform: 'Open Graph',         filename: 'og-image.png',             w: 1200, h: 630,  logoPct: 0.15, layout: 'og-image' },
  { platform: 'Letterhead Logo',    filename: 'letterhead-logo.png',      w: 600,  h: 200,  logoPct: 0.45, layout: 'wide-banner' },
  { platform: 'Business Card',      filename: 'business-card.png',        w: 1050, h: 600,  logoPct: 0.30, layout: 'wide-banner' },
  { platform: 'Slack / Discord',    filename: 'chat-avatar.png',          w: 512,  h: 512,  logoPct: 0.55, layout: 'profile-icon' },
];

// Escape XML special characters for SVG text
function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Determine text color for readability on the primary color
function textColorForBg(palette: BrandPalette): string {
  return palette.textOnPrimary === '#FFFFFF' ? '#FFFFFF' : '#1A1A2E';
}

// Build an SVG background for profile icons: solid brand color
function buildProfileBg(w: number, h: number, palette: BrandPalette): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${palette.primary}"/>
</svg>`;
}

// Build an SVG background for wide banners: gradient + decorative shapes
function buildBannerBg(w: number, h: number, palette: BrandPalette): string {
  const shortDim = Math.min(w, h);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.primary}"/>
      <stop offset="100%" stop-color="${palette.dark}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <circle cx="${Math.round(w * 0.82)}" cy="${Math.round(h * 0.18)}" r="${Math.round(shortDim * 0.45)}" fill="${palette.accent}" fill-opacity="0.10"/>
  <circle cx="${Math.round(w * 0.15)}" cy="${Math.round(h * 0.85)}" r="${Math.round(shortDim * 0.35)}" fill="${palette.secondary}" fill-opacity="0.08"/>
  <ellipse cx="${Math.round(w * 0.55)}" cy="${Math.round(h * 0.65)}" rx="${Math.round(shortDim * 0.25)}" ry="${Math.round(shortDim * 0.15)}" fill="${palette.accent}" fill-opacity="0.06"/>
</svg>`;
}

// Build an SVG background for OG images: gradient + shapes + brand name text
function buildOgBg(w: number, h: number, palette: BrandPalette, domainName: string): string {
  const textColor = textColorForBg(palette);
  const brandName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
  const fontSize = Math.round(Math.min(w, h) * 0.10);
  const subFontSize = Math.round(fontSize * 0.35);
  const shortDim = Math.min(w, h);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.primary}"/>
      <stop offset="100%" stop-color="${palette.dark}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <circle cx="${Math.round(w * 0.85)}" cy="${Math.round(h * 0.15)}" r="${Math.round(shortDim * 0.40)}" fill="${palette.accent}" fill-opacity="0.10"/>
  <circle cx="${Math.round(w * 0.10)}" cy="${Math.round(h * 0.90)}" r="${Math.round(shortDim * 0.30)}" fill="${palette.secondary}" fill-opacity="0.08"/>
  <text x="${Math.round(w / 2)}" y="${Math.round(h * 0.62)}"
    font-family="'Segoe UI', Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700"
    fill="${textColor}" text-anchor="middle">${escXml(brandName)}</text>
  <text x="${Math.round(w / 2)}" y="${Math.round(h * 0.62 + fontSize * 0.8)}"
    font-family="'Segoe UI', Arial, Helvetica, sans-serif" font-size="${subFontSize}" font-weight="400"
    fill="${textColor}" fill-opacity="0.7" text-anchor="middle">${escXml(domainName)}</text>
</svg>`;
}

/**
 * Build a white rounded-rect card with drop shadow as an SVG,
 * to be composited behind the logo for a polished "card" look.
 */
function buildLogoCard(cardW: number, cardH: number, radius: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cardW}" height="${cardH}">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="${Math.max(2, Math.round(cardH * 0.02))}" stdDeviation="${Math.max(4, Math.round(cardH * 0.04))}" flood-color="#000000" flood-opacity="0.15"/>
    </filter>
  </defs>
  <rect x="${Math.round(cardW * 0.05)}" y="${Math.round(cardH * 0.05)}"
    width="${Math.round(cardW * 0.9)}" height="${Math.round(cardH * 0.9)}"
    rx="${radius}" ry="${radius}"
    fill="white" filter="url(#shadow)"/>
</svg>`;
}

/**
 * Create a logo-on-card composite: white rounded card with shadow + logo centered inside.
 * Returns a PNG buffer of the card+logo ready to be composited onto a background.
 */
async function buildLogoOnCard(logoPngBuffer: Buffer, cardSize: number, padding = 0.18): Promise<Buffer> {
  const radius = Math.round(cardSize * 0.08);
  const logoInner = Math.round(cardSize * (1 - padding * 2));

  // Resize logo to fit inside the card padding
  const resizedLogo = await sharp(logoPngBuffer)
    .resize(logoInner, logoInner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  // Render the card SVG
  const cardSvg = buildLogoCard(cardSize, cardSize, radius);
  const cardBuffer = await sharp(Buffer.from(cardSvg))
    .resize(cardSize, cardSize)
    .png()
    .toBuffer();

  // Composite logo centered on the card
  const padPx = Math.round(cardSize * padding);
  return sharp(cardBuffer)
    .composite([{ input: resizedLogo, top: padPx, left: padPx }])
    .png()
    .toBuffer();
}

export async function generateSocialKit(
  logoPngBuffer: Buffer,
  palette: BrandPalette,
  signals: BrandSignals,
  domainName: string
): Promise<SocialAsset[]> {
  const assets: SocialAsset[] = [];

  for (const size of SOCIAL_SIZES) {
    const logoSize = Math.round(Math.min(size.w, size.h) * size.logoPct);
    // Card is slightly larger than the logo to provide padding
    const cardSize = Math.round(logoSize * 1.35);

    let bgSvg: string;
    let compositeTop: number | undefined;

    if (size.layout === 'profile-icon') {
      bgSvg = buildProfileBg(size.w, size.h, palette);
    } else if (size.layout === 'og-image') {
      bgSvg = buildOgBg(size.w, size.h, palette, domainName);
      // Position card above the text — upper area
      compositeTop = Math.round(size.h * 0.08);
    } else {
      bgSvg = buildBannerBg(size.w, size.h, palette);
    }

    // Render SVG background to PNG
    const bgBuffer = await sharp(Buffer.from(bgSvg))
      .resize(size.w, size.h)
      .png()
      .toBuffer();

    // Build the logo-on-card composite
    const logoCard = await buildLogoOnCard(logoPngBuffer, cardSize);

    // Composite card+logo onto background
    const compositeOptions: sharp.OverlayOptions = compositeTop !== undefined
      ? { input: logoCard, top: compositeTop, left: Math.round((size.w - cardSize) / 2) }
      : { input: logoCard, gravity: 'centre' };

    const buffer = await sharp(bgBuffer)
      .composite([compositeOptions])
      .png()
      .toBuffer();

    assets.push({
      platform: size.platform,
      filename: size.filename,
      width: size.w,
      height: size.h,
      buffer,
    });
  }

  return assets;
}
