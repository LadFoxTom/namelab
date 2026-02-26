import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { BrandPalette } from './palette';
import { BrandSignals } from './signals';
import { SocialStrategy } from './socialDirector';

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
  { platform: 'Instagram Post',     filename: 'instagram-post.png',       w: 1080, h: 1080, logoPct: 0.30, layout: 'og-image' },
  { platform: 'Instagram Story',    filename: 'instagram-story.png',      w: 1080, h: 1920, logoPct: 0.20, layout: 'wide-banner' },
  { platform: 'X Profile',          filename: 'x-profile.png',            w: 400,  h: 400,  logoPct: 0.55, layout: 'profile-icon' },
  { platform: 'X Banner',           filename: 'x-banner.png',             w: 1500, h: 500,  logoPct: 0.14, layout: 'wide-banner' },
  { platform: 'LinkedIn Profile',   filename: 'linkedin-profile.png',     w: 400,  h: 400,  logoPct: 0.55, layout: 'profile-icon' },
  { platform: 'LinkedIn Cover',     filename: 'linkedin-cover.png',       w: 1584, h: 396,  logoPct: 0.14, layout: 'wide-banner' },
  { platform: 'Facebook Profile',   filename: 'facebook-profile.png',     w: 196,  h: 196,  logoPct: 0.55, layout: 'profile-icon' },
  { platform: 'Facebook Cover',     filename: 'facebook-cover.png',       w: 820,  h: 312,  logoPct: 0.18, layout: 'wide-banner' },
  { platform: 'YouTube Channel Art',filename: 'youtube-channel-art.png',  w: 2560, h: 1440, logoPct: 0.06, layout: 'wide-banner' },
  { platform: 'YouTube Profile',    filename: 'youtube-profile.png',      w: 800,  h: 800,  logoPct: 0.55, layout: 'profile-icon' },
  { platform: 'TikTok Profile',     filename: 'tiktok-profile.png',       w: 200,  h: 200,  logoPct: 0.55, layout: 'profile-icon' },
  { platform: 'Pinterest Profile',  filename: 'pinterest-profile.png',    w: 165,  h: 165,  logoPct: 0.55, layout: 'profile-icon' },
  { platform: 'Email Signature',    filename: 'email-signature.png',      w: 300,  h: 100,  logoPct: 0.45, layout: 'wide-banner' },
  { platform: 'App Icon (iOS)',     filename: 'app-icon-ios.png',         w: 1024, h: 1024, logoPct: 0.50, layout: 'profile-icon' },
  { platform: 'App Icon (Android)', filename: 'app-icon-android.png',     w: 512,  h: 512,  logoPct: 0.50, layout: 'profile-icon' },
  { platform: 'Open Graph',         filename: 'og-image.png',             w: 1200, h: 630,  logoPct: 0.12, layout: 'og-image' },
  { platform: 'Letterhead Logo',    filename: 'letterhead-logo.png',      w: 600,  h: 200,  logoPct: 0.40, layout: 'wide-banner' },
  { platform: 'Business Card',      filename: 'business-card.png',        w: 1050, h: 600,  logoPct: 0.22, layout: 'wide-banner' },
  { platform: 'Slack / Discord',    filename: 'chat-avatar.png',          w: 512,  h: 512,  logoPct: 0.55, layout: 'profile-icon' },
];

