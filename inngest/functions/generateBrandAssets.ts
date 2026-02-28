import { inngest } from '../client';
import { prisma } from '@/lib/prisma';
import { downloadToBuffer, vectorizeToSvg, removeWhiteBackground, ensurePng, compositeLogoWithText, compositeLogoWithTextTransparent, generateNameImages } from '@/lib/brand/postprocess';
import { extractBrandPalette } from '@/lib/brand/palette';
import { getFontPairing } from '@/lib/brand/typography';
import { selectTypeSystem } from '@/lib/brand/typographer';
import { buildColorSystem } from '@/lib/brand/colorist';
import { runCriticQA } from '@/lib/brand/critic';
import { generateSocialKit } from '@/lib/brand/socialKit';
import { generateSocialStrategy } from '@/lib/brand/socialDirector';
import { generateFaviconPackage } from '@/lib/brand/favicons';
import { generateBrandPdf } from '@/lib/brand/brandPdf';
import { generateBusinessCards } from '@/lib/brand/businessCards';
import { assembleZip } from '@/lib/brand/packaging';
import { uploadBufferAndGetSignedUrl, downloadFromR2 } from '@/lib/brand/storage';
import { BrandSignals } from '@/lib/brand/signals';
import { DesignBrief } from '@/lib/brand/strategist';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const generateBrandAssets = inngest.createFunction(
  {
    id: 'generate-brand-assets',
    retries: 2,
    timeouts: { finish: '10m' },
  },
  { event: 'brand/generate.assets' },
  async ({ event, step }) => {
    const { purchaseId, brandSessionId, selectedConceptId, tier, domainName, email } = event.data;

    // Step 1: Load data and process images (URL-based steps)
    const { originalUrl, tone, signals, brief, conceptStyle } = await step.run('load-data', async () => {
      const brandSession = await prisma.brandSession.findUniqueOrThrow({
        where: { id: brandSessionId },
      });
      const concept = await prisma.brandConcept.findUniqueOrThrow({
        where: { id: selectedConceptId },
      });
      // Support both old format (flat BrandSignals) and new format ({ brief, derived })
      const rawSignals = brandSession.signals as any;
      const sessionSignals: BrandSignals = rawSignals?.derived ?? rawSignals as BrandSignals;
      const brief: DesignBrief | undefined = rawSignals?.brief;
      return { originalUrl: concept.originalUrl, tone: sessionSignals.tone as string, signals: sessionSignals, brief, conceptStyle: (concept as any).style as string | undefined };
    });

    // Step 2: Download original (unwatermarked) image from R2
    // Step 3: Generate all assets in one step (heavy Buffer work, no serialization needed)
    const { zipKey, downloadUrl: dlUrl } = await step.run('generate-and-package', async () => {
      let logoPngBuffer: Buffer;
      if (originalUrl.startsWith('http')) {
        const rawBuffer = await downloadToBuffer(originalUrl);
        logoPngBuffer = await ensurePng(rawBuffer);
      } else {
        const rawBuffer = await downloadFromR2(originalUrl);
        logoPngBuffer = await ensurePng(rawBuffer);
      }
      const logoPngTransparent = await removeWhiteBackground(logoPngBuffer);
      const logoSvg = await vectorizeToSvg(logoPngBuffer);
      const imagePalette = await extractBrandPalette(logoPngBuffer);

      // Use Typographer and Colorist agents when design brief is available
      const typeSystem = brief ? selectTypeSystem(brief, signals, conceptStyle) : undefined;
      const fonts = typeSystem || getFontPairing(tone as any);
      const colorSystem = brief ? buildColorSystem(brief, imagePalette, imagePalette.primary) : undefined;
      const palette = colorSystem?.brand ?? imagePalette;

      // Critic QA — validate and auto-fix brand system
      let qaReport = undefined;
      let finalPalette = palette;
      let finalColorSystem = colorSystem;
      if (brief) {
        const qa = runCriticQA(brief, signals, palette, fonts, typeSystem, colorSystem);
        qaReport = qa.report;
        finalPalette = qa.fixedPalette;
        finalColorSystem = qa.fixedColorSystem ?? colorSystem;
      }

      // Generate logo-with-text composites and name images
      let logoWithTextPng: Buffer | undefined;
      let logoWithTextTransparentPng: Buffer | undefined;
      let nameWhiteBgPng: Buffer | undefined;
      let nameTransparentPng: Buffer | undefined;
      const brandName = brief?.brandName || domainName.charAt(0).toUpperCase() + domainName.slice(1);
      try {
        logoWithTextPng = await compositeLogoWithText(logoPngBuffer, brandName, finalPalette.primary, finalPalette.dark);
        logoWithTextTransparentPng = await compositeLogoWithTextTransparent(logoPngBuffer, brandName, finalPalette.dark);
        const nameImages = await generateNameImages(brandName, finalPalette.dark);
        nameWhiteBgPng = nameImages.nameWhiteBg;
        nameTransparentPng = nameImages.nameTransparent;
      } catch (err: any) {
        console.warn('Logo-with-text/name composites failed:', err.message);
      }

      const favicons = await generateFaviconPackage(logoPngBuffer, domainName);

      let socialKit = undefined;
      let brandPdf = undefined;
      let businessCards = undefined;
      if (tier !== 'LOGO_ONLY') {
        const socialStrategy = brief ? await generateSocialStrategy(brief, signals) : undefined;
        socialKit = await generateSocialKit(logoPngBuffer, finalPalette, signals, domainName, socialStrategy, conceptStyle);
        businessCards = await generateBusinessCards(logoPngBuffer, finalPalette, domainName, brief);
        brandPdf = await generateBrandPdf(domainName, signals, logoPngBuffer, logoSvg, finalPalette, fonts, brief, typeSystem, finalColorSystem, logoPngTransparent);
      }

      const zipBuffer = await assembleZip({
        domainName,
        logoPng: logoPngBuffer,
        logoPngTransparent,
        logoWithTextPng,
        logoWithTextTransparentPng,
        nameWhiteBgPng,
        nameTransparentPng,
        logoSvg,
        palette: finalPalette,
        fonts,
        socialKit,
        favicons,
        brandPdf,
        businessCards,
        tier,
      });

      const key = `brand/${brandSessionId}/downloads/${purchaseId}.zip`;
      const url = await uploadBufferAndGetSignedUrl(key, zipBuffer, 'application/zip', 86400 * 7);
      return { zipKey: key, downloadUrl: url };
    });

    // Step 4: Update purchase record
    await step.run('update-purchase', () =>
      prisma.brandPurchase.update({
        where: { id: purchaseId },
        data: {
          status: 'COMPLETED',
          downloadUrl: dlUrl,
          downloadExpiresAt: new Date(Date.now() + 86400 * 7 * 1000),
          zipR2Key: zipKey,
        },
      })
    );

    // Step 5: Send download email
    if (email && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
      await step.run('send-email', () =>
        resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: email,
          subject: `Your ${domainName} brand files are ready`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
              <h2 style="color: #111;">Your brand files are ready</h2>
              <p style="color: #555;">Here are your brand identity files for <strong>${domainName}</strong>.</p>
              <a href="${dlUrl}" style="display:inline-block; background:#2563eb; color:white; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600; margin: 16px 0;">
                Download your files
              </a>
              <p style="color: #999; font-size: 12px;">This link expires in 7 days. After that, reply to this email and we'll regenerate it.</p>
              <p style="color: #999; font-size: 12px;">BrandKitz</p>
            </div>
          `,
        })
      );
    }

    return { success: true, downloadUrl: dlUrl };
  }
);
