/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'archiver', 'png-to-ico'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'fal.media',
      },
      {
        protocol: 'https',
        hostname: '**.fal.ai',
      },
    ],
  },
};

module.exports = nextConfig;
