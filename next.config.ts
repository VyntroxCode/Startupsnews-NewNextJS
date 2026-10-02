import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // deploy.sh builds into a separate directory and atomically swaps it into .next
  // afterward, so the still-running old process's ISR revalidation writes (e.g.
  // page.tsx's revalidate=60 rewriting .next/server/app/index.html in place)
  // can never land mid-build and clobber a chunk reference the new build already
  // replaced. NEXT_BUILD_DIR is only set during that build step.
  distDir: process.env.NEXT_BUILD_DIR || '.next',
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
    // 90 stays the default for hero/LCP images (see "LCP Issues" commit). 60 is added for small
    // carousel thumbnails (EventByCountryCard) — those never explicitly requested 90, they just
    // got it because 90 was the only allowed value; at ~380px rendered width the difference is
    // invisible but the byte savings are real, which matters on /events (dozens of images/page).
    qualities: [60, 90],
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "*.unsplash.com", pathname: "/**" },
      // CloudFront distribution in front of the S3 bucket (ImagesStartupNews)
      { protocol: "https", hostname: "images.startupnews.fyi", pathname: "/**" },
      // Sister site's image CDN — its posts/images get cross-referenced on this site too
      { protocol: "https", hostname: "images.themorningpulse.fyi", pathname: "/**" },
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
      { protocol: "https", hostname: "www.residentialsystems.com", pathname: "/**" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.startupnews.fyi" }],
        destination: "https://startupnews.fyi/:path*",
        permanent: true,
      },
      {
        source: "/category/:slug",
        destination: "/:slug",
        permanent: true,
      },
      {
        source: "/cybersecurity",
        destination: "/cyber-security",
        permanent: true,
      },
      {
        source: "/cybersecurity/:path*",
        destination: "/cyber-security/:path*",
        permanent: true,
      },
      {
        // "Funding" category was renamed to "Funding Tracker" (slug: funding -> funding-tracker)
        source: "/funding",
        destination: "/funding-tracker",
        permanent: true,
      },
      {
        // Public event submission page renamed from "Submit Your Event" to "List Your Event"
        source: "/submit-event",
        destination: "/list-your-event",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/funding-tracker", destination: "/category/funding-tracker" },
      // Numbered post sitemaps listed in /sitemap_index.xml (handler: app/sitemap-posts/[page]/route.ts)
      { source: "/sitemap-posts-:page(\\d+).xml", destination: "/sitemap-posts/:page" },
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
      // Public HTML: shared caches (Cloudflare, once a Cache Rule makes HTML eligible) may keep a
      // page for 60s and serve it stale for 5 more minutes while refetching — the same window as
      // the pages' own ISR revalidate. Browsers (max-age=0) always revalidate. This used to be
      // no-store everywhere so a deploy couldn't leave the edge serving HTML that points at
      // deleted chunks; scripts/build.sh now keeps previous builds' chunks for 14 days, so edge
      // HTML that is a few minutes old still resolves.
      {
        source: "/:path((?!(?:admin|api|dashboard|employee|unsubscribe)(?:/|$)|_next/).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      // Homepage: cached at Cloudflare for 15 min, matching page.tsx's revalidate=900. Listed after
      // the public rule so it overrides it. Not purged on publish (a prefix purge of "/" would
      // clear the whole site), so new posts can take up to 15 min to reach the edge copy.
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=900, stale-while-revalidate=300",
          },
        ],
      },
      // Articles (/{category}/{slug}): cached at Cloudflare for a day — old articles almost never
      // change, and most origin traffic is crawlers walking the long tail of them, which a 60s
      // TTL can't absorb. Every post change purges its URL (src/lib/cloudflare-purge.ts), so this
      // is only switched on when purging is configured at build time. Listed after the public
      // rule so it overrides it. First-segment exclusions = top-level routes with nested pages.
      ...(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID
        ? [
            {
              source:
                "/:category((?!(?:admin|api|author|category|dashboard|employee|events|incubatx|post|sitemap-posts|startup-events|unsubscribe|_next)(?![^/]))[^/]+)/:rest+",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=0, s-maxage=86400, stale-while-revalidate=300",
                },
              ],
            },
          ]
        : []),
      // Private/per-user areas and APIs: never cached anywhere.
      {
        source: "/:area(admin|api|dashboard|employee|unsubscribe)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate, max-age=0",
          },
        ],
      },
      // Staff/user areas: never indexed, even if a page forgets its robots metadata.
      {
        source: "/:area(admin|dashboard|employee)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
