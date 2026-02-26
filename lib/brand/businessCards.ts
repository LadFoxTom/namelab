import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkitModule from '@pdf-lib/fontkit';
import { BrandPalette } from './palette';
import { DesignBrief } from './strategist';

export interface BusinessCardAsset {
  filename: string;
  buffer: Buffer;
}

// Business card dimensions: 3.5" × 2" at 300dpi = 1050 × 600 px
const CARD_W = 1050;
const CARD_H = 600;

// PDF points: 3.5" × 2" = 252 × 144 pt
const PDF_W = 252;
const PDF_H = 144;

let _fontBase64: string | null = null;
function getInterBoldBase64(): string {
  if (!_fontBase64) {
    const fontPath = path.join(process.cwd(), 'lib/brand/fonts/Inter-Bold.ttf');
    _fontBase64 = fs.readFileSync(fontPath).toString('base64');
  }
  return _fontBase64;
}

let _fontRegularBase64: string | null = null;
function getInterRegularBase64(): string {
  if (!_fontRegularBase64) {
    const fontPath = path.join(process.cwd(), 'lib/brand/fonts/Inter-Regular.ttf');
    _fontRegularBase64 = fs.readFileSync(fontPath).toString('base64');
  }
  return _fontRegularBase64;
}

function hexToRgbValues(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function hexLuminance(hex: string): number {
  const { r, g, b } = hexToRgbValues(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function getVisualPrimary(palette: BrandPalette): string {
  const lum = hexLuminance(palette.primary);
  if (lum > 0.85) return palette.accent && hexLuminance(palette.accent) < 0.8 ? palette.accent : palette.dark;
  if (lum < 0.05) return palette.accent && hexLuminance(palette.accent) > 0.1 ? palette.accent : palette.dark;
  return palette.primary;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function generateBusinessCards(
  logoPngBuffer: Buffer,
  palette: BrandPalette,
  domainName: string,
  brief?: DesignBrief
): Promise<BusinessCardAsset[]> {
  const brandName = brief?.brandName || domainName.charAt(0).toUpperCase() + domainName.slice(1);
  const visPrimary = getVisualPrimary(palette);
  const assets: BusinessCardAsset[] = [];

  // ── PNG Front ─────────────────────────────────────────────────────────────
  const frontPng = await generateFrontPng(logoPngBuffer, palette, visPrimary, brandName, domainName);
  assets.push({ filename: 'business-card-front.png', buffer: frontPng });

  // ── PNG Back ──────────────────────────────────────────────────────────────
  const backPng = await generateBackPng(logoPngBuffer, palette, visPrimary);
  assets.push({ filename: 'business-card-back.png', buffer: backPng });

  // ── PDF Front ─────────────────────────────────────────────────────────────
  const frontPdf = await generateFrontPdf(logoPngBuffer, palette, visPrimary, brandName, domainName);
  assets.push({ filename: 'business-card-front.pdf', buffer: frontPdf });

  // ── PDF Back ──────────────────────────────────────────────────────────────
  const backPdf = await generateBackPdf(logoPngBuffer, palette, visPrimary);
  assets.push({ filename: 'business-card-back.pdf', buffer: backPdf });

  // ── Print specs README ────────────────────────────────────────────────────
  const readme = `# Business Card Print Specifications

## Trim Size
3.5" × 2" (88.9mm × 50.8mm) — Standard US business card

## Bleed
Add 3mm (0.125") bleed on all sides when printing.
Final file with bleed: 3.75" × 2.25" (95.25mm × 57.15mm)

## Safe Zone
Keep all important content at least 3mm (0.125") from the trim edge.

## Resolution
300 DPI — print-ready

## Recommended Paper
- Weight: 350-400 gsm (14-16pt)
- Finish: Matte or Soft-Touch Matte for premium feel
- Alternative: Silk or Uncoated for a natural look

## Colors
- Primary: ${palette.primary}
- Dark: ${palette.dark}
- Accent: ${palette.accent}

## Files Included
- business-card-front.png — Front design (1050×600px at 300dpi)
- business-card-back.png — Back design (1050×600px at 300dpi)
- business-card-front.pdf — Vector PDF for print
- business-card-back.pdf — Vector PDF for print

## Notes
- Replace placeholder contact information with your actual details
- Ensure your printer supports the specified bleed area
- Request a physical proof before full print run
`;
  assets.push({ filename: 'README-print-specs.md', buffer: Buffer.from(readme) });

  return assets;
}

// ── PNG generators ────────────────────────────────────────────────────────────

async function generateFrontPng(
  logoPngBuffer: Buffer, palette: BrandPalette,
  visPrimary: string, brandName: string, domainName: string
): Promise<Buffer> {
  const boldBase64 = getInterBoldBase64();
  const regularBase64 = getInterRegularBase64();

  // White background with accent bar on left
  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}">
  <rect width="${CARD_W}" height="${CARD_H}" fill="white"/>
  <rect x="0" y="0" width="8" height="${CARD_H}" fill="${visPrimary}"/>
</svg>`;

  const bgBuffer = await sharp(Buffer.from(bgSvg)).png().toBuffer();

  // Logo: small, top-left area
  const logoSize = 80;
  const resizedLogo = await sharp(logoPngBuffer)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  // Text overlay: brand name + placeholder contact info
  const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}">
  <defs>
    <style>
      @font-face { font-family: "InterBold"; src: url(data:font/truetype;base64,${boldBase64}); }
      @font-face { font-family: "InterRegular"; src: url(data:font/truetype;base64,${regularBase64}); }
    </style>
  </defs>
  <text x="40" y="190" font-family="InterBold" font-size="28" font-weight="700" fill="${palette.dark}">${escapeXml(brandName)}</text>
  <text x="40" y="260" font-family="InterRegular" font-size="16" fill="#6B7280">Your Name</text>
  <text x="40" y="290" font-family="InterRegular" font-size="14" fill="#9CA3AF">Job Title</text>
  <text x="40" y="350" font-family="InterRegular" font-size="14" fill="#6B7280">hello@${escapeXml(domainName)}.com</text>
  <text x="40" y="380" font-family="InterRegular" font-size="14" fill="#6B7280">+1 (555) 000-0000</text>
  <text x="40" y="410" font-family="InterRegular" font-size="14" fill="#6B7280">${escapeXml(domainName)}.com</text>
</svg>`;

  // Pre-render the text SVG to PNG first — Sharp can't resolve @font-face data URIs
  // in SVG overlays, so we rasterize the SVG to a PNG buffer, then composite the PNG.
  const textPng = await sharp(Buffer.from(textSvg))
    .resize(CARD_W, CARD_H)
    .png()
    .toBuffer();

  return sharp(bgBuffer)
    .composite([
      { input: resizedLogo, top: 60, left: 40 },
      { input: textPng, top: 0, left: 0 },
    ])
    .png()
    .toBuffer();
}

async function generateBackPng(
  logoPngBuffer: Buffer, palette: BrandPalette, visPrimary: string
): Promise<Buffer> {
  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}">
  <rect width="${CARD_W}" height="${CARD_H}" fill="${visPrimary}"/>
</svg>`;

  const bgBuffer = await sharp(Buffer.from(bgSvg)).png().toBuffer();

  const logoSize = 140;
  const resizedLogo = await sharp(logoPngBuffer)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp(bgBuffer)
    .composite([{ input: resizedLogo, gravity: 'centre' }])
    .png()
    .toBuffer();
}

// ── PDF generators ────────────────────────────────────────────────────────────

async function generateFrontPdf(
  logoPngBuffer: Buffer, palette: BrandPalette,
  visPrimary: string, brandName: string, domainName: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkitModule as any);

  const fontDir = path.join(process.cwd(), 'lib/brand/fonts');
  const fontBold = await pdfDoc.embedFont(fs.readFileSync(path.join(fontDir, 'Inter-Bold.ttf')));
  const fontRegular = await pdfDoc.embedFont(fs.readFileSync(path.join(fontDir, 'Inter-Regular.ttf')));
  const logoPng = await pdfDoc.embedPng(logoPngBuffer);

  const page = pdfDoc.addPage([PDF_W, PDF_H]);
  const dark = hexToRgbValues(palette.dark);
  const primary = hexToRgbValues(visPrimary);

  // White background
  page.drawRectangle({ x: 0, y: 0, width: PDF_W, height: PDF_H, color: rgb(1, 1, 1) });

  // Accent bar on left
  page.drawRectangle({ x: 0, y: 0, width: 2, height: PDF_H, color: rgb(primary.r / 255, primary.g / 255, primary.b / 255) });

  // Logo
  const logoScale = 18;
  const logoRatio = logoPng.width / logoPng.height;
  page.drawImage(logoPng, { x: 12, y: PDF_H - 12 - logoScale, width: logoScale * logoRatio, height: logoScale });

  // Brand name
  page.drawText(brandName, { x: 12, y: PDF_H - 48, size: 8, font: fontBold, color: rgb(dark.r / 255, dark.g / 255, dark.b / 255) });

  // Contact info
  const gray = rgb(0.42, 0.45, 0.50);
  const lightGray = rgb(0.61, 0.64, 0.66);
  page.drawText('Your Name', { x: 12, y: PDF_H - 66, size: 5, font: fontRegular, color: gray });
  page.drawText('Job Title', { x: 12, y: PDF_H - 76, size: 4.5, font: fontRegular, color: lightGray });
  page.drawText(`hello@${domainName}.com`, { x: 12, y: PDF_H - 92, size: 4.5, font: fontRegular, color: gray });
  page.drawText('+1 (555) 000-0000', { x: 12, y: PDF_H - 102, size: 4.5, font: fontRegular, color: gray });
  page.drawText(`${domainName}.com`, { x: 12, y: PDF_H - 112, size: 4.5, font: fontRegular, color: gray });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

async function generateBackPdf(
  logoPngBuffer: Buffer, palette: BrandPalette, visPrimary: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkitModule as any);
  const logoPng = await pdfDoc.embedPng(logoPngBuffer);

  const page = pdfDoc.addPage([PDF_W, PDF_H]);
  const primary = hexToRgbValues(visPrimary);

  // Solid primary background
  page.drawRectangle({
    x: 0, y: 0, width: PDF_W, height: PDF_H,
    color: rgb(primary.r / 255, primary.g / 255, primary.b / 255),
  });

  // Centered logo
  const logoScale = 32;
  const logoRatio = logoPng.width / logoPng.height;
  const logoW = logoScale * logoRatio;
  page.drawImage(logoPng, {
    x: (PDF_W - logoW) / 2,
    y: (PDF_H - logoScale) / 2,
    width: logoW,
    height: logoScale,
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
