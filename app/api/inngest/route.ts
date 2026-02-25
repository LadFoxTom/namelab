import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { generateBrandAssets } from '@/inngest/functions/generateBrandAssets';
import { generateBrandPreviews } from '@/inngest/functions/generateBrandPreviews';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateBrandAssets, generateBrandPreviews],
});
