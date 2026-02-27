import { PDFDocument, rgb, PageSizes } from 'pdf-lib';
import fontkitModule from '@pdf-lib/fontkit';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { BrandPalette } from './palette';
import { BrandSignals } from './signals';
import { TypeSystem } from './typographer';
import { ColorSystem } from './colorist';
import { DesignBrief } from './strategist';
import { FontPairing } from './typography';

// ── Google Fonts download helper ────────────────────────────────────────────

const FONT_CACHE_DIR = path.join(os.tmpdir(), 'sparkdomain-fonts');

/** Download a Google Font TTF file (Regular weight) with caching */
async function downloadGoogleFont(fontName: string, weight: number = 400): Promise<Buffer | null> {
  try {
    if (!fs.existsSync(FONT_CACHE_DIR)) fs.mkdirSync(FONT_CACHE_DIR, { recursive: true });

    const cacheKey = `${fontName.replace(/\s/g, '-')}-${weight}.ttf`;
    const cachePath = path.join(FONT_CACHE_DIR, cacheKey);

    // Return from cache if available
    if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath);

    // Fetch from Google Fonts CSS API (user-agent determines format)
    const family = `${fontName.replace(/\s/g, '+')}:wght@${weight}`;
    const cssUrl = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
    const cssRes = await fetch(cssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, // Triggers .ttf URLs
    });
    if (!cssRes.ok) return null;

    const css = await cssRes.text();
    // Extract TTF URL from the CSS
    const urlMatch = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^\)]+\.ttf)\)/);
    if (!urlMatch) return null;

    const fontRes = await fetch(urlMatch[1]);
    if (!fontRes.ok) return null;

    const buffer = Buffer.from(await fontRes.arrayBuffer());
    fs.writeFileSync(cachePath, buffer);
    return buffer;
  } catch {
    return null;
  }
}

// ── Types ───────────────────────────────────────────────────────────────────

type RGB = { r: number; g: number; b: number };

// ── Aesthetic template system ────────────────────────────────────────────────

type PdfTemplateId = 'minimal' | 'luxury' | 'organic' | 'technical' | 'default';

interface PdfTemplate {
  id: PdfTemplateId;
  coverAccentStyle: 'stripe' | 'frame' | 'gradient-bar';
  swatchBorderRadius: number;   // 0 = sharp, 4+ = rounded
  sectionNumberStyle: 'plain' | 'circled' | 'none';
  ornamentDivider: boolean;     // decorative dividers between sections
  cardShadow: boolean;          // subtle shadow on card elements
}

const PDF_TEMPLATES: Record<PdfTemplateId, PdfTemplate> = {
  minimal: {
    id: 'minimal',
    coverAccentStyle: 'stripe',
    swatchBorderRadius: 0,
    sectionNumberStyle: 'plain',
    ornamentDivider: false,
    cardShadow: false,
  },
  luxury: {
    id: 'luxury',
    coverAccentStyle: 'frame',
    swatchBorderRadius: 2,
    sectionNumberStyle: 'circled',
    ornamentDivider: true,
    cardShadow: true,
  },
  organic: {
    id: 'organic',
    coverAccentStyle: 'gradient-bar',
    swatchBorderRadius: 6,
    sectionNumberStyle: 'plain',
    ornamentDivider: false,
    cardShadow: true,
  },
  technical: {
    id: 'technical',
    coverAccentStyle: 'stripe',
    swatchBorderRadius: 0,
    sectionNumberStyle: 'plain',
    ornamentDivider: false,
    cardShadow: false,
  },
  default: {
    id: 'default',
    coverAccentStyle: 'stripe',
    swatchBorderRadius: 3,
    sectionNumberStyle: 'plain',
    ornamentDivider: false,
    cardShadow: false,
  },
};

function selectPdfTemplate(brief?: DesignBrief): PdfTemplate {
  if (!brief) return PDF_TEMPLATES.default;
  const dir = brief.aestheticDirection.toLowerCase();

  if (/minimal|swiss|nordic|clean/.test(dir)) return PDF_TEMPLATES.minimal;
  if (/classical|luxury|heritage|editorial|refined|neo-classical/.test(dir)) return PDF_TEMPLATES.luxury;
  if (/organic|warm|natural|soft|gentle/.test(dir)) return PDF_TEMPLATES.organic;
  if (/terminal|brutal|tactical|dark|cyber|technical/.test(dir)) return PDF_TEMPLATES.technical;

  return PDF_TEMPLATES.default;
}

interface PdfContext {
  pdfDoc: any;
  fontRegular: any;
  fontBold: any;
  fontLight: any;
  brandDisplayFont: any;      // brand's display font (or fallback to fontBold)
  brandDisplayFontRegular: any; // brand display at regular weight (or fallback)
  brandBodyFont: any;         // brand's body font (or fallback to fontRegular)
  logoPng: any;
  logoPngTransparent: any;  // for use on colored/dark backgrounds
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
  visPrimary: RGB;  // primary guaranteed to be visible (not near-white/black)
  useDarkTheme: boolean;
  pageBg: RGB;     // themed page background (off-white for light, dark for dark)
  pageFg: RGB;     // themed page text color
  template: PdfTemplate;
}

// ── Sector-aware contact placeholders ────────────────────────────────────────

interface SectorContact { name: string; title: string; email: string }

const SECTOR_CONTACTS: { pattern: RegExp; contact: SectorContact }[] = [
  { pattern: /food|restaurant|hospitality|cafe|coffee|bakery/i, contact: { name: 'Sofia Martinez', title: 'Head Chef', email: 'sofia' } },
  { pattern: /tech|saas|ai|software|developer|platform/i, contact: { name: 'Alex Chen', title: 'CTO', email: 'alex' } },
  { pattern: /creative|agency|design|studio|media/i, contact: { name: 'Lena Dahl', title: 'Creative Director', email: 'lena' } },
  { pattern: /finance|legal|consulting|banking|invest/i, contact: { name: 'James Crawford', title: 'Managing Partner', email: 'james' } },
  { pattern: /health|medical|wellness|bio|pharma/i, contact: { name: 'Dr. Maya Singh', title: 'Medical Director', email: 'maya' } },
  { pattern: /education|learning|school|university/i, contact: { name: 'Rachel Torres', title: 'Program Director', email: 'rachel' } },
  { pattern: /retail|commerce|shop|store|pet/i, contact: { name: 'Emma Wilson', title: 'Store Manager', email: 'emma' } },
  { pattern: /luxury|fashion|beauty|premium/i, contact: { name: 'Isabelle Moreau', title: 'Brand Director', email: 'isabelle' } },
];

const DEFAULT_CONTACT: SectorContact = { name: 'Sam Morgan', title: 'Founder', email: 'sam' };

