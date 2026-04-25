/**
 * RSS feed and item types for cron ingestion.
 */

export interface RssFeedEntity {
  id: number;
  name: string;
  url: string;
  logo_url?: string | null;
  category_id: number;
  author_id: number;
  enabled: number;
  fetch_interval_minutes: number;
  last_fetched_at: Date | string | null;
  last_error: string | null;
  error_count: number;
  max_items_per_fetch: number;
  auto_publish: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface RssFeedItemEntity {
  id: number;
  rss_feed_id: number;
  guid: string;
  title: string;
  link: string;
  author?: string | null;
  description: string | null;
  content: string | null;
  image_url: string | null;
  published_at: Date | string | null;
  processed: number;
  post_id: number | null;
  created_at: Date | string;
  updated_at: Date | string;
}

/** Parsed item from RSS XML (before DB) */
export interface ParsedRssItem {
  guid: string;
  title: string;
  link: string;
  author?: string;
  description?: string;
  content?: string;
  imageUrl?: string;
  publishedAt?: Date | string | null;
}

export interface ProcessFeedResult {
  /** Total items returned by the feed this run */
  itemsInFeed: number;
  /** New items (GUID not seen before) we attempted to create posts for */
  newItems: number;
  postsCreated: number;
  itemsProcessed: number;
  errors: string[];
}

export interface ProcessAllFeedsResult {
  /** Number of enabled feeds found (all are processed in this run) */
  totalFeeds: number;
  processed: number;
  created: number;
  errors: Array<{ feedId: number; feedName: string; error: string }>;
  /** Per-feed stats so logs show why created=0 (e.g. newItems=0 = no new articles) */
  feedSummaries: Array<{ feedName: string; itemsInFeed: number; newItems: number; created: number }>;
}
