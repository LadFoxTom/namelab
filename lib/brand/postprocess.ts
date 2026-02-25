import { fal } from '@fal-ai/client';
import sharp from 'sharp';

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
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
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
export async function removeWhiteBackground(imageBuffer: Buffer, threshold = 245): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    if (r >= threshold && g >= threshold && b >= threshold) {
      // Fade alpha based on how white the pixel is (soft edge)
      const whiteness = Math.min(r, g, b);
      const alpha = whiteness >= 252 ? 0 : Math.round((255 - whiteness) * 3);
      pixels[i + 3] = Math.min(pixels[i + 3], alpha);
    }
  }

  return sharp(Buffer.from(pixels.buffer), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
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
