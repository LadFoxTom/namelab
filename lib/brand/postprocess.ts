import { fal } from '@fal-ai/client';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Cache the embedded font for SVG text rendering (Sharp can't access system fonts)
let _fontBase64: string | null = null;
function getInterBoldBase64(): string {
  if (!_fontBase64) {
    const fontPath = path.join(process.cwd(), 'lib/brand/fonts/Inter-Bold.ttf');
    _fontBase64 = fs.readFileSync(fontPath).toString('base64');
  }
  return _fontBase64;
}

fal.config({ credentials: process.env.FAL_KEY! });

export async function removeBackground(imageUrl: string): Promise<string> {
  const result = await fal.subscribe('fal-ai/imageutils/rembg', {
    input: { image_url: imageUrl },
  }) as any;
  return result.data.image.url;
}

export async function upscaleImage(imageUrl: string): Promise<string> {
  const result = await fal.subscribe('fal-ai/esrgan', {
    input: {
      image_url: imageUrl,
      scale: 2,
    },
  }) as any;
  return result.data.image.url;
}

export async function downloadToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Convert any image buffer (JPEG, WebP, etc.) to PNG. Already-PNG buffers pass through. */
export async function ensurePng(buffer: Buffer): Promise<Buffer> {
  // Check PNG magic bytes
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return buffer;
  }
  return sharp(buffer).png().toBuffer();
}

export async function vectorizeToSvg(imageBuffer: Buffer): Promise<string> {
  const formData = new FormData();
  formData.append('image', new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }), 'logo.png');
  formData.append('output.file_format', 'svg');
  formData.append('output.svg.version', '1.1');
  formData.append('processing.max_colors', '8');

  const res = await fetch('https://vectorizer.ai/api/v1/vectorize', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.VECTORIZER_AI_API_ID}:${process.env.VECTORIZER_AI_API_SECRET}`
      ).toString('base64')}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vectorizer.AI failed: ${error}`);
  }

  return res.text();
}

/**
 * Remove white/near-white background pixels from a PNG buffer,
 * making them transparent. Uses a threshold to handle anti-aliased edges.
 */
