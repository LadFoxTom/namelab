import sharp from 'sharp';
import { colorizeToWhite, colorizeToBlack, compositeOnBackground } from './postprocess';
import { extractIcon } from './iconExtractor';
import { renderTextToPng } from './textRenderer';

export interface VariationSet {
  name: string;
  variations: { filename: string; buffer: Buffer }[];
}

export interface LogoVariations {
  icon: VariationSet;
  wordmark: VariationSet;
  horizontalLockup: VariationSet;
  stackedLockup: VariationSet;
  monogram: VariationSet;
  taglineLockup: VariationSet;
}

/**
 * Generate the full variation matrix from a selected concept.
 * 6 variations x 5 color versions = 30 files.
 */
export async function generateVariations(
  logoPngTransparent: Buffer,
  brandName: string,
  tagline: string,
  palette: { primary: string; dark: string },
  size = 2000
): Promise<LogoVariations> {
  // 1. Extract icon
  const iconBuffer = await extractIcon(logoPngTransparent, size);

  // 2. Render wordmark (text only)
  const wordmarkBuffer = await renderText(brandName, palette.dark, size, Math.round(size * 0.2), Math.round(size * 0.1));

  // 3. Horizontal lockup: icon left + wordmark right
  const horizontalBuffer = await composeHorizontal(iconBuffer, brandName, palette.dark, size);

  // 4. Stacked lockup: icon top + wordmark bottom
  const stackedBuffer = await composeStacked(iconBuffer, brandName, palette.dark, size);

  // 5. Monogram: 1-3 initials
  const initials = deriveInitials(brandName);
  const monogramBuffer = await renderText(initials, palette.dark, size, size, Math.round(size * 0.4));

  // 6. Tagline lockup: stacked + tagline below
  const taglineText = tagline || `${brandName} — Your brand`;
  const taglineBuffer = await composeTaglineLockup(iconBuffer, brandName, taglineText, palette.dark, size);

  // Generate 5 color versions for each variation
  const variations: LogoVariations = {
    icon: await colorize('icon', iconBuffer, palette),
    wordmark: await colorize('wordmark', wordmarkBuffer, palette),
    horizontalLockup: await colorize('primary-lockup', horizontalBuffer, palette),
    stackedLockup: await colorize('stacked', stackedBuffer, palette),
    monogram: await colorize('monogram', monogramBuffer, palette),
    taglineLockup: await colorize('tagline-lockup', taglineBuffer, palette),
  };

  return variations;
}

async function colorize(
  prefix: string,
  buffer: Buffer,
  palette: { primary: string; dark: string }
): Promise<VariationSet> {
  const [white, black, onDark, onBrand] = await Promise.all([
    colorizeToWhite(buffer),
    colorizeToBlack(buffer),
    compositeOnBackground(buffer, palette.dark),
    compositeOnBackground(buffer, palette.primary),
  ]);

  return {
    name: prefix,
    variations: [
      { filename: 'full-color.png', buffer },
      { filename: 'white.png', buffer: white },
      { filename: 'black.png', buffer: black },
      { filename: 'on-dark.png', buffer: onDark },
      { filename: 'on-brand.png', buffer: onBrand },
    ],
  };
}

async function renderText(
  text: string,
  color: string,
  width: number,
  height: number,
  fontSize: number
): Promise<Buffer> {
  return renderTextToPng(text, color, width, height, fontSize);
}

async function composeHorizontal(
  iconBuffer: Buffer,
  brandName: string,
  textColor: string,
  totalWidth: number
): Promise<Buffer> {
  const iconSize = Math.round(totalWidth * 0.3);
  const textWidth = Math.round(totalWidth * 0.6);
  const textHeight = Math.round(iconSize * 0.5);
  const fontSize = Math.round(textHeight * 0.6);
  const gap = Math.round(totalWidth * 0.04);
  const outputHeight = iconSize;

  const resizedIcon = await sharp(iconBuffer)
    .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const textBuffer = await renderText(brandName, textColor, textWidth, textHeight, fontSize);

  const iconLeft = Math.round((totalWidth - iconSize - gap - textWidth) / 2);
  const iconTop = 0;
  const textLeft = iconLeft + iconSize + gap;
  const textTop = Math.round((outputHeight - textHeight) / 2);

  return sharp({
    create: { width: totalWidth, height: outputHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([
      { input: resizedIcon, top: iconTop, left: iconLeft },
      { input: textBuffer, top: textTop, left: textLeft },
    ])
    .png()
    .toBuffer();
}

async function composeStacked(
  iconBuffer: Buffer,
  brandName: string,
  textColor: string,
  size: number
): Promise<Buffer> {
  const iconSize = Math.round(size * 0.5);
  const textHeight = Math.round(size * 0.12);
  const fontSize = Math.round(size * 0.055);
  const gap = Math.round(size * 0.03);
  const totalHeight = iconSize + gap + textHeight;

  const resizedIcon = await sharp(iconBuffer)
    .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const textBuffer = await renderText(brandName, textColor, size, textHeight, fontSize);

  const iconLeft = Math.round((size - iconSize) / 2);

  return sharp({
    create: { width: size, height: totalHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([
      { input: resizedIcon, top: 0, left: iconLeft },
      { input: textBuffer, top: iconSize + gap, left: 0 },
    ])
    .png()
    .toBuffer();
}

async function composeTaglineLockup(
  iconBuffer: Buffer,
  brandName: string,
  tagline: string,
  textColor: string,
  size: number
): Promise<Buffer> {
  const iconSize = Math.round(size * 0.45);
  const nameHeight = Math.round(size * 0.1);
  const tagHeight = Math.round(size * 0.06);
  const nameFontSize = Math.round(size * 0.05);
  const tagFontSize = Math.round(size * 0.025);
  const gap1 = Math.round(size * 0.03);
  const gap2 = Math.round(size * 0.015);
  const totalHeight = iconSize + gap1 + nameHeight + gap2 + tagHeight;

  const resizedIcon = await sharp(iconBuffer)
    .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const nameBuffer = await renderText(brandName, textColor, size, nameHeight, nameFontSize);
  const tagBuffer = await renderText(tagline, textColor, size, tagHeight, tagFontSize);

  const iconLeft = Math.round((size - iconSize) / 2);

  return sharp({
    create: { width: size, height: totalHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([
      { input: resizedIcon, top: 0, left: iconLeft },
      { input: nameBuffer, top: iconSize + gap1, left: 0 },
      { input: tagBuffer, top: iconSize + gap1 + nameHeight + gap2, left: 0 },
    ])
    .png()
    .toBuffer();
}

function deriveInitials(brandName: string): string {
  const words = brandName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);

  if (words.length >= 2) {
    return words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
  }

  const word = words[0] || brandName;
  const consonants = word.slice(1).match(/[bcdfghjklmnpqrstvwxyz]/gi);
  if (consonants && consonants.length > 0) {
    return `${word[0].toUpperCase()}${consonants[Math.floor(consonants.length / 2)].toUpperCase()}`;
  }
  return `${word[0].toUpperCase()}${(word[1] || '').toUpperCase()}`;
}
