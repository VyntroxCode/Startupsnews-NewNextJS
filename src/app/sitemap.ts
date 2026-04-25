import type { MetadataRoute } from "next";
import { query } from "@/shared/database/connection";
import { normalizePostSlugForCategory } from "@/lib/post-utils";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

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

function asDate(value: Date | string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1.0 },
    { url: `${SITE_URL}/news`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact-us`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/startup-events`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/privacy-policy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms-and-conditions`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/return-refund-policy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/advertise-with-us`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/our-partners`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/delete-your-account`, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const [categories, posts] = await Promise.all([
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
          changeFrequency: "daily",
          priority: 0.7,
        };
      });

    return [...staticRoutes, ...categoryRoutes, ...postRoutes];
  } catch (error) {
    console.error("Failed to generate sitemap from database:", error);
    return staticRoutes;
  }
}
