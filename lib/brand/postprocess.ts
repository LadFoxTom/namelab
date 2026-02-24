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

export async function svgToHighResPng(svgString: string, size = 2000): Promise<Buffer> {
  return sharp(Buffer.from(svgString))
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}
