// ══════════════════════════════════════════════════════════════════
// Shared domain types for Content Studio.
// Ported from the implicit shapes in content-studio-v17.html.
// ══════════════════════════════════════════════════════════════════

/** A news item, from a Google News search or a direct URL import. */
export interface Article {
  title: string;
  link: string;
  pubDate: string;
  desc: string;
  feedName: string;
  feedUrl: string;
  feedColor: string;
  source: string;
  /** Full article text, fetched on demand via /api/extract. */
  fullText?: string | null;
  /** True when the "article" is really a free-text topic brief. */
  isTopicMode?: boolean;
  /** True when imported by pasting a URL. */
  isURLImport?: boolean;
  /** True when the source query was already narrowed server-side with `when:`. */
  timeScoped?: boolean;
}

/** A staff author whose voice the model writes in (persisted under `cs_authors`). */
export interface Author {
  id: string;
  name: string;
  role: string;
  beats: string;
  bio: string;
  linkedin: string;
  voice: string;
  /** Paragraph-by-paragraph structure this author follows. */
  structure?: string;
  /** The publication pattern this voice is modelled on. */
  patternRef?: string;
  /** Voice traits are a best guess and not yet verified by a human. */
  inferred?: boolean;
}

/** An article template — drives tone, layout and which special sections are on. */
export interface Template {
  geo: string;
  tone: string;
  specials: string[];
  label: string;
  style: string;
}

export type TemplateId = "news" | "conversational";

/** One of the three ways to pick a source. */
export type SourceMode = "url" | "topic" | "news";

/** One of the four output tabs. */
export type OutputTab = "preview" | "seo" | "schema" | "raw";

/** A built-in Google News company query. */
export interface NewsSource {
  id: string;
  label: string;
  color: string;
  query?: string;
  url?: string;
}

/** A user-added news source (persisted under `cs_news_custom_sources`). */
export interface CustomNewsSource {
  id: string;
  label: string;
  color: string;
  /** `feed` = direct RSS, `site` = a domain, `article` = one URL, `topic` = a search. */
  type: "feed" | "site" | "article" | "topic";
  url?: string;
  host?: string;
  query?: string;
  /** For `site` sources, a direct feed found by /api/discover. */
  discoveredFeedUrl?: string;
}

/** One entry in the fan-out job list built for /api/news. */
export interface NewsJob {
  id: string;
  label: string;
  color: string;
  url: string;
  /** True when the time window is already baked into the query via `when:`. */
  timeScoped: boolean;
  /** Keep every item the feed returns instead of the per-source cap. */
  fullFeed?: boolean;
  /** Google News search used when the feed is empty or has nothing in the time window. */
  fallbackQuery?: string;
}

/** One Google Trends "Trending now" entry. */
export interface TrendItem {
  term: string;
  /** ISO time the spike started. */
  started: string;
  /** ISO time it stopped trending, or null while still active. */
  ended: string | null;
  /** Approximate searches, e.g. 10000 for "10K+". */
  volume: number;
  increasePct: number;
  related: string[];
  /** Top Google News headlines for the term. */
  articles: { title: string; source: string; link: string; pubDate: string }[];
}

/** One news source as shown in the source filter bar. */
export interface NewsSourceInfo {
  id: string;
  label: string;
  color: string;
}

/** A freshness window for the news workspace. */
export interface TimeRange {
  id: string;
  label: string;
  /** Hours back; null means "all time". */
  hours: number | null;
}

/**
 * One block of the article body.
 *
 * The prompt constrains the model to a closed tag set, so the body is parsed
 * into this AST rather than held as opaque HTML — see lib/article/blocks.ts.
 */
export type ArticleBlock =
  | { id: string; kind: "p"; html: string }
  | { id: string; kind: "h2"; html: string }
  | { id: string; kind: "ul"; items: string[] }
  | { id: string; kind: "keyTakeaways"; items: string[] }
  | { id: string; kind: "dataCallout"; figure: string; note: string }
  | { id: string; kind: "authorInput"; text: string };

/** A pink highlight, stored as character offsets into a block's plain text. */
export interface Highlight {
  blockId: string;
  start: number;
  end: number;
}

/** The four kinds of editor input. content-studio-v17.html:2097-2102 */
export type AuthorInputType = "opinion" | "data" | "quote" | "obs";

/** One FAQ pair produced by the metadata call. */
export interface Faq {
  q: string;
  a: string;
}

/** The parsed metadata object returned by the SEO/GEO call. */
export interface GeneratedMeta {
  headline: string;
  subheadline: string;
  meta_description: string;
  meta_keywords: string;
  og_title: string;
  slug: string;
  schema_type: string;
  seo_score: number;
  geo_score: number;
  lsi_keywords: string[];
  faqs: Faq[];
}

/** Everything the preview, SEO, schema and raw tabs render from. */
export interface GeneratedData extends GeneratedMeta {
  /** Canonical body HTML as generated. The editable source of truth is `blocks`. */
  body_html: string;
  /** The parsed body. React owns this; the Raw tab is derived from it. */
  blocks: ArticleBlock[];
  /** The source article this was generated from. */
  _article: Article;
  /** The primary keyword derived from the source headline. */
  _keyword: string;
  /** The author whose voice was used, if any. */
  _author: Author | null;
  /** The template used. */
  _template: Template;
  /** Changes on every generation; used to re-key the article DOM island. */
  _generationId: string;
}

/** The settings the generate call reads (was DOM-only in the original). */
export interface GenerateSettings {
  length: string;
  templateId: TemplateId;
  authorId: string;
  specials: string[];
}

/** Request body for POST /api/generate. */
export interface GenerateRequest {
  article: Article;
  settings: GenerateSettings;
  author: Author | null;
  recentHeadlines: string[];
}

/** SSE events streamed back by POST /api/generate. */
export type GenerateEvent =
  | { type: "step"; step: number; label?: string }
  | { type: "done"; data: GeneratedData }
  | { type: "error"; message: string };
