import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkitModule from '@pdf-lib/fontkit';
import { BrandPalette } from './palette';
import { DesignBrief } from './strategist';
import { buildTextSvg } from './textRenderer';

export interface LetterheadAsset {
  filename: string;
  buffer: Buffer;
}

// US Letter at 300dpi: 8.5" × 11" = 2550 × 3300 px
const LH_W = 2550;
const LH_H = 3300;

// PDF US Letter in points: 612 × 792 pt
const PDF_LH_W = 612;
const PDF_LH_H = 792;

// No. 10 Envelope: 9.5" × 4.125" = 684 × 297 pt
const ENV_W = 684;
const ENV_H = 297;

function hexToRgbValues(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
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

export async function generateLetterhead(
  logoPngBuffer: Buffer,
  palette: BrandPalette,
  domainName: string,
  brief?: DesignBrief
): Promise<LetterheadAsset[]> {
  const brandName = brief?.brandName || domainName.charAt(0).toUpperCase() + domainName.slice(1);
  const visPrimary = getVisualPrimary(palette);
  const accent = hexToRgbValues(visPrimary);
  const assets: LetterheadAsset[] = [];

  // ── Letterhead PNG ─────────────────────────────────────────────────────────
  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LH_W}" height="${LH_H}">
  <rect width="${LH_W}" height="${LH_H}" fill="white"/>
  <rect x="0" y="0" width="${LH_W}" height="20" fill="${visPrimary}"/>
  <line x1="150" y1="3100" x2="2400" y2="3100" stroke="${visPrimary}" stroke-width="2" opacity="0.3"/>
</svg>`;

  const bgBuffer = await sharp(Buffer.from(bgSvg)).png().toBuffer();

  const logoSize = 180;
  const resizedLogo = await sharp(logoPngBuffer)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  // Text overlay using opentype.js path rendering (no @font-face needed)
  const textSvg = buildTextSvg(LH_W, LH_H, [
    { text: brandName, x: 360, y: 190, fontSize: 56, color: palette.dark, weight: 'bold' },
    { text: `${domainName}.com`, x: 150, y: 3160, fontSize: 28, color: '#9CA3AF', weight: 'regular' },
    { text: `hello@${domainName}.com`, x: 2400, y: 3160, fontSize: 28, color: '#9CA3AF', weight: 'regular', anchor: 'end' },
  ]);

  const textPng = await sharp(Buffer.from(textSvg)).resize(LH_W, LH_H).png().toBuffer();

  const letterheadPng = await sharp(bgBuffer)
    .composite([
      { input: resizedLogo, top: 100, left: 150 },
      { input: textPng, top: 0, left: 0 },
    ])
    .png()
    .toBuffer();

  assets.push({ filename: 'letterhead.png', buffer: letterheadPng });

  // ── Letterhead PDF ─────────────────────────────────────────────────────────
  const lhPdf = await PDFDocument.create();
  lhPdf.registerFontkit(fontkitModule as any);

  const fontDir = path.join(process.cwd(), 'lib/brand/fonts');
  const fontBold = await lhPdf.embedFont(fs.readFileSync(path.join(fontDir, 'Inter-Bold.ttf')));
  const fontRegular = await lhPdf.embedFont(fs.readFileSync(path.join(fontDir, 'Inter-Regular.ttf')));
  const logoPdf = await lhPdf.embedPng(logoPngBuffer);

  const lhPage = lhPdf.addPage([PDF_LH_W, PDF_LH_H]);
  const accentNorm = { r: accent.r / 255, g: accent.g / 255, b: accent.b / 255 };
  const darkNorm = hexToRgbValues(palette.dark);

  // White background
  lhPage.drawRectangle({ x: 0, y: 0, width: PDF_LH_W, height: PDF_LH_H, color: rgb(1, 1, 1) });
  // Accent line at top
  lhPage.drawRectangle({ x: 0, y: PDF_LH_H - 5, width: PDF_LH_W, height: 5, color: rgb(accentNorm.r, accentNorm.g, accentNorm.b) });
  // Logo top-left
  const logoScale = 40;
  const logoRatio = logoPdf.width / logoPdf.height;
  lhPage.drawImage(logoPdf, { x: 48, y: PDF_LH_H - 60, width: logoScale * logoRatio, height: logoScale });
  // Brand name
  lhPage.drawText(brandName, { x: 48 + logoScale * logoRatio + 12, y: PDF_LH_H - 46, size: 14, font: fontBold, color: rgb(darkNorm.r / 255, darkNorm.g / 255, darkNorm.b / 255) });
  // Footer
  lhPage.drawRectangle({ x: 48, y: 42, width: PDF_LH_W - 96, height: 0.5, color: rgb(accentNorm.r, accentNorm.g, accentNorm.b), opacity: 0.3 });
  lhPage.drawText(`${domainName}.com`, { x: 48, y: 28, size: 8, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
  lhPage.drawText(`hello@${domainName}.com`, { x: PDF_LH_W - 150, y: 28, size: 8, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });

  const lhBytes = await lhPdf.save();
  assets.push({ filename: 'letterhead.pdf', buffer: Buffer.from(lhBytes) });

  // ── Envelope PDF (No. 10) ──────────────────────────────────────────────────
  const envPdf = await PDFDocument.create();
  envPdf.registerFontkit(fontkitModule as any);

  const envFontBold = await envPdf.embedFont(fs.readFileSync(path.join(fontDir, 'Inter-Bold.ttf')));
  const envFontRegular = await envPdf.embedFont(fs.readFileSync(path.join(fontDir, 'Inter-Regular.ttf')));
  const envLogo = await envPdf.embedPng(logoPngBuffer);

  const envPage = envPdf.addPage([ENV_W, ENV_H]);

  // White background
  envPage.drawRectangle({ x: 0, y: 0, width: ENV_W, height: ENV_H, color: rgb(1, 1, 1) });
  // Accent line at top
  envPage.drawRectangle({ x: 0, y: ENV_H - 3, width: ENV_W, height: 3, color: rgb(accentNorm.r, accentNorm.g, accentNorm.b) });
  // Logo top-left
  const envLogoSize = 24;
  const envLogoRatio = envLogo.width / envLogo.height;
  envPage.drawImage(envLogo, { x: 28, y: ENV_H - 38, width: envLogoSize * envLogoRatio, height: envLogoSize });
  // Brand name + return address
  envPage.drawText(brandName, { x: 28 + envLogoSize * envLogoRatio + 8, y: ENV_H - 28, size: 8, font: envFontBold, color: rgb(darkNorm.r / 255, darkNorm.g / 255, darkNorm.b / 255) });
  envPage.drawText(`${domainName}.com`, { x: 28 + envLogoSize * envLogoRatio + 8, y: ENV_H - 40, size: 6, font: envFontRegular, color: rgb(0.5, 0.5, 0.5) });

  const envBytes = await envPdf.save();
  assets.push({ filename: 'envelope-no10.pdf', buffer: Buffer.from(envBytes) });

  return assets;
}
