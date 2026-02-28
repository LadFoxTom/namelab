import sharp from 'sharp';
import { textToPathElement } from './textRenderer';

export async function applyWatermark(imageBuffer: Buffer): Promise<Buffer> {
  const width = 400;
  const height = 400;

  // Build rotated text paths using opentype.js (avoids system font dependency)
  const mainText = textToPathElement('SPARKDOMAIN PREVIEW', width / 2, height / 2, 18, 'rgba(0,0,0,0.35)', { weight: 'bold', anchor: 'middle' });
  const subText = textToPathElement('Not for commercial use', width / 2, height * 0.65, 12, 'rgba(0,0,0,0.25)', { weight: 'regular', anchor: 'middle' });

  const watermarkSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="rgba(255,255,255,0.45)"/>
      <g transform="rotate(-35, ${width / 2}, ${height / 2})">
        ${mainText}
        ${subText}
      </g>
    </svg>`;

  return sharp(imageBuffer)
    .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .composite([{ input: Buffer.from(watermarkSvg), blend: 'over' }])
    .png({ quality: 80 })
    .toBuffer();
}
