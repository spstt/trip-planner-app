import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      // Wikipedia / Wikimedia Commons — destination photos
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: '*.wikipedia.org' },
    ],
  },
  // Required to support Leaflet SSR
  transpilePackages: ['leaflet', 'react-leaflet'],
}

export default nextConfig
