/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'archiver', 'png-to-ico'],
    outputFileTracingIncludes: {
      '/api/brand/build-kit': ['./lib/brand/fonts/**/*'],
      '/api/brand/mockup': ['./lib/brand/fonts/**/*'],
      '/api/brand/rebuild-kit': ['./lib/brand/fonts/**/*'],
    },
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
        hostname: '**.fal.media',
      },
      {
        protocol: 'https',
        hostname: '**.fal.ai',
      },
    ],
  },
};

module.exports = nextConfig;
