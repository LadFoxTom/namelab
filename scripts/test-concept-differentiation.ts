/**
 * Test: Per-concept brand kit differentiation + text rendering
 *
 * Validates that:
 *  1. Business card text renders as visible pixels (not empty rectangles)
 *  2. Social media text overlays render as visible pixels
 *  3. Different concept styles → different fonts (typographer)
 *  4. Different concept styles → different color palettes (colorist)
 *  5. Different concept styles → different social media backgrounds (socialKit hash)
 *
 * Usage:
 *   npx tsx scripts/test-concept-differentiation.ts
 *
 * No database, no external APIs required — uses synthetic data.
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { selectTypeSystem } from '../lib/brand/typographer';
import { buildColorSystem } from '../lib/brand/colorist';
import { generateBusinessCards } from '../lib/brand/businessCards';
import { generateSocialKit } from '../lib/brand/socialKit';
import { BrandSignals } from '../lib/brand/signals';
import { DesignBrief } from '../lib/brand/strategist';
import { BrandPalette } from '../lib/brand/palette';

// ── Synthetic test data ─────────────────────────────────────────────────────

const TEST_DOMAIN = 'birdpetstore';

const testSignals: BrandSignals = {
  domainName: TEST_DOMAIN,
  tone: 'playful',
  subTone: 'warm and approachable',
  colorDirection: {
    primary: 'bright teal',
    mood: 'warm moderate',
    avoid: 'dark grays',
    paletteStyle: 'analogous',
  },
  iconStyle: 'organic',
  industry: 'Pet Retail',
  targetAudience: 'Pet owners aged 25-45',
  brandPersonality: 'Friendly, trustworthy, fun',
  avoidElements: ['skulls', 'dark themes'],
  suggestedKeywords: ['bird', 'pet', 'store', 'feather'],
};

const testBrief: DesignBrief = {
  brandName: 'BirdPetStore',
  tagline: 'Where every bird finds a home',
  sectorClassification: 'Pet Retail / E-commerce',
  tensionPair: 'playful but trustworthy',
  aestheticDirection: 'Warm organic with clean layout',
  memorableAnchor: 'A friendly bird silhouette',
  brandPillars: [
    { name: 'Care', description: 'Genuine care for every pet' },
    { name: 'Trust', description: 'Reliable products and advice' },
  ],
  personalityTraits: [
    { trait: 'Playful', counterbalance: 'Professional' },
  ],
  targetAudienceSummary: 'Pet owners seeking quality bird supplies',
  themePreference: 'light',
  typeGuidance: {
    displayCategory: 'humanist_sans',
    bodyCategory: 'humanist_sans',
    formalityLevel: 2,
    suggestedDisplayFonts: ['Nunito Sans', 'Work Sans'],
    suggestedBodyFonts: ['DM Sans', 'Source Sans 3'],
  },
  colorGuidance: {
    temperature: 'warm',
    saturationLevel: 'vibrant',
    accentHueRange: '160-190 teal',
    avoidHues: ['red', 'black'],
    suggestedPrimaryHex: '#14B8A6',
    suggestedAccentHex: '#F59E0B',
  },
  logoGuidance: {
    preferredStyles: ['pictorial', 'icon_wordmark'],
    geometry: 'organic',
    strokeWeight: 'medium',
    conceptSeeds: ['bird', 'feather', 'nest'],
  },
  competitiveDifferentiation: 'Warm, approachable brand in a market of generic pet stores',
};

// Simulate different logo-extracted palettes for different concepts
const conceptPalettes: Record<string, BrandPalette> = {
  emblem: {
    primary: '#2E7D8C',   // teal-blue
    secondary: '#1A4A52',
    accent: '#F5A623',
    light: '#F0F9FF',
    dark: '#0F172A',
    textOnPrimary: '#FFFFFF',
    textOnLight: '#0F172A',
    cssVars: '',
  },
  mascot: {
    primary: '#E85D3A',   // warm orange-red
    secondary: '#8B3520',
    accent: '#4ECDC4',
    light: '#FFF5F0',
    dark: '#1A0E0A',
    textOnPrimary: '#FFFFFF',
    textOnLight: '#1A0E0A',
    cssVars: '',
  },
  abstract_mark: {
    primary: '#7C3AED',   // purple
    secondary: '#4C1D95',
    accent: '#10B981',
    light: '#F5F3FF',
    dark: '#1E1036',
    textOnPrimary: '#FFFFFF',
    textOnLight: '#1E1036',
    cssVars: '',
  },
  wordmark: {
    primary: '#0EA5E9',   // sky blue
    secondary: '#0369A1',
    accent: '#F97316',
    light: '#F0F9FF',
    dark: '#0C1524',
    textOnPrimary: '#FFFFFF',
    textOnLight: '#0C1524',
    cssVars: '',
  },
};

const CONCEPT_STYLES = Object.keys(conceptPalettes);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Create a simple colored PNG to use as a fake logo */
async function createTestLogo(color: string): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <rect width="512" height="512" fill="white"/>
    <circle cx="256" cy="256" r="200" fill="${color}"/>
    <circle cx="200" cy="220" r="30" fill="white"/>
    <circle cx="312" cy="220" r="30" fill="white"/>
  </svg>`;
  return sharp(Buffer.from(svg)).resize(512, 512).png().toBuffer();
}

/** Count non-transparent, non-white pixels in a region of a PNG */
async function countVisiblePixels(
  pngBuffer: Buffer, x: number, y: number, w: number, h: number
): Promise<number> {
  const { data, info } = await sharp(pngBuffer)
    .extract({ left: x, top: y, width: w, height: h })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let visible = 0;
  const channels = info.channels;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const a = channels === 4 ? data[i + 3] : 255;
    // Count pixel if it's not transparent and not pure white
    if (a > 10 && !(r > 245 && g > 245 && b > 245)) {
      visible++;
    }
  }
  return visible;
}

// ── Tests ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const outputDir = path.join(process.cwd(), 'test-output', 'concept-diff');

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function main() {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1: Business card text rendering
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ Test 1: Business card text rendering ═══');
  const logo = await createTestLogo('#2E7D8C');
  const cards = await generateBusinessCards(logo, conceptPalettes.emblem, TEST_DOMAIN, testBrief);
  const frontCard = cards.find(c => c.filename === 'business-card-front.png');

  if (!frontCard) {
    assert(false, 'Front card PNG generated');
  } else {
    // The text area is roughly y:180-420, x:30-500 on the 1050×600 card
    const textPixels = await countVisiblePixels(frontCard.buffer, 30, 180, 500, 240);
    assert(textPixels > 200, `Text area has visible pixels (${textPixels} found)`,
      textPixels <= 200 ? 'Text may be rendering as empty rectangles' : undefined);

    // Save for visual inspection
    fs.writeFileSync(path.join(outputDir, 'business-card-front.png'), frontCard.buffer);
    console.log(`    Saved → test-output/concept-diff/business-card-front.png`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2: Social media text overlay rendering
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ Test 2: Social media text overlay rendering ═══');
  const socialStrategy = {
    backgroundTreatments: { banner: 'gradient' as const, og: 'gradient' as const, profile: 'solid' as const },
    typographyOverlay: {
      taglineOnBanners: true,
      taglineText: 'Where every bird finds a home',
      domainOnOgImages: true,
      textPlacement: 'center' as const,
      textStyle: 'caps' as const,
    },
  };

  const socialAssets = await generateSocialKit(
    logo, conceptPalettes.emblem, testSignals, TEST_DOMAIN, socialStrategy, 'emblem'
  );

  // Check X Banner — it's a wide-banner that should have tagline text
  const xBanner = socialAssets.find(a => a.filename === 'x-banner.png');
  if (!xBanner) {
    assert(false, 'X Banner generated');
  } else {
    // Text is placed near bottom (around 85-92% height)
    const textY = Math.round(xBanner.height * 0.80);
    const textH = Math.round(xBanner.height * 0.18);
    const textPixels = await countVisiblePixels(xBanner.buffer, 0, textY, xBanner.width, textH);
    assert(textPixels > 100, `Banner text area has visible pixels (${textPixels} found)`,
      textPixels <= 100 ? 'Text overlay may be rendering as empty rectangles' : undefined);

    fs.writeFileSync(path.join(outputDir, 'x-banner.png'), xBanner.buffer);
    console.log(`    Saved → test-output/concept-diff/x-banner.png`);
  }

  // Check OG image — should have domain text
  const ogImage = socialAssets.find(a => a.filename === 'og-image.png');
  if (ogImage) {
    fs.writeFileSync(path.join(outputDir, 'og-image.png'), ogImage.buffer);
    console.log(`    Saved → test-output/concept-diff/og-image.png`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 3: Per-concept font differentiation
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ Test 3: Per-concept font differentiation ═══');
  const fontResults: Record<string, { heading: string; body: string }> = {};

  for (const style of CONCEPT_STYLES) {
    const ts = selectTypeSystem(testBrief, testSignals, style);
    fontResults[style] = { heading: ts.heading.name, body: ts.body.name };
    console.log(`    ${style.padEnd(15)} → heading: ${ts.heading.name.padEnd(20)} body: ${ts.body.name}`);
  }

  // Check that not all styles produce the same heading font
  const uniqueHeadings = new Set(Object.values(fontResults).map(f => f.heading));
  assert(uniqueHeadings.size > 1,
    `Different concept styles produce different heading fonts (${uniqueHeadings.size} unique)`,
    uniqueHeadings.size <= 1 ? `All concepts got "${[...uniqueHeadings][0]}"` : undefined);

  // Also compare with no salt
  const noSalt = selectTypeSystem(testBrief, testSignals);
  const withSalt = selectTypeSystem(testBrief, testSignals, 'emblem');
  const saltChangedFont = noSalt.heading.name !== withSalt.heading.name || noSalt.body.name !== withSalt.body.name;
  assert(saltChangedFont,
    `conceptSalt changes font selection (no-salt: ${noSalt.heading.name}/${noSalt.body.name}, emblem: ${withSalt.heading.name}/${withSalt.body.name})`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 4: Per-concept color palette differentiation
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ Test 4: Per-concept color palette differentiation ═══');
  const colorResults: Record<string, string> = {};

  for (const style of CONCEPT_STYLES) {
    const pal = conceptPalettes[style];
    const cs = buildColorSystem(testBrief, pal, pal.primary);
    colorResults[style] = cs.brand.primary;
    console.log(`    ${style.padEnd(15)} → primary: ${cs.brand.primary}  (logo-extracted: ${pal.primary})`);
  }

  const uniqueColors = new Set(Object.values(colorResults));
  assert(uniqueColors.size > 1,
    `Different concept palettes produce different brand primaries (${uniqueColors.size} unique)`,
    uniqueColors.size <= 1 ? `All concepts got "${[...uniqueColors][0]}"` : undefined);

  // Verify that conceptPrimary actually shifts the color vs. without it
  const csWithout = buildColorSystem(testBrief, conceptPalettes.mascot);
  const csWith = buildColorSystem(testBrief, conceptPalettes.mascot, conceptPalettes.mascot.primary);
  assert(csWithout.brand.primary !== csWith.brand.primary,
    `conceptPrimary changes palette (without: ${csWithout.brand.primary}, with: ${csWith.brand.primary})`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 5: Per-concept social media background variation
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ Test 5: Per-concept social kit hash variation ═══');

  // Generate two social kits with different concept salts and compare a banner
  const social1 = await generateSocialKit(logo, conceptPalettes.emblem, testSignals, TEST_DOMAIN, undefined, 'emblem');
  const social2 = await generateSocialKit(logo, conceptPalettes.mascot, testSignals, TEST_DOMAIN, undefined, 'mascot');

  const banner1 = social1.find(a => a.filename === 'x-banner.png')!;
  const banner2 = social2.find(a => a.filename === 'x-banner.png')!;

  // Compare buffers — different salt + different palette should produce different images
  const bannersIdentical = banner1.buffer.equals(banner2.buffer);
  assert(!bannersIdentical,
    'Different concept salts produce different social banners',
    bannersIdentical ? 'Banners are identical!' : undefined);

  // Save both for visual comparison
  fs.writeFileSync(path.join(outputDir, 'x-banner-emblem.png'), banner1.buffer);
  fs.writeFileSync(path.join(outputDir, 'x-banner-mascot.png'), banner2.buffer);
  console.log(`    Saved → test-output/concept-diff/x-banner-emblem.png`);
  console.log(`    Saved → test-output/concept-diff/x-banner-mascot.png`);

  // Also save profile icons for comparison
  const profile1 = social1.find(a => a.filename === 'x-profile.png')!;
  const profile2 = social2.find(a => a.filename === 'x-profile.png')!;
  fs.writeFileSync(path.join(outputDir, 'x-profile-emblem.png'), profile1.buffer);
  fs.writeFileSync(path.join(outputDir, 'x-profile-mascot.png'), profile2.buffer);

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
  console.log(`Output saved to: test-output/concept-diff/`);
  if (failed > 0) {
    console.log('\nFAILED — inspect the saved images to diagnose issues.');
    process.exit(1);
  } else {
    console.log('\nALL PASSED');
  }
}

main().catch((err) => {
  console.error('\nTest failed with error:', err);
  process.exit(1);
});