function getSectorContact(sector: string): SectorContact {
  for (const { pattern, contact } of SECTOR_CONTACTS) {
    if (pattern.test(sector)) return contact;
  }
  return DEFAULT_CONTACT;
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

/** Get a visible "visual primary" — avoids near-white/near-black primary colors */
function getVisualPrimary(primary: RGB, accent: RGB, dark: RGB): RGB {
  const lum = luminance(primary);
  if (lum > 0.85) return luminance(accent) < 0.8 ? accent : dark;
  if (lum < 0.05) return luminance(accent) > 0.1 ? accent : dark;
  return primary;
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

/** Test if a font can encode all characters in a string */
function canFontEncode(font: any, text: string): boolean {
  try {
    font.encodeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Draw text safely, ensuring it doesn't exceed maxWidth by truncating.
 *  Falls back to fallbackFont if the primary font can't encode the text. */
function drawTextSafe(page: any, text: string, opts: any & { fallbackFont?: any }) {
  if (!text) return;
  const { font, size, maxWidth, fallbackFont } = opts;
  // Choose a font that can actually encode this text
  const useFont = (font && canFontEncode(font, text)) ? font
    : (fallbackFont && canFontEncode(fallbackFont, text)) ? fallbackFont
    : font; // last resort — try original, let it throw if it must
  const drawOpts = { ...opts, font: useFont };
  delete drawOpts.fallbackFont;

  if (maxWidth && useFont) {
    try {
      let t = text;
      while (t.length > 3 && useFont.widthOfTextAtSize(t, size) > maxWidth) {
        t = t.slice(0, -1);
      }
      if (t.length < text.length) t = t.slice(0, -3) + '...';
      page.drawText(t, { ...drawOpts });
    } catch {
      try { page.drawText(text, drawOpts); } catch { /* skip */ }
    }
  } else {
    try {
      page.drawText(text, drawOpts);
    } catch {
      // Silently skip if text can't be encoded at all
    }
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
  colorSystem?: ColorSystem,
  logoPngTransparentBuffer?: Buffer
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkitModule as any);

  const fontDir = path.join(process.cwd(), 'lib/brand/fonts');
  const fontRegular = await pdfDoc.embedFont(fs.readFileSync(path.join(fontDir, 'Inter-Regular.ttf')));
  const fontBold = await pdfDoc.embedFont(fs.readFileSync(path.join(fontDir, 'Inter-Bold.ttf')));
  const fontLight = await pdfDoc.embedFont(fs.readFileSync(path.join(fontDir, 'Inter-Light.ttf')));
  const logoPng = await pdfDoc.embedPng(logoPngBuffer);
  // Embed transparent version for use on colored/dark backgrounds (falls back to regular)
  let logoPngTransparent = logoPng;
  if (logoPngTransparentBuffer) {
    try {
      logoPngTransparent = await pdfDoc.embedPng(logoPngTransparentBuffer);
    } catch {
      logoPngTransparent = logoPng; // fallback if transparent PNG fails
    }
  }

  // Download and embed brand fonts (display + body) from Google Fonts
  let brandDisplayFont = fontBold;
  let brandDisplayFontRegular = fontRegular;
  let brandBodyFont = fontRegular;
  const useFonts = typeSystem || fonts;
  try {
    // Display font: try bold weight first, then the highest available
    const displayName = useFonts.heading.name;
    const displayWeights = useFonts.heading.weights;
    const boldWeight = displayWeights.includes(700) ? 700 : displayWeights[displayWeights.length - 1] || 700;
    const displayBuf = await downloadGoogleFont(displayName, boldWeight);
    if (displayBuf) brandDisplayFont = await pdfDoc.embedFont(displayBuf);
    // Also get regular weight for body-size display specimens
    const regWeight = displayWeights.includes(400) ? 400 : displayWeights[0] || 400;
    if (regWeight !== boldWeight) {
      const displayRegBuf = await downloadGoogleFont(displayName, regWeight);
      if (displayRegBuf) brandDisplayFontRegular = await pdfDoc.embedFont(displayRegBuf);
    } else {
      brandDisplayFontRegular = brandDisplayFont;
    }

    // Body font
    const bodyName = useFonts.body.name;
    const bodyWeights = useFonts.body.weights;
    const bodyWeight = bodyWeights.includes(400) ? 400 : bodyWeights[0] || 400;
    const bodyBuf = await downloadGoogleFont(bodyName, bodyWeight);
    if (bodyBuf) brandBodyFont = await pdfDoc.embedFont(bodyBuf);
  } catch (err: any) {
    console.warn('Brand font download failed, using Inter fallback:', err.message);
  }

  const page1 = pdfDoc.addPage(PageSizes.A4);
  const { width, height } = page1.getSize();

  // Compute visual primary (guaranteed visible)
  const primaryRgb = hexToRgb(palette.primary);
  const accentRgb = hexToRgb(palette.accent);
  const darkRgb = hexToRgb(palette.dark);
  const visPrimary = getVisualPrimary(primaryRgb, accentRgb, darkRgb);

  // Determine theme from brief or visual primary luminance
  const visPrimaryLum = luminance(visPrimary);
  const useDarkTheme = brief?.themePreference === 'dark' || (brief?.themePreference !== 'light' && visPrimaryLum < 0.35);

  // Select aesthetic template
  const template = selectPdfTemplate(brief);

  // Themed page background/foreground (template-aware)
  let pageBg: RGB;
  if (useDarkTheme) {
    pageBg = colorSystem ? hexToRgb(colorSystem.system.background.hex) : { r: 0.04, g: 0.04, b: 0.04 };
  } else if (template.id === 'luxury') {
    pageBg = { r: 0.98, g: 0.97, b: 0.95 }; // warm cream #FAF7F2
  } else if (template.id === 'organic') {
    pageBg = { r: 0.99, g: 0.97, b: 0.94 }; // warm light #FDF8F0
  } else if (template.id === 'technical') {
    pageBg = { r: 0.04, g: 0.04, b: 0.04 }; // dark #0A0A0B
  } else {
    pageBg = { r: 0.97, g: 0.97, b: 0.98 }; // light neutral #F8F8FA
  }
  // Technical template forces dark foreground
  const pageFg = (useDarkTheme || template.id === 'technical')
    ? (colorSystem ? hexToRgb(colorSystem.system.foreground.hex) : { r: 0.93, g: 0.93, b: 0.95 })
    : { r: 0.1, g: 0.1, b: 0.1 };

  const ctx: PdfContext = {
    pdfDoc, fontRegular, fontBold, fontLight,
    brandDisplayFont, brandDisplayFontRegular, brandBodyFont,
    logoPng, logoPngTransparent,
    width, height,
    brandTitle: brief?.brandName || domainName.charAt(0).toUpperCase() + domainName.slice(1),
    domainName,
    primary: primaryRgb,
    dark: darkRgb,
    light: hexToRgb(palette.light),
    accent: accentRgb,
    secondary: hexToRgb(palette.secondary),
    white: { r: 1, g: 1, b: 1 },
    lightGray: { r: 0.96, g: 0.96, b: 0.97 },
    visPrimary,
    useDarkTheme,
    pageBg,
    pageFg,
    template,
  };

  let pageNum = 1;
  drawCoverPage(page1, ctx, brief);
  drawTocPage(ctx, brief);
  drawBrandOverviewPage(ctx, signals, brief, pageNum++);
  if (brief) {
    drawBrandStoryPage(ctx, brief, pageNum++);
    drawBrandVoicePage(ctx, brief, signals, pageNum++);
  }
  drawLogoSystemPage(ctx, pageNum++);
  drawColorPalettePage(ctx, palette, colorSystem, pageNum++);
  if (colorSystem && brief) {
    drawColorDeepDivePage(ctx, colorSystem, palette, pageNum++);
  }
  drawTypographyPage(ctx, useFonts, signals, brief, typeSystem, pageNum++);
  if (brief) {
    drawImageryDirectionPage(ctx, brief, pageNum++);
  }
  drawApplicationsPage(ctx, palette, brief, pageNum++);
  if (brief) {
    drawDigitalApplicationsPage(ctx, palette, brief, pageNum++);
    drawExtendedApplicationsPage(ctx, palette, brief, pageNum++);
  }
  drawDosDontsPage(ctx, palette, brief, pageNum++);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ── Page helpers ────────────────────────────────────────────────────────────

function drawPageHeader(page: any, ctx: PdfContext, title: string, pageNum: number) {
  // Themed page background
  page.drawRectangle({ x: 0, y: 0, width: ctx.width, height: ctx.height, color: c(ctx.pageBg) });
  // Subtle section tag with accent underline (replaces solid bar)
  const numStr = String(pageNum).padStart(2, '0');
  const headerText = `${numStr} — ${title.toUpperCase()}`;
  page.drawText(headerText, { x: 48, y: ctx.height - 42, size: 8, font: ctx.fontBold, color: c(ctx.pageFg), opacity: 0.6 });
  // Thin accent underline
  const headerW = Math.min(ctx.fontBold.widthOfTextAtSize(headerText, 8) + 8, 200);
  page.drawRectangle({ x: 48, y: ctx.height - 47, width: headerW, height: 1.5, color: c(ctx.accent), opacity: 0.4 });
  // Top accent line
  page.drawRectangle({ x: 0, y: ctx.height - 3, width: ctx.width, height: 3, color: c(ctx.accent) });
}

function drawPageFooter(page: any, ctx: PdfContext, sectionName: string) {
  // Accent line footer
  page.drawRectangle({ x: 48, y: 34, width: ctx.width - 96, height: 1, color: c(ctx.visPrimary), opacity: 0.15 });
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

  if (ctx.useDarkTheme || ctx.template.id === 'technical') {
    // Dark theme: near-black background with accent elements
    page.drawRectangle({ x: 0, y: 0, width, height, color: c(ctx.dark) });
    // Accent stripe at top
    page.drawRectangle({ x: 0, y: height - 4, width, height: 4, color: c(ctx.accent) });
    // Subtle vertical line
    page.drawRectangle({ x: Math.round(width * 0.75), y: 0, width: 1, height, color: c(ctx.accent), opacity: 0.08 });
  } else if (ctx.template.id === 'luxury') {
    // Luxury: warm background with border frame and accent accents
    page.drawRectangle({ x: 0, y: 0, width, height, color: c(ctx.pageBg) });
    // Inner border frame
    const m = 28;
    page.drawRectangle({ x: m, y: m, width: width - m * 2, height: height - m * 2, borderColor: c(ctx.accent), borderWidth: 0.5 });
    // Ornamental accent line at top
    page.drawRectangle({ x: width / 2 - 40, y: height - m - 16, width: 80, height: 1, color: c(ctx.accent), opacity: 0.6 });
  } else {
    // Light/brand theme: primary color background
    page.drawRectangle({ x: 0, y: 0, width, height, color: c(ctx.visPrimary) });
    // Accent stripe
    page.drawRectangle({ x: 0, y: height - 4, width, height: 4, color: c(ctx.accent) });
  }

  // Logo area — use transparent logo directly on brand color (no white box)
  const logoSize = 160;
  const logoX = (width - logoSize) / 2;
  const logoY = height / 2 + 80;
  // Use logoPng on luxury (light bg), transparent on others
  const coverLogo = ctx.template.id === 'luxury' ? ctx.logoPng : ctx.logoPngTransparent;
  page.drawImage(coverLogo, { x: logoX, y: logoY, width: logoSize, height: logoSize });

  // Cover text color: dark for luxury (light bg), white for everything else
  const coverTextColor = ctx.template.id === 'luxury' ? ctx.dark : ctx.white;

  // Brand name — use brand display font with fallback to Inter Bold
  const titleSize = 38;
  const titleFont = canFontEncode(ctx.brandDisplayFont, ctx.brandTitle) ? ctx.brandDisplayFont : ctx.fontBold;
  const titleW = titleFont.widthOfTextAtSize(ctx.brandTitle, titleSize);
  const maxTitleW = width - 96;
  const actualTitleSize = titleW > maxTitleW ? titleSize * (maxTitleW / titleW) : titleSize;
  const actualTitleW = titleFont.widthOfTextAtSize(ctx.brandTitle, actualTitleSize);
  page.drawText(ctx.brandTitle, { x: (width - actualTitleW) / 2, y: logoY - 40, size: actualTitleSize, font: titleFont, color: c(coverTextColor) });

  // Subtitle
  const subtitle = 'Brand Identity Guidelines';
  const subFont = canFontEncode(ctx.fontLight, subtitle) ? ctx.fontLight : ctx.fontRegular;
  const subW = subFont.widthOfTextAtSize(subtitle, 13);
  page.drawText(subtitle, { x: (width - subW) / 2, y: logoY - 62, size: 13, font: subFont, color: c(coverTextColor), opacity: 0.6 });

  // Tagline — with font fallback chain
  if (brief?.tagline) {
    const tagFont = canFontEncode(ctx.brandBodyFont, brief.tagline) ? ctx.brandBodyFont
      : canFontEncode(ctx.fontRegular, brief.tagline) ? ctx.fontRegular
      : null;
    if (tagFont) {
      const tagW = tagFont.widthOfTextAtSize(brief.tagline, 10);
      const maxTagW = width - 120;
      if (tagW <= maxTagW) {
        page.drawText(brief.tagline, { x: (width - tagW) / 2, y: logoY - 85, size: 10, font: tagFont, color: c(coverTextColor), opacity: 0.4 });
      }
    }
  }

  // Bottom info
  page.drawText(ctx.domainName, { x: 48, y: 28, size: 8, font: ctx.fontRegular, color: c(coverTextColor), opacity: 0.4 });
  const year = new Date().getFullYear().toString();
  page.drawText(`v1.0  ·  ${year}`, { x: width - 90, y: 28, size: 8, font: ctx.fontRegular, color: c(coverTextColor), opacity: 0.4 });

  // Luxury template: ornamental divider below tagline
  if (ctx.template.ornamentDivider) {
    page.drawRectangle({ x: width / 2 - 30, y: logoY - 100, width: 60, height: 0.5, color: c(ctx.accent), opacity: 0.5 });
  }
}

// ── Page 2: Table of Contents ───────────────────────────────────────────────

function drawTocPage(ctx: PdfContext, brief?: DesignBrief) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;

  page.drawRectangle({ x: 0, y: 0, width, height, color: c(ctx.pageBg) });
  // Top accent line
  page.drawRectangle({ x: 0, y: height - 3, width, height: 3, color: c(ctx.visPrimary) });

  page.drawText('Contents', { x: 48, y: height - 80, size: 28, font: ctx.brandDisplayFont, color: c(ctx.pageFg) });

  const baseSections = [
    { num: '01', title: 'Brand Overview', desc: 'Mission, pillars, and personality' },
  ];
  if (brief) {
    baseSections.push(
      { num: '02', title: 'Brand Story', desc: 'Tagline, tensions, pillars, and positioning' },
      { num: '03', title: 'Brand Voice', desc: 'Personality, tone, and messaging guidance' },
    );
  }
  const logoNum = brief ? '04' : '02';
  const colorNum = brief ? '05' : '03';
  baseSections.push(
    { num: logoNum, title: 'Logo System', desc: 'Usage, clear space, and restrictions' },
    { num: colorNum, title: 'Color Palette', desc: 'Primary, secondary, and functional colors' },
  );
  if (brief) {
    baseSections.push({ num: '06', title: 'Color Deep-Dive', desc: 'Full system, accessibility, and dark theme' });
  }
  const typoNum = brief ? '07' : '04';
  baseSections.push({ num: typoNum, title: 'Typography', desc: 'Type system, scale, and pairing' });
  if (brief) {
    baseSections.push({ num: '08', title: 'Imagery Direction', desc: 'Photography mood and treatment guidance' });
  }
  const appNum = brief ? '09' : '05';
  baseSections.push({ num: appNum, title: 'Applications', desc: 'Business card and letterhead' });
  if (brief) {
    baseSections.push(
      { num: '10', title: 'Digital Applications', desc: 'Website mockups, buttons, and forms' },
      { num: '11', title: 'Extended Applications', desc: 'Letterhead, email signature, and social media' },
    );
  }
  const dosNum = brief ? '12' : '06';
  baseSections.push({ num: dosNum, title: "Do's & Don'ts", desc: 'Usage guidelines' });
  const sections = baseSections;

  // Dynamic spacing: shrink when many sections to prevent overflow
  const footerY = 50; // reserve space for footer
  const availableH = (height - 140) - footerY;
  const sectionSpacing = Math.min(62, Math.floor(availableH / sections.length));

  let y = height - 140;
  sections.forEach((s) => {
    if (y < footerY) return; // safety: don't draw below footer
    page.drawText(s.num, { x: 48, y, size: 20, font: ctx.fontBold, color: c(ctx.accent), opacity: 0.4 });
    page.drawText(s.title, { x: 95, y: y + 2, size: 13, font: ctx.brandDisplayFont, color: c(ctx.pageFg) });
    page.drawText(s.desc, { x: 95, y: y - 15, size: 9, font: ctx.fontRegular, color: c(ctx.pageFg), opacity: 0.5 });
    page.drawRectangle({ x: 48, y: y - 28, width: width - 96, height: 0.5, color: c(ctx.pageFg), opacity: 0.06 });
    y -= sectionSpacing;
  });

  // Brief summary card — only show if enough space remains (skip for 10+ sections)
  if (brief && sections.length <= 9 && y > footerY + 120) {
    const cardH = 100;
    const cardY = Math.max(footerY + 10, y - cardH);
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

function drawBrandOverviewPage(ctx: PdfContext, signals: BrandSignals, brief?: DesignBrief, pageNum = 1) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Brand Overview', pageNum);

  let y = height - 90;
  const maxTextW = width - 96;

  // Tagline in large text
  if (brief?.tagline) {
    drawSectionLabel(page, ctx, 'Brand Positioning', 48, y);
    y -= 24;
    const tagLines = wrapText(`"${brief.tagline}"`, ctx.fontBold, 16, maxTextW);
    tagLines.slice(0, 2).forEach((line) => {
      page.drawText(line, { x: 48, y, size: 16, font: ctx.fontBold, color: c(ctx.visPrimary) });
      y -= 22;
    });
    y -= 4;
  }

  // Tension + Aesthetic in a subtle card
  if (brief?.tensionPair || brief?.aestheticDirection) {
    const cardH = 50;
    page.drawRectangle({ x: 48, y: y - cardH, width: maxTextW, height: cardH, color: c(ctx.lightGray) });
    page.drawRectangle({ x: 48, y: y - cardH, width: 3, height: cardH, color: c(ctx.visPrimary) });
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
      drawTextSafe(page, t.trait, { x: 56, y: traitY, size: 9, font: ctx.fontBold, color: c(ctx.visPrimary), maxWidth: 145 });
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

function drawLogoSystemPage(ctx: PdfContext, pageNum = 2) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Logo System', pageNum);

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
    // Use transparent logo on dark/brand backgrounds, regular on light
    const logoImg = i === 0 ? ctx.logoPng : ctx.logoPngTransparent;
    page.drawImage(logoImg, { x: vx + (variantW - lgSize) / 2, y: y - variantH + (variantH - lgSize) / 2, width: lgSize, height: lgSize });
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

  y -= 24;

  // Logo Size Comparison — show at different scales
  if (y > 260) {
    drawSectionLabel(page, ctx, 'Size Comparison', 48, y);
    y -= 14;
    const sizes = [
      { px: 24, label: '24px' },
      { px: 40, label: '40px' },
      { px: 64, label: '64px' },
      { px: 96, label: '96px' },
    ];
    let sx = 48;
    sizes.forEach(({ px, label }) => {
      const drawSize = Math.min(px, 96);
      page.drawImage(ctx.logoPng, { x: sx, y: y - drawSize, width: drawSize, height: drawSize });
      page.drawText(label, { x: sx + drawSize / 2 - 10, y: y - drawSize - 12, size: 7, font: ctx.fontRegular, color: c(ctx.pageFg), opacity: 0.5 });
      sx += drawSize + 28;
    });
    y -= 120;
  }

  // Incorrect Usage — 4 mini-cards showing what NOT to do
  if (y > 140) {
    drawSectionLabel(page, ctx, 'Incorrect Usage', 48, y);
    y -= 14;
    const boxW = (contentW - 36) / 4;
    const boxH = 60;
    const violations = [
      { label: 'No stretching', desc: 'Maintain aspect ratio' },
      { label: 'No recoloring', desc: 'Use approved colors' },
      { label: 'No low contrast', desc: 'Ensure legibility' },
      { label: 'No effects', desc: 'No shadows or outlines' },
    ];
    violations.forEach((v, i) => {
      const bx = 48 + i * (boxW + 12);
      page.drawRectangle({ x: bx, y: y - boxH, width: boxW, height: boxH, color: c(ctx.pageBg) });
      page.drawRectangle({ x: bx, y: y - boxH, width: boxW, height: boxH, borderColor: rgb(0.94, 0.27, 0.27), borderWidth: 0.5 });
      // Red X
      page.drawText('✕', { x: bx + boxW - 14, y: y - 14, size: 10, font: ctx.fontBold, color: rgb(0.94, 0.27, 0.27) });
      page.drawText(v.label, { x: bx + 6, y: y - 16, size: 7, font: ctx.fontBold, color: c(ctx.pageFg) });
      page.drawText(v.desc, { x: bx + 6, y: y - 30, size: 6, font: ctx.fontRegular, color: c(ctx.pageFg), opacity: 0.5 });
    });
  }

  drawPageFooter(page, ctx, 'Logo System');
}

// ── Page 5: Color Palette ───────────────────────────────────────────────────

function drawColorPalettePage(ctx: PdfContext, palette: BrandPalette, colorSystem?: ColorSystem, pageNum = 3) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Color Palette', pageNum);

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
    if (codeH > 30) {
      page.drawRectangle({ x: 48, y: y - codeH, width: contentW, height: codeH, color: rgb(0.09, 0.09, 0.11) });
      const codeInnerW = contentW - 24; // padding on both sides
      const maxLines = Math.floor((codeH - 20) / 11); // 10px top/bottom padding
      const cssLines = palette.cssVars.split('\n').slice(0, maxLines);
      cssLines.forEach((line, i) => {
        // Truncate each line to fit within the code block
        let truncated = line;
        try {
          while (truncated.length > 3 && ctx.fontRegular.widthOfTextAtSize(truncated, 7) > codeInnerW) {
            truncated = truncated.slice(0, -1);
          }
        } catch { truncated = line.slice(0, 55); }
        const textY = y - 14 - (i * 11);
        if (textY > y - codeH + 4) { // don't render below the box
          page.drawText(truncated, { x: 58, y: textY, size: 7, font: ctx.fontRegular, color: rgb(0.65, 0.85, 0.65) });
        }
      });
    }
  }

  drawPageFooter(page, ctx, 'Color Palette');
}

// ── Page 6: Typography ──────────────────────────────────────────────────────

function drawTypographyPage(ctx: PdfContext, fonts: FontPairing, signals: BrandSignals, brief?: DesignBrief, typeSystem?: TypeSystem, pageNum = 4) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Typography', pageNum);

  let y = height - 90;
  const maxTextW = width - 96;

  // Display Font — show font name prominently
  drawSectionLabel(page, ctx, `Display — ${fonts.heading.name}`, 48, y);
  y -= 42;

  // Specimen at descending sizes
  const headingSizes = [
    { size: 28, label: 'Display' },
    { size: 22, label: 'H1' },
    { size: 16, label: 'H2' },
    { size: 13, label: 'H3' },
  ];
  headingSizes.forEach(({ size, label }) => {
    drawTextSafe(page, ctx.brandTitle, { x: 48, y, size, font: ctx.brandDisplayFont, color: c(ctx.dark), maxWidth: maxTextW - 50 });
    page.drawText(label, { x: width - 70, y: y + 2, size: 7, font: ctx.fontLight, color: rgb(0.55, 0.55, 0.55) });
    y -= size + 10;
  });

  y -= 8;

  // Body Font — use brand body font for specimen
  if (y > 280) {
    drawSectionLabel(page, ctx, `Body — ${fonts.body.name}`, 48, y);
    y -= 20;
    const sampleText = brief
      ? `${ctx.brandTitle} operates in the ${brief.sectorClassification} space. The brand embodies "${brief.tensionPair}" — balancing precision with personality across every touchpoint.`
      : `${ctx.brandTitle} is built for the ${signals.industry} space. Every design decision reinforces the brand's position.`;
    const bodyLines = wrapText(sampleText, ctx.brandBodyFont, 10, maxTextW);
    bodyLines.slice(0, 4).forEach((line) => {
      page.drawText(line, { x: 48, y, size: 10, font: ctx.brandBodyFont, color: c(ctx.dark) });
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

function drawApplicationsPage(ctx: PdfContext, palette: BrandPalette, brief?: DesignBrief, pageNum = 5) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Applications', pageNum);

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
  drawTextSafe(page, ctx.brandTitle, { x: 64, y: y - 66, size: 10, font: ctx.brandDisplayFont, color: c(ctx.dark), maxWidth: cardW - 32 });
  const contact = getSectorContact(brief?.sectorClassification || '');
  page.drawText(`${contact.name}  ·  ${contact.title}`, { x: 64, y: y - 80, size: 7, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
  page.drawText(`${contact.email}@${ctx.domainName}`, { x: 64, y: y - 94, size: 7, font: ctx.fontRegular, color: c(ctx.visPrimary) });

  // Back
  const backX = 48 + cardW + 20;
  page.drawRectangle({ x: backX, y: y - cardH, width: cardW, height: cardH, color: c(ctx.visPrimary) });
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
    page.drawRectangle({ x: lhX + 14, y: y - lhH + 18, width: lhW - 28, height: 0.5, color: c(ctx.visPrimary), opacity: 0.3 });
    page.drawText(`${ctx.domainName}`, { x: lhX + 14, y: y - lhH + 8, size: 6, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
    y -= lhH + 24;
  }

  // Additional collateral: email signature, social avatar, favicon
  if (y > 180) {
    const colW = (contentW - 24) / 3;

    // Email Signature mockup
    drawSectionLabel(page, ctx, 'Email Signature', 48, y);
    const sigH = 60;
    const sigY = y - 14;
    page.drawRectangle({ x: 48, y: sigY - sigH, width: colW, height: sigH, color: c(ctx.white) });
    page.drawRectangle({ x: 48, y: sigY - sigH, width: colW, height: sigH, borderColor: rgb(0.88, 0.88, 0.88), borderWidth: 0.3 });
    page.drawRectangle({ x: 48, y: sigY, width: colW, height: 2, color: c(ctx.accent) });
    const sigContact = getSectorContact(brief?.sectorClassification || '');
    page.drawImage(ctx.logoPng, { x: 54, y: sigY - 24, width: 18, height: 18 });
    page.drawText(sigContact.name, { x: 78, y: sigY - 14, size: 7, font: ctx.fontBold, color: c(ctx.dark) });
    drawTextSafe(page, sigContact.title, { x: 78, y: sigY - 24, size: 6, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5), maxWidth: colW - 36 });
    page.drawText(`${sigContact.email}@${ctx.domainName}`, { x: 54, y: sigY - sigH + 10, size: 6, font: ctx.fontRegular, color: c(ctx.visPrimary) });

    // Social Avatar (circle crop preview)
    const avatarX = 48 + colW + 12;
    drawSectionLabel(page, ctx, 'Social Avatar', avatarX, y);
    const avatarSize = 48;
    const avatarCenterX = avatarX + colW / 2;
    const avatarCenterY = sigY - sigH / 2;
    // Circle background
    page.drawCircle({ x: avatarCenterX, y: avatarCenterY, size: avatarSize / 2, color: c(ctx.visPrimary) });
    page.drawImage(ctx.logoPngTransparent, {
      x: avatarCenterX - avatarSize * 0.35, y: avatarCenterY - avatarSize * 0.35,
      width: avatarSize * 0.7, height: avatarSize * 0.7,
    });
    page.drawText('Profile picture', { x: avatarX, y: sigY - sigH - 12, size: 6, font: ctx.fontRegular, color: c(ctx.pageFg), opacity: 0.5 });

    // Favicon Preview (multiple sizes)
    const favX = avatarX + colW + 12;
    drawSectionLabel(page, ctx, 'Favicon', favX, y);
    const favSizes = [16, 24, 32, 48];
    let fx = favX;
    favSizes.forEach((sz) => {
      const drawSz = Math.min(sz, 48);
      page.drawRectangle({ x: fx, y: sigY - drawSz - 4, width: drawSz, height: drawSz, color: c(ctx.lightGray) });
      page.drawImage(ctx.logoPng, { x: fx + 1, y: sigY - drawSz - 3, width: drawSz - 2, height: drawSz - 2 });
      page.drawText(`${sz}px`, { x: fx, y: sigY - drawSz - 16, size: 5, font: ctx.fontRegular, color: c(ctx.pageFg), opacity: 0.5 });
      fx += drawSz + 10;
    });
  }

  drawPageFooter(page, ctx, 'Applications');
}

// ── Brand Story Page ─────────────────────────────────────────────────────────

function drawBrandStoryPage(ctx: PdfContext, brief: DesignBrief, pageNum = 2) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Brand Story', pageNum);

  let y = height - 90;
  const maxTextW = width - 96;

  // Hero quote: brand name + tagline
  drawSectionLabel(page, ctx, 'Brand Positioning', 48, y);
  y -= 28;
  drawTextSafe(page, ctx.brandTitle, { x: 48, y, size: 28, font: ctx.brandDisplayFont, color: c(ctx.visPrimary), maxWidth: maxTextW });
  y -= 36;
  if (brief.tagline) {
    const tagLines = wrapText(`"${brief.tagline}"`, ctx.fontLight, 14, maxTextW);
    tagLines.slice(0, 2).forEach((line) => {
      page.drawText(line, { x: 48, y, size: 14, font: ctx.fontLight, color: c(ctx.pageFg), opacity: 0.7 });
      y -= 20;
    });
  }
  y -= 12;

  // Tension pair as pull-quote
  if (brief.tensionPair) {
    const tensionH = 50;
    page.drawRectangle({ x: 48, y: y - tensionH, width: maxTextW, height: tensionH, color: c(ctx.visPrimary), opacity: 0.08 });
    page.drawRectangle({ x: 48, y: y - tensionH, width: 4, height: tensionH, color: c(ctx.accent) });
    drawTextSafe(page, `"${brief.tensionPair}"`, { x: 68, y: y - 20, size: 13, font: ctx.brandDisplayFont, color: c(ctx.pageFg), maxWidth: maxTextW - 40 });
    page.drawText('Brand Tension', { x: 68, y: y - 38, size: 8, font: ctx.fontRegular, color: c(ctx.pageFg), opacity: 0.5 });
    y -= tensionH + 20;
  }

  // Pillars as 3 cards
  if (brief.brandPillars && brief.brandPillars.length > 0 && y > 300) {
    drawSectionLabel(page, ctx, 'Brand Pillars', 48, y);
    y -= 20;
    const pillarCount = Math.min(brief.brandPillars.length, 3);
    const pillarW = (maxTextW - (pillarCount - 1) * 12) / pillarCount;
    const pillarH = 90;
    brief.brandPillars.slice(0, pillarCount).forEach((pillar, i) => {
      const px = 48 + i * (pillarW + 12);
      page.drawRectangle({ x: px, y: y - pillarH, width: pillarW, height: pillarH, color: c(ctx.lightGray) });
      page.drawRectangle({ x: px, y: y, width: pillarW, height: 3, color: c(ctx.accent) });
      drawTextSafe(page, pillar.name, { x: px + 12, y: y - 18, size: 11, font: ctx.fontBold, color: c(ctx.dark), maxWidth: pillarW - 24 });
      const descLines = wrapText(pillar.description, ctx.fontRegular, 8, pillarW - 24);
      descLines.slice(0, 4).forEach((line, li) => {
        page.drawText(line, { x: px + 12, y: y - 36 - (li * 12), size: 8, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
      });
    });
    y -= pillarH + 24;
  }

  // Target audience
  if (brief.targetAudienceSummary && y > 180) {
    drawSectionLabel(page, ctx, 'Target Audience', 48, y);
    y -= 18;
    const audienceLines = wrapText(brief.targetAudienceSummary, ctx.fontRegular, 10, maxTextW);
    audienceLines.slice(0, 5).forEach((line) => {
      if (y < 60) return;
      page.drawText(line, { x: 48, y, size: 10, font: ctx.fontRegular, color: rgb(0.3, 0.3, 0.3) });
      y -= 15;
    });
    y -= 10;
  }

  // Competitive differentiation
  if (brief.competitiveDifferentiation && y > 120) {
    drawSectionLabel(page, ctx, 'Differentiation', 48, y);
    y -= 18;
    const diffLines = wrapText(brief.competitiveDifferentiation, ctx.fontRegular, 9, maxTextW);
    diffLines.slice(0, 4).forEach((line) => {
      if (y < 60) return;
      page.drawText(line, { x: 48, y, size: 9, font: ctx.fontRegular, color: rgb(0.35, 0.35, 0.35) });
      y -= 13;
    });
  }

  drawPageFooter(page, ctx, 'Brand Story');
}

// ── Brand Voice Page ─────────────────────────────────────────────────────────

function drawBrandVoicePage(ctx: PdfContext, brief: DesignBrief, signals: BrandSignals, pageNum = 3) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Brand Voice', pageNum);

  let y = height - 90;
  const maxTextW = width - 96;

  // Personality traits as trait ↔ counterbalance grid
  if (brief.personalityTraits && brief.personalityTraits.length > 0) {
    drawSectionLabel(page, ctx, 'Personality Spectrum', 48, y);
    y -= 24;

    // Table header
    const colTrait = 48;
    const colBar = 210;
    const colCounter = 340;
    page.drawRectangle({ x: colTrait, y: y - 4, width: maxTextW, height: 18, color: c(ctx.lightGray) });
    page.drawText('TRAIT', { x: colTrait + 8, y: y, size: 7, font: ctx.fontBold, color: c(ctx.pageFg), opacity: 0.6 });
    page.drawText('COUNTERBALANCE', { x: colCounter + 8, y: y, size: 7, font: ctx.fontBold, color: c(ctx.pageFg), opacity: 0.6 });
    y -= 22;

    brief.personalityTraits.slice(0, 5).forEach((t) => {
      if (y < 100) return;
      // Trait side
      drawTextSafe(page, t.trait, { x: colTrait + 8, y, size: 10, font: ctx.fontBold, color: c(ctx.visPrimary), maxWidth: 150 });
      // Visual bar between
      page.drawRectangle({ x: colBar, y: y + 2, width: 120, height: 8, color: c(ctx.lightGray) });
      page.drawRectangle({ x: colBar, y: y + 2, width: 70, height: 8, color: c(ctx.accent), opacity: 0.5 });
      // Counterbalance side
      drawTextSafe(page, t.counterbalance, { x: colCounter + 8, y, size: 10, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4), maxWidth: 150 });
      page.drawRectangle({ x: colTrait, y: y - 10, width: maxTextW, height: 0.3, color: c(ctx.pageFg), opacity: 0.08 });
      y -= 28;
    });
    y -= 12;
  }

  // Tone descriptors
  if (y > 360) {
    drawSectionLabel(page, ctx, 'Tone of Voice', 48, y);
    y -= 20;
    const toneDesc = brief.tensionPair
      ? `The brand voice lives in the tension of "${brief.tensionPair}". Communications should feel ${signals.tone}, anchored in ${brief.aestheticDirection.toLowerCase()} principles.`
      : `The brand voice is ${signals.tone}, with undertones of ${signals.subTone || 'confidence'}.`;
    const toneLines = wrapText(toneDesc, ctx.fontRegular, 10, maxTextW);
    toneLines.slice(0, 3).forEach((line) => {
      page.drawText(line, { x: 48, y, size: 10, font: ctx.fontRegular, color: rgb(0.3, 0.3, 0.3) });
      y -= 15;
    });
    y -= 14;
  }

  // "We say / We don't say" table derived from tension + aesthetic
  if (y > 220) {
    drawSectionLabel(page, ctx, 'Messaging Guidance', 48, y);
    y -= 20;

    const halfW = (maxTextW - 16) / 2;

    // "We say" header
    page.drawRectangle({ x: 48, y: y - 4, width: halfW, height: 20, color: rgb(0.13, 0.77, 0.37), opacity: 0.12 });
    page.drawText('WE SAY', { x: 56, y: y, size: 8, font: ctx.fontBold, color: rgb(0.13, 0.65, 0.30) });

    // "We don't say" header
    page.drawRectangle({ x: 48 + halfW + 16, y: y - 4, width: halfW, height: 20, color: rgb(0.94, 0.27, 0.27), opacity: 0.12 });
    page.drawText("WE DON'T SAY", { x: 56 + halfW + 16, y: y, size: 8, font: ctx.fontBold, color: rgb(0.85, 0.20, 0.20) });
    y -= 28;

    // Derive messaging from tension pair and traits
    const tension = brief.tensionPair || '';
    const parts = tension.split(/\bbut\b/i).map(s => s.trim());
    const quality1 = parts[0] || signals.tone;
    const quality2 = parts[1] || signals.subTone || 'approachable';

    const weSay = [
      `${quality1.charAt(0).toUpperCase() + quality1.slice(1)} and clear`,
      `Confident yet ${quality2.toLowerCase()}`,
      'Direct with purpose',
      'Human and authentic',
    ];
    const weDontSay = [
      'Overly casual or sloppy',
      'Cold or corporate jargon',
      'Vague or wishy-washy',
      'Hyperbolic or salesy',
    ];

    weSay.forEach((item, i) => {
      if (y < 80) return;
      page.drawRectangle({ x: 48, y: y - 3, width: 6, height: 6, color: rgb(0.13, 0.77, 0.37) });
      page.drawText(item, { x: 62, y, size: 9, font: ctx.fontRegular, color: rgb(0.3, 0.3, 0.3) });
      if (weDontSay[i]) {
        page.drawRectangle({ x: 48 + halfW + 16, y: y - 3, width: 6, height: 6, color: rgb(0.94, 0.27, 0.27) });
        page.drawText(weDontSay[i], { x: 62 + halfW + 16, y, size: 9, font: ctx.fontRegular, color: rgb(0.3, 0.3, 0.3) });
      }
      y -= 18;
    });
  }

  drawPageFooter(page, ctx, 'Brand Voice');
}

// ── Imagery Direction Page ───────────────────────────────────────────────────

function drawImageryDirectionPage(ctx: PdfContext, brief: DesignBrief, pageNum = 8) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Imagery Direction', pageNum);

  let y = height - 90;
  const maxTextW = width - 96;

  // Photography mood
  drawSectionLabel(page, ctx, 'Photography Mood', 48, y);
  y -= 22;

  const aesthetic = brief.aestheticDirection.toLowerCase();
  const isWarm = /warm|organic|soft|gentle|natural/.test(aesthetic);
  const isCool = /cool|technical|minimal|swiss|brutal/.test(aesthetic);
  const mood = isWarm ? 'Warm, natural lighting with soft shadows and authentic moments'
    : isCool ? 'Clean, controlled lighting with precise composition and sharp focus'
    : 'Balanced lighting with intentional composition and brand-aligned subjects';

  const moodLines = wrapText(mood, ctx.fontRegular, 11, maxTextW);
  moodLines.forEach((line) => {
    page.drawText(line, { x: 48, y, size: 11, font: ctx.fontRegular, color: c(ctx.pageFg) });
    y -= 16;
  });
  y -= 16;

  // Subject matter guidance
  drawSectionLabel(page, ctx, 'Subject Matter', 48, y);
  y -= 20;

  const sector = brief.sectorClassification.toLowerCase();
  const subjects = [
    { label: 'People', desc: sector.includes('tech') ? 'Diverse teams collaborating, candid work moments' : sector.includes('food') ? 'Artisans at work, community gatherings' : 'Real people in authentic settings' },
    { label: 'Environment', desc: sector.includes('tech') ? 'Clean workspaces, modern architecture' : sector.includes('nature') || sector.includes('wellness') ? 'Natural landscapes, organic textures' : 'Brand-relevant spaces and contexts' },
    { label: 'Product', desc: 'Hero shots with consistent styling and clear brand presence' },
    { label: 'Abstract', desc: 'Textures and patterns that reinforce the brand aesthetic' },
  ];

  const cardW = (maxTextW - 12) / 2;
  const cardH = 70;
  subjects.forEach((subj, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = 48 + col * (cardW + 12);
    const sy = y - row * (cardH + 12);
    if (sy - cardH < 60) return;
    page.drawRectangle({ x: sx, y: sy - cardH, width: cardW, height: cardH, color: c(ctx.lightGray) });
    page.drawRectangle({ x: sx, y: sy, width: cardW, height: 3, color: c(ctx.accent) });
    drawTextSafe(page, subj.label, { x: sx + 12, y: sy - 18, size: 10, font: ctx.fontBold, color: c(ctx.dark), maxWidth: cardW - 24 });
    const descLines = wrapText(subj.desc, ctx.fontRegular, 8, cardW - 24);
    descLines.slice(0, 3).forEach((line, li) => {
      page.drawText(line, { x: sx + 12, y: sy - 34 - (li * 11), size: 8, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
    });
  });
  y -= 2 * (cardH + 12) + 16;

  // Treatment guidance
  if (y > 200) {
    drawSectionLabel(page, ctx, 'Treatment & Processing', 48, y);
    y -= 20;

    const treatments = [
      { label: 'Temperature', value: isWarm ? 'Warm tones, amber highlights' : isCool ? 'Cool tones, blue-tinted shadows' : 'Neutral, true-to-life color' },
      { label: 'Contrast', value: /bold|brutal|technical/.test(aesthetic) ? 'High contrast, deep blacks' : /soft|gentle|organic/.test(aesthetic) ? 'Low contrast, lifted blacks' : 'Medium contrast, balanced' },
      { label: 'Saturation', value: /vibrant|bold/.test(aesthetic) ? 'Rich, saturated colors' : /muted|minimal|editorial/.test(aesthetic) ? 'Desaturated, muted palette' : 'Natural saturation' },
      { label: 'Composition', value: /minimal|swiss/.test(aesthetic) ? 'Grid-aligned, generous whitespace' : /organic|natural/.test(aesthetic) ? 'Organic framing, asymmetric balance' : 'Rule of thirds, intentional cropping' },
    ];

    treatments.forEach((t) => {
      if (y < 80) return;
      page.drawText(t.label, { x: 48, y, size: 9, font: ctx.fontBold, color: c(ctx.dark) });
      drawTextSafe(page, t.value, { x: 160, y, size: 9, font: ctx.fontRegular, color: rgb(0.35, 0.35, 0.35), maxWidth: maxTextW - 120 });
      page.drawRectangle({ x: 48, y: y - 8, width: maxTextW, height: 0.3, color: c(ctx.pageFg), opacity: 0.06 });
      y -= 20;
    });
  }

  drawPageFooter(page, ctx, 'Imagery Direction');
}

// ── Color Deep-Dive Page ─────────────────────────────────────────────────────

function drawColorDeepDivePage(ctx: PdfContext, colorSystem: ColorSystem, palette: BrandPalette, pageNum = 6) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Color Deep-Dive', pageNum);

  let y = height - 90;
  const maxTextW = width - 96;

  // Full system colors with all 4 formats
  drawSectionLabel(page, ctx, 'System Colors', 48, y);
  y -= 14;

  const sysColors = [
    { label: 'Background', spec: colorSystem.system.background },
    { label: 'Surface', spec: colorSystem.system.surface },
    { label: 'Foreground', spec: colorSystem.system.foreground },
    { label: 'Muted', spec: colorSystem.system.muted },
    { label: 'Border', spec: colorSystem.system.border },
    { label: 'Accent', spec: colorSystem.system.accent },
  ];

  const colW = (maxTextW - 10) / 3;
  sysColors.forEach((sc, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const sx = 48 + col * (colW + 5);
    const sy = y - row * 68;
    const swRgb = hexToRgb(sc.spec.hex);
    const isDark = luminance(swRgb) < 0.5;
    const textColor = isDark ? ctx.white : { r: 0.1, g: 0.1, b: 0.1 };

    page.drawRectangle({ x: sx, y: sy - 30, width: colW, height: 30, color: c(swRgb) });
    page.drawText(sc.label, { x: sx + 6, y: sy - 14, size: 7, font: ctx.fontBold, color: c(textColor) });
    page.drawText(sc.spec.hex, { x: sx + 6, y: sy - 24, size: 6, font: ctx.fontRegular, color: c(textColor), opacity: 0.8 });
    // Specs below swatch
    page.drawText(sc.spec.rgb, { x: sx, y: sy - 40, size: 5.5, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
    page.drawText(sc.spec.hsl, { x: sx, y: sy - 49, size: 5.5, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
    page.drawText(sc.spec.cmyk, { x: sx, y: sy - 58, size: 5.5, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
  });
  y -= 2 * 68 + 16;

  // Accessibility table
  if (colorSystem.accessibility.length > 0 && y > 300) {
    drawSectionLabel(page, ctx, 'Accessibility Matrix', 48, y);
    y -= 16;

    // Table header
    page.drawRectangle({ x: 48, y: y - 4, width: maxTextW, height: 18, color: c(ctx.lightGray) });
    page.drawText('Color Pair', { x: 56, y: y, size: 7, font: ctx.fontBold, color: c(ctx.dark) });
    page.drawText('Ratio', { x: 260, y: y, size: 7, font: ctx.fontBold, color: c(ctx.dark) });
    page.drawText('AA', { x: 330, y: y, size: 7, font: ctx.fontBold, color: c(ctx.dark) });
    page.drawText('AAA', { x: 380, y: y, size: 7, font: ctx.fontBold, color: c(ctx.dark) });
    y -= 20;

    colorSystem.accessibility.forEach((check) => {
      if (y < 120) return;
      drawTextSafe(page, check.pair, { x: 56, y, size: 8, font: ctx.fontRegular, color: rgb(0.3, 0.3, 0.3), maxWidth: 195 });
      page.drawText(`${check.ratio}:1`, { x: 260, y, size: 8, font: ctx.fontRegular, color: rgb(0.3, 0.3, 0.3) });
      page.drawRectangle({ x: 330, y: y - 2, width: 8, height: 8, color: check.aaPass ? rgb(0.13, 0.77, 0.37) : rgb(0.94, 0.27, 0.27) });
      page.drawText(check.aaPass ? 'Pass' : 'Fail', { x: 342, y, size: 7, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
      page.drawRectangle({ x: 380, y: y - 2, width: 8, height: 8, color: check.aaaPass ? rgb(0.13, 0.77, 0.37) : rgb(0.94, 0.27, 0.27) });
      page.drawText(check.aaaPass ? 'Pass' : 'Fail', { x: 392, y, size: 7, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
      page.drawRectangle({ x: 48, y: y - 8, width: maxTextW, height: 0.3, color: c(ctx.pageFg), opacity: 0.06 });
      y -= 18;
    });
    y -= 12;
  }

  // Proportions bar chart
  if (y > 200) {
    drawSectionLabel(page, ctx, 'Usage Proportions', 48, y);
    y -= 16;

    const barH = 32;
    const props = colorSystem.proportions;
    const segments = [
      { pct: props.background, color: hexToRgb(colorSystem.system.background.hex), label: `Background ${props.background}%` },
      { pct: props.surface, color: hexToRgb(colorSystem.system.surface.hex), label: `Surface ${props.surface}%` },
      { pct: props.foreground, color: hexToRgb(colorSystem.system.foreground.hex), label: `Foreground ${props.foreground}%` },
      { pct: props.accent, color: hexToRgb(colorSystem.system.accent.hex), label: `Accent ${props.accent}%` },
    ];

    let bx = 48;
    segments.forEach((seg) => {
      const segW = maxTextW * seg.pct / 100;
      page.drawRectangle({ x: bx, y: y - barH, width: segW, height: barH, color: c(seg.color) });
      if (segW > 50) {
        const isDk = luminance(seg.color) < 0.5;
        page.drawText(`${seg.pct}%`, { x: bx + 6, y: y - barH / 2 - 3, size: 7, font: ctx.fontBold, color: isDk ? c(ctx.white) : rgb(0.1, 0.1, 0.1) });
      }
      bx += segW;
    });
    y -= barH + 10;
    page.drawText(segments.map(s => s.label).join('   '), { x: 48, y, size: 7, font: ctx.fontRegular, color: rgb(0.45, 0.45, 0.45) });
    y -= 24;
  }

  // Dark theme preview
  if (y > 120) {
    drawSectionLabel(page, ctx, `Theme: ${colorSystem.theme === 'dark' ? 'Dark' : 'Light'}`, 48, y);
    y -= 14;
    const previewH = Math.min(60, y - 60);
    const bg = hexToRgb(colorSystem.system.background.hex);
    const fg = hexToRgb(colorSystem.system.foreground.hex);
    const accent = hexToRgb(colorSystem.system.accent.hex);
    page.drawRectangle({ x: 48, y: y - previewH, width: maxTextW, height: previewH, color: c(bg) });
    page.drawText('Heading Text', { x: 64, y: y - 20, size: 12, font: ctx.brandDisplayFont, color: c(fg) });
    page.drawText('Body text preview in theme colors', { x: 64, y: y - 36, size: 9, font: ctx.fontRegular, color: c(fg), opacity: 0.7 });
    page.drawRectangle({ x: maxTextW - 60, y: y - previewH + 12, width: 80, height: 24, color: c(accent) });
    const isDkAccent = luminance(accent) < 0.5;
    page.drawText('Button', { x: maxTextW - 42, y: y - previewH + 20, size: 8, font: ctx.fontBold, color: isDkAccent ? c(ctx.white) : rgb(0.1, 0.1, 0.1) });
  }

  drawPageFooter(page, ctx, 'Color Deep-Dive');
}

// ── Digital Applications Page ────────────────────────────────────────────────

function drawDigitalApplicationsPage(ctx: PdfContext, palette: BrandPalette, brief: DesignBrief, pageNum = 10) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Digital Applications', pageNum);

  let y = height - 90;
  const maxTextW = width - 96;

  // Website header mockup
  drawSectionLabel(page, ctx, 'Website Header', 48, y);
  y -= 14;

  const headerH = 70;
  page.drawRectangle({ x: 48, y: y - headerH, width: maxTextW, height: headerH, color: c(ctx.white) });
  page.drawRectangle({ x: 48, y: y - headerH, width: maxTextW, height: headerH, borderColor: rgb(0.88, 0.88, 0.88), borderWidth: 0.5 });
  // Logo in header
  page.drawImage(ctx.logoPng, { x: 62, y: y - 38, width: 28, height: 28 });
  drawTextSafe(page, ctx.brandTitle, { x: 96, y: y - 28, size: 10, font: ctx.brandDisplayFont, color: c(ctx.dark), maxWidth: 120 });
  // Nav items
  const navItems = ['Home', 'About', 'Services', 'Contact'];
  let navX = maxTextW - 140;
  navItems.forEach((item) => {
    page.drawText(item, { x: navX, y: y - 28, size: 7, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
    navX += 40;
  });
  // CTA button
  page.drawRectangle({ x: maxTextW - 20, y: y - 36, width: 56, height: 22, color: c(ctx.visPrimary) });
  const ctaColor = luminance(ctx.visPrimary) < 0.5 ? ctx.white : { r: 0.1, g: 0.1, b: 0.1 };
  page.drawText('Get Started', { x: maxTextW - 12, y: y - 30, size: 6, font: ctx.fontBold, color: c(ctaColor) });

  y -= headerH + 24;

  // Button states
  if (y > 420) {
    drawSectionLabel(page, ctx, 'Button States', 48, y);
    y -= 20;

    const btnW = 100;
    const btnH = 30;
    const btnGap = 16;
    const states = [
      { label: 'Default', bgColor: ctx.visPrimary, opacity: 1 },
      { label: 'Hover', bgColor: ctx.accent, opacity: 1 },
      { label: 'Disabled', bgColor: ctx.lightGray, opacity: 0.5 },
    ];

    states.forEach((state, i) => {
      const bx = 48 + i * (btnW + btnGap);
      page.drawRectangle({ x: bx, y: y - btnH, width: btnW, height: btnH, color: c(state.bgColor), opacity: state.opacity });
      const isDk = luminance(state.bgColor) < 0.5;
      const btnText = isDk ? ctx.white : { r: 0.1, g: 0.1, b: 0.1 };
      page.drawText('Button Text', { x: bx + 18, y: y - btnH / 2 - 4, size: 8, font: ctx.fontBold, color: c(btnText) });
      page.drawText(state.label, { x: bx + btnW / 2 - 16, y: y - btnH - 14, size: 7, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
    });
    y -= btnH + 36;
  }

  // Form input preview
  if (y > 300) {
    drawSectionLabel(page, ctx, 'Form Elements', 48, y);
    y -= 20;

    const inputW = maxTextW * 0.6;
    const inputH = 28;

    // Label
    page.drawText('Email Address', { x: 48, y, size: 8, font: ctx.fontBold, color: c(ctx.dark) });
    y -= 14;

    // Input field
    page.drawRectangle({ x: 48, y: y - inputH, width: inputW, height: inputH, color: c(ctx.white) });
    page.drawRectangle({ x: 48, y: y - inputH, width: inputW, height: inputH, borderColor: rgb(0.8, 0.8, 0.82), borderWidth: 1 });
    page.drawText('you@example.com', { x: 58, y: y - inputH / 2 - 4, size: 8, font: ctx.fontRegular, color: rgb(0.6, 0.6, 0.6) });
    y -= inputH + 12;

    // Focused input
    page.drawText('Password', { x: 48, y, size: 8, font: ctx.fontBold, color: c(ctx.dark) });
    y -= 14;
    page.drawRectangle({ x: 48, y: y - inputH, width: inputW, height: inputH, color: c(ctx.white) });
    page.drawRectangle({ x: 48, y: y - inputH, width: inputW, height: inputH, borderColor: c(ctx.visPrimary), borderWidth: 1.5 });
    page.drawText('••••••••', { x: 58, y: y - inputH / 2 - 4, size: 10, font: ctx.fontRegular, color: c(ctx.dark) });
    y -= inputH + 20;
  }

  // Card component preview
  if (y > 180) {
    drawSectionLabel(page, ctx, 'Card Component', 48, y);
    y -= 14;

    const cardW = maxTextW * 0.5;
    const cardH = 100;
    page.drawRectangle({ x: 48, y: y - cardH, width: cardW, height: cardH, color: c(ctx.white) });
    page.drawRectangle({ x: 48, y: y - cardH, width: cardW, height: cardH, borderColor: rgb(0.9, 0.9, 0.9), borderWidth: 0.5 });
    page.drawRectangle({ x: 48, y: y, width: cardW, height: 3, color: c(ctx.accent) });
    page.drawText('Card Title', { x: 62, y: y - 24, size: 11, font: ctx.brandDisplayFont, color: c(ctx.dark) });
    const cardText = 'A sample card component showing the brand design system applied to a common UI pattern.';
    const cardLines = wrapText(cardText, ctx.fontRegular, 8, cardW - 28);
    cardLines.slice(0, 3).forEach((line, li) => {
      page.drawText(line, { x: 62, y: y - 42 - (li * 12), size: 8, font: ctx.fontRegular, color: rgb(0.4, 0.4, 0.4) });
    });
    page.drawText('Learn more →', { x: 62, y: y - cardH + 14, size: 8, font: ctx.fontBold, color: c(ctx.visPrimary) });
  }

  drawPageFooter(page, ctx, 'Digital Applications');
}

// ── Extended Applications Page ───────────────────────────────────────────────

function drawExtendedApplicationsPage(ctx: PdfContext, palette: BrandPalette, brief: DesignBrief, pageNum = 11) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, 'Extended Applications', pageNum);

  let y = height - 90;
  const maxTextW = width - 96;

  // Letterhead mockup
  drawSectionLabel(page, ctx, 'Letterhead', 48, y);
  y -= 14;

  const lhW = maxTextW * 0.55;
  const lhH = 180;
  const lhX = 48;

  page.drawRectangle({ x: lhX, y: y - lhH, width: lhW, height: lhH, color: c(ctx.white) });
  page.drawRectangle({ x: lhX, y: y - lhH, width: lhW, height: lhH, borderColor: rgb(0.88, 0.88, 0.88), borderWidth: 0.3 });
  page.drawRectangle({ x: lhX, y: y - 2.5, width: lhW, height: 2.5, color: c(ctx.accent) });
  page.drawImage(ctx.logoPng, { x: lhX + 14, y: y - 36, width: 26, height: 26 });
  for (let i = 0; i < 7; i++) {
    const lw = i === 0 ? lhW * 0.45 : lhW * (0.4 + Math.random() * 0.35);
    page.drawRectangle({ x: lhX + 14, y: y - 55 - (i * 12), width: Math.min(lw, lhW - 28), height: 4, color: c(ctx.dark), opacity: 0.06 });
  }
  page.drawRectangle({ x: lhX + 14, y: y - lhH + 18, width: lhW - 28, height: 0.5, color: c(ctx.visPrimary), opacity: 0.3 });
  page.drawText(ctx.domainName, { x: lhX + 14, y: y - lhH + 8, size: 5, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });

  // Envelope mockup beside letterhead
  const envX = lhX + lhW + 20;
  const envW = maxTextW - lhW - 20;
  const envH = 70;
  drawSectionLabel(page, ctx, 'Envelope', envX, y);
  const envTopY = y - 14;
  page.drawRectangle({ x: envX, y: envTopY - envH, width: envW, height: envH, color: c(ctx.white) });
  page.drawRectangle({ x: envX, y: envTopY - envH, width: envW, height: envH, borderColor: rgb(0.88, 0.88, 0.88), borderWidth: 0.3 });
  page.drawRectangle({ x: envX, y: envTopY, width: envW, height: 2, color: c(ctx.accent) });
  page.drawImage(ctx.logoPng, { x: envX + 8, y: envTopY - 22, width: 14, height: 14 });
  page.drawText(ctx.domainName, { x: envX + 26, y: envTopY - 16, size: 5, font: ctx.fontRegular, color: c(ctx.dark) });

  y -= lhH + 30;

  // Email signature preview
  if (y > 340) {
    drawSectionLabel(page, ctx, 'Email Signature', 48, y);
    y -= 14;

    const sigW = maxTextW * 0.6;
    const sigH = 80;
    page.drawRectangle({ x: 48, y: y - sigH, width: sigW, height: sigH, color: c(ctx.white) });
    page.drawRectangle({ x: 48, y: y - sigH, width: sigW, height: sigH, borderColor: rgb(0.88, 0.88, 0.88), borderWidth: 0.3 });
    // Divider line at top
    page.drawRectangle({ x: 48, y: y, width: sigW, height: 2, color: c(ctx.accent) });
    const contact = getSectorContact(brief.sectorClassification);
    page.drawImage(ctx.logoPng, { x: 60, y: y - 40, width: 30, height: 30 });
    page.drawText(contact.name, { x: 100, y: y - 16, size: 9, font: ctx.fontBold, color: c(ctx.dark) });
    page.drawText(contact.title, { x: 100, y: y - 28, size: 7, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
    page.drawText(`${contact.email}@${ctx.domainName}`, { x: 100, y: y - 40, size: 7, font: ctx.fontRegular, color: c(ctx.visPrimary) });
    page.drawText(`${ctx.domainName}.com  |  +1 (555) 000-0000`, { x: 60, y: y - sigH + 12, size: 6, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });

    y -= sigH + 24;
  }

  // Social media grid (4 platform previews)
  if (y > 180) {
    drawSectionLabel(page, ctx, 'Social Media Profiles', 48, y);
    y -= 14;

    const platforms = [
      { name: 'LinkedIn', size: '1200×628' },
      { name: 'Twitter/X', size: '1500×500' },
      { name: 'Instagram', size: '1080×1080' },
      { name: 'Facebook', size: '820×312' },
    ];

    const gridW = (maxTextW - 12) / 2;
    const gridH = 50;
    platforms.forEach((p, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const gx = 48 + col * (gridW + 12);
      const gy = y - row * (gridH + 16);
      if (gy - gridH < 60) return;

      page.drawRectangle({ x: gx, y: gy - gridH, width: gridW, height: gridH, color: c(ctx.visPrimary), opacity: 0.15 });
      page.drawImage(ctx.logoPngTransparent, { x: gx + gridW / 2 - 12, y: gy - gridH / 2 - 10, width: 24, height: 24 });
      page.drawText(p.name, { x: gx + 4, y: gy - gridH - 12, size: 7, font: ctx.fontBold, color: c(ctx.pageFg) });
      page.drawText(p.size, { x: gx + gridW - 50, y: gy - gridH - 12, size: 6, font: ctx.fontRegular, color: rgb(0.5, 0.5, 0.5) });
    });
  }

  drawPageFooter(page, ctx, 'Extended Applications');
}

// ── Page: Do's & Don'ts ─────────────────────────────────────────────────────

function drawDosDontsPage(ctx: PdfContext, palette: BrandPalette, brief?: DesignBrief, pageNum = 6) {
  const page = ctx.pdfDoc.addPage(PageSizes.A4);
  const { width, height } = ctx;
  drawPageHeader(page, ctx, "Do's & Don'ts", pageNum);

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

  // Quick Reference Card — only draw if enough room above footer (footer at y~34)
  const footerClearance = 50;
  const qrCardH = 100;
  if (y - qrCardH > footerClearance) {
    const cardColor = ctx.useDarkTheme ? ctx.dark : ctx.visPrimary;
    page.drawRectangle({ x: 48, y: y - qrCardH, width: width - 96, height: qrCardH, color: c(cardColor) });
    page.drawRectangle({ x: 48, y: y, width: width - 96, height: 2.5, color: c(ctx.accent) });

    page.drawText('Quick Reference', { x: 64, y: y - 18, size: 11, font: ctx.fontBold, color: c(ctx.white) });

    const refs = [
      `Primary: ${palette.primary.toUpperCase()}  ·  Accent: ${palette.accent.toUpperCase()}`,
      `Display: ${brief ? 'See Typography section' : 'Inter'}  ·  Body: See Typography section`,
      brief ? `${brief.aestheticDirection}  ·  ${brief.tensionPair}` : `Domain: ${ctx.domainName}`,
      'Generated by Sparkdomain  ·  sparkdomain.xyz',
    ];
    refs.forEach((ref, i) => {
      drawTextSafe(page, ref, { x: 64, y: y - 36 - (i * 16), size: 8, font: ctx.fontRegular, color: c(ctx.white), opacity: 0.8, maxWidth: width - 130, fallbackFont: ctx.fontRegular });
    });
  }

  drawPageFooter(page, ctx, "Do's & Don'ts");
}
