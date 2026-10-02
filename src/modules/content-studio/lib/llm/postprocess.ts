// sanitize-html rather than isomorphic-dompurify: the latter pulls in jsdom,
// whose ESM-only deps fail to load in the Vercel Node runtime.
import sanitizeHtml from "sanitize-html";
import type { Article, GeneratedMeta } from "@/modules/content-studio/types";

// ══════════════════════════════════════════════════════════════════
// Output cleanup, ported from content-studio-v17.html:1916-2022.
// `backlink_anchors` is intentionally dropped — no prompt ever produced it
// and nothing rendered it (see the plan's "drop dead code" decision).
// ══════════════════════════════════════════════════════════════════

/** Hard safety-net trim: cuts at the last full word at or before maxLen, no ellipsis. */
export function trimToLength(s: string, maxLen: number): string {
  if (!s) return s;
  s = s.trim();
  if (s.length <= maxLen)
    return /[.!?]$/.test(s) ? s : s.replace(/[,;:\s]+$/, "") + ".";
  const cut = s.slice(0, maxLen);
  // Prefer cutting at the end of a complete sentence within range, so we
  // never leave a dangling clause with no closing punctuation.
  const lastSentenceEnd = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? "),
  );
  if (lastSentenceEnd > 60) return cut.slice(0, lastSentenceEnd + 1).trim();
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(
    /[,;:\s]+$/,
    "",
  );
  return /[.!?]$/.test(trimmed) ? trimmed : trimmed + ".";
}

export function clampScore(n: unknown, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(100, Math.round(v)));
}

// ── AI-MARKER CLEANUP (safety net) ──
// The prompts and fact-check pass already ban these, but LLMs slip sometimes.
// Catches em dash, en dash, horizontal bar, minus sign, and "--" used as a faux dash.
const DASH_RE = /\s*(?:--+|[—–―−])\s*/g;

export function stripDashes(text: string): string {
  if (!text) return text;
  let out = text.replace(DASH_RE, ", ");
  out = out.replace(/,\s*([.,])/g, "$1").replace(/,\s*,/g, ",");
  return out;
}

export function stripAIArtifacts(html: string): string {
  return stripDashes(html);
}

export function safeParseJSON(raw: string): Record<string, unknown> {
  const c = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
  const s = c.indexOf("{"),
    e = c.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("No JSON found");
  return JSON.parse(c.slice(s, e + 1));
}

/**
 * Sanitize model-produced HTML before it is rendered with
 * dangerouslySetInnerHTML. The allowlist mirrors the prompt's own
 * OUTPUT FORMAT whitelist (prompts.ts), plus <mark> for highlight mode.
 */
export function sanitizeBody(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "h2",
      "ul",
      "ol",
      "li",
      "div",
      "blockquote",
      "cite",
      "strong",
      "em",
      "a",
      "mark",
      "br",
    ],
    allowedAttributes: {
      "*": ["class", "data-author-input"],
      a: ["href", "rel", "target"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

/** Shape of the raw JSON the metadata call returns, before normalisation. */
type RawMeta = Partial<GeneratedMeta> & Record<string, unknown>;

export function parseOutput(
  bodyHtml: string,
  metaRaw: string,
  article: Article,
  keyword: string,
): GeneratedMeta & { body_html: string } {
  let meta: RawMeta;
  try {
    meta = safeParseJSON(metaRaw) as RawMeta;
  } catch {
    meta = {
      headline: article.title.slice(0, 65),
      subheadline: article.desc || "",
      meta_description: (article.desc || article.title).slice(0, 155),
      meta_keywords: keyword,
      og_title: article.title,
      schema_type: "NewsArticle",
      read_time: "4 min read",
      word_count: bodyHtml.replace(/<[^>]+>/g, "").split(/\s+/).length,
      seo_score: 70,
      geo_score: 65,
      seo_notes: "Auto-generated content.",
      lsi_keywords: [],
      faqs: [],
    };
  }

  // Strip stray dashes first, THEN hard-enforce the length cap so the final
  // string can never overshoot 158 chars even after dash→comma expansion.
  const headline = stripDashes((meta.headline || "").trim());
  const subheadline = stripDashes((meta.subheadline || "").trim());
  const meta_description = trimToLength(
    stripDashes((meta.meta_description || "").trim()),
    158,
  );

  return {
    headline,
    subheadline,
    meta_description,
    meta_keywords: meta.meta_keywords || keyword,
    og_title: meta.og_title || headline,
    slug: (meta.slug as string) || "",
    schema_type: meta.schema_type || "NewsArticle",
    seo_score: clampScore(meta.seo_score, 70),
    geo_score: clampScore(meta.geo_score, 65),
    lsi_keywords: Array.isArray(meta.lsi_keywords) ? meta.lsi_keywords : [],
    faqs: Array.isArray(meta.faqs) ? meta.faqs : [],
    body_html: sanitizeBody(bodyHtml.trim()),
  };
}
