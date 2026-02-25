import { PDFDocument, rgb, PageSizes } from 'pdf-lib';
import fontkitModule from '@pdf-lib/fontkit';
import path from 'path';
import fs from 'fs';
import { BrandPalette } from './palette';
import { FontPairing } from './typography';
import { BrandSignals } from './signals';

// Helper: hex string to pdf-lib rgb (0-1 scale)
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  };
}

export async function generateBrandPdf(
  domainName: string,
  signals: BrandSignals,
  logoPngBuffer: Buffer,
  logoSvgString: string,
  palette: BrandPalette,
  fonts: FontPairing
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkitModule as any);

  // Load embedded fonts
  const fontDir = path.join(process.cwd(), 'lib/brand/fonts');
  const interRegularBytes = fs.readFileSync(path.join(fontDir, 'Inter-Regular.ttf'));
  const interBoldBytes = fs.readFileSync(path.join(fontDir, 'Inter-Bold.ttf'));
  const interLightBytes = fs.readFileSync(path.join(fontDir, 'Inter-Light.ttf'));

  const fontRegular = await pdfDoc.embedFont(interRegularBytes);
  const fontBold = await pdfDoc.embedFont(interBoldBytes);
  const fontLight = await pdfDoc.embedFont(interLightBytes);

  // Embed logo image
  const logoPng = await pdfDoc.embedPng(logoPngBuffer);

  const primary = hexToRgb(palette.primary);
  const dark = hexToRgb(palette.dark);
  const light = hexToRgb(palette.light);
  const secondary = hexToRgb(palette.secondary);
  const accent = hexToRgb(palette.accent);
  const white = { r: 1, g: 1, b: 1 };
  const black = { r: 0, g: 0, b: 0 };
  const lightGray = { r: 0.96, g: 0.96, b: 0.97 };

  // ─────────────────────────────────────────────────────────────
  // PAGE 1: Cover
  // ─────────────────────────────────────────────────────────────
  const page1 = pdfDoc.addPage(PageSizes.A4);
  const { width, height } = page1.getSize();

  // Background — split: top 60% brand color, bottom 40% white
  const splitY = height * 0.38;
  page1.drawRectangle({ x: 0, y: splitY, width, height: height - splitY, color: rgb(primary.r, primary.g, primary.b) });
  page1.drawRectangle({ x: 0, y: 0, width, height: splitY, color: rgb(1, 1, 1) });

  // Logo centered on the color section
  const logoSize = 160;
  const logoX = (width - logoSize) / 2;
  const logoY = splitY + (height - splitY - logoSize) / 2 + 20;

  // White card behind logo for contrast
  page1.drawRectangle({
    x: logoX - 24, y: logoY - 24,
    width: logoSize + 48, height: logoSize + 48,
    color: rgb(1, 1, 1),
  });
  page1.drawImage(logoPng, { x: logoX, y: logoY, width: logoSize, height: logoSize });

  // Brand name
  const brandTitle = domainName.charAt(0).toUpperCase() + domainName.slice(1);
  page1.drawText(brandTitle, {
    x: (width - fontBold.widthOfTextAtSize(brandTitle, 36)) / 2,
    y: splitY + 36,
    size: 36,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // Tagline
  const tagline = 'Brand Identity Guidelines';
  page1.drawText(tagline, {
    x: (width - fontLight.widthOfTextAtSize(tagline, 14)) / 2,
    y: splitY + 12,
    size: 14,
    font: fontLight,
    color: rgb(white.r, white.g, white.b),
    opacity: 0.8,
  });

  // Bottom section — domain + year
  page1.drawText(domainName, {
    x: 48, y: 32,
    size: 11, font: fontRegular,
    color: rgb(0.6, 0.6, 0.6),
  });
  page1.drawText(new Date().getFullYear().toString(), {
    x: width - 80, y: 32,
    size: 11, font: fontRegular,
    color: rgb(0.6, 0.6, 0.6),
  });

  // ─────────────────────────────────────────────────────────────
  // PAGE 2: Logo Usage
  // ─────────────────────────────────────────────────────────────
  const page2 = pdfDoc.addPage(PageSizes.A4);

  // Page header
  drawPageHeader(page2, 'Logo', fontBold, fontRegular, primary, width, height);

  // Section: Primary Logo — on white
  drawSectionLabel(page2, 'Primary — Light Background', fontBold, 48, height - 100, dark);

  const logoWhiteBg = height - 240;
  page2.drawRectangle({ x: 48, y: logoWhiteBg, width: width - 96, height: 120, color: rgb(lightGray.r, lightGray.g, lightGray.b) });
  const lgSize = 80;
  page2.drawImage(logoPng, { x: (width - lgSize) / 2, y: logoWhiteBg + 20, width: lgSize, height: lgSize });

  // Section: Primary Logo — on brand color
  drawSectionLabel(page2, 'Primary — Dark Background', fontBold, 48, height - 280, dark);

  const logoDarkBg = height - 420;
  page2.drawRectangle({ x: 48, y: logoDarkBg, width: width - 96, height: 120, color: rgb(dark.r, dark.g, dark.b) });
  page2.drawImage(logoPng, { x: (width - lgSize) / 2, y: logoDarkBg + 20, width: lgSize, height: lgSize });

  // Section: Clear space rule
  drawSectionLabel(page2, 'Clear Space', fontBold, 48, height - 460, dark);
  page2.drawText(
    'Always maintain a minimum clear space equal to the height of the "x" in the logotype around all sides of the logo.',
    { x: 48, y: height - 490, size: 10, font: fontRegular, color: rgb(0.4, 0.4, 0.4), maxWidth: width - 96 }
  );

  // Section: Minimum size
  drawSectionLabel(page2, 'Minimum Size', fontBold, 48, height - 545, dark);
  page2.drawText('Digital: 24px height minimum    Print: 8mm height minimum',
    { x: 48, y: height - 570, size: 10, font: fontRegular, color: rgb(0.4, 0.4, 0.4) }
  );

  // Section: Don'ts
  drawSectionLabel(page2, "Don'ts", fontBold, 48, height - 610, dark);
  const donts = [
    'Do not stretch or distort the logo',
    'Do not change the logo colors',
    'Do not add drop shadows or effects',
    'Do not place on busy backgrounds',
    'Do not rotate the logo',
  ];
  donts.forEach((dont, i) => {
    page2.drawText(`- ${dont}`, {
      x: 48, y: height - 635 - (i * 18),
      size: 10, font: fontRegular,
      color: rgb(0.7, 0.2, 0.2),
    });
  });

  drawPageFooter(page2, domainName, 'Logo Usage', fontLight, width);

  // ─────────────────────────────────────────────────────────────
  // PAGE 3: Color Palette
  // ─────────────────────────────────────────────────────────────
  const page3 = pdfDoc.addPage(PageSizes.A4);
  drawPageHeader(page3, 'Colors', fontBold, fontRegular, primary, width, height);

  const colorSwatches = [
    { label: 'Primary', hex: palette.primary, rgb: primary, textColor: palette.textOnPrimary === '#FFFFFF' ? white : black },
    { label: 'Secondary', hex: palette.secondary, rgb: secondary, textColor: white },
    { label: 'Accent', hex: palette.accent, rgb: accent, textColor: black },
    { label: 'Light', hex: palette.light, rgb: light, textColor: black },
    { label: 'Dark', hex: palette.dark, rgb: dark, textColor: white },
  ];

  const swatchWidth = (width - 96 - (colorSwatches.length - 1) * 12) / colorSwatches.length;
  const swatchHeight = 120;
  const swatchY = height - 220;

  colorSwatches.forEach((swatch, i) => {
    const x = 48 + i * (swatchWidth + 12);

    // Color block
    page3.drawRectangle({
      x, y: swatchY, width: swatchWidth, height: swatchHeight,
      color: rgb(swatch.rgb.r, swatch.rgb.g, swatch.rgb.b),
    });

    // Label inside swatch
    page3.drawText(swatch.label, {
      x: x + 10, y: swatchY + swatchHeight - 22,
      size: 10, font: fontBold,
      color: rgb(swatch.textColor.r, swatch.textColor.g, swatch.textColor.b),
    });

    // Hex below swatch
    page3.drawText(swatch.hex.toUpperCase(), {
      x: x + (swatchWidth - fontBold.widthOfTextAtSize(swatch.hex.toUpperCase(), 9)) / 2,
      y: swatchY - 16,
      size: 9, font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  // Color usage guidance
  drawSectionLabel(page3, 'Color Usage', fontBold, 48, height - 380, dark);

  const colorGuidance = [
    { color: 'Primary', use: 'Main brand color. Use for primary buttons, key headings, and brand elements.' },
    { color: 'Secondary', use: 'Supporting brand color. Use for backgrounds, hover states, and section dividers.' },
    { color: 'Accent', use: 'Highlight color. Use sparingly for CTAs, links, and attention elements.' },
    { color: 'Light', use: 'Background color. Use for page backgrounds and card surfaces.' },
    { color: 'Dark', use: 'Text color. Use for body text and high-contrast elements on light backgrounds.' },
  ];

  colorGuidance.forEach((item, i) => {
    const y = height - 410 - (i * 40);
    page3.drawRectangle({ x: 48, y: y - 4, width: 10, height: 10, color: rgb(primary.r, primary.g, primary.b) });
    page3.drawText(item.color, { x: 66, y, size: 11, font: fontBold, color: rgb(dark.r, dark.g, dark.b) });
    page3.drawText(item.use, { x: 66, y: y - 16, size: 9, font: fontRegular, color: rgb(0.45, 0.45, 0.45), maxWidth: width - 114 });
  });

  // CSS variables block
  drawSectionLabel(page3, 'CSS Variables', fontBold, 48, height - 620, dark);
  page3.drawRectangle({ x: 48, y: height - 790, width: width - 96, height: 150, color: rgb(0.12, 0.12, 0.14) });
  page3.drawText(palette.cssVars, {
    x: 64, y: height - 670,
    size: 8, font: fontRegular,
    color: rgb(0.7, 0.9, 0.7),
    maxWidth: width - 128,
    lineHeight: 14,
  });

  drawPageFooter(page3, domainName, 'Color Palette', fontLight, width);

  // ─────────────────────────────────────────────────────────────
  // PAGE 4: Typography
  // ─────────────────────────────────────────────────────────────
  const page4 = pdfDoc.addPage(PageSizes.A4);
  drawPageHeader(page4, 'Typography', fontBold, fontRegular, primary, width, height);

  // Heading font section
  drawSectionLabel(page4, `Heading Font - ${fonts.heading.name}`, fontBold, 48, height - 100, dark);

  const headingSizes = [
    { size: 32, label: 'H1 - 32px/2rem', weight: 'Bold' },
    { size: 24, label: 'H2 - 24px/1.5rem', weight: 'Bold' },
    { size: 20, label: 'H3 - 20px/1.25rem', weight: 'Medium' },
  ];

  let yPos = height - 140;
  headingSizes.forEach(({ size, label, weight }) => {
    page4.drawText(brandTitle, {
      x: 48, y: yPos,
      size, font: fontBold,
      color: rgb(dark.r, dark.g, dark.b),
    });
    page4.drawText(`${label} / ${weight}`, {
      x: width - 200, y: yPos + size / 2 - 5,
      size: 8, font: fontRegular,
      color: rgb(0.6, 0.6, 0.6),
    });
    yPos -= size + 20;
  });

  // Body font section
  const bodyY = yPos - 20;
  drawSectionLabel(page4, `Body Font - ${fonts.body.name}`, fontBold, 48, bodyY, dark);

  const sampleText = `The ${signals.industry} space is changing rapidly. ${brandTitle} is built for ${signals.targetAudience}.`;
  page4.drawText(sampleText, {
    x: 48, y: bodyY - 30,
    size: 13, font: fontRegular,
    color: rgb(dark.r, dark.g, dark.b),
    maxWidth: width - 96,
    lineHeight: 20,
  });
  page4.drawText('Regular / 13px body copy, 1.6 line height recommended', {
    x: 48, y: bodyY - 80,
    size: 8, font: fontLight,
    color: rgb(0.55, 0.55, 0.55),
  });

  // Font pairing rules
  const rulesY = bodyY - 120;
  drawSectionLabel(page4, 'Typography Rules', fontBold, 48, rulesY, dark);

  // Truncate Google Fonts URL to prevent overflow
  const fontsUrlDisplay = fonts.googleFontsUrl.length > 70
    ? fonts.googleFontsUrl.slice(0, 67) + '...'
    : fonts.googleFontsUrl;

  const typographyRules = [
    `Heading font (${fonts.heading.name}): Headlines, hero text, section titles, CTAs`,
    `Body font (${fonts.body.name}): Paragraphs, descriptions, UI labels, captions`,
    `Monospace (${fonts.mono.name}): Code samples, technical content, data display`,
    'Minimum body text size: 13px on screen, 9pt in print',
    'Maximum line length: 65-75 characters for optimal readability',
    `Google Fonts: ${fontsUrlDisplay}`,
  ];

  // Use dynamic Y tracking to prevent overlap when text wraps
  const maxTextWidth = width - 96;
  let currentY = rulesY - 24;
  typographyRules.forEach((rule) => {
    const text = `- ${rule}`;
    page4.drawText(text, {
      x: 48, y: currentY,
      size: 9, font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
      maxWidth: maxTextWidth,
    });
    // Estimate lines needed based on text width
    const textWidth = fontRegular.widthOfTextAtSize(text, 9);
    const lines = Math.ceil(textWidth / maxTextWidth);
    currentY -= lines * 14 + 4;
  });

  drawPageFooter(page4, domainName, 'Typography', fontLight, width);

  // ─────────────────────────────────────────────────────────────
  // PAGE 5: Brand Voice & Summary
  // ─────────────────────────────────────────────────────────────
  const page5 = pdfDoc.addPage(PageSizes.A4);
  drawPageHeader(page5, 'Brand Voice', fontBold, fontRegular, primary, width, height);

  // Brand personality
  drawSectionLabel(page5, 'Brand Personality', fontBold, 48, height - 100, dark);
  page5.drawText(signals.brandPersonality, {
    x: 48, y: height - 130,
    size: 16, font: fontBold,
    color: rgb(primary.r, primary.g, primary.b),
    maxWidth: width - 96,
  });

  // Tone of voice
  drawSectionLabel(page5, 'Tone of Voice', fontBold, 48, height - 190, dark);
  page5.drawText(`${signals.tone.charAt(0).toUpperCase() + signals.tone.slice(1)} / ${signals.subTone}`, {
    x: 48, y: height - 215,
    size: 12, font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Target audience
  drawSectionLabel(page5, 'Target Audience', fontBold, 48, height - 255, dark);
  page5.drawText(signals.targetAudience, {
    x: 48, y: height - 280,
    size: 12, font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
    maxWidth: width - 96,
  });

  // Avoid
  drawSectionLabel(page5, 'Brand Avoids', fontBold, 48, height - 330, dark);
  signals.avoidElements.forEach((avoid, i) => {
    page5.drawText(`- ${avoid}`, {
      x: 48, y: height - 355 - (i * 18),
      size: 10, font: fontRegular,
      color: rgb(0.6, 0.25, 0.25),
    });
  });

  // Quick reference card
  const cardY = height - 500;
  page5.drawRectangle({
    x: 48, y: cardY - 120, width: width - 96, height: 140,
    color: rgb(primary.r, primary.g, primary.b),
  });

  page5.drawText('Quick Reference', {
    x: 68, y: cardY + 2,
    size: 13, font: fontBold,
    color: rgb(1, 1, 1),
  });

  const refs = [
    `Primary Color: ${palette.primary.toUpperCase()}`,
    `Heading Font: ${fonts.heading.name}`,
    `Body Font: ${fonts.body.name}`,
    `Tone: ${signals.tone} / ${signals.subTone}`,
  ];
  refs.forEach((ref, i) => {
    page5.drawText(ref, {
      x: 68, y: cardY - 20 - (i * 20),
      size: 10, font: fontRegular,
      color: rgb(1, 1, 1),
      opacity: 0.9,
    });
  });

  // Generated by
  const genBy = 'Generated by Sparkdomain';
  page5.drawText(genBy, {
    x: (width - fontLight.widthOfTextAtSize(genBy, 9)) / 2,
    y: 32,
    size: 9, font: fontLight,
    color: rgb(0.65, 0.65, 0.65),
  });

  drawPageFooter(page5, domainName, 'Brand Voice', fontLight, width);

  // ─────────────────────────────────────────────────────────────
  // Finalize
  // ─────────────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ─── Helper functions ──────────────────────────────────────────

function drawPageHeader(
  page: any,
  title: string,
  fontBold: any,
  _fontRegular: any,
  primary: { r: number; g: number; b: number },
  width: number,
  height: number
) {
  page.drawRectangle({ x: 0, y: height - 56, width, height: 56, color: rgb(primary.r, primary.g, primary.b) });
  page.drawText(title, {
    x: 48, y: height - 36,
    size: 18, font: fontBold,
    color: rgb(1, 1, 1),
  });
}

function drawSectionLabel(
  page: any,
  label: string,
  fontBold: any,
  x: number,
  y: number,
  dark: { r: number; g: number; b: number }
) {
  page.drawText(label.toUpperCase(), {
    x, y,
    size: 9, font: fontBold,
    color: rgb(dark.r, dark.g, dark.b),
    opacity: 0.5,
  });
  page.drawLine({
    start: { x, y: y - 6 },
    end: { x: x + 120, y: y - 6 },
    thickness: 0.5,
    color: rgb(dark.r, dark.g, dark.b),
    opacity: 0.2,
  });
}

function drawPageFooter(page: any, domainName: string, sectionName: string, fontLight: any, width: number) {
  page.drawText(`${domainName}  /  ${sectionName}`, {
    x: 48, y: 20,
    size: 8, font: fontLight,
    color: rgb(0.65, 0.65, 0.65),
  });
  page.drawText('sparkdomain.xyz', {
    x: width - 100, y: 20,
    size: 8, font: fontLight,
    color: rgb(0.65, 0.65, 0.65),
  });
}