// Lighten/darken a hex color
function adjustColor(hex: string, amount: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Get a "visual primary" color that's guaranteed to be visible.
 * When primary is near-white or near-black, falls back to accent or dark.
 */
function getVisualPrimary(palette: BrandPalette): string {
  const lum = hexLuminance(palette.primary);
  if (lum > 0.85) return palette.accent && hexLuminance(palette.accent) < 0.8 ? palette.accent : palette.dark;
  if (lum < 0.05) return palette.accent && hexLuminance(palette.accent) > 0.1 ? palette.accent : palette.dark;
  return palette.primary;
}

// ── Background builders ──────────────────────────────────────────────────────

// Style A: Clean minimal — solid color with subtle geometric accent
function buildMinimalBg(w: number, h: number, palette: BrandPalette): string {
  const visPrimary = getVisualPrimary(palette);
  const isLight = hexLuminance(visPrimary) > 0.5;
  const bgColor = isLight ? palette.dark : visPrimary;
  const accentOpacity = 0.08;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${bgColor}"/>
  <rect x="${Math.round(w * 0.7)}" y="0" width="${Math.round(w * 0.005)}" height="${h}" fill="${palette.accent}" fill-opacity="${accentOpacity * 3}"/>
  <rect x="0" y="${Math.round(h * 0.85)}" width="${w}" height="${Math.round(h * 0.005)}" fill="${palette.accent}" fill-opacity="${accentOpacity * 2}"/>
</svg>`;
}

// Style B: Gradient with angled stripe accent
function buildStripeBg(w: number, h: number, palette: BrandPalette): string {
  const visPrimary = getVisualPrimary(palette);
  const darker = adjustColor(visPrimary, -40);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${visPrimary}"/>
      <stop offset="100%" stop-color="${darker}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <polygon points="0,${h} ${Math.round(w * 0.35)},${h} 0,${Math.round(h * 0.6)}" fill="${palette.accent}" fill-opacity="0.12"/>
  <polygon points="${w},0 ${Math.round(w * 0.65)},0 ${w},${Math.round(h * 0.4)}" fill="${palette.accent}" fill-opacity="0.08"/>
</svg>`;
}

// Style C: Split layout — primary color left, lighter right
function buildSplitBg(w: number, h: number, palette: BrandPalette): string {
  const visPrimary = getVisualPrimary(palette);
  const splitX = Math.round(w * 0.38);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${palette.light}"/>
  <rect width="${splitX}" height="${h}" fill="${visPrimary}"/>
  <rect x="${splitX}" y="${Math.round(h * 0.3)}" width="3" height="${Math.round(h * 0.4)}" fill="${palette.accent}"/>
</svg>`;
}

// Style D: Dark editorial — near-black with accent line
function buildEditorialBg(w: number, h: number, palette: BrandPalette): string {
  const visPrimary = getVisualPrimary(palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${palette.dark}"/>
  <rect x="0" y="0" width="${w}" height="${Math.round(h * 0.006)}" fill="${palette.accent}"/>
  <rect x="0" y="${h - Math.round(h * 0.006)}" width="${w}" height="${Math.round(h * 0.006)}" fill="${visPrimary}" fill-opacity="0.4"/>
</svg>`;
}

// Select a background style based on brand hash for variety
function selectBannerBg(w: number, h: number, palette: BrandPalette, brandHash: number): string {
  const styles = [buildMinimalBg, buildStripeBg, buildSplitBg, buildEditorialBg];
  return styles[brandHash % styles.length](w, h, palette);
}

// Profile icon: solid primary with optional subtle pattern
function buildProfileBg(w: number, h: number, palette: BrandPalette): string {
  const visPrimary = getVisualPrimary(palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${visPrimary}"/>
</svg>`;
}

// OG image: gradient background with accent line (no SVG text — Sharp can't render fonts)
function buildOgBg(w: number, h: number, palette: BrandPalette): string {
  const visPrimary = getVisualPrimary(palette);
  const isLight = hexLuminance(visPrimary) > 0.5;
  const bgColor = isLight ? palette.dark : visPrimary;
  const darker = adjustColor(bgColor, -30);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgColor}"/>
      <stop offset="100%" stop-color="${darker}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${w}" height="${Math.round(h * 0.005)}" fill="${palette.accent}"/>
</svg>`;
}

// ── Strategy-driven background builders ─────────────────────────────────────

// Pure gradient background (no geometric accents)
function buildGradientBg(w: number, h: number, palette: BrandPalette): string {
  const visPrimary = getVisualPrimary(palette);
  const isLight = hexLuminance(visPrimary) > 0.5;
  const from = isLight ? palette.dark : visPrimary;
  const to = adjustColor(from, -35);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
</svg>`;
}

// Dot/grid pattern on dark background
function buildPatternBg(w: number, h: number, palette: BrandPalette): string {
  const visPrimary = getVisualPrimary(palette);
  const spacing = Math.max(20, Math.round(Math.min(w, h) * 0.03));
  const dotR = Math.max(1, Math.round(spacing * 0.08));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <pattern id="dots" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">
      <circle cx="${spacing / 2}" cy="${spacing / 2}" r="${dotR}" fill="${visPrimary}" fill-opacity="0.12"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="${palette.dark}"/>
  <rect width="${w}" height="${h}" fill="url(#dots)"/>
</svg>`;
}

function selectBgByStrategy(
  w: number, h: number, palette: BrandPalette, brandHash: number,
  bgStyle?: string
): string {
  switch (bgStyle) {
    case 'gradient': return buildGradientBg(w, h, palette);
    case 'pattern': return buildPatternBg(w, h, palette);
    case 'editorial': return buildEditorialBg(w, h, palette);
    case 'minimal': return buildMinimalBg(w, h, palette);
    default: return selectBannerBg(w, h, palette, brandHash);
  }
}

// ── Text overlay rendering ──────────────────────────────────────────────────

let _socialFontBase64: string | null = null;
function getInterBoldBase64(): string {
  if (!_socialFontBase64) {
    const fontPath = path.join(process.cwd(), 'lib/brand/fonts/Inter-Bold.ttf');
    _socialFontBase64 = fs.readFileSync(fontPath).toString('base64');
  }
  return _socialFontBase64;
}

async function renderTextOverlay(
  bgBuffer: Buffer, w: number, h: number,
  text: string, placement: string, textStyle: string, palette: BrandPalette
): Promise<Buffer> {
  if (!text) return bgBuffer;

  const fontSize = Math.max(14, Math.round(Math.min(w, h) * 0.04));
  const fontBase64 = getInterBoldBase64();
  const textColor = hexLuminance(palette.dark) < 0.5 ? palette.light : palette.dark;
  const transform = textStyle === 'caps' ? text.toUpperCase() : text;
  const letterSpacing = textStyle === 'caps' ? ' letter-spacing="0.08em"' : '';
  const fontWeight = textStyle === 'light' ? '400' : '700';

  let x: string, y: number, anchor: string;
  switch (placement) {
    case 'center':
      x = '50%'; y = Math.round(h * 0.88); anchor = 'middle'; break;
    case 'bottom-center':
      x = '50%'; y = Math.round(h * 0.92); anchor = 'middle'; break;
    default: // bottom-left
      x = `${Math.round(w * 0.06)}`; y = Math.round(h * 0.90); anchor = 'start'; break;
  }

  const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <style>@font-face { font-family: "InterOverlay"; src: url(data:font/truetype;base64,${fontBase64}); }</style>
  </defs>
  <text x="${x}" y="${y}" text-anchor="${anchor}"
    font-family="InterOverlay" font-size="${fontSize}" font-weight="${fontWeight}"
    fill="${textColor}" fill-opacity="0.85"${letterSpacing}>${escapeXml(transform)}</text>
</svg>`;

  return sharp(bgBuffer)
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Simple hash for brand variety
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function generateSocialKit(
  logoPngBuffer: Buffer,
  palette: BrandPalette,
  signals: BrandSignals,
  domainName: string,
  strategy?: SocialStrategy
): Promise<SocialAsset[]> {
  const assets: SocialAsset[] = [];
  const brandHash = hashString(domainName);

  const bgTreatments = strategy?.backgroundTreatments;
  const overlay = strategy?.typographyOverlay;

  for (const size of SOCIAL_SIZES) {
    const logoSize = Math.round(Math.min(size.w, size.h) * size.logoPct);

    let bgSvg: string;
    let logoGravity: sharp.Gravity | undefined = 'centre';
    let logoTop: number | undefined;
    let logoLeft: number | undefined;
    let addPadding = false;

    if (size.layout === 'profile-icon') {
      // Profile icons always use solid bg for recognizability
      bgSvg = buildProfileBg(size.w, size.h, palette);
      addPadding = true;
    } else if (size.layout === 'og-image') {
      bgSvg = bgTreatments
        ? selectBgByStrategy(size.w, size.h, palette, brandHash, bgTreatments.og)
        : buildOgBg(size.w, size.h, palette);
      addPadding = true;
    } else {
      // Banner
      bgSvg = bgTreatments
        ? selectBgByStrategy(size.w, size.h, palette, brandHash, bgTreatments.banner)
        : selectBannerBg(size.w, size.h, palette, brandHash);
      const bgStyle = brandHash % 4;
      if (!bgTreatments && bgStyle === 2) {
        // Split layout: logo goes on the right side (only for algorithmic fallback)
        logoLeft = Math.round(size.w * 0.52);
        logoTop = Math.round((size.h - logoSize) / 2);
        logoGravity = undefined;
      } else {
        logoGravity = 'centre';
      }
    }

    // Render SVG background to PNG
    let bgBuffer = await sharp(Buffer.from(bgSvg))
      .resize(size.w, size.h)
      .png()
      .toBuffer();

    // Resize logo with padding for profile icons
    const padding = addPadding ? Math.round(logoSize * 0.12) : 0;
    const innerSize = logoSize - padding * 2;
    const resizedLogo = await sharp(logoPngBuffer)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();

    // For profile icons, add a subtle white circle card behind the logo
    let logoComposite: Buffer;
    if (size.layout === 'profile-icon') {
      const cardSize = logoSize;
      const radius = Math.round(cardSize * 0.12);
      const cardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cardSize}" height="${cardSize}">
        <rect width="${cardSize}" height="${cardSize}" rx="${radius}" ry="${radius}" fill="white"/>
      </svg>`;
      const cardBuffer = await sharp(Buffer.from(cardSvg)).resize(cardSize, cardSize).png().toBuffer();
      logoComposite = await sharp(cardBuffer)
        .composite([{ input: resizedLogo, top: padding, left: padding }])
        .png()
        .toBuffer();
    } else {
      logoComposite = resizedLogo;
    }

    // Composite logo onto background
    const compositeOptions: sharp.OverlayOptions = logoGravity
      ? { input: logoComposite, gravity: logoGravity }
      : { input: logoComposite, top: logoTop!, left: logoLeft! };

    let buffer = await sharp(bgBuffer)
      .composite([compositeOptions])
      .png()
      .toBuffer();

    // Add text overlays for banners and OG images when strategy is available
    if (overlay && size.layout === 'wide-banner' && overlay.taglineOnBanners && overlay.taglineText) {
      buffer = await renderTextOverlay(
        buffer, size.w, size.h,
        overlay.taglineText, overlay.textPlacement, overlay.textStyle, palette
      );
    }
    if (overlay && size.layout === 'og-image' && overlay.domainOnOgImages) {
      buffer = await renderTextOverlay(
        buffer, size.w, size.h,
        domainName, overlay.textPlacement, overlay.textStyle, palette
      );
    }

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
