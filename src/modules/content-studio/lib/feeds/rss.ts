import "server-only";

import { XMLParser } from "fast-xml-parser";
import { fetchPage } from "./extract";

// ══════════════════════════════════════════════════════════════════
// Server-side RSS/Atom parsing.
//
// Replaces both `fetchViaRSS2JSON` and `fetchViaProxyXML`
// (content-studio-v17.html:1217-1245). With no CORS to work around, neither
// rss2json nor a proxy is needed — fetch the feed and parse it here.
// The item shape matches the original exactly so nothing downstream changes.
// ══════════════════════════════════════════════════════════════════

export interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  desc: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  // Feed titles and descriptions routinely carry entities and CDATA.
  processEntities: true,
  htmlEntities: true,
});

/** Feed values can come back as a string, a number, or an object with #text. */
function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("#text" in o) return text(o["#text"]);
  }
  return "";
}

/** Atom puts the URL in <link href="…"/>; RSS puts it in the element body. */
function linkOf(item: Record<string, unknown>): string {
  const raw = item.link;
  if (typeof raw === "string" && raw.trim()) return raw.trim();

  const candidates = Array.isArray(raw) ? raw : [raw];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
    if (c && typeof c === "object") {
      const o = c as Record<string, unknown>;
      // Prefer rel="alternate" when several <link>s are present.
      if (o["@_rel"] && o["@_rel"] !== "alternate") continue;
      const href = o["@_href"];
      if (typeof href === "string" && href.trim()) return href.trim();
      const body = text(o);
      if (body) return body;
    }
  }
  return "#";
}

const ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
};

/**
 * Descriptions are HTML inside XML, so the parser's one round of entity decoding leaves
 * markup-level entities (Google News pads every item with `&nbsp;&nbsp;`). Tags become
 * spaces rather than nothing so adjacent links don't run together ("Android AuthoritySamsung").
 */
function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/g, (_, e: string) => ENTITIES[e])
    .replace(/\s+/g, " ")
    .trim();
}

function toArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Parse RSS 2.0 or Atom XML into the original's item shape. */
export function parseFeedXml(xml: string): RssItem[] {
  const doc = parser.parse(xml);

  const channel = doc?.rss?.channel ?? doc?.["rdf:RDF"] ?? doc?.feed ?? doc;
  const raw = [
    ...toArray(channel?.item),
    ...toArray(channel?.entry),
    ...toArray(doc?.feed?.entry),
  ];

  const out: RssItem[] = [];
  const seen = new Set<string>();

  for (const item of raw as Record<string, unknown>[]) {
    if (!item || typeof item !== "object") continue;

    const title = stripTags(text(item.title)) || "Untitled";
    if (title === "Untitled") continue;

    const link = linkOf(item);
    if (seen.has(link) && link !== "#") continue;
    seen.add(link);

    const pubDate =
      text(item.pubDate) ||
      text(item.published) ||
      text(item.updated) ||
      text(item["dc:date"]) ||
      "";

    const desc = stripTags(
      text(item.description) || text(item.summary) || text(item.content),
    ).slice(0, 180);

    out.push({ title, link, pubDate, desc });
  }

  return out;
}

/** Fetch and parse one feed. Throws when the feed yields nothing usable. */
export async function fetchFeedItems(feedUrl: string): Promise<RssItem[]> {
  const xml = await fetchPage(feedUrl);
  const items = parseFeedXml(xml);
  if (!items.length) throw new Error("No items found in feed");
  return items;
}
