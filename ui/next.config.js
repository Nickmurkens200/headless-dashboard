/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Runtime configuration - can be changed without rebuilding
  publicRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
    iconSourceUrl: process.env.NEXT_PUBLIC_ICON_SOURCE || 'https://cdn.jsdelivr.net/gh/selfhst/icons/png/',
  },
  
  // Server-only runtime config
  serverRuntimeConfig: {
    apiUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  },

  // Allow images from icon CDN
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        pathname: '/gh/**',
      },
      {
        protocol: 'https',
        hostname: '*.selfh.st',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
