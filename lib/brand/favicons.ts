import sharp from 'sharp';
import pngToIco from 'png-to-ico';

export interface FaviconAsset {
  filename: string;
  buffer: Buffer;
}

const FAVICON_SIZES = [16, 32, 48, 64, 128, 180, 192, 512];

export async function generateFaviconPackage(logoPngBuffer: Buffer, domainName: string): Promise<FaviconAsset[]> {
  const assets: FaviconAsset[] = [];
  const pngBuffers: Record<number, Buffer> = {};

  for (const size of FAVICON_SIZES) {
    const buffer = await sharp(logoPngBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    pngBuffers[size] = buffer;
    assets.push({ filename: `favicon-${size}x${size}.png`, buffer });
  }

  const icoBuffer = await pngToIco([pngBuffers[16], pngBuffers[32], pngBuffers[48]]);
  assets.push({ filename: 'favicon.ico', buffer: icoBuffer });

  assets.push({ filename: 'apple-touch-icon.png', buffer: pngBuffers[180] });

  const manifest = {
    name: domainName,
    short_name: domainName,
    icons: FAVICON_SIZES.map(s => ({ src: `favicon-${s}x${s}.png`, sizes: `${s}x${s}`, type: 'image/png' })),
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone',
  };
  assets.push({ filename: 'site.webmanifest', buffer: Buffer.from(JSON.stringify(manifest, null, 2)) });

  return assets;
}
