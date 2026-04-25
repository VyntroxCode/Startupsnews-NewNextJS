import Parser from 'rss-parser';
import type { ParsedRssItem } from '../domain/types';

const FETCH_TIMEOUT_MS = Number(process.env.RSS_FETCH_TIMEOUT) || 30000;

export interface FetchAndParseResult {
  items: ParsedRssItem[];
  feedImageUrl?: string;
  feedTitle?: string;
}

export class RssParserService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: FETCH_TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
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

      items.push({
        guid: guid.substring(0, 500),
        title,
        link,
        author: author ? author.substring(0, 500) : undefined,
        description: item.contentSnippet || item.content ? stripHtml(String(item.content || item.contentSnippet || '')).slice(0, 2000) : undefined,
        content: item.content ? String(item.content) : undefined,
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

  private extractImageUrl(item: Parser.Item): string | undefined {
    const enclosure = item.enclosure;
    if (enclosure?.type?.startsWith('image/') && enclosure?.url) {
      return enclosure.url;
    }
    if ((item as { mediaContent?: { $?: { url?: string } }; 'media:content'?: { $?: { url?: string } } })?.mediaContent?.$?.url) {
      return (item as { mediaContent: { $: { url: string } } }).mediaContent.$.url;
    }
    if ((item as { 'media:content'?: { $?: { url?: string } } })?.['media:content']?.$?.url) {
      return (item as { 'media:content': { $: { url: string } } })['media:content'].$.url;
    }
    const content = item.content || item.contentSnippet || '';
    const imgMatch = String(content).match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch?.[1]) return imgMatch[1];
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
