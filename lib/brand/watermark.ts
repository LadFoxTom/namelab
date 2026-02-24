import sharp from 'sharp';

export async function applyWatermark(imageBuffer: Buffer): Promise<Buffer> {
  const width = 400;
  const height = 400;

  const watermarkSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="rgba(255,255,255,0.45)"/>
      <text
        x="50%" y="50%"
        dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="18" font-weight="bold"
        fill="rgba(0,0,0,0.35)"
        transform="rotate(-35, ${width / 2}, ${height / 2})"
        letter-spacing="3"
      >SPARKDOMAIN PREVIEW</text>
      <text
        x="50%" y="65%"
        dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="12"
        fill="rgba(0,0,0,0.25)"
        transform="rotate(-35, ${width / 2}, ${height / 2})"
      >Not for commercial use</text>
    </svg>`;

  return sharp(imageBuffer)
    .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .composite([{ input: Buffer.from(watermarkSvg), blend: 'over' }])
    .png({ quality: 80 })
    .toBuffer();
}
