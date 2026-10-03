import { escapeAttr, escapeHtml, serializeBlocks } from "./blocks";
import type { GeneratedData } from "@/modules/content-studio/types";

// ══════════════════════════════════════════════════════════════════
// The downloadable standalone article file.
// Ported from `buildFullHTML`, content-studio-v17.html:2219-2286.
//
// IMPORTANT — two things that look wrong but aren't:
//
// 1. This file builds HTML by string concatenation, so every interpolated
//    value MUST be escaped by hand. That is the opposite of the rest of the
//    codebase, where React escapes automatically and manual escaping would
//    double-escape. Do not "clean up" the escape calls below.
//
// 2. EXPORT_CSS is a plain string and must stay one. It is NOT app CSS and
//    must NOT be converted to Tailwind — the exported file is self-contained
//    and has no build step. (Fixes the one real bug in the original: headlines
//    and descriptions were interpolated into attributes unescaped, so a
//    headline containing a double quote corrupted every meta tag after it.)
// ══════════════════════════════════════════════════════════════════

const EXPORT_CSS = `
body{font-family:Georgia,'Times New Roman',serif;max-width:780px;margin:0 auto;padding:40px 20px;line-height:1.85;color:#18192b;font-size:17px}
h1{font-size:34px;line-height:1.2;margin-bottom:10px;font-weight:700}
h2{font-size:22px;margin:36px 0 12px;font-weight:600;border-top:1px solid #e5e5e0;padding-top:8px}
p{margin-bottom:20px}
blockquote{margin:28px 0;padding:18px 22px;border-left:4px solid #e8186d;background:#fff0f4;font-style:italic;font-size:18px;border-radius:0 10px 10px 0}
blockquote cite{display:block;margin-top:8px;font-size:13px;font-style:normal;color:#666;font-weight:600}
.key-takeaways{margin:28px 0;padding:20px 24px;background:#f5f4f0;border:1px solid #e2e1da;border-radius:10px}
.key-takeaways ul{padding-left:20px}.key-takeaways li{margin-bottom:8px;font-size:15px}
.data-callout{margin:28px 0;padding:22px 26px;background:linear-gradient(135deg,#e8186d,#b80f55);color:#fff;border-radius:10px}
.data-callout strong{font-size:28px;display:block;margin-bottom:4px}.data-callout p{color:#fff;opacity:.9}
.deck{font-size:20px;color:#555;margin-bottom:28px;font-style:italic;padding-left:16px;border-left:3px solid #ccc}
.faq-section{margin-top:40px;padding-top:24px;border-top:2px solid #e5e5e5}
.faq-section h2{margin-top:0;border:none;padding:0}
.faq-item{margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #f0f0ee}
.faq-item:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
.faq-q{font-size:16px;font-weight:600;margin-bottom:8px}
.faq-a{font-size:15px;color:#444;line-height:1.7}
.source-footer{margin-top:36px;padding-top:18px;border-top:1px solid #e5e5e5;font-size:14px;color:#777}
.source-footer a{color:#e8186d;text-decoration:none}
`.trim();

export function buildArticleSchema(d: GeneratedData): Record<string, unknown> {
  const au = d._author;
  const authorSchema = au
    ? {
        "@type": "Person",
        name: au.name,
        jobTitle: au.role || "",
        url: au.linkedin || "",
        sameAs: au.linkedin ? [au.linkedin] : [],
        description: au.bio || "",
      }
    : { "@type": "Organization", name: d._article.feedName };

  return {
    "@context": "https://schema.org",
    "@type": d.schema_type || "NewsArticle",
    headline: d.headline || "",
    description: d.meta_description || "",
    keywords: d.meta_keywords || "",
    author: authorSchema,
    publisher: { "@type": "Organization", name: "StartupNews.fyi" },
    url: d._article.link,
    datePublished: d._article.pubDate || new Date().toISOString(),
    dateModified: new Date().toISOString(),
  };
}

export function buildFaqSchema(d: GeneratedData): Record<string, unknown> | null {
  if (!d.faqs?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: d.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** JSON-LD must not be able to terminate the <script> element that carries it. */
function jsonLd(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, null, 2).replace(/<\//g, "<\\/");
}

/**
 * `forPost` (Move to post): leave out the <h1> headline and the "Source:" footer,
 * since the post already has its own title field and shouldn't credit the source,
 * and move filled author input to just before the FAQ.
 */
export function buildFullHtml(d: GeneratedData, opts: { forPost?: boolean } = {}): string {
  const { forPost = false } = opts;
  // Strip unfilled author-input placeholders so they never ship.
  // In a post, the editor's own input sits at the end of the body, just before the FAQ.
  const bodyOut = serializeBlocks(d.blocks, {
    dropEmptyAuthorInputs: true,
    authorInputsLast: forPost,
  });

  const schema = buildArticleSchema(d);
  const faqSchema = buildFaqSchema(d);

  const faqHTML = (d.faqs || [])
    .map(
      (f) =>
        `<div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question"><h3 class="faq-q" itemprop="name">${escapeHtml(
          f.q,
        )}</h3><div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer"><p class="faq-a" itemprop="text">${escapeHtml(
          f.a,
        )}</p></div></div>`,
    )
    .join("");

  const au = d._author;
  const byline = au
    ? `<p class="byline" style="font-size:14px;color:#555;margin:0 0 24px;padding-bottom:16px;border-bottom:1px solid #e5e5e0">By <strong>${escapeHtml(
        au.name,
      )}</strong>${au.role ? ", " + escapeHtml(au.role) : ""}${
        au.linkedin
          ? ` &middot; <a href="${escapeAttr(
              au.linkedin,
            )}" rel="author noopener" target="_blank">LinkedIn</a>`
          : ""
      }</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(d.headline || "")}</title>
<meta name="description" content="${escapeAttr(d.meta_description || "")}">
<meta name="keywords" content="${escapeAttr(d.meta_keywords || "")}">
<meta name="robots" content="index, follow">
<meta property="og:title" content="${escapeAttr(d.og_title || d.headline || "")}">
<meta property="og:description" content="${escapeAttr(d.meta_description || "")}">
<meta property="og:type" content="article">
<meta property="og:url" content="${escapeAttr(d._article.link)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${escapeAttr(d._article.link)}">
<script type="application/ld+json">${jsonLd(schema)}</script>
${faqSchema ? `<script type="application/ld+json">${jsonLd(faqSchema)}</script>` : ""}
<style>
${EXPORT_CSS}
</style>
</head>
<body>
<article>
${forPost ? "" : `<h1>${escapeHtml(d.headline || "")}</h1>`}
${d.subheadline ? `<p class="deck">${escapeHtml(d.subheadline)}</p>` : ""}
${byline}
${bodyOut}
${faqHTML ? `<section class="faq-section" itemscope itemtype="https://schema.org/FAQPage"><h2>Frequently asked questions</h2>${faqHTML}</section>` : ""}
${
  forPost
    ? ""
    : `<div class="source-footer"><strong>Source:</strong> <a href="${escapeAttr(
        d._article.link,
      )}" target="_blank" rel="noopener">${escapeHtml(d._article.feedName)} — ${escapeHtml(
        d._article.title,
      )}</a></div>`
}
</article>
</body>
</html>`;
}

/** Filename slug for the download. content-studio-v17.html:2292 */
export function articleSlug(headline: string): string {
  return (headline || "article")
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()
    .replace(/-+/g, "-")
    .slice(0, 60);
}