export async function removeWhiteBackground(imageBuffer: Buffer, threshold = 240): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const total = width * height;
  const visited = new Uint8Array(total); // 0 = not visited

  // Helper: is pixel at index i "white-ish"?
  const isWhitish = (idx: number) => {
    const off = idx * 4;
    return pixels[off] >= threshold && pixels[off + 1] >= threshold && pixels[off + 2] >= threshold;
  };

  // Seed queue with all border pixels that are white
  const queue: number[] = [];
  for (let x = 0; x < width; x++) {
    // top row
    if (isWhitish(x)) { queue.push(x); visited[x] = 1; }
    // bottom row
    const b = (height - 1) * width + x;
    if (isWhitish(b)) { queue.push(b); visited[b] = 1; }
  }
  for (let y = 1; y < height - 1; y++) {
    // left col
    const l = y * width;
    if (isWhitish(l)) { queue.push(l); visited[l] = 1; }
    // right col
    const r = y * width + width - 1;
    if (isWhitish(r)) { queue.push(r); visited[r] = 1; }
  }

  // BFS flood fill from border
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % width, y = (idx - x) / width;
    const neighbors = [];
    if (x > 0) neighbors.push(idx - 1);
    if (x < width - 1) neighbors.push(idx + 1);
    if (y > 0) neighbors.push(idx - width);
    if (y < height - 1) neighbors.push(idx + width);
    for (const n of neighbors) {
      if (!visited[n] && isWhitish(n)) {
        visited[n] = 1;
        queue.push(n);
      }
    }
  }

  // Pass 1: Make visited (border-connected) white pixels transparent
  for (let i = 0; i < total; i++) {
    if (visited[i]) {
      const off = i * 4;
      const whiteness = Math.min(pixels[off], pixels[off + 1], pixels[off + 2]);
      const alpha = whiteness >= 250 ? 0 : Math.round((255 - whiteness) * 3);
      pixels[off + 3] = Math.min(pixels[off + 3], alpha);
    }
  }

  // Enclosed white pixels (not border-connected) are ALWAYS preserved.
  // They are part of the logo design (white fills, body colors, etc.)
  // and must stay opaque so the logo remains readable on any background.

  return sharp(Buffer.from(pixels.buffer), {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Render brand name text as a PNG buffer using embedded Inter Bold font */
async function renderBrandText(
  brandName: string,
  color: string,
  width: number,
  height: number,
  fontSize: number
): Promise<Buffer> {
  const fontB64 = getInterBoldBase64();
  const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <style>
      @font-face {
        font-family: 'InterBrand';
        src: url('data:font/truetype;base64,${fontB64}');
      }
    </style>
  </defs>
  <text x="${width / 2}" y="${height * 0.72}"
    font-family="InterBrand" font-size="${fontSize}" font-weight="700"
    fill="${color}" text-anchor="middle">${escXml(brandName)}</text>
</svg>`;

  return sharp(Buffer.from(textSvg)).resize(width, height).png().toBuffer();
}

/**
 * Composite a logo with brand name text below it.
 * Returns white background version.
 */
export async function compositeLogoWithText(
  logoPngBuffer: Buffer,
  brandName: string,
  primaryColor: string,
  darkColor: string,
  outputWidth = 2000
): Promise<Buffer> {
  const logoSize = Math.round(outputWidth * 0.5);
  const textHeight = Math.round(outputWidth * 0.12);
  const totalHeight = Math.round(logoSize + textHeight + outputWidth * 0.1);
  const fontSize = Math.round(outputWidth * 0.055);

  const resizedLogo = await sharp(logoPngBuffer)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  const textBuffer = await renderBrandText(brandName, darkColor, outputWidth, textHeight, fontSize);

  const logoLeft = Math.round((outputWidth - logoSize) / 2);
  const logoTop = Math.round(outputWidth * 0.04);
  const textTop = logoTop + logoSize + Math.round(outputWidth * 0.02);

  return sharp({
    create: { width: outputWidth, height: totalHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } }
  })
    .composite([
      { input: resizedLogo, top: logoTop, left: logoLeft },
      { input: textBuffer, top: textTop, left: 0 },
    ])
    .png()
    .toBuffer();
}

/**
 * Composite a logo with brand name text below it — transparent background.
 */
export async function compositeLogoWithTextTransparent(
  logoPngBuffer: Buffer,
  brandName: string,
  darkColor: string,
  outputWidth = 2000
): Promise<Buffer> {
  const logoSize = Math.round(outputWidth * 0.5);
  const textHeight = Math.round(outputWidth * 0.12);
  const totalHeight = Math.round(logoSize + textHeight + outputWidth * 0.1);
  const fontSize = Math.round(outputWidth * 0.055);

  // Use transparent-bg logo
  const transparentLogo = await removeWhiteBackground(logoPngBuffer);
  const resizedLogo = await sharp(transparentLogo)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const textBuffer = await renderBrandText(brandName, darkColor, outputWidth, textHeight, fontSize);

  const logoLeft = Math.round((outputWidth - logoSize) / 2);
  const logoTop = Math.round(outputWidth * 0.04);
  const textTop = logoTop + logoSize + Math.round(outputWidth * 0.02);

  return sharp({
    create: { width: outputWidth, height: totalHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([
      { input: resizedLogo, top: logoTop, left: logoLeft },
      { input: textBuffer, top: textTop, left: 0 },
    ])
    .png()
    .toBuffer();
}

/**
 * Generate a brand name text image (no logo).
 * Returns both white-bg and transparent-bg versions.
 */
export async function generateNameImages(
  brandName: string,
  darkColor: string,
  outputWidth = 2000
): Promise<{ nameWhiteBg: Buffer; nameTransparent: Buffer }> {
  const height = Math.round(outputWidth * 0.2);
  const fontSize = Math.round(outputWidth * 0.08);

  const textBuffer = await renderBrandText(brandName, darkColor, outputWidth, height, fontSize);

  // White background version
  const nameWhiteBg = await sharp({
    create: { width: outputWidth, height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } }
  })
    .composite([{ input: textBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();

  // Transparent background version (textBuffer already has transparent bg from SVG)
  return { nameWhiteBg, nameTransparent: textBuffer };
}

/**
 * Set all non-transparent pixels to white, preserving alpha.
 * For reversed/knockout logos on dark backgrounds.
 */
export async function colorizeToWhite(transparentPng: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(transparentPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  for (let i = 0; i < width * height; i++) {
    const off = i * 4;
    if (pixels[off + 3] > 0) {
      pixels[off] = 255;
      pixels[off + 1] = 255;
      pixels[off + 2] = 255;
    }
  }

  return sharp(Buffer.from(pixels.buffer), {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
}

/**
 * Set all non-transparent pixels to black, preserving alpha.
 * For B&W printing, fax, one-color applications.
 */
export async function colorizeToBlack(transparentPng: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(transparentPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  for (let i = 0; i < width * height; i++) {
    const off = i * 4;
    if (pixels[off + 3] > 0) {
      pixels[off] = 0;
      pixels[off + 1] = 0;
      pixels[off + 2] = 0;
    }
  }

  return sharp(Buffer.from(pixels.buffer), {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
}

/** Convert a PNG to grayscale. */
export async function toGrayscale(png: Buffer): Promise<Buffer> {
  return sharp(png).grayscale().png().toBuffer();
}

/**
 * Composite a transparent logo centered on a solid-color background.
 * For "logo on dark bg" and "logo on brand-color bg" previews.
 */
export async function compositeOnBackground(
  transparentPng: Buffer,
  bgColor: string,
  size = 2000
): Promise<Buffer> {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  const logoSize = Math.round(size * 0.6);
  const resized = await sharp(transparentPng)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const offset = Math.round((size - logoSize) / 2);

  return sharp({
    create: { width: size, height: size, channels: 4, background: { r, g, b, alpha: 255 } }
  })
    .composite([{ input: resized, top: offset, left: offset }])
    .png()
    .toBuffer();
}

export async function svgToHighResPng(svgString: string, size = 2000): Promise<Buffer> {
  // Strip white background rects from SVG so the PNG has true transparency.
  // Vectorizer.ai and other tools often add a full-size white rect as background.
  const cleaned = svgString.replace(
    /<rect[^>]*(?:fill\s*=\s*["'](?:#fff(?:fff)?|white|rgb\(255\s*,\s*255\s*,\s*255\))["'])[^>]*(?:width\s*=\s*["']100%["']|height\s*=\s*["']100%["'])[^>]*\/?\s*>/gi,
    ''
  );

  return sharp(Buffer.from(cleaned))
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}
