import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger request bodies for admin post/event create and edit (e.g. rich text from mobile)
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
      allowedOrigins: [
        'startupnews.thebackend.in',
        'alb-main-snfyiv2-975669443.us-east-1.elb.amazonaws.com',
      ],
    },
    proxyClientMaxBodySize: '4mb',
  },
  // Allow external images from DB (S3 bucket) and CDN
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "*.unsplash.com", pathname: "/**" },
      // S3 bucket: startupnews-media-2026 (us-east-1) – images from DB
      { protocol: "https", hostname: "startupnews-media-2026.s3.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "startupnews-media-2026.s3.us-east-1.amazonaws.com", pathname: "/**" },
      // S3: path-style and other virtual-hosted buckets
      { protocol: "https", hostname: "s3.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "*.s3.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "**.s3.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "**.s3.*.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "**.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "startupnews.thebackend.in", pathname: "/**" },
      { protocol: "https", hostname: "startupnews.fyi", pathname: "/**" },
      { protocol: "https", hostname: "img.etimg.com", pathname: "/**" },
      { protocol: "https", hostname: "*.etimg.com", pathname: "/**" },
      { protocol: "https", hostname: "i0.wp.com", pathname: "/**" },
      { protocol: "https", hostname: "*.wp.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.pnndigital.com", pathname: "/**" },
      { protocol: "https", hostname: "inc42.com", pathname: "/**" },
      { protocol: "https", hostname: "*.inc42.com", pathname: "/**" },
      { protocol: "https", hostname: "startupstorymedia.com", pathname: "/**" },
      { protocol: "https", hostname: "*.startupstorymedia.com", pathname: "/**" },
      { protocol: "https", hostname: "www.livemint.com", pathname: "/**" },
      { protocol: "https", hostname: "livemint.com", pathname: "/**" },
      { protocol: "https", hostname: "img-cdn.public.com", pathname: "/**" },
      { protocol: "https", hostname: "media.wired.com", pathname: "/**" },
      { protocol: "https", hostname: "www.cnet.com", pathname: "/**" },
      { protocol: "https", hostname: "s.yimg.com", pathname: "/**" },
      { protocol: "https", hostname: "*.yimg.com", pathname: "/**" },
      { protocol: "http", hostname: "www.siliconluxe.com", pathname: "/**" },
      { protocol: "http", hostname: "localhost", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/**" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/category/:slug",
        destination: "/:slug",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/funding", destination: "/category/funding" },
    ];
  },
  // Optional: shorten CDN cache for HTML so deploys don’t serve old chunk refs.
  // If using CloudFront, invalidate /* on deploy instead.
  async headers() {
    return [
      // Static assets (CSS, JS) – long cache so browser caches them
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // HTML: do not cache documents at the edge so deploys cannot serve stale chunk refs
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
