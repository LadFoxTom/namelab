import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { generateBrandAssets } from '@/inngest/functions/generateBrandAssets';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateBrandAssets],
});
