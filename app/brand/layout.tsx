import type { Metadata } from 'next';
import BrandShell from '@/components/brand/BrandShell';

export const metadata: Metadata = {
  title: 'BrandKitz — AI Brand Identity Generator',
  description:
    'Generate a complete brand identity in 60 seconds. Logo concepts, color palette, typography, social media kit, and 100+ production-ready files — all powered by AI.',
  icons: {
    icon: [
      { url: '/brand/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/brand/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/brand/apple-touch-icon.png',
  },
  openGraph: {
    title: 'BrandKitz — AI Brand Identity Generator',
    description:
      'Generate a complete brand identity in 60 seconds. Logo, colors, typography, and 100+ production-ready files.',
    siteName: 'BrandKitz',
    type: 'website',
  },
};

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  return <BrandShell>{children}</BrandShell>;
}
