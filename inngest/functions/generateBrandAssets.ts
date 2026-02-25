import { inngest } from '../client';
import { prisma } from '@/lib/prisma';
import { upscaleImage, downloadToBuffer, vectorizeToSvg, removeWhiteBackground } from '@/lib/brand/postprocess';
import { extractBrandPalette } from '@/lib/brand/palette';
import { getFontPairing } from '@/lib/brand/typography';
import { generateSocialKit } from '@/lib/brand/socialKit';
import { generateFaviconPackage } from '@/lib/brand/favicons';
import { generateBrandPdf } from '@/lib/brand/brandPdf';
import { assembleZip } from '@/lib/brand/packaging';
import { uploadBufferAndGetSignedUrl, getSignedDownloadUrl } from '@/lib/brand/storage';
import { BrandSignals } from '@/lib/brand/signals';
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
    const { originalUrl, tone, signals } = await step.run('load-data', async () => {
      const brandSession = await prisma.brandSession.findUniqueOrThrow({
        where: { id: brandSessionId },
      });
      const concept = await prisma.brandConcept.findUniqueOrThrow({
        where: { id: selectedConceptId },
      });
      const sessionSignals = brandSession.signals as unknown as BrandSignals;
      return { originalUrl: concept.originalUrl, tone: sessionSignals.tone as string, signals: sessionSignals };
    });

    // Step 2: Resolve R2 key if needed, then upscale
    const upscaledUrl = await step.run('process-image', async () => {
      const resolvedUrl = originalUrl.startsWith('http')
        ? originalUrl
        : await getSignedDownloadUrl(originalUrl);
      return upscaleImage(resolvedUrl);
    });

    // Step 3: Generate all assets in one step (heavy Buffer work, no serialization needed)
    const { zipKey, downloadUrl: dlUrl } = await step.run('generate-and-package', async () => {
      const logoPngBuffer = await downloadToBuffer(upscaledUrl);
      const logoPngTransparent = await removeWhiteBackground(logoPngBuffer);
      const logoSvg = await vectorizeToSvg(logoPngBuffer);
      const palette = await extractBrandPalette(logoPngBuffer);
      const fonts = getFontPairing(tone as any);
      const favicons = await generateFaviconPackage(logoPngBuffer, domainName);

      let socialKit = undefined;
      let brandPdf = undefined;
      if (tier !== 'LOGO_ONLY') {
        socialKit = await generateSocialKit(logoPngBuffer, palette, signals, domainName);
        brandPdf = await generateBrandPdf(domainName, signals, logoPngBuffer, logoSvg, palette, fonts);
      }

      const zipBuffer = await assembleZip({
        domainName,
        logoPng: logoPngBuffer,
        logoPngTransparent,
        logoSvg,
        palette,
        fonts,
        socialKit,
        favicons,
        brandPdf,
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
              <p style="color: #999; font-size: 12px;">Sparkdomain</p>
            </div>
          `,
        })
      );
    }

    return { success: true, downloadUrl: dlUrl };
  }
);
