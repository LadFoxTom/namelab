import archiver from 'archiver';
import { Writable } from 'stream';
import { BrandPalette } from './palette';
import { FontPairing } from './typography';
import { SocialAsset } from './socialKit';
import { FaviconAsset } from './favicons';
import { BusinessCardAsset } from './businessCards';
import { ColorSystem } from './colorist';
import { LetterheadAsset } from './letterhead';
import { EmailSignatureAsset } from './emailSignature';

interface PackageAssets {
  domainName: string;
  logoPng: Buffer;
  logoPngTransparent?: Buffer;
  logoWithTextPng?: Buffer;
  logoWithTextTransparentPng?: Buffer;
  nameWhiteBgPng?: Buffer;
  nameTransparentPng?: Buffer;
  logoSvg: string;
  palette: BrandPalette;
  fonts: FontPairing;
  socialKit?: SocialAsset[];
  favicons: FaviconAsset[];
  brandPdf?: Buffer;
  businessCards?: BusinessCardAsset[];
  tier: 'LOGO_ONLY' | 'BRAND_KIT' | 'BRAND_KIT_PRO';
  // Phase 1: logo variants
  logoWhitePng?: Buffer;
  logoBlackPng?: Buffer;
  logoGrayscalePng?: Buffer;
  logoOnDarkBgPng?: Buffer;
  logoOnBrandBgPng?: Buffer;
  logoHighRes4000?: Buffer;
  logoWithTextHighRes?: Buffer;
  colorSystem?: ColorSystem;
  // Phase 3: print collateral
  letterhead?: LetterheadAsset[];
  emailSignature?: EmailSignatureAsset[];
}

