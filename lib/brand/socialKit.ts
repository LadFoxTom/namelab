import sharp from 'sharp';

export interface SocialAsset {
  platform: string;
  filename: string;
  width: number;
  height: number;
  buffer: Buffer;
}

const SOCIAL_SIZES: Array<{ platform: string; filename: string; w: number; h: number; logoPct: number }> = [
  { platform: 'Instagram Profile',  filename: 'instagram-profile.png',   w: 320,  h: 320,  logoPct: 0.7 },
  { platform: 'Instagram Post',     filename: 'instagram-post.png',       w: 1080, h: 1080, logoPct: 0.5 },
  { platform: 'Instagram Story',    filename: 'instagram-story.png',      w: 1080, h: 1920, logoPct: 0.3 },
  { platform: 'X Profile',          filename: 'x-profile.png',            w: 400,  h: 400,  logoPct: 0.7 },
  { platform: 'X Banner',           filename: 'x-banner.png',             w: 1500, h: 500,  logoPct: 0.2 },
  { platform: 'LinkedIn Profile',   filename: 'linkedin-profile.png',     w: 400,  h: 400,  logoPct: 0.7 },
  { platform: 'LinkedIn Cover',     filename: 'linkedin-cover.png',       w: 1584, h: 396,  logoPct: 0.2 },
  { platform: 'Facebook Profile',   filename: 'facebook-profile.png',     w: 196,  h: 196,  logoPct: 0.7 },
  { platform: 'Facebook Cover',     filename: 'facebook-cover.png',       w: 820,  h: 312,  logoPct: 0.25 },
  { platform: 'YouTube Channel Art',filename: 'youtube-channel-art.png',  w: 2560, h: 1440, logoPct: 0.15 },
  { platform: 'YouTube Profile',    filename: 'youtube-profile.png',      w: 800,  h: 800,  logoPct: 0.7 },
  { platform: 'TikTok Profile',     filename: 'tiktok-profile.png',       w: 200,  h: 200,  logoPct: 0.7 },
  { platform: 'Pinterest Profile',  filename: 'pinterest-profile.png',    w: 165,  h: 165,  logoPct: 0.7 },
  { platform: 'Email Signature',    filename: 'email-signature.png',      w: 300,  h: 100,  logoPct: 0.5 },
  { platform: 'App Icon (iOS)',     filename: 'app-icon-ios.png',         w: 1024, h: 1024, logoPct: 0.65 },
  { platform: 'App Icon (Android)', filename: 'app-icon-android.png',     w: 512,  h: 512,  logoPct: 0.65 },
  { platform: 'Open Graph',         filename: 'og-image.png',             w: 1200, h: 630,  logoPct: 0.35 },
  { platform: 'Letterhead Logo',    filename: 'letterhead-logo.png',      w: 600,  h: 200,  logoPct: 0.5 },
  { platform: 'Business Card',      filename: 'business-card.png',        w: 1050, h: 600,  logoPct: 0.4 },
  { platform: 'Slack / Discord',    filename: 'chat-avatar.png',          w: 512,  h: 512,  logoPct: 0.7 },
];

export async function generateSocialKit(
  logoPngBuffer: Buffer,
  primaryColor: string
): Promise<SocialAsset[]> {
  const assets: SocialAsset[] = [];

  for (const size of SOCIAL_SIZES) {
    const logoSize = Math.round(Math.min(size.w, size.h) * size.logoPct);

    const resizedLogo = await sharp(logoPngBuffer)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const hexColor = primaryColor.replace('#', '');
    const r = parseInt(hexColor.slice(0, 2), 16);
    const g = parseInt(hexColor.slice(2, 4), 16);
    const b = parseInt(hexColor.slice(4, 6), 16);

    const buffer = await sharp({
      create: { width: size.w, height: size.h, channels: 4, background: { r, g, b, alpha: 255 } }
    })
      .composite([{ input: resizedLogo, gravity: 'centre' }])
      .png()
      .toBuffer();

    assets.push({ platform: size.platform, filename: size.filename, width: size.w, height: size.h, buffer });
  }

  return assets;
}
