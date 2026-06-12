import type { MetadataRoute } from "next";
import { query } from "@/shared/database/connection";
import { normalizePostSlugForCategory } from "@/lib/post-utils";
import { slugify } from "@/shared/utils/string.utils";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

// Staff authors hardcoded in FullArticle — added to sitemap so search engines
// can discover their author pages. Not rendered as clickable links in articles.
const STAFF_AUTHOR_SLUGS = [
  { name: "StartupNews.fyi Editorial Team", slug: "startupnewsfyi-editorial-team" },
  { name: "Madhur Mohan Malik",             slug: "madhur-mohan-malik"            },
  { name: "Kapil Suri",                     slug: "kapil-suri"                    },
  { name: "Kanak Aggarwal",                 slug: "kanak-aggarwal"                },
  { name: "Sreejit Kumar",                  slug: "sreejit-kumar"                 },
];

type PostSitemapRow = {
  slug: string;
  category_slug: string;
  updated_at: Date | string | null;
  published_at: Date | string | null;
  created_at: Date | string | null;
};

type CategorySitemapRow = {
  slug: string;
};

type EventSitemapRow = {
  slug: string;
  updated_at: Date | string | null;
  created_at: Date | string | null;
};

type AuthorSitemapRow = {
  name: string;
  updated_at: Date | string | null;
};

function asDate(value: Date | string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1.0 },
    { url: `${SITE_URL}/news`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/press-release`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/startup-events`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/about-us`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact-us`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/advertise-with-us`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/our-partners`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/privacy-policy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms-and-conditions`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/return-refund-policy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/delete-your-account`, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const [categories, posts, events, authors] = await Promise.all([
      query<CategorySitemapRow>(
        "SELECT slug FROM categories ORDER BY id DESC"
      ),
      query<PostSitemapRow>(
        `SELECT p.slug, c.slug AS category_slug, p.updated_at, p.published_at, p.created_at
         FROM posts p
         INNER JOIN categories c ON c.id = p.category_id
         WHERE p.status = 'published' AND IFNULL(p.is_gone_410, 0) = 0
         ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id DESC`
      ),
      query<EventSitemapRow>(
        `SELECT slug, updated_at, created_at
         FROM events
         WHERE status IN ('upcoming', 'ongoing') AND slug IS NOT NULL AND slug != ''
         ORDER BY event_date ASC`
      ),
      query<AuthorSitemapRow>(
        `SELECT name, updated_at
         FROM users
         WHERE is_active = 1 AND name IS NOT NULL AND name != ''
         ORDER BY id ASC`
      ),
    ]);

    const categoryRoutes: MetadataRoute.Sitemap = categories
      .filter((c) => (c.slug || "").trim().length > 0)
      .map((c) => ({
        url: `${SITE_URL}/${encodeURIComponent(c.slug.trim())}`,
        changeFrequency: "hourly",
        priority: 0.8,
      }));

    const postRoutes: MetadataRoute.Sitemap = posts
      .filter((p) => (p.slug || "").trim().length > 0 && (p.category_slug || "").trim().length > 0)
      .map((p) => {
        const categorySlug = (p.category_slug || "").trim().replace(/^\/+|\/+$/g, "");
        const normalizedSlug = normalizePostSlugForCategory(categorySlug, p.slug || "");
        const postPath = `${categorySlug}/${normalizedSlug}`.replace(/^\/+|\/+$/g, "");
        return {
          url: `${SITE_URL}/${postPath}`,
          lastModified: asDate(p.updated_at) || asDate(p.published_at) || asDate(p.created_at),
          changeFrequency: "daily" as const,
          priority: 0.7,
        };
      });

    const eventRoutes: MetadataRoute.Sitemap = events
      .filter((e) => (e.slug || "").trim().length > 0)
      .map((e) => ({
        url: `${SITE_URL}/startup-events/${e.slug.trim()}`,
        lastModified: asDate(e.updated_at) || asDate(e.created_at),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));

    const authorRoutes: MetadataRoute.Sitemap = authors
      .filter((a) => (a.name || "").trim().length > 0)
      .map((a) => ({
        url: `${SITE_URL}/author/${slugify(a.name.trim())}`,
        lastModified: asDate(a.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.5,
      }));

    const staffAuthorRoutes: MetadataRoute.Sitemap = STAFF_AUTHOR_SLUGS.map((a) => ({
      url: `${SITE_URL}/author/${a.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));

    return [...staticRoutes, ...categoryRoutes, ...postRoutes, ...eventRoutes, ...authorRoutes, ...staffAuthorRoutes];
  } catch (error) {
    console.error("Failed to generate sitemap from database:", error);
    return staticRoutes;
  }
}
