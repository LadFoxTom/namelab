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

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

// ── Background builders ──────────────────────────────────────────────────────

// Style A: Clean minimal — solid color with subtle geometric accent
function buildMinimalBg(w: number, h: number, palette: BrandPalette): string {
  const isLight = hexLuminance(palette.primary) > 0.5;
  const bgColor = isLight ? palette.dark : palette.primary;
  const accentOpacity = 0.08;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${bgColor}"/>
  <rect x="${Math.round(w * 0.7)}" y="0" width="${Math.round(w * 0.005)}" height="${h}" fill="${palette.accent}" fill-opacity="${accentOpacity * 3}"/>
  <rect x="0" y="${Math.round(h * 0.85)}" width="${w}" height="${Math.round(h * 0.005)}" fill="${palette.accent}" fill-opacity="${accentOpacity * 2}"/>
</svg>`;
}

// Style B: Gradient with angled stripe accent
function buildStripeBg(w: number, h: number, palette: BrandPalette): string {
  const darker = adjustColor(palette.primary, -40);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.primary}"/>
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
  const splitX = Math.round(w * 0.38);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${palette.light}"/>
  <rect width="${splitX}" height="${h}" fill="${palette.primary}"/>
  <rect x="${splitX}" y="${Math.round(h * 0.3)}" width="3" height="${Math.round(h * 0.4)}" fill="${palette.accent}"/>
</svg>`;
}

// Style D: Dark editorial — near-black with accent line
function buildEditorialBg(w: number, h: number, palette: BrandPalette): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${palette.dark}"/>
  <rect x="0" y="0" width="${w}" height="${Math.round(h * 0.006)}" fill="${palette.accent}"/>
  <rect x="0" y="${h - Math.round(h * 0.006)}" width="${w}" height="${Math.round(h * 0.006)}" fill="${palette.primary}" fill-opacity="0.4"/>
</svg>`;
}

// Select a background style based on brand hash for variety
function selectBannerBg(w: number, h: number, palette: BrandPalette, brandHash: number): string {
  const styles = [buildMinimalBg, buildStripeBg, buildSplitBg, buildEditorialBg];
  return styles[brandHash % styles.length](w, h, palette);
}

// Profile icon: solid primary with optional subtle pattern
function buildProfileBg(w: number, h: number, palette: BrandPalette): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${palette.primary}"/>
</svg>`;
}

// OG image: logo + brand name + tagline
function buildOgBg(w: number, h: number, palette: BrandPalette, domainName: string, brandHash: number): string {
  const isLight = hexLuminance(palette.primary) > 0.5;
  const bgColor = isLight ? palette.dark : palette.primary;
  const textColor = '#FFFFFF';
  const brandName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
  const fontSize = Math.round(Math.min(w, h) * 0.09);
  const subFontSize = Math.round(fontSize * 0.35);
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
  <text x="${Math.round(w / 2)}" y="${Math.round(h * 0.68)}"
    font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="${fontSize}" font-weight="700"
    fill="${textColor}" text-anchor="middle">${escXml(brandName)}</text>
  <text x="${Math.round(w / 2)}" y="${Math.round(h * 0.68 + fontSize * 0.7)}"
    font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="${subFontSize}" font-weight="300"
    fill="${textColor}" fill-opacity="0.5" text-anchor="middle">${escXml(domainName)}</text>
</svg>`;
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
  domainName: string
): Promise<SocialAsset[]> {
  const assets: SocialAsset[] = [];
  const brandHash = hashString(domainName);

  for (const size of SOCIAL_SIZES) {
    const logoSize = Math.round(Math.min(size.w, size.h) * size.logoPct);

    let bgSvg: string;
    let logoGravity: sharp.Gravity | undefined = 'centre';
    let logoTop: number | undefined;
    let logoLeft: number | undefined;
    let addPadding = false;

    if (size.layout === 'profile-icon') {
      bgSvg = buildProfileBg(size.w, size.h, palette);
      addPadding = true;
    } else if (size.layout === 'og-image') {
      bgSvg = buildOgBg(size.w, size.h, palette, domainName, brandHash);
      // Position logo in the upper center area
      logoTop = Math.round(size.h * 0.08);
      logoLeft = Math.round((size.w - logoSize) / 2);
      logoGravity = undefined;
      addPadding = true;
    } else {
      // Banner
      bgSvg = selectBannerBg(size.w, size.h, palette, brandHash);
      const bgStyle = brandHash % 4;
      if (bgStyle === 2) {
        // Split layout: logo goes on the right side
        logoLeft = Math.round(size.w * 0.52);
        logoTop = Math.round((size.h - logoSize) / 2);
        logoGravity = undefined;
      } else {
        // Other styles: center the logo
        logoGravity = 'centre';
      }
    }

    // Render SVG background to PNG
    const bgBuffer = await sharp(Buffer.from(bgSvg))
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
