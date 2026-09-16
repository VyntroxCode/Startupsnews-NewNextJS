import { query } from "@/shared/database/connection";
import { normalizePostSlugForCategory } from "@/lib/post-utils";

// Shared building blocks for the split sitemaps:
//   /sitemap_index.xml (also served at /sitemap.xml) → sitemap-news.xml, sitemap-posts-1..N.xml,
//   sitemap-events.xml, sitemap-static.xml
// Category listing pages are noindex,nofollow (see app/[...slug]/page.tsx), so no sitemap lists them.
// No <lastmod> or <changefreq> is emitted anywhere, and every URL gets priority 1.0 unless an entry overrides it.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi").replace(/\/+$/, "");

// Posts per numbered file. Files are filled oldest-first (by id), so sitemap-posts-1 stays
// byte-stable once full and only the last file grows — crawlers don't re-fetch the whole archive daily.
// 50,000 is the sitemap protocol's per-file URL limit; post 50,001 onward starts sitemap-posts-2.
export const POSTS_PER_SITEMAP = 50000;

const DEFAULT_PRIORITY = 1.0;

// Covers the last 7 days (max 1000 per file). Google News itself only reads articles from the
// last 2 days — the older entries are ignored by it, not an error.
const NEWS_WINDOW_HOURS = 24 * 7;
const NEWS_PUBLICATION_NAME = "StartupNews.fyi";
// Press releases are not editorial news and are excluded from the Google News sitemap
// (they still appear in the regular posts sitemaps).
const NEWS_EXCLUDED_CATEGORIES = ["press-release"];

const STAFF_AUTHOR_SLUGS = [
  "startupnewsfyi-editorial-team",
  "madhur-mohan-malik",
  "kapil-suri",
  "kanak-aggarwal",
  "sreejit-kumar",
];

const STATIC_ROUTES: string[] = [
  "/",
  "/news",
  "/press-release",
  "/events",
  "/about-us",
  "/contact-us",
  "/advertise-with-us",
  "/our-partners",
  "/privacy-policy",
  "/terms-and-conditions",
  "/return-refund-policy",
];

// A post belongs in a sitemap only if it is live and indexable.
const INDEXABLE_POST_WHERE = `p.status = 'published'
  AND IFNULL(p.is_gone_410, 0) = 0
  AND IFNULL(p.robots, 'index,follow') NOT LIKE 'noindex%'
  AND p.slug IS NOT NULL AND p.slug != ''
  AND c.slug IS NOT NULL AND c.slug != ''`;

type PostRow = {
  title?: string | null;
  slug: string;
  category_slug: string;
  published_at?: Date | string | null;
  created_at?: Date | string | null;
};

export type UrlEntry = {
  loc: string;
  priority?: number;
};

function asDate(value: Date | string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&apos;";
    }
  });
}

function postUrl(row: PostRow): string {
  const categorySlug = row.category_slug.trim().replace(/^\/+|\/+$/g, "");
  const leaf = normalizePostSlugForCategory(categorySlug, row.slug);
  return `${SITE_URL}/${categorySlug}/${leaf}`;
}

// ---------- XML rendering ----------

export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900",
    },
  });
}

export function renderUrlset(entries: UrlEntry[]): string {
  const urls = entries
    .map((e) => {
      const parts = [`<loc>${escapeXml(e.loc)}</loc>`];
      parts.push(`<priority>${(e.priority ?? DEFAULT_PRIORITY).toFixed(1)}</priority>`);
      return `<url>${parts.join("")}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

// ---------- sitemap-static.xml ----------

export function getStaticEntries(): UrlEntry[] {
  const pages = STATIC_ROUTES.map((path) => ({ loc: `${SITE_URL}${path}` }));
  const authors = STAFF_AUTHOR_SLUGS.map((slug) => ({ loc: `${SITE_URL}/author/${slug}` }));
  return [...pages, ...authors];
}

// ---------- sitemap-events.xml ----------

export async function getEventEntries(): Promise<UrlEntry[]> {
  const rows = await query<{ slug: string }>(
    `SELECT slug
     FROM partnership_events
     WHERE site_status = 'upcoming' AND slug IS NOT NULL AND slug != ''
     ORDER BY event_start_date ASC`
  );
  return rows.map((e) => ({ loc: `${SITE_URL}/startup-events/${e.slug.trim()}` }));
}

// ---------- sitemap-posts-N.xml ----------

export async function getPostSitemapCount(): Promise<number> {
  const rows = await query<{ n: number | bigint }>(
    `SELECT COUNT(*) AS n
     FROM posts p
     INNER JOIN categories c ON c.id = p.category_id
     WHERE ${INDEXABLE_POST_WHERE}`
  );
  const total = Number(rows[0]?.n ?? 0);
  return Math.max(1, Math.ceil(total / POSTS_PER_SITEMAP));
}

/** `page` is 1-based. Returns null when the page is out of range. */
export async function getPostEntries(page: number): Promise<UrlEntry[] | null> {
  if (!Number.isInteger(page) || page < 1) return null;
  const rows = await query<PostRow>(
    `SELECT p.slug, c.slug AS category_slug
     FROM posts p
     INNER JOIN categories c ON c.id = p.category_id
     WHERE ${INDEXABLE_POST_WHERE}
     ORDER BY p.id ASC
     LIMIT ? OFFSET ?`,
    [POSTS_PER_SITEMAP, (page - 1) * POSTS_PER_SITEMAP]
  );
  if (rows.length === 0 && page > 1) return null;
  return rows.map((row) => ({ loc: postUrl(row) }));
}

// ---------- sitemap-news.xml (Google News) ----------

export async function renderNewsSitemap(): Promise<string> {
  const excluded = NEWS_EXCLUDED_CATEGORIES.map(() => "?").join(",");
  const rows = await query<PostRow>(
    `SELECT p.title, p.slug, c.slug AS category_slug, p.published_at, p.created_at
     FROM posts p
     INNER JOIN categories c ON c.id = p.category_id
     WHERE ${INDEXABLE_POST_WHERE}
       AND c.slug NOT IN (${excluded})
       AND COALESCE(p.published_at, p.created_at) >= NOW() - INTERVAL ${NEWS_WINDOW_HOURS} HOUR
     ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id DESC
     LIMIT 1000`,
    NEWS_EXCLUDED_CATEGORIES
  );

  const urls = rows
    .map((row) => {
      const published = asDate(row.published_at) || asDate(row.created_at);
      if (!published) return "";
      return `<url><loc>${escapeXml(postUrl(row))}</loc><news:news><news:publication><news:name>${escapeXml(NEWS_PUBLICATION_NAME)}</news:name><news:language>en</news:language></news:publication><news:publication_date>${published.toISOString()}</news:publication_date><news:title>${escapeXml((row.title || "").trim())}</news:title></news:news></url>`;
    })
    .filter(Boolean)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;
}

// ---------- sitemap_index.xml ----------

export async function renderSitemapIndex(): Promise<string> {
  const pageCount = await getPostSitemapCount();

  const children = [
    `${SITE_URL}/sitemap-news.xml`,
    ...Array.from({ length: pageCount }, (_, i) => `${SITE_URL}/sitemap-posts-${i + 1}.xml`),
    `${SITE_URL}/sitemap-events.xml`,
    `${SITE_URL}/sitemap-static.xml`,
  ];

  const body = children.map((loc) => `<sitemap><loc>${escapeXml(loc)}</loc></sitemap>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>
`;
}