export async function assembleZip(assets: PackageAssets): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const output = new Writable({
      write(chunk, _, callback) { chunks.push(chunk); callback(); }
    });
    output.on('finish', () => resolve(Buffer.concat(chunks)));

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', reject);
    archive.pipe(output);

    const name = assets.domainName;

    archive.append(assets.logoPng, { name: `${name}/logo/logo-2000px.png` });
    if (assets.logoPngTransparent) {
      archive.append(assets.logoPngTransparent, { name: `${name}/logo/logo-2000px-transparent.png` });
    }
    if (assets.logoWithTextPng) {
      archive.append(assets.logoWithTextPng, { name: `${name}/logo/logo-with-name.png` });
    }
    if (assets.logoWithTextTransparentPng) {
      archive.append(assets.logoWithTextTransparentPng, { name: `${name}/logo/logo-with-name-transparent.png` });
    }
    if (assets.nameWhiteBgPng) {
      archive.append(assets.nameWhiteBgPng, { name: `${name}/logo/brand-name.png` });
    }
    if (assets.nameTransparentPng) {
      archive.append(assets.nameTransparentPng, { name: `${name}/logo/brand-name-transparent.png` });
    }
    archive.append(Buffer.from(assets.logoSvg), { name: `${name}/logo/logo.svg` });

    // Phase 1: Logo color variants
    if (assets.logoWhitePng) {
      archive.append(assets.logoWhitePng, { name: `${name}/logo/logo-reversed-white.png` });
      // Also generate 2000px version
      archive.append(assets.logoWhitePng, { name: `${name}/logo/logo-reversed-white-2000px.png` });
    }
    if (assets.logoBlackPng) {
      archive.append(assets.logoBlackPng, { name: `${name}/logo/logo-black.png` });
      archive.append(assets.logoBlackPng, { name: `${name}/logo/logo-black-2000px.png` });
    }
    if (assets.logoGrayscalePng) {
      archive.append(assets.logoGrayscalePng, { name: `${name}/logo/logo-grayscale.png` });
    }
    if (assets.logoOnDarkBgPng) {
      archive.append(assets.logoOnDarkBgPng, { name: `${name}/logo/logo-on-dark-background.png` });
    }
    if (assets.logoOnBrandBgPng) {
      archive.append(assets.logoOnBrandBgPng, { name: `${name}/logo/logo-on-brand-background.png` });
    }
    if (assets.logoHighRes4000) {
      archive.append(assets.logoHighRes4000, { name: `${name}/logo/logo-4000px-transparent.png` });
    }
    if (assets.logoWithTextHighRes) {
      archive.append(assets.logoWithTextHighRes, { name: `${name}/logo/logo-with-name-4000px.png` });
    }

    for (const favicon of assets.favicons) {
      archive.append(favicon.buffer, { name: `${name}/favicons/${favicon.filename}` });
    }

    if (assets.tier !== 'LOGO_ONLY') {
      if (assets.socialKit) {
        for (const asset of assets.socialKit) {
          archive.append(asset.buffer, { name: `${name}/social-media/${asset.filename}` });
        }
      }

      archive.append(Buffer.from(assets.palette.cssVars), { name: `${name}/brand/colors.css` });

      // Enriched colors.json with full ColorSpec per color
      const colorsJson = assets.colorSystem ? {
        brand: {
          primary: assets.colorSystem.brand.primary,
          secondary: assets.colorSystem.brand.secondary,
          accent: assets.colorSystem.brand.accent,
          light: assets.colorSystem.brand.light,
          dark: assets.colorSystem.brand.dark,
        },
        system: {
          accent: assets.colorSystem.system.accent,
          background: assets.colorSystem.system.background,
          surface: assets.colorSystem.system.surface,
          foreground: assets.colorSystem.system.foreground,
          muted: assets.colorSystem.system.muted,
          border: assets.colorSystem.system.border,
        },
        functional: assets.colorSystem.functional,
        accessibility: assets.colorSystem.accessibility,
        proportions: assets.colorSystem.proportions,
        theme: assets.colorSystem.theme,
      } : {
        brand: {
          primary: assets.palette.primary,
          secondary: assets.palette.secondary,
          accent: assets.palette.accent,
          light: assets.palette.light,
          dark: assets.palette.dark,
        },
      };
      archive.append(Buffer.from(JSON.stringify(colorsJson, null, 2)), { name: `${name}/brand/colors.json` });

      // Design tokens for dev handoff
      const brandTokens = {
        color: {
          'brand-primary': { value: assets.palette.primary, type: 'color' },
          'brand-secondary': { value: assets.palette.secondary, type: 'color' },
          'brand-accent': { value: assets.palette.accent, type: 'color' },
          'brand-light': { value: assets.palette.light, type: 'color' },
          'brand-dark': { value: assets.palette.dark, type: 'color' },
          ...(assets.colorSystem ? {
            'background': { value: assets.colorSystem.system.background.hex, type: 'color' },
            'surface': { value: assets.colorSystem.system.surface.hex, type: 'color' },
            'foreground': { value: assets.colorSystem.system.foreground.hex, type: 'color' },
            'muted': { value: assets.colorSystem.system.muted.hex, type: 'color' },
            'border': { value: assets.colorSystem.system.border.hex, type: 'color' },
            'success': { value: assets.colorSystem.functional.success.hex, type: 'color' },
            'warning': { value: assets.colorSystem.functional.warning.hex, type: 'color' },
            'error': { value: assets.colorSystem.functional.error.hex, type: 'color' },
            'info': { value: assets.colorSystem.functional.info.hex, type: 'color' },
          } : {}),
        },
        font: {
          heading: { value: assets.fonts.heading.cssFamily, type: 'fontFamily' },
          body: { value: assets.fonts.body.cssFamily, type: 'fontFamily' },
          mono: { value: assets.fonts.mono.cssFamily, type: 'fontFamily' },
        },
      };
      archive.append(Buffer.from(JSON.stringify(brandTokens, null, 2)), { name: `${name}/brand/brand-tokens.json` });

      // Tailwind theme config
      const tailwindTheme = `/** @type {import('tailwindcss').Config['theme']} */
module.exports = {
  colors: {
    brand: {
      primary: '${assets.palette.primary}',
      secondary: '${assets.palette.secondary}',
      accent: '${assets.palette.accent}',
      light: '${assets.palette.light}',
      dark: '${assets.palette.dark}',${assets.colorSystem ? `
      background: '${assets.colorSystem.system.background.hex}',
      surface: '${assets.colorSystem.system.surface.hex}',
      foreground: '${assets.colorSystem.system.foreground.hex}',
      muted: '${assets.colorSystem.system.muted.hex}',
      border: '${assets.colorSystem.system.border.hex}',` : ''}
    },
  },
  fontFamily: {
    heading: [${assets.fonts.heading.cssFamily.split(',').map(f => `'${f.trim()}'`).join(', ')}],
    body: [${assets.fonts.body.cssFamily.split(',').map(f => `'${f.trim()}'`).join(', ')}],
    mono: [${assets.fonts.mono.cssFamily.split(',').map(f => `'${f.trim()}'`).join(', ')}],
  },
};
`;
      archive.append(Buffer.from(tailwindTheme), { name: `${name}/brand/tailwind-theme.js` });

      // Dark mode CSS
      if (assets.colorSystem) {
        const cs = assets.colorSystem;
        const darkBg = cs.theme === 'dark' ? cs.system.background.hex : cs.system.foreground.hex;
        const darkFg = cs.theme === 'dark' ? cs.system.foreground.hex : cs.system.background.hex;
        const darkSurface = cs.theme === 'dark' ? cs.system.surface.hex : cs.system.muted.hex;
        const darkModeCss = `@media (prefers-color-scheme: dark) {
  :root {
    --brand-primary: ${cs.brand.primary};
    --brand-accent: ${cs.brand.accent};
    --brand-background: ${darkBg};
    --brand-surface: ${darkSurface};
    --brand-foreground: ${darkFg};
    --brand-muted: ${cs.system.muted.hex};
    --brand-border: ${cs.system.border.hex};
  }
}
`;
        archive.append(Buffer.from(darkModeCss), { name: `${name}/brand/dark-mode.css` });
      }

      const fontGuide = `
# ${name} Typography Guide

## Heading Font
${assets.fonts.heading.name}
Weights: ${assets.fonts.heading.weights.join(', ')}
CSS: font-family: ${assets.fonts.heading.cssFamily};

## Body Font
${assets.fonts.body.name}
Weights: ${assets.fonts.body.weights.join(', ')}
CSS: font-family: ${assets.fonts.body.cssFamily};

## Monospace Font
${assets.fonts.mono.name}
CSS: font-family: ${assets.fonts.mono.cssFamily};

## Google Fonts Import
${assets.fonts.googleFontsUrl}
      `.trim();
      archive.append(Buffer.from(fontGuide), { name: `${name}/brand/typography.md` });

      if (assets.businessCards) {
        for (const card of assets.businessCards) {
          archive.append(card.buffer, { name: `${name}/business-cards/${card.filename}` });
        }
      }

      if (assets.brandPdf) {
        archive.append(assets.brandPdf, { name: `${name}/brand/brand-guidelines.pdf` });
      }

      // Phase 3: Print collateral
      if (assets.letterhead) {
        for (const item of assets.letterhead) {
          archive.append(item.buffer, { name: `${name}/print-collateral/${item.filename}` });
        }
      }
      if (assets.emailSignature) {
        for (const item of assets.emailSignature) {
          archive.append(item.buffer, { name: `${name}/print-collateral/${item.filename}` });
        }
      }
    }

    const readme = `# ${name} Brand Identity Package
Generated by Sparkdomain

## Contents
${assets.tier === 'LOGO_ONLY' ? `- logo/ — PNG (original + transparent) + SVG\n- favicons/ — All sizes + .ico + webmanifest` :
`- logo/ — PNG (original, transparent, reversed white/black, grayscale, on-dark, on-brand, 4000px hi-res) + SVG
- favicons/ — All sizes + .ico + webmanifest
- social-media/ — 20 platform-sized assets
- business-cards/ — Print-ready PNG + PDF templates
- print-collateral/ — Letterhead, envelope, email signature
- brand/ — Colors (CSS + JSON + tokens + Tailwind), typography guide, dark mode CSS, brand guidelines PDF`}

## License
These files are licensed for commercial use for the brand "${name}".
You may use these assets in any commercial or personal project.
    `.trim();
    archive.append(Buffer.from(readme), { name: `${name}/README.md` });

    archive.finalize();
  });
}
