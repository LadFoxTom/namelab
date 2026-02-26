import { PDFDocument, rgb, PageSizes } from 'pdf-lib';
import fontkitModule from '@pdf-lib/fontkit';
import path from 'path';
import fs from 'fs';
import { BrandPalette } from './palette';
import { BrandSignals } from './signals';
import { TypeSystem } from './typographer';
import { ColorSystem } from './colorist';
import { DesignBrief } from './strategist';
import { FontPairing } from './typography';
import { QAReport } from './critic';

// ── Types ───────────────────────────────────────────────────────────────────

type RGB = { r: number; g: number; b: number };

interface PdfContext {
  pdfDoc: any;
  fontRegular: any;
  fontBold: any;
  fontLight: any;
  logoPng: any;
  width: number;
  height: number;
  brandTitle: string;
  domainName: string;
  primary: RGB;
  dark: RGB;
  light: RGB;
  accent: RGB;
  secondary: RGB;
  white: RGB;
  lightGray: RGB;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  };
}

function c(color: RGB) { return rgb(color.r, color.g, color.b); }

function hexToRgbStr(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}`;
}

function hexToCmykStr(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return '0 / 0 / 0 / 100';
  return `${Math.round(((1 - r - k) / (1 - k)) * 100)} / ${Math.round(((1 - g - k) / (1 - k)) * 100)} / ${Math.round(((1 - b - k) / (1 - k)) * 100)} / ${Math.round(k * 100)}`;
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, fontSize) > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Main export ─────────────────────────────────────────────────────────────

export async function generateBrandPdf(
  domainName: string,
  signals: BrandSignals,
  logoPngBuffer: Buffer,
  logoSvgString: string,
  palette: BrandPalette,
  fonts: FontPairing,
  brief?: DesignBrief,
  typeSystem?: TypeSystem,
  colorSystem?: ColorSystem,
  qaReport?: QAReport
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkitModule as any);

  const fontDir = path.join(process.cwd(), 'lib/brand/fonts');
  const fontRegular = await pdfDoc.embedFont(fs.readFileSync(path.join(fontDir, 'Inter-Regular.ttf')));
  const fontBold = await pdfDoc.embedFont(fs.readFileSync(path.join(fontDir, 'Inter-Bold.ttf')));
  const fontLight = await pdfDoc.embedFont(fs.readFileSync(path.join(fontDir, 'Inter-Light.ttf')));
  const logoPng = await pdfDoc.embedPng(logoPngBuffer);

  const page1 = pdfDoc.addPage(PageSizes.A4);
  const { width, height } = page1.getSize();

  const ctx: PdfContext = {
    pdfDoc, fontRegular, fontBold, fontLight, logoPng,
    width, height,
    brandTitle: domainName.charAt(0).toUpperCase() + domainName.slice(1),
    domainName,
    primary: hexToRgb(palette.primary),
    dark: hexToRgb(palette.dark),
    light: hexToRgb(palette.light),
    accent: hexToRgb(palette.accent),
    secondary: hexToRgb(palette.secondary),
    white: { r: 1, g: 1, b: 1 },
    lightGray: { r: 0.96, g: 0.96, b: 0.97 },
  };

  // Use the actual fonts from typeSystem when available
  const useFonts = typeSystem || fonts;

  drawCoverPage(page1, ctx, brief);
  drawTocPage(ctx, brief, !!qaReport);
  drawBrandOverviewPage(ctx, signals, brief);
  drawLogoSystemPage(ctx);
  drawColorPalettePage(ctx, palette, colorSystem);
  drawTypographyPage(ctx, useFonts, signals, brief, typeSystem);
  drawApplicationsPage(ctx, palette);
  drawDosDontsPage(ctx, palette, brief);
  if (qaReport) {
    drawQualityReportPage(ctx, qaReport);
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ── Page helpers ────────────────────────────────────────────────────────────

function drawPageHeader(page: any, ctx: PdfContext, title: string, pageNum: number) {
  // Brand-colored header bar
  page.drawRectangle({ x: 0, y: ctx.height - 56, width: ctx.width, height: 56, color: c(ctx.primary) });
  page.drawText(title, { x: 48, y: ctx.height - 38, size: 16, font: ctx.fontBold, color: c(ctx.white) });
  // Page number
  const numStr = `0${pageNum}`;
  page.drawText(numStr, { x: ctx.width - 60, y: ctx.height - 38, size: 14, font: ctx.fontLight, color: c(ctx.white), opacity: 0.6 });
}

function drawPageFooter(page: any, ctx: PdfContext, sectionName: string) {
  page.drawLine({ start: { x: 48, y: 36 }, end: { x: ctx.width - 48, y: 36 }, thickness: 0.5, color: c(ctx.dark), opacity: 0.1 });
  page.drawText(`${ctx.domainName}  /  ${sectionName}`, { x: 48, y: 20, size: 7, font: ctx.fontLight, color: rgb(0.55, 0.55, 0.55) });
  page.drawText('sparkdomain.xyz', { x: ctx.width - 100, y: 20, size: 7, font: ctx.fontLight, color: rgb(0.55, 0.55, 0.55) });
}

function drawSectionLabel(page: any, ctx: PdfContext, label: string, x: number, y: number) {
  page.drawText(label.toUpperCase(), { x, y, size: 8, font: ctx.fontBold, color: c(ctx.primary), opacity: 0.7 });
  page.drawLine({ start: { x, y: y - 5 }, end: { x: x + 100, y: y - 5 }, thickness: 1.5, color: c(ctx.primary), opacity: 0.3 });
}

// ── Page 1: Cover ───────────────────────────────────────────────────────────

function drawCoverPage(page: any, ctx: PdfContext, brief?: DesignBrief) {
  const { width, height } = ctx;

  // Full primary background
  page.drawRectangle({ x: 0, y: 0, width, height, color: c(ctx.primary) });

  // Subtle grid texture
  for (let i = 0; i <= 20; i++) {
    page.drawLine({ start: { x: (i * width) / 20, y: 0 }, end: { x: (i * width) / 20, y: height }, thickness: 0.3, color: c(ctx.white), opacity: 0.04 });
    page.drawLine({ start: { x: 0, y: (i * height) / 20 }, end: { x: width, y: (i * height) / 20 }, thickness: 0.3, color: c(ctx.white), opacity: 0.04 });
  }

  // White card for logo
  const cardW = 200;
  const cardH = 200;
  const cardX = (width - cardW) / 2;
  const cardY = height / 2 + 30;
  page.drawRectangle({ x: cardX, y: cardY, width: cardW, height: cardH, color: c(ctx.white) });
  const logoSize = 150;
  page.drawImage(ctx.logoPng, { x: cardX + (cardW - logoSize) / 2, y: cardY + (cardH - logoSize) / 2, width: logoSize, height: logoSize });

  // Brand name — large
  const titleSize = 42;
  const titleW = ctx.fontBold.widthOfTextAtSize(ctx.brandTitle, titleSize);
  page.drawText(ctx.brandTitle, { x: (width - titleW) / 2, y: cardY - 50, size: titleSize, font: ctx.fontBold, color: c(ctx.white) });

  // Subtitle
  const subtitle = 'Brand Identity Guidelines';
  const subW = ctx.fontLight.widthOfTextAtSize(subtitle, 14);
  page.drawText(subtitle, { x: (width - subW) / 2, y: cardY - 75, size: 14, font: ctx.fontLight, color: c(ctx.white), opacity: 0.7 });

  // Tagline from brief
  if (brief?.tagline) {
    const tagW = ctx.fontRegular.widthOfTextAtSize(brief.tagline, 11);
    page.drawText(brief.tagline, { x: (width - tagW) / 2, y: cardY - 100, size: 11, font: ctx.fontRegular, color: c(ctx.white), opacity: 0.5 });
  }

  // Bottom info
  page.drawText(ctx.domainName, { x: 48, y: 32, size: 9, font: ctx.fontRegular, color: c(ctx.white), opacity: 0.5 });
  const year = new Date().getFullYear().toString();
  page.drawText(`v1.0  /  ${year}`, { x: width - 100, y: 32, size: 9, font: ctx.fontRegular, color: c(ctx.white), opacity: 0.5 });

  // Confidential notice
  const confText = 'Confidential — For internal use only';
  const confW = ctx.fontLight.widthOfTextAtSize(confText, 8);
  page.drawText(confText, { x: (width - confW) / 2, y: 50, size: 8, font: ctx.fontLight, color: c(ctx.white), opacity: 0.3 });
}

// ── Page 2: Table of Contents ───────────────────────────────────────────────

function drawTocPage(ctx: PdfContext, brief?: DesignBrief, hasQa?: boolean) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;

  page.drawRectangle({ x: 0, y: 0, width, height, color: c(ctx.white) });

  // Header accent bar (thin)
  page.drawRectangle({ x: 0, y: height - 4, width, height: 4, color: c(ctx.primary) });

  page.drawText('Contents', { x: 48, y: height - 80, size: 32, font: ctx.fontBold, color: c(ctx.dark) });

  const sections = [
    { num: '01', title: 'Brand Overview', desc: 'Mission, pillars, and personality' },
    { num: '02', title: 'Logo System', desc: 'Usage, clear space, and restrictions' },
    { num: '03', title: 'Color Palette', desc: 'Primary, secondary, and functional colors' },
    { num: '04', title: 'Typography', desc: 'Type system, scale, and pairing' },
    { num: '05', title: 'Applications', desc: 'Business card and letterhead' },
    { num: '06', title: "Do's & Don'ts", desc: 'Usage guidelines' },
    ...(hasQa ? [{ num: '07', title: 'Quality Report', desc: 'Automated QA scores and checks' }] : []),
  ];

  let y = height - 150;
  sections.forEach((s) => {
    // Number
    page.drawText(s.num, { x: 48, y, size: 24, font: ctx.fontBold, color: c(ctx.primary), opacity: 0.3 });
    // Title
    page.drawText(s.title, { x: 100, y: y + 2, size: 14, font: ctx.fontBold, color: c(ctx.dark) });
    // Description
    page.drawText(s.desc, { x: 100, y: y - 16, size: 9, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
    // Divider
    page.drawLine({ start: { x: 48, y: y - 28 }, end: { x: width - 48, y: y - 28 }, thickness: 0.5, color: c(ctx.dark), opacity: 0.08 });
    y -= 70;
  });

  // Brief summary at bottom if available
  if (brief) {
    const summaryY = 160;
    page.drawRectangle({ x: 48, y: summaryY - 80, width: width - 96, height: 100, color: c(ctx.lightGray) });
    page.drawText('Brand at a Glance', { x: 68, y: summaryY, size: 10, font: ctx.fontBold, color: c(ctx.dark) });

    const glanceItems = [
      `Sector: ${brief.sectorClassification}`,
      `Direction: ${brief.aestheticDirection}`,
      `Tension: ${brief.tensionPair}`,
    ];
    glanceItems.forEach((item, i) => {
      page.drawText(item, { x: 68, y: summaryY - 18 - (i * 16), size: 9, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
    });
  }

  drawPageFooter(page, ctx, 'Contents');
}

// ── Page 3: Brand Overview ──────────────────────────────────────────────────

function drawBrandOverviewPage(ctx: PdfContext, signals: BrandSignals, brief?: DesignBrief) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Brand Overview', 1);

  let y = height - 90;

  // Mission / Tagline
  drawSectionLabel(page, ctx, 'Brand Positioning', 48, y);
  y -= 24;
  if (brief?.tagline) {
    page.drawText(`"${brief.tagline}"`, { x: 48, y, size: 18, font: ctx.fontBold, color: c(ctx.primary), maxWidth: width - 96 });
    y -= 30;
  }
  if (brief?.tensionPair) {
    page.drawText(`Brand tension: ${brief.tensionPair}`, { x: 48, y, size: 11, font: ctx.fontRegular, color: rgb(0.35, 0.35, 0.35) });
    y -= 14;
  }
  if (brief?.aestheticDirection) {
    page.drawText(`Aesthetic: ${brief.aestheticDirection}`, { x: 48, y, size: 11, font: ctx.fontRegular, color: rgb(0.35, 0.35, 0.35) });
    y -= 14;
  }

  // Brand Pillars
  y -= 20;
  drawSectionLabel(page, ctx, 'Brand Pillars', 48, y);
  y -= 20;

  const pillars = brief?.brandPillars ?? [
    { name: 'Quality', description: 'Commitment to excellence in every detail' },
    { name: 'Innovation', description: 'Pushing boundaries in the industry' },
    { name: 'Trust', description: 'Building lasting relationships' },
  ];

  const pillarW = (width - 96 - (pillars.length - 1) * 16) / Math.min(pillars.length, 3);
  pillars.slice(0, 3).forEach((pillar, i) => {
    const px = 48 + i * (pillarW + 16);

    // Card
    page.drawRectangle({ x: px, y: y - 75, width: pillarW, height: 80, color: c(ctx.lightGray) });
    // Accent top bar
    page.drawRectangle({ x: px, y: y + 2, width: pillarW, height: 3, color: c(ctx.primary) });
    // Name
    page.drawText(pillar.name, { x: px + 12, y: y - 14, size: 11, font: ctx.fontBold, color: c(ctx.dark) });
    // Description
    const descLines = wrapText(pillar.description, ctx.fontRegular, 8, pillarW - 24);
    descLines.forEach((line, li) => {
      page.drawText(line, { x: px + 12, y: y - 32 - (li * 12), size: 8, font: ctx.fontRegular, color: rgb(0.45, 0.45, 0.45) });
    });
  });

  y -= 120;

  // Personality Traits
  drawSectionLabel(page, ctx, 'Brand Personality', 48, y);
  y -= 22;

  const traits = brief?.personalityTraits ?? [
    { trait: signals.tone, counterbalance: signals.subTone || 'balanced' },
  ];

  traits.slice(0, 4).forEach((t, i) => {
    const traitY = y - (i * 36);
    // Trait pill
    page.drawRectangle({ x: 48, y: traitY - 6, width: 180, height: 22, color: c(ctx.lightGray) });
    page.drawText(t.trait, { x: 58, y: traitY, size: 10, font: ctx.fontBold, color: c(ctx.primary) });
    // Arrow
    page.drawText('  ←→  ', { x: 238, y: traitY, size: 10, font: ctx.fontRegular, color: rgb(0.6, 0.6, 0.6) });
    // Counterbalance pill
    page.drawRectangle({ x: 290, y: traitY - 6, width: 180, height: 22, color: c(ctx.lightGray) });
    page.drawText(t.counterbalance, { x: 300, y: traitY, size: 10, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
  });

  y -= traits.length * 36 + 20;

  // Target Audience
  drawSectionLabel(page, ctx, 'Target Audience', 48, y);
  y -= 20;
  const audienceText = brief?.targetAudienceSummary || signals.targetAudience;
  const audienceLines = wrapText(audienceText, ctx.fontRegular, 11, width - 96);
  audienceLines.forEach((line, i) => {
    page.drawText(line, { x: 48, y: y - (i * 16), size: 11, font: ctx.fontRegular, color: rgb(0.3, 0.3, 0.3) });
  });

  y -= audienceLines.length * 16 + 24;

  // Memorable Anchor
  if (brief?.memorableAnchor) {
    drawSectionLabel(page, ctx, 'Memorable Anchor', 48, y);
    y -= 20;
    page.drawText(brief.memorableAnchor, { x: 48, y, size: 11, font: ctx.fontRegular, color: rgb(0.3, 0.3, 0.3), maxWidth: width - 96 });
  }

  drawPageFooter(page, ctx, 'Brand Overview');
}

// ── Page 4: Logo System ─────────────────────────────────────────────────────

function drawLogoSystemPage(ctx: PdfContext) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Logo System', 2);

  let y = height - 90;

  // Primary Logo — Light Background
  drawSectionLabel(page, ctx, 'Primary Logo — Light Background', 48, y);
  y -= 10;
  page.drawRectangle({ x: 48, y: y - 110, width: width - 96, height: 110, color: c(ctx.lightGray) });
  const lgSize = 80;
  page.drawImage(ctx.logoPng, { x: (width - lgSize) / 2, y: y - 95, width: lgSize, height: lgSize });
  y -= 130;

  // Primary Logo — Dark Background
  drawSectionLabel(page, ctx, 'Primary Logo — Dark Background', 48, y);
  y -= 10;
  page.drawRectangle({ x: 48, y: y - 110, width: width - 96, height: 110, color: c(ctx.dark) });
  page.drawImage(ctx.logoPng, { x: (width - lgSize) / 2, y: y - 95, width: lgSize, height: lgSize });
  y -= 130;

  // Primary Logo — Brand Color Background
  drawSectionLabel(page, ctx, 'Primary Logo — Brand Color', 48, y);
  y -= 10;
  page.drawRectangle({ x: 48, y: y - 110, width: width - 96, height: 110, color: c(ctx.primary) });
  page.drawImage(ctx.logoPng, { x: (width - lgSize) / 2, y: y - 95, width: lgSize, height: lgSize });
  y -= 130;

  // Clear Space Rule
  drawSectionLabel(page, ctx, 'Clear Space', 48, y);
  y -= 20;
  page.drawText('Maintain a minimum clear space equal to the height of one distinctive element', { x: 48, y, size: 9, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4), maxWidth: width - 96 });
  page.drawText('in the mark (unit "X") around all sides of the logo.', { x: 48, y: y - 14, size: 9, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4), maxWidth: width - 96 });
  y -= 36;

  // Minimum Size
  drawSectionLabel(page, ctx, 'Minimum Size', 48, y);
  y -= 20;
  page.drawText('Digital: 32px wide minimum  /  Print: 20mm wide minimum', { x: 48, y, size: 9, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
  page.drawText('Below 32px, use the monogram-only variant for legibility.', { x: 48, y: y - 14, size: 9, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });

  drawPageFooter(page, ctx, 'Logo System');
}

// ── Page 5: Color Palette ───────────────────────────────────────────────────

function drawColorPalettePage(ctx: PdfContext, palette: BrandPalette, colorSystem?: ColorSystem) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Color Palette', 3);

  let y = height - 90;

  // Brand Colors — large swatches with multi-format specs
  drawSectionLabel(page, ctx, 'Brand Colors', 48, y);
  y -= 14;

  const swatches = [
    { label: 'Primary', hex: palette.primary },
    { label: 'Secondary', hex: palette.secondary },
    { label: 'Accent', hex: palette.accent },
    { label: 'Light', hex: palette.light },
    { label: 'Dark', hex: palette.dark },
  ];

  const swatchW = (width - 96 - (swatches.length - 1) * 8) / swatches.length;
  const swatchH = 90;

  swatches.forEach((swatch, i) => {
    const sx = 48 + i * (swatchW + 8);
    const swatchRgb = hexToRgb(swatch.hex);
    const isDark = (swatchRgb.r * 0.299 + swatchRgb.g * 0.587 + swatchRgb.b * 0.114) < 0.5;
    const textColor = isDark ? ctx.white : { r: 0.1, g: 0.1, b: 0.1 };

    // Swatch block
    page.drawRectangle({ x: sx, y: y - swatchH, width: swatchW, height: swatchH, color: c(swatchRgb) });
    // Label inside
    page.drawText(swatch.label, { x: sx + 8, y: y - 18, size: 8, font: ctx.fontBold, color: c(textColor) });

    // Color specs below swatch
    const specY = y - swatchH - 12;
    page.drawText(swatch.hex.toUpperCase(), { x: sx, y: specY, size: 7, font: ctx.fontBold, color: c(ctx.dark) });
    page.drawText(`RGB: ${hexToRgbStr(swatch.hex)}`, { x: sx, y: specY - 12, size: 6, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
    page.drawText(`CMYK: ${hexToCmykStr(swatch.hex)}`, { x: sx, y: specY - 22, size: 6, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
  });

  y -= swatchH + 50;

  // Functional Colors (if colorSystem available)
  if (colorSystem) {
    drawSectionLabel(page, ctx, 'Functional Colors', 48, y);
    y -= 14;

    const funcColors = [
      { label: 'Success', hex: colorSystem.functional.success.hex },
      { label: 'Warning', hex: colorSystem.functional.warning.hex },
      { label: 'Error', hex: colorSystem.functional.error.hex },
      { label: 'Info', hex: colorSystem.functional.info.hex },
    ];

    funcColors.forEach((fc, i) => {
      const fx = 48 + i * 120;
      const fRgb = hexToRgb(fc.hex);
      page.drawRectangle({ x: fx, y: y - 36, width: 100, height: 36, color: c(fRgb) });
      const fIsDark = (fRgb.r * 0.299 + fRgb.g * 0.587 + fRgb.b * 0.114) < 0.5;
      page.drawText(fc.label, { x: fx + 8, y: y - 16, size: 8, font: ctx.fontBold, color: fIsDark ? c(ctx.white) : rgb(0.1, 0.1, 0.1) });
      page.drawText(fc.hex, { x: fx + 8, y: y - 28, size: 7, font: ctx.fontRegular, color: fIsDark ? c(ctx.white) : rgb(0.1, 0.1, 0.1), opacity: 0.7 });
    });

    y -= 60;
  }

  // Color Usage Proportions
  drawSectionLabel(page, ctx, 'Color Usage Ratio', 48, y);
  y -= 16;

  const proportions = colorSystem?.proportions ?? { background: 60, surface: 20, foreground: 10, accent: 10 };
  const barW = width - 96;
  const barH = 28;

  // Proportion bar
  const bgW = barW * proportions.background / 100;
  const sfW = barW * proportions.surface / 100;
  const fgW = barW * proportions.foreground / 100;
  const acW = barW * proportions.accent / 100;

  page.drawRectangle({ x: 48, y: y - barH, width: bgW, height: barH, color: c(ctx.light) });
  page.drawRectangle({ x: 48 + bgW, y: y - barH, width: sfW, height: barH, color: c(ctx.secondary) });
  page.drawRectangle({ x: 48 + bgW + sfW, y: y - barH, width: fgW, height: barH, color: c(ctx.dark) });
  page.drawRectangle({ x: 48 + bgW + sfW + fgW, y: y - barH, width: acW, height: barH, color: c(ctx.primary) });

  y -= barH + 10;
  page.drawText(`Background ${proportions.background}%   Surface ${proportions.surface}%   Foreground ${proportions.foreground}%   Accent ${proportions.accent}%`, {
    x: 48, y, size: 7, font: ctx.fontRegular, color: rgb(0.45, 0.45, 0.45),
  });

  y -= 28;

  // Accessibility (if colorSystem available)
  if (colorSystem && colorSystem.accessibility.length > 0) {
    drawSectionLabel(page, ctx, 'Accessibility (WCAG)', 48, y);
    y -= 16;

    colorSystem.accessibility.forEach((check, i) => {
      const checkY = y - (i * 16);
      const pass = check.aaPass;
      page.drawRectangle({ x: 48, y: checkY - 4, width: 8, height: 8, color: pass ? rgb(0.13, 0.77, 0.37) : rgb(0.94, 0.27, 0.27) });
      page.drawText(`${check.pair}: ${check.ratio}:1 — ${pass ? 'AA Pass' : 'AA Fail'}${check.aaaPass ? ' / AAA Pass' : ''}`, {
        x: 64, y: checkY, size: 8, font: ctx.fontRegular, color: rgb(0.35, 0.35, 0.35),
      });
    });
    y -= colorSystem.accessibility.length * 16 + 14;
  }

  // CSS Variables
  drawSectionLabel(page, ctx, 'CSS Variables', 48, y);
  y -= 10;
  const codeH = 120;
  page.drawRectangle({ x: 48, y: y - codeH, width: width - 96, height: codeH, color: rgb(0.09, 0.09, 0.11) });
  page.drawText(palette.cssVars, { x: 60, y: y - 16, size: 7, font: ctx.fontRegular, color: rgb(0.65, 0.85, 0.65), maxWidth: width - 120, lineHeight: 12 });

  drawPageFooter(page, ctx, 'Color Palette');
}

// ── Page 6: Typography ──────────────────────────────────────────────────────

function drawTypographyPage(ctx: PdfContext, fonts: FontPairing, signals: BrandSignals, brief?: DesignBrief, typeSystem?: TypeSystem) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Typography', 4);

  let y = height - 90;

  // Display Font
  drawSectionLabel(page, ctx, `Display Font — ${fonts.heading.name}`, 48, y);
  y -= 24;

  // Specimen — brand name at different sizes (using embedded Inter as visual proxy)
  const headingSizes = [
    { size: 36, label: 'Display' },
    { size: 28, label: 'H1' },
    { size: 22, label: 'H2' },
    { size: 16, label: 'H3' },
  ];
  headingSizes.forEach(({ size, label }) => {
    page.drawText(ctx.brandTitle, { x: 48, y, size, font: ctx.fontBold, color: c(ctx.dark) });
    page.drawText(label, { x: width - 80, y: y + 4, size: 8, font: ctx.fontLight, color: rgb(0.55, 0.55, 0.55) });
    y -= size + 12;
  });

  y -= 10;

  // Body Font
  drawSectionLabel(page, ctx, `Body Font — ${fonts.body.name}`, 48, y);
  y -= 22;
  const sampleText = brief
    ? `${ctx.brandTitle} operates in the ${brief.sectorClassification} space. The brand embodies the tension of being "${brief.tensionPair}" — balancing precision with personality.`
    : `The ${signals.industry} space is changing rapidly. ${ctx.brandTitle} is built for ${signals.targetAudience}. Every detail matters.`;
  page.drawText(sampleText, { x: 48, y, size: 11, font: ctx.fontRegular, color: c(ctx.dark), maxWidth: width - 96, lineHeight: 17 });
  y -= 56;

  // Monospace Font
  drawSectionLabel(page, ctx, `Monospace Font — ${fonts.mono.name}`, 48, y);
  y -= 22;
  page.drawRectangle({ x: 48, y: y - 30, width: width - 96, height: 36, color: rgb(0.09, 0.09, 0.11) });
  page.drawText(`const brand = "${ctx.domainName}";  // v1.0`, { x: 60, y: y - 14, size: 9, font: ctx.fontRegular, color: rgb(0.65, 0.85, 0.65) });
  y -= 50;

  // Type Scale Table (if typeSystem available)
  if (typeSystem) {
    drawSectionLabel(page, ctx, `Type Scale — ${typeSystem.scaleRatioName} (${typeSystem.scaleRatio})`, 48, y);
    y -= 18;

    // Table header
    page.drawRectangle({ x: 48, y: y - 14, width: width - 96, height: 18, color: c(ctx.lightGray) });
    const cols = [48, 120, 220, 290, 350, 420];
    const headers = ['Level', 'Font', 'Weight', 'Size', 'Leading', 'Tracking'];
    headers.forEach((h, i) => {
      page.drawText(h, { x: cols[i] + 4, y: y - 8, size: 7, font: ctx.fontBold, color: c(ctx.dark) });
    });
    y -= 18;

    // Table rows
    typeSystem.typeScale.forEach((level) => {
      page.drawText(level.name, { x: cols[0] + 4, y: y - 10, size: 7, font: ctx.fontBold, color: c(ctx.dark) });
      page.drawText(level.font, { x: cols[1] + 4, y: y - 10, size: 7, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(level.weight, { x: cols[2] + 4, y: y - 10, size: 7, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(`${level.sizePt}pt`, { x: cols[3] + 4, y: y - 10, size: 7, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(`${level.leadingPt}pt`, { x: cols[4] + 4, y: y - 10, size: 7, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(level.tracking, { x: cols[5] + 4, y: y - 10, size: 7, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
      page.drawLine({ start: { x: 48, y: y - 16 }, end: { x: width - 48, y: y - 16 }, thickness: 0.3, color: c(ctx.dark), opacity: 0.08 });
      y -= 18;
    });

    y -= 10;
  }

  // Pairing Rationale
  if (typeSystem?.pairingRationale) {
    drawSectionLabel(page, ctx, 'Pairing Rationale', 48, y);
    y -= 18;
    const rationaleLines = wrapText(typeSystem.pairingRationale, ctx.fontRegular, 8, width - 96);
    rationaleLines.forEach((line) => {
      page.drawText(line, { x: 48, y, size: 8, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
      y -= 12;
    });
  }

  // Google Fonts URL
  y -= 8;
  const fontsUrl = fonts.googleFontsUrl.length > 80 ? fonts.googleFontsUrl.slice(0, 77) + '...' : fonts.googleFontsUrl;
  page.drawText(`Google Fonts: ${fontsUrl}`, { x: 48, y, size: 7, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5), maxWidth: width - 96 });

  drawPageFooter(page, ctx, 'Typography');
}

// ── Page 7: Applications ────────────────────────────────────────────────────

function drawApplicationsPage(ctx: PdfContext, palette: BrandPalette) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Applications', 5);

  let y = height - 90;

  // Business Card — Front
  drawSectionLabel(page, ctx, 'Business Card — Front', 48, y);
  y -= 14;

  const cardW = 250;
  const cardH = 150;
  const cardX = (width - cardW) / 2;

  // Card front
  page.drawRectangle({ x: cardX, y: y - cardH, width: cardW, height: cardH, color: c(ctx.white) });
  page.drawRectangle({ x: cardX, y: y - cardH, width: cardW, height: cardH, borderColor: c(ctx.dark), borderWidth: 0.5 });
  // Accent stripe
  page.drawRectangle({ x: cardX, y: y - 4, width: cardW, height: 4, color: c(ctx.primary) });
  // Logo on card
  const cardLogoSize = 40;
  page.drawImage(ctx.logoPng, { x: cardX + 20, y: y - 60, width: cardLogoSize, height: cardLogoSize });
  // Text
  page.drawText(ctx.brandTitle, { x: cardX + 20, y: y - 80, size: 12, font: ctx.fontBold, color: c(ctx.dark) });
  page.drawText('Your Name  /  Title', { x: cardX + 20, y: y - 95, size: 8, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
  page.drawText(`hello@${ctx.domainName}.com`, { x: cardX + 20, y: y - 110, size: 7, font: ctx.fontRegular, color: c(ctx.primary) });
  page.drawText(`${ctx.domainName}.com`, { x: cardX + 20, y: y - 122, size: 7, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });

  y -= cardH + 30;

  // Business Card — Back
  drawSectionLabel(page, ctx, 'Business Card — Back', 48, y);
  y -= 14;

  page.drawRectangle({ x: cardX, y: y - cardH, width: cardW, height: cardH, color: c(ctx.primary) });
  const backLogoSize = 60;
  page.drawImage(ctx.logoPng, { x: cardX + (cardW - backLogoSize) / 2, y: y - cardH + (cardH - backLogoSize) / 2, width: backLogoSize, height: backLogoSize });

  y -= cardH + 30;

  // Letterhead
  drawSectionLabel(page, ctx, 'Letterhead', 48, y);
  y -= 14;

  const lhW = width - 160;
  const lhH = 180;
  const lhX = 80;

  page.drawRectangle({ x: lhX, y: y - lhH, width: lhW, height: lhH, color: c(ctx.white) });
  page.drawRectangle({ x: lhX, y: y - lhH, width: lhW, height: lhH, borderColor: c(ctx.dark), borderWidth: 0.3 });
  // Accent top bar
  page.drawRectangle({ x: lhX, y: y - 3, width: lhW, height: 3, color: c(ctx.primary) });
  // Logo
  page.drawImage(ctx.logoPng, { x: lhX + 16, y: y - 40, width: 30, height: 30 });
  // Sample text lines
  for (let i = 0; i < 6; i++) {
    const lw = i === 0 ? lhW * 0.5 : lhW * (0.6 + Math.random() * 0.3);
    page.drawRectangle({ x: lhX + 16, y: y - 65 - (i * 14), width: Math.min(lw, lhW - 32), height: 6, color: c(ctx.dark), opacity: 0.08 });
  }
  // Footer line
  page.drawLine({ start: { x: lhX + 16, y: y - lhH + 20 }, end: { x: lhX + lhW - 16, y: y - lhH + 20 }, thickness: 0.3, color: c(ctx.primary), opacity: 0.5 });
  page.drawText(`${ctx.domainName}.com`, { x: lhX + 16, y: y - lhH + 10, size: 6, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });

  drawPageFooter(page, ctx, 'Applications');
}

// ── Page 8: Do's & Don'ts ───────────────────────────────────────────────────

function drawDosDontsPage(ctx: PdfContext, palette: BrandPalette, brief?: DesignBrief) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, "Do's & Don'ts", 6);

  let y = height - 90;

  // Do's
  drawSectionLabel(page, ctx, "Do's", 48, y);
  y -= 18;

  const dos = [
    'Use the logo on clean, uncluttered backgrounds',
    'Maintain the minimum clear space around the logo',
    'Use the approved color palette consistently',
    'Follow the type hierarchy for all communications',
    `Use ${palette.primary.toUpperCase()} as the primary brand accent`,
    'Reference these guidelines for all brand applications',
  ];

  dos.forEach((d) => {
    page.drawRectangle({ x: 48, y: y - 4, width: 8, height: 8, color: rgb(0.13, 0.77, 0.37) });
    page.drawText(d, { x: 66, y, size: 9, font: ctx.fontRegular, color: rgb(0.25, 0.25, 0.25), maxWidth: width - 120 });
    y -= 22;
  });

  y -= 16;

  // Don'ts
  drawSectionLabel(page, ctx, "Don'ts", 48, y);
  y -= 18;

  const donts = [
    'Do not stretch, distort, or rotate the logo',
    'Do not change the logo colors or add effects',
    'Do not place the logo on busy or low-contrast backgrounds',
    'Do not use colors outside the approved palette for brand materials',
    'Do not use unauthorized typefaces for brand communications',
    'Do not reduce the logo below the minimum size specification',
    'Do not add drop shadows, borders, or outlines to the logo',
    'Do not recreate or redraw the logo — always use the provided files',
  ];

  donts.forEach((d) => {
    page.drawRectangle({ x: 48, y: y - 4, width: 8, height: 8, color: rgb(0.94, 0.27, 0.27) });
    page.drawText(d, { x: 66, y, size: 9, font: ctx.fontRegular, color: rgb(0.25, 0.25, 0.25), maxWidth: width - 120 });
    y -= 22;
  });

  y -= 24;

  // Quick Reference Card
  const cardH = 120;
  page.drawRectangle({ x: 48, y: y - cardH, width: width - 96, height: cardH, color: c(ctx.primary) });
  // Accent bar
  page.drawRectangle({ x: 48, y: y, width: width - 96, height: 3, color: c(ctx.accent) });

  page.drawText('Quick Reference', { x: 68, y: y - 20, size: 12, font: ctx.fontBold, color: c(ctx.white) });

  const refs = [
    `Primary Color: ${palette.primary.toUpperCase()}  /  Accent: ${palette.accent.toUpperCase()}`,
    `Display Font: ${ctx.fontBold ? 'See Typography section' : 'Inter'}`,
    brief ? `Direction: ${brief.aestheticDirection}  /  Tension: ${brief.tensionPair}` : `Domain: ${ctx.domainName}`,
    'Generated by Sparkdomain  /  sparkdomain.xyz',
  ];
  refs.forEach((ref, i) => {
    page.drawText(ref, { x: 68, y: y - 40 - (i * 18), size: 9, font: ctx.fontRegular, color: c(ctx.white), opacity: 0.85 });
  });

  drawPageFooter(page, ctx, "Do's & Don'ts");
}

// ── Page 9: Quality Report ─────────────────────────────────────────────────

function drawQualityReportPage(ctx: PdfContext, qaReport: QAReport) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Quality Report', 7);

  let y = height - 90;

  // Verdict banner
  const verdictColor = qaReport.verdict === 'approve'
    ? rgb(0.13, 0.77, 0.37)
    : qaReport.verdict === 'approve_with_warnings'
    ? rgb(0.95, 0.65, 0.1)
    : rgb(0.94, 0.27, 0.27);
  const verdictLabel = qaReport.verdict === 'approve'
    ? 'APPROVED'
    : qaReport.verdict === 'approve_with_warnings'
    ? 'APPROVED WITH WARNINGS'
    : 'FLAGGED FOR REVIEW';

  page.drawRectangle({ x: 48, y: y - 36, width: width - 96, height: 40, color: verdictColor, opacity: 0.1 });
  page.drawRectangle({ x: 48, y: y, width: 4, height: 4, color: verdictColor });
  page.drawText(verdictLabel, { x: 68, y: y - 6, size: 14, font: ctx.fontBold, color: verdictColor });
  page.drawText(qaReport.summary, { x: 68, y: y - 24, size: 8, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4), maxWidth: width - 140 });
  y -= 60;

  // Score cards
  drawSectionLabel(page, ctx, 'Quality Scores', 48, y);
  y -= 18;

  const scoreItems = [
    { label: 'Brief Alignment', score: qaReport.scores.briefAlignment },
    { label: 'Internal Consistency', score: qaReport.scores.internalConsistency },
    { label: 'Differentiation', score: qaReport.scores.differentiation },
    { label: 'Technical Quality', score: qaReport.scores.technicalQuality },
    { label: 'Overall', score: qaReport.scores.overall },
  ];

  const scoreCardW = (width - 96 - 4 * 8) / 5;
  scoreItems.forEach((item, i) => {
    const sx = 48 + i * (scoreCardW + 8);
    const isOverall = item.label === 'Overall';

    // Card background
    page.drawRectangle({ x: sx, y: y - 60, width: scoreCardW, height: 64, color: isOverall ? c(ctx.primary) : c(ctx.lightGray) });

    // Score number
    const scoreStr = `${item.score}`;
    const scoreColor = isOverall ? ctx.white : item.score >= 8 ? { r: 0.13, g: 0.77, b: 0.37 } : item.score >= 5 ? { r: 0.95, g: 0.65, b: 0.1 } : { r: 0.94, g: 0.27, b: 0.27 };
    page.drawText(scoreStr, { x: sx + scoreCardW / 2 - 8, y: y - 30, size: 24, font: ctx.fontBold, color: c(scoreColor) });
    page.drawText('/10', { x: sx + scoreCardW / 2 + 8, y: y - 26, size: 9, font: ctx.fontLight, color: isOverall ? c(ctx.white) : rgb(0.5, 0.5, 0.5), opacity: 0.6 });

    // Label
    const labelColor = isOverall ? ctx.white : ctx.dark;
    page.drawText(item.label, { x: sx + 6, y: y - 52, size: 7, font: ctx.fontBold, color: c(labelColor), opacity: isOverall ? 0.9 : 0.7 });
  });

  y -= 82;

  // Issues
  if (qaReport.issues.length > 0) {
    drawSectionLabel(page, ctx, `Issues (${qaReport.issues.length})`, 48, y);
    y -= 16;

    qaReport.issues.slice(0, 8).forEach((issue) => {
      const sevColor = issue.severity === 'blocking'
        ? rgb(0.94, 0.27, 0.27)
        : issue.severity === 'warning'
        ? rgb(0.95, 0.65, 0.1)
        : rgb(0.4, 0.6, 0.9);

      page.drawRectangle({ x: 48, y: y - 4, width: 8, height: 8, color: sevColor });
      page.drawText(`[${issue.severity}]`, { x: 62, y, size: 7, font: ctx.fontBold, color: sevColor });
      page.drawText(`${issue.category}: ${issue.description}`, { x: 110, y, size: 7, font: ctx.fontRegular, color: rgb(0.3, 0.3, 0.3), maxWidth: width - 165 });
      y -= 18;
    });

    if (qaReport.issues.length > 8) {
      page.drawText(`+ ${qaReport.issues.length - 8} more issue(s)`, { x: 62, y, size: 7, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
      y -= 18;
    }
  }

  y -= 10;

  // Auto-fixes applied
  if (qaReport.fixes.length > 0) {
    drawSectionLabel(page, ctx, `Auto-Fixes Applied (${qaReport.fixes.length})`, 48, y);
    y -= 16;

    qaReport.fixes.forEach((fix) => {
      page.drawRectangle({ x: 48, y: y - 4, width: 8, height: 8, color: rgb(0.13, 0.77, 0.37) });
      page.drawText(fix.description, { x: 62, y, size: 7, font: ctx.fontRegular, color: rgb(0.3, 0.3, 0.3), maxWidth: width - 120 });
      y -= 14;
      page.drawText(`${fix.before} → ${fix.after}`, { x: 62, y, size: 7, font: ctx.fontBold, color: c(ctx.primary) });
      y -= 20;
    });
  }

  drawPageFooter(page, ctx, 'Quality Report');
}
