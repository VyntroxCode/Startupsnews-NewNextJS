import type { ParsedRssItem, RssFeedEntity } from '../domain/types';
import type { ProcessAllFeedsResult, ProcessFeedResult } from '../domain/types';
import { RssFeedsRepository } from '../repository/rss-feeds.repository';
import { RssParserService } from './rss-parser.service';
import { RssPostCreatorService } from './rss-post-creator.service';
import { createLogger } from '@/shared/utils/logger';

const log = createLogger('rss-feeds');

/**
 * When RSS_MAX_PUBLISHED_AGE_HOURS is set (e.g. 24), only items whose pubDate falls within
 * the last N hours are considered for ingest. Feeds often return a week or more of entries;
 * without this, every unseen GUID is "new" until max_items_per_fetch is reached each run.
 *
 * RSS_INCLUDE_UNDATED_FEED_ITEMS=true keeps items with missing pubDate when the filter is on
 * (default: false — undated items are skipped so old backlog cannot slip through).
 */
export class RssFeedsService {
  private repo = new RssFeedsRepository();
  private parser = new RssParserService();
  private postCreator = new RssPostCreatorService();

  async processAllFeeds(): Promise<ProcessAllFeedsResult> {
    const feeds = await this.repo.findEnabled();
    const result: ProcessAllFeedsResult = {
      totalFeeds: feeds.length,
      processed: 0,
      created: 0,
      errors: [],
      feedSummaries: [],
    };

    // Process every enabled feed in this run (all at once, every 10 min)
    for (const feed of feeds) {
      if (!this.shouldFetch(feed)) continue;
      try {
        const feedResult = await this.processFeed(feed);
        result.processed++;
        result.created += feedResult.postsCreated;
        result.feedSummaries.push({
          feedName: feed.name,
          itemsInFeed: feedResult.itemsInFeed,
          newItems: feedResult.newItems,
          created: feedResult.postsCreated,
        });
        await this.repo.updateLastFetched(feed.id, null);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push({ feedId: feed.id, feedName: feed.name, error: message });
        await this.repo.updateLastFetched(feed.id, message);
      }
    }

    return result;
  }

  async processFeed(feed: RssFeedEntity): Promise<ProcessFeedResult> {
    const { items, feedImageUrl } = await this.parser.fetchAndParse(feed.url);

    if (feedImageUrl) {
      await this.repo.update(feed.id, { logo_url: feedImageUrl });
    }

    const ageFiltered = this.filterItemsByPublishedAge(items, feed.name);
    const toProcess = this.filterItemsByQuality(ageFiltered, feed.name);
    const newItems: typeof items = [];
    for (const item of toProcess) {
      const existsByGuid = await this.repo.itemExistsByGuid(feed.id, item.guid);
      if (existsByGuid) continue;
      const existsByTitle = await this.repo.itemExistsByTitle(item.title);
      if (existsByTitle) continue;
      newItems.push(item);
    }

    const limited = newItems.slice(0, feed.max_items_per_fetch || 10);
    const errors: string[] = [];
    let postsCreated = 0;

    const feedForValues = String(feed.feed_for ?? 'website').split(',').map((v) => v.trim());
    const isForWebsite = feedForValues.includes('website');
    const isForNewsletter = feedForValues.includes('newsletter');

    for (const item of limited) {
      let savedItemId: number | null = null;
      try {
        const savedItem = await this.repo.saveFeedItem({
          rss_feed_id: feed.id,
          guid: item.guid,
          title: item.title,
          link: item.link,
          author: item.author ?? null,
          description: item.description ?? null,
          content: item.content ?? null,
          image_url: item.imageUrl ?? null,
          published_at: item.publishedAt ?? null,
        });
        savedItemId = savedItem.id;

        if (isForWebsite) {
          const { postId } = await this.postCreator.createPostFromRssItem(item, feed);
          await this.repo.linkItemToPost(savedItemId, postId);
          postsCreated++;
        }

        if (isForNewsletter) {
          await this.repo.saveNewsletterItem({
            rss_feed_id: feed.id,
            feed_name: feed.name,
            feed_url: feed.url,
            feed_logo_url: feed.logo_url ?? null,
            title: item.title,
            link: item.link,
            image_url: item.imageUrl ?? null,
            description: item.description ?? null,
            published_at: item.publishedAt ?? null,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Item ${item.guid}: ${msg}`);
        // Remove the feed item row so the item can be retried on the next run
        // (otherwise guid uniqueness would permanently skip it with post_id = NULL)
        if (savedItemId !== null) {
          try { await this.repo.deleteFeedItem(savedItemId); } catch { /* best-effort */ }
        }
      }
    }

    return {
      itemsInFeed: items.length,
      newItems: limited.length,
      postsCreated,
      itemsProcessed: limited.length,
      errors,
    };
  }

  /**
   * Optional window on item.pubDate (RSS pubDate). Unset env = no filter (legacy behavior).
   */
  private filterItemsByPublishedAge(items: ParsedRssItem[], feedName: string): ParsedRssItem[] {
    const raw = process.env.RSS_MAX_PUBLISHED_AGE_HOURS?.trim();
    if (!raw) return items;

    const hours = Number(raw);
    if (!Number.isFinite(hours) || hours <= 0) return items;

    const includeUndated =
      process.env.RSS_INCLUDE_UNDATED_FEED_ITEMS === '1' ||
      process.env.RSS_INCLUDE_UNDATED_FEED_ITEMS === 'true';

    const cutoffMs = Date.now() - hours * 60 * 60 * 1000;
    let droppedNoDate = 0;
    let droppedOld = 0;

    const out = items.filter((item) => {
      if (!item.publishedAt) {
        if (includeUndated) return true;
        droppedNoDate += 1;
        return false;
      }
      const t =
        item.publishedAt instanceof Date
          ? item.publishedAt.getTime()
          : new Date(item.publishedAt).getTime();
      if (!Number.isFinite(t)) {
        if (includeUndated) return true;
        droppedNoDate += 1;
        return false;
      }
      if (t < cutoffMs) {
        droppedOld += 1;
        return false;
      }
      return true;
    });

    if (droppedNoDate > 0 || droppedOld > 0) {
      log.info('RSS items skipped by published-date window', {
        feedName,
        maxPublishedAgeHours: hours,
        inFeed: items.length,
        afterFilter: out.length,
        droppedNoDate,
        droppedOld,
      });
    }

    return out;
  }

  /** Drop items with no image or with unresolved HTML entities in the title. */
  private filterItemsByQuality(items: ParsedRssItem[], feedName: string): ParsedRssItem[] {
    const HTML_ENTITY_RE = /&(?:[a-z]+|#[0-9]+|#x[0-9a-f]+);/i;
    let droppedNoImage = 0;
    let droppedBadTitle = 0;

    const out = items.filter((item) => {
      if (!item.imageUrl) {
        droppedNoImage++;
        return false;
      }
      if (HTML_ENTITY_RE.test(item.title)) {
        droppedBadTitle++;
        return false;
      }
      return true;
    });

    if (droppedNoImage > 0 || droppedBadTitle > 0) {
      log.info('RSS items skipped by quality filter', {
        feedName,
        droppedNoImage,
        droppedBadTitle,
        remaining: out.length,
      });
    }

    return out;
  }

  /** Return true so we fetch every time the cron runs (every 10 min). Interval is for future use. */
  private shouldFetch(_feed: RssFeedEntity): boolean {
    return true;
  }
}
