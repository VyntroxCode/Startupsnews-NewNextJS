import "server-only";

import * as cheerio from "cheerio";

import { safeFetch } from "./safeFetch";
import { resolveGoogleNewsUrl } from "./googleNews";

// ══════════════════════════════════════════════════════════════════
// Server-side article extraction.
//
// Replaces the browser's CORS-proxy chain + r.jina.ai + regex scraper
// (content-studio-v17.html:995-1172). Server fetch has no CORS, so we go
// straight to the page and parse it with a real HTML parser.
// ══════════════════════════════════════════════════════════════════

export async function fetchPage(url: string): Promise<string> {
  return (await safeFetch(url)).body;
}

// Strip common navigation/cookie/paywall/promo boilerplate that extraction
// sometimes pulls in alongside — or instead of — real article text (e.g. "Skip to content",
// event-ticket promos, cookie banners, subscribe walls, share-button label lists).
// content-studio-v17.html:1009-1023
const BOILERPLATE_LINE_PATTERNS = [
  /^skip to content$/i,
  /^skip to main content$/i,
  /save \$?\d+[\d,]* on your .*(ticket|pass|membership)/i,
  /^register now$/i,
  /^(accept|manage) cookies?/i,
  /^we use cookies/i,
  /^sign in$|^log in$|^subscribe(\s*now)?$/i,
  /^share this (article|story)/i,
  /^(follow|add) us (on|as)/i,
  /^advertisement$/i,
  /^related (articles?|stories?)$/i,
  /^\d+ (min|minute) read$/i,
  /^by\s+.{1,40}\s*[·|]\s*\d+\s*(min|hour)/i,
];

export function stripBoilerplate(text: string): string {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      if (l.length < 3) return false;
      return !BOILERPLATE_LINE_PATTERNS.some((rx) => rx.test(l));
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A bare domain/homepage URL (no path, or just "/") is a listing page, not a
 * single article. content-studio-v17.html:1033-1036
 */
export function looksLikeHomepage(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      !u.pathname ||
      u.pathname === "/" ||
      u.pathname.split("/").filter(Boolean).length === 0
    );
  } catch {
    return false;
  }
}

export interface ExtractedArticle {
  title: string;
  text: string;
  excerpt: string;
  isHomepage: boolean;
}

/**
 * Smart article body extraction — prioritise <article>/<main> over the full page.
 * Ported in intent from `extractArticleTextGlobal`
 * (content-studio-v17.html:1083-1098), but using cheerio instead of regex so
 * nested tags and malformed markup don't break the match.
 */
export function extractFromHtml(html: string, url: string): ExtractedArticle {
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").first().text().trim() ||
    domainOf(url);

  // Chrome that never belongs to the article.
  $("script, style, nav, footer, header, aside, noscript, form, iframe").remove();

  const candidates = [
    "article",
    "main",
    '[role="main"]',
    ".post-content",
    ".entry-content",
    ".article-body",
    ".story-body",
    '[class*="article"]',
    '[class*="post"]',
    '[class*="content"]',
    '[class*="story"]',
    '[class*="entry"]',
    '[class*="body"]',
  ];

  let best = "";
  for (const sel of candidates) {
    const node = $(sel).first();
    if (!node.length) continue;
    const text = node.text().replace(/\s+/g, " ").trim();
    if (text.length > best.length) best = text;
    // An <article>/<main> hit long enough to be a real body wins immediately.
    if (best.length > 1200) break;
  }

  if (best.length < 300) {
    best = $("body").text().replace(/\s+/g, " ").trim();
  }

  const text = stripBoilerplate(best);

  return {
    title: title.slice(0, 120),
    text,
    excerpt: text.slice(0, 220),
    isHomepage: looksLikeHomepage(url),
  };
}

/** Fetch a URL and return just its article text. Used by the generate pipeline. */
export async function fetchArticleText(url: string): Promise<string> {
  return (await fetchArticlePage(url)).text;
}

/**
 * Fetch a URL and return the full extraction.
 *
 * Google News stubs are resolved to the publisher URL first — fetching the stub
 * itself yields a JS interstitial with no article text. See ./googleNews.ts.
 */
export async function fetchArticlePage(url: string): Promise<ExtractedArticle> {
  const target = await resolveGoogleNewsUrl(url);
  const { body, finalUrl } = await safeFetch(target);
  return extractFromHtml(body, finalUrl);
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
