/**
 * Reliable text-to-SVG-path renderer using opentype.js.
 *
 * Sharp's SVG renderer (librsvg) doesn't reliably support @font-face
 * with base64 data URIs — especially on Vercel's serverless environment
 * where system fonts are extremely limited.  When the embedded font fails
 * to load, text renders as tofu characters (□□□□).
 *
 * This module converts text to actual SVG <path> elements using opentype.js,
 * so the result is pure vector geometry that renders correctly everywhere.
 */

import opentype from 'opentype.js';
import path from 'path';
import sharp from 'sharp';

// Cache loaded fonts
let _interBold: opentype.Font | null = null;
let _interRegular: opentype.Font | null = null;

function getInterBold(): opentype.Font {
  if (!_interBold) {
    const fontPath = path.join(process.cwd(), 'lib/brand/fonts/Inter-Bold.ttf');
    _interBold = opentype.loadSync(fontPath);
  }
  return _interBold;
}

function getInterRegular(): opentype.Font {
  if (!_interRegular) {
    const fontPath = path.join(process.cwd(), 'lib/brand/fonts/Inter-Regular.ttf');
    _interRegular = opentype.loadSync(fontPath);
  }
  return _interRegular;
}

function getFont(weight: 'bold' | 'regular' = 'bold'): opentype.Font {
  return weight === 'regular' ? getInterRegular() : getInterBold();
}

/**
 * Convert text to an SVG <path> element string (just the path, no wrapping SVG).
 * Positioned at the given x, y coordinates (baseline-left, like SVG <text>).
 */
export function textToPathElement(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string,
  options?: { weight?: 'bold' | 'regular'; anchor?: 'start' | 'middle' | 'end' }
): string {
  const font = getFont(options?.weight);
  const anchor = options?.anchor || 'start';

  // Measure text width for anchor adjustment
  let xPos = x;
  if (anchor !== 'start') {
    const metrics = font.getPath(text, 0, 0, fontSize);
    const bbox = metrics.getBoundingBox();
    const textWidth = bbox.x2 - bbox.x1;
    if (anchor === 'middle') xPos = x - textWidth / 2 - bbox.x1;
    else if (anchor === 'end') xPos = x - textWidth - bbox.x1;
  }

  const textPath = font.getPath(text, xPos, y, fontSize);
  const pathData = textPath.toPathData(2);
  return `<path d="${pathData}" fill="${color}" />`;
}

/**
 * Convert text to a full SVG string, centered within the given dimensions.
 */
export function textToSvgPath(
  text: string,
  fontSize: number,
  color: string,
  width: number,
  height: number,
  options?: { weight?: 'bold' | 'regular'; yPosition?: number }
): string {
  const font = getFont(options?.weight);

  // Get the path object from opentype
  const textPath = font.getPath(text, 0, 0, fontSize);
  const bbox = textPath.getBoundingBox();
  const textWidth = bbox.x2 - bbox.x1;
  const textHeight = bbox.y2 - bbox.y1;

  // Center horizontally, center vertically
  const xOffset = (width - textWidth) / 2 - bbox.x1;
  const yOffset = options?.yPosition
    ? options.yPosition
    : (height + textHeight) / 2 - bbox.y2 + (bbox.y2 - bbox.y1) / 2;

  // Get the path with correct positioning
  const positionedPath = font.getPath(text, xOffset, yOffset, fontSize);
  const pathData = positionedPath.toPathData(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <path d="${pathData}" fill="${color}" />
</svg>`;
}

/**
 * Render text as a PNG buffer using opentype.js paths + Sharp.
 * Drop-in replacement for the old SVG @font-face approach.
 */
export async function renderTextToPng(
  text: string,
  color: string,
  width: number,
  height: number,
  fontSize: number,
  options?: { weight?: 'bold' | 'regular' }
): Promise<Buffer> {
  const svg = textToSvgPath(text, fontSize, color, width, height, options);
  return sharp(Buffer.from(svg)).resize(width, height).png().toBuffer();
}

/**
 * Build a composite SVG with multiple text elements rendered as paths.
 * Use this for complex layouts like business cards and letterhead.
 */
export function buildTextSvg(
  width: number,
  height: number,
  elements: Array<{
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    weight?: 'bold' | 'regular';
    anchor?: 'start' | 'middle' | 'end';
  }>
): string {
  const paths = elements
    .map((el) =>
      textToPathElement(el.text, el.x, el.y, el.fontSize, el.color, {
        weight: el.weight,
        anchor: el.anchor,
      })
    )
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  ${paths}
</svg>`;
}
