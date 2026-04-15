import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: 'output: export' was removed to enable Vercel SSR/SSG.
  // Static export disabled server-side rendering, making the site invisible to Google.
  images: {
    // Allow images from any remote domain (needed for Cloudinary, etc.)
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
