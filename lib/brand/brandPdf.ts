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
  useDarkTheme: boolean;
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

function luminance(color: RGB): number {
  return 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    try {
      if (font.widthOfTextAtSize(test, fontSize) > maxWidth) {
        if (current) lines.push(current);
        // If a single word is wider than maxWidth, truncate it
        if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
          let truncated = word;
          while (truncated.length > 3 && font.widthOfTextAtSize(truncated + '...', fontSize) > maxWidth) {
            truncated = truncated.slice(0, -1);
          }
          current = truncated + '...';
        } else {
          current = word;
        }
      } else {
        current = test;
      }
    } catch {
      current = test; // fallback if width calc fails
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Draw text safely, ensuring it doesn't exceed maxWidth by truncating */
function drawTextSafe(page: any, text: string, opts: any) {
  if (!text) return;
  const { font, size, maxWidth } = opts;
  if (maxWidth && font) {
    try {
      let t = text;
      while (t.length > 3 && font.widthOfTextAtSize(t, size) > maxWidth) {
        t = t.slice(0, -1);
      }
      if (t.length < text.length) t = t.slice(0, -3) + '...';
      page.drawText(t, opts);
    } catch {
      page.drawText(text, opts);
    }
  } else {
    page.drawText(text, opts);
  }
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
  colorSystem?: ColorSystem
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

  // Determine theme from brief or primary color luminance
  const primaryLum = luminance(hexToRgb(palette.primary));
  const useDarkTheme = brief?.themePreference === 'dark' || (brief?.themePreference !== 'light' && primaryLum < 0.35);

  const ctx: PdfContext = {
    pdfDoc, fontRegular, fontBold, fontLight, logoPng,
    width, height,
    brandTitle: brief?.brandName || domainName.charAt(0).toUpperCase() + domainName.slice(1),
    domainName,
    primary: hexToRgb(palette.primary),
    dark: hexToRgb(palette.dark),
    light: hexToRgb(palette.light),
    accent: hexToRgb(palette.accent),
    secondary: hexToRgb(palette.secondary),
    white: { r: 1, g: 1, b: 1 },
    lightGray: { r: 0.96, g: 0.96, b: 0.97 },
    useDarkTheme,
  };

  const useFonts = typeSystem || fonts;

  drawCoverPage(page1, ctx, brief);
  drawTocPage(ctx, brief);
  drawBrandOverviewPage(ctx, signals, brief);
  drawLogoSystemPage(ctx);
  drawColorPalettePage(ctx, palette, colorSystem);
  drawTypographyPage(ctx, useFonts, signals, brief, typeSystem);
  drawApplicationsPage(ctx, palette);
  drawDosDontsPage(ctx, palette, brief);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ── Page helpers ────────────────────────────────────────────────────────────

function drawPageHeader(page: any, ctx: PdfContext, title: string, pageNum: number) {
  const bgColor = ctx.useDarkTheme ? ctx.dark : ctx.primary;
  page.drawRectangle({ x: 0, y: ctx.height - 56, width: ctx.width, height: 56, color: c(bgColor) });
  page.drawText(title.toUpperCase(), { x: 48, y: ctx.height - 38, size: 13, font: ctx.fontBold, color: c(ctx.white) });
  // Accent underline
  page.drawRectangle({ x: 48, y: ctx.height - 56, width: 60, height: 2.5, color: c(ctx.accent) });
  const numStr = String(pageNum).padStart(2, '0');
  page.drawText(numStr, { x: ctx.width - 60, y: ctx.height - 38, size: 14, font: ctx.fontLight, color: c(ctx.white), opacity: 0.5 });
}

function drawPageFooter(page: any, ctx: PdfContext, sectionName: string) {
  // Accent line footer
  page.drawRectangle({ x: 48, y: 34, width: ctx.width - 96, height: 1, color: c(ctx.primary), opacity: 0.15 });
  page.drawText(`${ctx.domainName}  ·  ${sectionName}`, { x: 48, y: 18, size: 7, font: ctx.fontLight, color: rgb(0.55, 0.55, 0.55) });
  page.drawText('sparkdomain.xyz', { x: ctx.width - 100, y: 18, size: 7, font: ctx.fontLight, color: rgb(0.55, 0.55, 0.55) });
}

function drawSectionLabel(page: any, ctx: PdfContext, label: string, x: number, y: number) {
  page.drawText(label.toUpperCase(), { x, y, size: 8, font: ctx.fontBold, color: c(ctx.accent), opacity: 0.85 });
  page.drawRectangle({ x, y: y - 6, width: 40, height: 2, color: c(ctx.accent), opacity: 0.4 });
}

// ── Page 1: Cover ───────────────────────────────────────────────────────────

function drawCoverPage(page: any, ctx: PdfContext, brief?: DesignBrief) {
  const { width, height } = ctx;

  if (ctx.useDarkTheme) {
    // Dark theme: near-black background with accent elements
    page.drawRectangle({ x: 0, y: 0, width, height, color: c(ctx.dark) });
    // Accent stripe at top
    page.drawRectangle({ x: 0, y: height - 6, width, height: 6, color: c(ctx.accent) });
    // Subtle vertical line
    page.drawRectangle({ x: Math.round(width * 0.75), y: 0, width: 1, height, color: c(ctx.accent), opacity: 0.08 });
  } else {
    // Light/brand theme: primary color background with texture
    page.drawRectangle({ x: 0, y: 0, width, height, color: c(ctx.primary) });
    // Subtle diagonal accent
    page.drawRectangle({ x: 0, y: height * 0.4, width, height: 1.5, color: c(ctx.white), opacity: 0.06 });
    // Accent stripe
    page.drawRectangle({ x: 0, y: height - 6, width, height: 6, color: c(ctx.accent) });
  }

  // Logo area — clean white card
  const cardW = 180;
  const cardH = 180;
  const cardX = (width - cardW) / 2;
  const cardY = height / 2 + 60;
  page.drawRectangle({ x: cardX, y: cardY, width: cardW, height: cardH, color: c(ctx.white) });
  const logoSize = 140;
  page.drawImage(ctx.logoPng, { x: cardX + (cardW - logoSize) / 2, y: cardY + (cardH - logoSize) / 2, width: logoSize, height: logoSize });

  // Brand name
  const titleSize = 38;
  const titleW = ctx.fontBold.widthOfTextAtSize(ctx.brandTitle, titleSize);
  const maxTitleW = width - 96;
  const actualTitleSize = titleW > maxTitleW ? titleSize * (maxTitleW / titleW) : titleSize;
  const actualTitleW = ctx.fontBold.widthOfTextAtSize(ctx.brandTitle, actualTitleSize);
  page.drawText(ctx.brandTitle, { x: (width - actualTitleW) / 2, y: cardY - 50, size: actualTitleSize, font: ctx.fontBold, color: c(ctx.white) });

  // Subtitle
  const subtitle = 'Brand Identity Guidelines';
  const subW = ctx.fontLight.widthOfTextAtSize(subtitle, 13);
  page.drawText(subtitle, { x: (width - subW) / 2, y: cardY - 72, size: 13, font: ctx.fontLight, color: c(ctx.white), opacity: 0.6 });

  // Tagline
  if (brief?.tagline) {
    const tagW = ctx.fontRegular.widthOfTextAtSize(brief.tagline, 10);
    const maxTagW = width - 120;
    if (tagW <= maxTagW) {
      page.drawText(brief.tagline, { x: (width - tagW) / 2, y: cardY - 95, size: 10, font: ctx.fontRegular, color: c(ctx.white), opacity: 0.4 });
    }
  }

  // Bottom info
  page.drawText(ctx.domainName, { x: 48, y: 28, size: 8, font: ctx.fontRegular, color: c(ctx.white), opacity: 0.4 });
  const year = new Date().getFullYear().toString();
  page.drawText(`v1.0  ·  ${year}`, { x: width - 90, y: 28, size: 8, font: ctx.fontRegular, color: c(ctx.white), opacity: 0.4 });
}

// ── Page 2: Table of Contents ───────────────────────────────────────────────

function drawTocPage(ctx: PdfContext, brief?: DesignBrief) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;

  page.drawRectangle({ x: 0, y: 0, width, height, color: c(ctx.white) });
  // Top accent line
  page.drawRectangle({ x: 0, y: height - 3, width, height: 3, color: c(ctx.primary) });

  page.drawText('Contents', { x: 48, y: height - 80, size: 28, font: ctx.fontBold, color: c(ctx.dark) });

  const sections = [
    { num: '01', title: 'Brand Overview', desc: 'Mission, pillars, and personality' },
    { num: '02', title: 'Logo System', desc: 'Usage, clear space, and restrictions' },
    { num: '03', title: 'Color Palette', desc: 'Primary, secondary, and functional colors' },
    { num: '04', title: 'Typography', desc: 'Type system, scale, and pairing' },
    { num: '05', title: 'Applications', desc: 'Business card and letterhead' },
    { num: '06', title: "Do's & Don'ts", desc: 'Usage guidelines' },
  ];

  let y = height - 140;
  sections.forEach((s) => {
    page.drawText(s.num, { x: 48, y, size: 20, font: ctx.fontBold, color: c(ctx.accent), opacity: 0.4 });
    page.drawText(s.title, { x: 95, y: y + 2, size: 13, font: ctx.fontBold, color: c(ctx.dark) });
    page.drawText(s.desc, { x: 95, y: y - 15, size: 9, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
    page.drawRectangle({ x: 48, y: y - 28, width: width - 96, height: 0.5, color: c(ctx.dark), opacity: 0.06 });
    y -= 62;
  });

  // Brief summary card at bottom
  if (brief) {
    const cardY = 80;
    const cardH = 100;
    page.drawRectangle({ x: 48, y: cardY, width: width - 96, height: cardH, color: c(ctx.lightGray) });
    // Accent left bar
    page.drawRectangle({ x: 48, y: cardY, width: 3, height: cardH, color: c(ctx.accent) });

    page.drawText('Brand at a Glance', { x: 68, y: cardY + cardH - 22, size: 10, font: ctx.fontBold, color: c(ctx.dark) });

    const glanceItems = [
      `Sector: ${brief.sectorClassification}`,
      `Direction: ${brief.aestheticDirection}`,
      `Tension: ${brief.tensionPair}`,
    ];
    glanceItems.forEach((item, i) => {
      drawTextSafe(page, item, { x: 68, y: cardY + cardH - 42 - (i * 16), size: 9, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4), maxWidth: width - 140 });
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
  const maxTextW = width - 96;

  // Tagline in large text
  if (brief?.tagline) {
    drawSectionLabel(page, ctx, 'Brand Positioning', 48, y);
    y -= 24;
    const tagLines = wrapText(`"${brief.tagline}"`, ctx.fontBold, 16, maxTextW);
    tagLines.slice(0, 2).forEach((line) => {
      page.drawText(line, { x: 48, y, size: 16, font: ctx.fontBold, color: c(ctx.primary) });
      y -= 22;
    });
    y -= 4;
  }

  // Tension + Aesthetic in a subtle card
  if (brief?.tensionPair || brief?.aestheticDirection) {
    const cardH = 50;
    page.drawRectangle({ x: 48, y: y - cardH, width: maxTextW, height: cardH, color: c(ctx.lightGray) });
    page.drawRectangle({ x: 48, y: y - cardH, width: 3, height: cardH, color: c(ctx.primary) });
    if (brief.tensionPair) {
      drawTextSafe(page, `Tension: ${brief.tensionPair}`, { x: 64, y: y - 16, size: 10, font: ctx.fontRegular, color: rgb(0.3, 0.3, 0.3), maxWidth: maxTextW - 32 });
    }
    if (brief.aestheticDirection) {
      drawTextSafe(page, `Aesthetic: ${brief.aestheticDirection}`, { x: 64, y: y - 34, size: 10, font: ctx.fontRegular, color: rgb(0.3, 0.3, 0.3), maxWidth: maxTextW - 32 });
    }
    y -= cardH + 16;
  }

  // Brand Pillars
  const pillars = brief?.brandPillars ?? [
    { name: 'Quality', description: 'Commitment to excellence in every detail' },
    { name: 'Innovation', description: 'Pushing boundaries in the industry' },
    { name: 'Trust', description: 'Building lasting relationships' },
  ];

  if (pillars.length > 0 && y > 300) {
    drawSectionLabel(page, ctx, 'Brand Pillars', 48, y);
    y -= 20;

    const pillarCount = Math.min(pillars.length, 3);
    const pillarW = (maxTextW - (pillarCount - 1) * 12) / pillarCount;
    pillars.slice(0, pillarCount).forEach((pillar, i) => {
      const px = 48 + i * (pillarW + 12);
      page.drawRectangle({ x: px, y: y - 70, width: pillarW, height: 74, color: c(ctx.lightGray) });
      page.drawRectangle({ x: px, y: y + 1, width: pillarW, height: 3, color: c(ctx.accent) });
      drawTextSafe(page, pillar.name, { x: px + 10, y: y - 14, size: 10, font: ctx.fontBold, color: c(ctx.dark), maxWidth: pillarW - 20 });
      const descLines = wrapText(pillar.description, ctx.fontRegular, 8, pillarW - 20);
      descLines.slice(0, 3).forEach((line, li) => {
        page.drawText(line, { x: px + 10, y: y - 30 - (li * 11), size: 8, font: ctx.fontRegular, color: rgb(0.45, 0.45, 0.45) });
      });
    });
    y -= 105;
  }

  // Personality Traits
  const traits = brief?.personalityTraits ?? [
    { trait: signals.tone, counterbalance: signals.subTone || 'balanced' },
  ];

  if (traits.length > 0 && y > 200) {
    drawSectionLabel(page, ctx, 'Brand Personality', 48, y);
    y -= 20;

    traits.slice(0, 4).forEach((t, i) => {
      const traitY = y - (i * 32);
      if (traitY < 60) return;
      page.drawRectangle({ x: 48, y: traitY - 5, width: 160, height: 20, color: c(ctx.lightGray) });
      drawTextSafe(page, t.trait, { x: 56, y: traitY, size: 9, font: ctx.fontBold, color: c(ctx.primary), maxWidth: 145 });
      page.drawText('↔', { x: 218, y: traitY, size: 10, font: ctx.fontRegular, color: rgb(0.6, 0.6, 0.6) });
      page.drawRectangle({ x: 240, y: traitY - 5, width: 160, height: 20, color: c(ctx.lightGray) });
      drawTextSafe(page, t.counterbalance, { x: 248, y: traitY, size: 9, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4), maxWidth: 145 });
    });
    y -= Math.min(traits.length, 4) * 32 + 16;
  }

  // Target Audience
  if (y > 120) {
    const audienceText = brief?.targetAudienceSummary || signals.targetAudience;
    if (audienceText) {
      drawSectionLabel(page, ctx, 'Target Audience', 48, y);
      y -= 18;
      const audienceLines = wrapText(audienceText, ctx.fontRegular, 10, maxTextW);
      audienceLines.slice(0, 4).forEach((line) => {
        if (y < 50) return;
        page.drawText(line, { x: 48, y, size: 10, font: ctx.fontRegular, color: rgb(0.3, 0.3, 0.3) });
        y -= 15;
      });
    }
  }

  drawPageFooter(page, ctx, 'Brand Overview');
}

// ── Page 4: Logo System ─────────────────────────────────────────────────────

function drawLogoSystemPage(ctx: PdfContext) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Logo System', 2);

  let y = height - 90;
  const contentW = width - 96;
  const lgSize = 80;

  // Three logo display variants side by side
  drawSectionLabel(page, ctx, 'Logo Variations', 48, y);
  y -= 14;

  const variantW = (contentW - 24) / 3;
  const variantH = 100;
  const variants = [
    { label: 'Light Background', bg: ctx.lightGray },
    { label: 'Dark Background', bg: ctx.dark },
    { label: 'Brand Color', bg: ctx.primary },
  ];

  variants.forEach((v, i) => {
    const vx = 48 + i * (variantW + 12);
    page.drawRectangle({ x: vx, y: y - variantH, width: variantW, height: variantH, color: c(v.bg) });
    page.drawImage(ctx.logoPng, { x: vx + (variantW - lgSize) / 2, y: y - variantH + (variantH - lgSize) / 2, width: lgSize, height: lgSize });
    // Label below
    const labelColor = rgb(0.45, 0.45, 0.45);
    page.drawText(v.label, { x: vx, y: y - variantH - 14, size: 7, font: ctx.fontRegular, color: labelColor });
  });

  y -= variantH + 40;

  // Clear Space + Minimum Size in two columns
  const colW = (contentW - 20) / 2;

  // Clear Space
  drawSectionLabel(page, ctx, 'Clear Space', 48, y);
  y -= 18;
  const clearLines = wrapText('Maintain a minimum clear space equal to the height of one distinctive element in the mark (unit "X") around all sides of the logo.', ctx.fontRegular, 9, colW);
  clearLines.slice(0, 4).forEach((line) => {
    page.drawText(line, { x: 48, y, size: 9, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
    y -= 13;
  });

  y -= 10;

  // Minimum Size
  drawSectionLabel(page, ctx, 'Minimum Size', 48, y);
  y -= 18;
  page.drawText('Digital: 32px wide minimum', { x: 48, y, size: 9, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
  y -= 14;
  page.drawText('Print: 20mm wide minimum', { x: 48, y, size: 9, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
  y -= 14;
  page.drawText('Below 32px, use monogram variant for legibility.', { x: 48, y, size: 9, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });

  y -= 30;

  // Full-width brand color banner with logo centered
  if (y > 160) {
    const bannerH = 120;
    page.drawRectangle({ x: 0, y: y - bannerH, width, height: bannerH, color: c(ctx.primary) });
    const bannerLogoSize = 70;
    page.drawImage(ctx.logoPng, { x: (width - bannerLogoSize) / 2, y: y - bannerH + (bannerH - bannerLogoSize) / 2, width: bannerLogoSize, height: bannerLogoSize });
    // Brand name under the logo in the banner
    const brandNameW = ctx.fontBold.widthOfTextAtSize(ctx.brandTitle, 14);
    page.drawText(ctx.brandTitle, { x: (width - brandNameW) / 2, y: y - bannerH + 14, size: 14, font: ctx.fontBold, color: c(ctx.white), opacity: 0.7 });
  }

  drawPageFooter(page, ctx, 'Logo System');
}

// ── Page 5: Color Palette ───────────────────────────────────────────────────

function drawColorPalettePage(ctx: PdfContext, palette: BrandPalette, colorSystem?: ColorSystem) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Color Palette', 3);

  let y = height - 90;
  const contentW = width - 96;

  // Brand Colors — large swatches
  drawSectionLabel(page, ctx, 'Brand Colors', 48, y);
  y -= 14;

  const swatches = [
    { label: 'Primary', hex: palette.primary },
    { label: 'Secondary', hex: palette.secondary },
    { label: 'Accent', hex: palette.accent },
    { label: 'Light', hex: palette.light },
    { label: 'Dark', hex: palette.dark },
  ];

  const swatchW = (contentW - (swatches.length - 1) * 6) / swatches.length;
  const swatchH = 80;

  swatches.forEach((swatch, i) => {
    const sx = 48 + i * (swatchW + 6);
    const swatchRgb = hexToRgb(swatch.hex);
    const isDark = luminance(swatchRgb) < 0.5;
    const textColor = isDark ? ctx.white : { r: 0.1, g: 0.1, b: 0.1 };

    page.drawRectangle({ x: sx, y: y - swatchH, width: swatchW, height: swatchH, color: c(swatchRgb) });
    page.drawText(swatch.label, { x: sx + 6, y: y - 16, size: 7, font: ctx.fontBold, color: c(textColor) });

    // Color specs below
    const specY = y - swatchH - 10;
    page.drawText(swatch.hex.toUpperCase(), { x: sx, y: specY, size: 7, font: ctx.fontBold, color: c(ctx.dark) });
    page.drawText(`RGB: ${hexToRgbStr(swatch.hex)}`, { x: sx, y: specY - 11, size: 6, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
    page.drawText(`CMYK: ${hexToCmykStr(swatch.hex)}`, { x: sx, y: specY - 21, size: 6, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
  });

  y -= swatchH + 46;

  // Functional Colors
  if (colorSystem && y > 320) {
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
      page.drawRectangle({ x: fx, y: y - 32, width: 100, height: 32, color: c(fRgb) });
      const fIsDark = luminance(fRgb) < 0.5;
      page.drawText(fc.label, { x: fx + 8, y: y - 14, size: 7, font: ctx.fontBold, color: fIsDark ? c(ctx.white) : rgb(0.1, 0.1, 0.1) });
      page.drawText(fc.hex, { x: fx + 8, y: y - 26, size: 6, font: ctx.fontRegular, color: fIsDark ? c(ctx.white) : rgb(0.1, 0.1, 0.1), opacity: 0.7 });
    });

    y -= 52;
  }

  // Color Usage Proportions
  if (y > 230) {
    drawSectionLabel(page, ctx, 'Color Usage Ratio', 48, y);
    y -= 14;

    const proportions = colorSystem?.proportions ?? { background: 60, surface: 20, foreground: 10, accent: 10 };
    const barH = 24;

    const segments = [
      { pct: proportions.background, color: ctx.light, label: `Background ${proportions.background}%` },
      { pct: proportions.surface, color: ctx.secondary, label: `Surface ${proportions.surface}%` },
      { pct: proportions.foreground, color: ctx.dark, label: `Foreground ${proportions.foreground}%` },
      { pct: proportions.accent, color: ctx.primary, label: `Accent ${proportions.accent}%` },
    ];

    let bx = 48;
    segments.forEach((seg) => {
      const segW = contentW * seg.pct / 100;
      page.drawRectangle({ x: bx, y: y - barH, width: segW, height: barH, color: c(seg.color) });
      bx += segW;
    });

    y -= barH + 8;
    page.drawText(segments.map(s => s.label).join('   '), { x: 48, y, size: 7, font: ctx.fontRegular, color: rgb(0.45, 0.45, 0.45) });
    y -= 22;
  }

  // Accessibility
  if (colorSystem && colorSystem.accessibility.length > 0 && y > 180) {
    drawSectionLabel(page, ctx, 'Accessibility (WCAG)', 48, y);
    y -= 14;

    colorSystem.accessibility.slice(0, 6).forEach((check) => {
      if (y < 60) return;
      const pass = check.aaPass;
      page.drawRectangle({ x: 48, y: y - 3, width: 6, height: 6, color: pass ? rgb(0.13, 0.77, 0.37) : rgb(0.94, 0.27, 0.27) });
      page.drawText(`${check.pair}: ${check.ratio}:1 — ${pass ? 'AA Pass' : 'AA Fail'}${check.aaaPass ? ' · AAA' : ''}`, {
        x: 60, y, size: 7, font: ctx.fontRegular, color: rgb(0.35, 0.35, 0.35),
      });
      y -= 14;
    });
    y -= 10;
  }

  // CSS Variables
  if (y > 120) {
    drawSectionLabel(page, ctx, 'CSS Variables', 48, y);
    y -= 10;
    const codeH = Math.min(110, y - 50);
    page.drawRectangle({ x: 48, y: y - codeH, width: contentW, height: codeH, color: rgb(0.09, 0.09, 0.11) });
    // Truncate CSS vars to fit
    const cssLines = palette.cssVars.split('\n').slice(0, Math.floor(codeH / 11));
    cssLines.forEach((line, i) => {
      page.drawText(line.slice(0, 80), { x: 58, y: y - 14 - (i * 11), size: 7, font: ctx.fontRegular, color: rgb(0.65, 0.85, 0.65) });
    });
  }

  drawPageFooter(page, ctx, 'Color Palette');
}

// ── Page 6: Typography ──────────────────────────────────────────────────────

function drawTypographyPage(ctx: PdfContext, fonts: FontPairing, signals: BrandSignals, brief?: DesignBrief, typeSystem?: TypeSystem) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Typography', 4);

  let y = height - 90;
  const maxTextW = width - 96;

  // Display Font — show font name prominently
  drawSectionLabel(page, ctx, `Display — ${fonts.heading.name}`, 48, y);
  y -= 24;

  // Specimen at descending sizes
  const headingSizes = [
    { size: 32, label: 'Display' },
    { size: 24, label: 'H1' },
    { size: 18, label: 'H2' },
    { size: 14, label: 'H3' },
  ];
  headingSizes.forEach(({ size, label }) => {
    drawTextSafe(page, ctx.brandTitle, { x: 48, y, size, font: ctx.fontBold, color: c(ctx.dark), maxWidth: maxTextW - 50 });
    page.drawText(label, { x: width - 70, y: y + 2, size: 7, font: ctx.fontLight, color: rgb(0.55, 0.55, 0.55) });
    y -= size + 10;
  });

  y -= 8;

  // Body Font
  if (y > 280) {
    drawSectionLabel(page, ctx, `Body — ${fonts.body.name}`, 48, y);
    y -= 20;
    const sampleText = brief
      ? `${ctx.brandTitle} operates in the ${brief.sectorClassification} space. The brand embodies "${brief.tensionPair}" — balancing precision with personality across every touchpoint.`
      : `${ctx.brandTitle} is built for the ${signals.industry} space. Every design decision reinforces the brand's position.`;
    const bodyLines = wrapText(sampleText, ctx.fontRegular, 10, maxTextW);
    bodyLines.slice(0, 4).forEach((line) => {
      page.drawText(line, { x: 48, y, size: 10, font: ctx.fontRegular, color: c(ctx.dark) });
      y -= 15;
    });
    y -= 8;
  }

  // Monospace Font
  if (y > 230) {
    drawSectionLabel(page, ctx, `Mono — ${fonts.mono.name}`, 48, y);
    y -= 18;
    page.drawRectangle({ x: 48, y: y - 28, width: maxTextW, height: 32, color: rgb(0.09, 0.09, 0.11) });
    page.drawText(`const brand = "${ctx.domainName}";`, { x: 58, y: y - 14, size: 9, font: ctx.fontRegular, color: rgb(0.65, 0.85, 0.65) });
    y -= 46;
  }

  // Type Scale Table
  if (typeSystem && y > 170) {
    drawSectionLabel(page, ctx, `Scale — ${typeSystem.scaleRatioName} (${typeSystem.scaleRatio})`, 48, y);
    y -= 16;

    // Table header
    page.drawRectangle({ x: 48, y: y - 12, width: maxTextW, height: 16, color: c(ctx.lightGray) });
    const cols = [48, 110, 210, 275, 335, 400];
    const headers = ['Level', 'Font', 'Weight', 'Size', 'Leading', 'Tracking'];
    headers.forEach((h, i) => {
      page.drawText(h, { x: cols[i] + 4, y: y - 8, size: 6.5, font: ctx.fontBold, color: c(ctx.dark) });
    });
    y -= 16;

    typeSystem.typeScale.forEach((level) => {
      if (y < 80) return;
      page.drawText(level.name, { x: cols[0] + 4, y: y - 9, size: 7, font: ctx.fontBold, color: c(ctx.dark) });
      drawTextSafe(page, level.font, { x: cols[1] + 4, y: y - 9, size: 7, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4), maxWidth: 90 });
      page.drawText(level.weight, { x: cols[2] + 4, y: y - 9, size: 7, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(`${level.sizePt}pt`, { x: cols[3] + 4, y: y - 9, size: 7, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(`${level.leadingPt}pt`, { x: cols[4] + 4, y: y - 9, size: 7, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(level.tracking, { x: cols[5] + 4, y: y - 9, size: 7, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
      page.drawRectangle({ x: 48, y: y - 14, width: maxTextW, height: 0.3, color: c(ctx.dark), opacity: 0.06 });
      y -= 16;
    });
    y -= 8;
  }

  // Pairing Rationale
  if (typeSystem?.pairingRationale && y > 100) {
    drawSectionLabel(page, ctx, 'Pairing Rationale', 48, y);
    y -= 16;
    const rationaleLines = wrapText(typeSystem.pairingRationale, ctx.fontRegular, 8, maxTextW);
    rationaleLines.slice(0, 4).forEach((line) => {
      if (y < 60) return;
      page.drawText(line, { x: 48, y, size: 8, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
      y -= 11;
    });
  }

  // Google Fonts URL
  if (y > 60) {
    y -= 6;
    const url = fonts.googleFontsUrl.length > 85 ? fonts.googleFontsUrl.slice(0, 82) + '...' : fonts.googleFontsUrl;
    page.drawText(`Google Fonts: ${url}`, { x: 48, y, size: 7, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
  }

  drawPageFooter(page, ctx, 'Typography');
}

// ── Page 7: Applications ────────────────────────────────────────────────────

function drawApplicationsPage(ctx: PdfContext, palette: BrandPalette) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Applications', 5);

  let y = height - 90;
  const contentW = width - 96;

  // Business Cards — front and back side by side
  drawSectionLabel(page, ctx, 'Business Card', 48, y);
  y -= 14;

  const cardW = (contentW - 20) / 2;
  const cardH = Math.round(cardW * 0.6);

  // Front
  page.drawRectangle({ x: 48, y: y - cardH, width: cardW, height: cardH, color: c(ctx.white) });
  page.drawRectangle({ x: 48, y: y - cardH, width: cardW, height: cardH, borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 0.5 });
  page.drawRectangle({ x: 48, y: y, width: cardW, height: 3, color: c(ctx.accent) });
  const bcLogoSize = 32;
  page.drawImage(ctx.logoPng, { x: 64, y: y - 48, width: bcLogoSize, height: bcLogoSize });
  drawTextSafe(page, ctx.brandTitle, { x: 64, y: y - 66, size: 10, font: ctx.fontBold, color: c(ctx.dark), maxWidth: cardW - 32 });
  page.drawText('Your Name  ·  Title', { x: 64, y: y - 80, size: 7, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
  page.drawText(`hello@${ctx.domainName}`, { x: 64, y: y - 94, size: 7, font: ctx.fontRegular, color: c(ctx.primary) });

  // Back
  const backX = 48 + cardW + 20;
  page.drawRectangle({ x: backX, y: y - cardH, width: cardW, height: cardH, color: c(ctx.primary) });
  const backLogoSize = 50;
  page.drawImage(ctx.logoPng, { x: backX + (cardW - backLogoSize) / 2, y: y - cardH + (cardH - backLogoSize) / 2, width: backLogoSize, height: backLogoSize });

  y -= cardH + 30;

  // Letterhead
  if (y > 280) {
    drawSectionLabel(page, ctx, 'Letterhead', 48, y);
    y -= 14;

    const lhW = contentW * 0.7;
    const lhH = 160;
    const lhX = (width - lhW) / 2;

    page.drawRectangle({ x: lhX, y: y - lhH, width: lhW, height: lhH, color: c(ctx.white) });
    page.drawRectangle({ x: lhX, y: y - lhH, width: lhW, height: lhH, borderColor: rgb(0.88, 0.88, 0.88), borderWidth: 0.3 });
    // Accent top bar
    page.drawRectangle({ x: lhX, y: y - 2.5, width: lhW, height: 2.5, color: c(ctx.accent) });
    // Logo
    page.drawImage(ctx.logoPng, { x: lhX + 14, y: y - 36, width: 26, height: 26 });
    // Sample text lines
    for (let i = 0; i < 5; i++) {
      const lw = i === 0 ? lhW * 0.45 : lhW * (0.5 + Math.random() * 0.3);
      page.drawRectangle({ x: lhX + 14, y: y - 55 - (i * 13), width: Math.min(lw, lhW - 28), height: 5, color: c(ctx.dark), opacity: 0.06 });
    }
    // Footer line
    page.drawRectangle({ x: lhX + 14, y: y - lhH + 18, width: lhW - 28, height: 0.5, color: c(ctx.primary), opacity: 0.3 });
    page.drawText(`${ctx.domainName}`, { x: lhX + 14, y: y - lhH + 8, size: 6, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
  }

  drawPageFooter(page, ctx, 'Applications');
}

// ── Page 8: Do's & Don'ts ───────────────────────────────────────────────────

function drawDosDontsPage(ctx: PdfContext, palette: BrandPalette, brief?: DesignBrief) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, "Do's & Don'ts", 6);

  let y = height - 90;
  const maxTextW = width - 120;

  // Do's column
  drawSectionLabel(page, ctx, "Do's", 48, y);
  y -= 16;

  const dos = [
    'Use the logo on clean, uncluttered backgrounds',
    'Maintain the minimum clear space around the logo',
    'Use the approved color palette consistently',
    'Follow the type hierarchy for all communications',
    `Use ${palette.primary.toUpperCase()} as the primary brand accent`,
    'Reference these guidelines for all brand applications',
  ];

  dos.forEach((d) => {
    if (y < 50) return;
    page.drawRectangle({ x: 48, y: y - 3, width: 7, height: 7, color: rgb(0.13, 0.77, 0.37) });
    drawTextSafe(page, d, { x: 64, y, size: 9, font: ctx.fontRegular, color: rgb(0.25, 0.25, 0.25), maxWidth: maxTextW });
    y -= 20;
  });

  y -= 14;

  // Don'ts column
  drawSectionLabel(page, ctx, "Don'ts", 48, y);
  y -= 16;

  const donts = [
    'Do not stretch, distort, or rotate the logo',
    'Do not change the logo colors or add effects',
    'Do not place the logo on busy or low-contrast backgrounds',
    'Do not use colors outside the approved palette',
    'Do not use unauthorized typefaces for brand materials',
    'Do not reduce the logo below minimum size specification',
    'Do not add drop shadows, borders, or outlines to the logo',
    'Do not recreate or redraw the logo — use provided files',
  ];

  donts.forEach((d) => {
    if (y < 50) return;
    page.drawRectangle({ x: 48, y: y - 3, width: 7, height: 7, color: rgb(0.94, 0.27, 0.27) });
    drawTextSafe(page, d, { x: 64, y, size: 9, font: ctx.fontRegular, color: rgb(0.25, 0.25, 0.25), maxWidth: maxTextW });
    y -= 20;
  });

  y -= 16;

  // Quick Reference Card
  if (y > 120) {
    const cardH = 100;
    const cardColor = ctx.useDarkTheme ? ctx.dark : ctx.primary;
    page.drawRectangle({ x: 48, y: y - cardH, width: width - 96, height: cardH, color: c(cardColor) });
    page.drawRectangle({ x: 48, y: y, width: width - 96, height: 2.5, color: c(ctx.accent) });

    page.drawText('Quick Reference', { x: 64, y: y - 18, size: 11, font: ctx.fontBold, color: c(ctx.white) });

    const refs = [
      `Primary: ${palette.primary.toUpperCase()}  ·  Accent: ${palette.accent.toUpperCase()}`,
      `Display: ${brief ? 'See Typography section' : 'Inter'}  ·  Body: See Typography section`,
      brief ? `${brief.aestheticDirection}  ·  ${brief.tensionPair}` : `Domain: ${ctx.domainName}`,
      'Generated by Sparkdomain  ·  sparkdomain.xyz',
    ];
    refs.forEach((ref, i) => {
      drawTextSafe(page, ref, { x: 64, y: y - 36 - (i * 16), size: 8, font: ctx.fontRegular, color: c(ctx.white), opacity: 0.8, maxWidth: width - 130 });
    });
  }

  drawPageFooter(page, ctx, "Do's & Don'ts");
}
