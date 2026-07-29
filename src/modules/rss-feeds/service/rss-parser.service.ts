import Parser from 'rss-parser';
import type { ParsedRssItem } from '../domain/types';
import { bestUrlFromSrcset, getAttr } from '../utils/content-extract';

const FETCH_TIMEOUT_MS = Number(process.env.RSS_FETCH_TIMEOUT) || 30000;

type CustomItem = {
  'media:content': { $: { url?: string; medium?: string } } | { $: { url?: string; medium?: string } }[];
  'media:thumbnail': { $: { url?: string } };
  enclosure: { url?: string; type?: string };
};

export interface FetchAndParseResult {
  items: ParsedRssItem[];
  feedImageUrl?: string;
  feedTitle?: string;
}

export class RssParserService {
  private parser: Parser<Record<string, unknown>, CustomItem>;

  constructor() {
    this.parser = new Parser<Record<string, unknown>, CustomItem>({
      timeout: FETCH_TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      customFields: {
        item: [
          ['media:content', 'media:content', { keepArray: false }],
          ['media:thumbnail', 'media:thumbnail', { keepArray: false }],
        ],
      },
    });
  }

  async fetchAndParse(url: string): Promise<FetchAndParseResult> {
    const feed = await this.parser.parseURL(url);
    const items: ParsedRssItem[] = [];

    for (const item of feed.items) {
      const link = (item.link || item.guid || '').trim();
      const title = (item.title || 'Untitled').trim();
      const guid = (item.guid || item.link || link || `hash-${hashString(link + title)}`).trim();
      const author = (item.creator ?? (item as { author?: string }).author ?? '').trim() || undefined;

      const rawItem = item as unknown as Record<string, unknown>;
      const contentEncoded = rawItem['content:encoded'] ? String(rawItem['content:encoded']) : undefined;
      const rawDescription = contentEncoded || item.content || item.contentSnippet || '';

      items.push({
        guid: guid.substring(0, 500),
        title,
        link,
        author: author ? author.substring(0, 500) : undefined,
        description: rawDescription ? stripHtml(rawDescription).slice(0, 2000) : undefined,
        content: contentEncoded || (item.content ? String(item.content) : undefined),
        imageUrl: this.extractImageUrl(item),
        publishedAt: item.pubDate ? new Date(item.pubDate) : null,
      });
    }

    const feedImageUrl = (feed.image as { url?: string } | undefined)?.url?.trim();
    const feedTitle = feed.title?.trim();

    return {
      items,
      feedImageUrl: feedImageUrl || undefined,
      feedTitle: feedTitle || undefined,
    };
  }

  private extractImageUrl(item: Parser.Item & Partial<CustomItem>): string | undefined {
    // media:content — rss-parser returns it as object or array
    const mediaContent = item['media:content'];
    if (mediaContent) {
      const mc = Array.isArray(mediaContent) ? mediaContent[0] : mediaContent;
      if (mc?.$?.url) return mc.$.url;
    }

    // media:thumbnail
    const mediaThumbnail = item['media:thumbnail'];
    if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url;

    // enclosure (podcast/image RSS feeds)
    const enclosure = item.enclosure;
    if (enclosure?.type?.startsWith('image/') && enclosure?.url) {
      return enclosure.url;
    }

    // last resort: first <img> in content HTML (check content:encoded first, then content).
    // Prefer srcset/data-src over plain src — lazy-loaded markup often puts a
    // tiny/blurry placeholder in `src` and the real (or higher-res) image in
    // `data-src`/`srcset`.
    const htmlContent = String((item as Record<string, unknown>)['content:encoded'] || item.content || '');
    const imgTagMatch = htmlContent.match(/<img\b[^>]*>/i);
    if (imgTagMatch) {
      const tag = imgTagMatch[0];
      const candidate =
        bestUrlFromSrcset(getAttr(tag, 'srcset')) ||
        bestUrlFromSrcset(getAttr(tag, 'data-srcset')) ||
        getAttr(tag, 'data-src') ||
        getAttr(tag, 'data-lazy-src') ||
        getAttr(tag, 'data-original') ||
        getAttr(tag, 'src');
      if (candidate) return candidate;
    }

    return undefined;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h = ((h << 5) - h) + c;
    h = h & h;
  }
  return Math.abs(h).toString(36);
}
