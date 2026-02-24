import sharp from 'sharp';
import Color from 'color';

export interface BrandPalette {
  primary: string;
  secondary: string;
  accent: string;
  light: string;
  dark: string;
  textOnPrimary: string;
  textOnLight: string;
  cssVars: string;
}

export async function extractBrandPalette(imageBuffer: Buffer): Promise<BrandPalette> {
  const pngBuffer = await sharp(imageBuffer)
    .resize(200, 200, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();

  const { Vibrant } = await import('node-vibrant/node');
  const palette = await Vibrant.from(pngBuffer).getPalette();

  const primary = palette.Vibrant?.hex ?? '#2563EB';
  const secondary = palette.DarkVibrant?.hex ?? '#1E3A8A';
  const accent = palette.LightVibrant?.hex ?? '#60A5FA';
  const light = palette.LightMuted?.hex ?? '#F0F9FF';
  const dark = palette.DarkMuted?.hex ?? '#0F172A';

  const primaryColor = Color(primary);
  const textOnPrimary = primaryColor.isDark() ? '#FFFFFF' : '#000000';
  const textOnLight = '#0F172A';

  const cssVars = `
:root {
  --brand-primary: ${primary};
  --brand-secondary: ${secondary};
  --brand-accent: ${accent};
  --brand-light: ${light};
  --brand-dark: ${dark};
  --brand-text-on-primary: ${textOnPrimary};
  --brand-text-on-light: ${textOnLight};
}`.trim();

  return { primary, secondary, accent, light, dark, textOnPrimary, textOnLight, cssVars };
}
