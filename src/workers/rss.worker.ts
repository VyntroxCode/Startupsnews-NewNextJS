/**
 * RSS worker – processes RSS_FEED_PROCESS jobs using existing RssFeedsService.
 * Used by cron and by API (manual fetch).
 */

import type { Job } from '@/queue/job-types';
import { JobType } from '@/queue/job-types';
import { createLogger } from '@/shared/utils/logger';
import { createFeedLock } from '@/shared/locks/redis-lock';
import { memoryGuard } from '@/shared/utils/memory-guard';
import { RssFeedsRepository } from '@/modules/rss-feeds/repository/rss-feeds.repository';
import { RssFeedsService } from '@/modules/rss-feeds/service/rss-feeds.service';

const log = createLogger('rss-worker');

export class RssFeedWorker {
  private repo = new RssFeedsRepository();
  private service = new RssFeedsService();

  async processFeedJob(job: Job): Promise<void> {
    if (job.type !== JobType.RSS_FEED_PROCESS) {
      throw new Error(`Invalid job type: ${job.type}`);
    }
    const { feedId, feedUrl, feedName } = job.payload as { feedId: number; feedUrl: string; feedName: string };

    log.info('Processing RSS feed job', { jobId: job.id, feedId, feedName, attempt: job.attempts });

    const feedLock = createFeedLock(feedId, 600000);
    const acquired = await feedLock.acquire();
    if (!acquired) {
      log.info('Feed skipped – lock held', { feedId, feedName, jobId: job.id });
      return;
    }

    try {
      const feed = await this.repo.findById(feedId);
      if (!feed) throw new Error(`Feed ${feedId} not found`);

      const result = await memoryGuard.execute(
        () => this.service.processFeed(feed),
        `process-feed-${feedId}`
      );
      await this.repo.updateLastFetched(feedId, null);
      log.info('Feed processed', { feedId, feedName, postsCreated: result.postsCreated, itemsProcessed: result.itemsProcessed });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.repo.updateLastFetched(feedId, msg).catch(() => {});
      log.error('Feed processing failed', error, { feedId, feedName, jobId: job.id });
      throw error;
    } finally {
      await feedLock.release();
    }
  }

  /** Manual run for one feed (dashboard "Fetch now"); bypasses queue. */
  async processFeedManually(feedId: number): Promise<{ postsCreated: number; itemsProcessed: number }> {
    const feed = await this.repo.findById(feedId);
    if (!feed) throw new Error(`Feed ${feedId} not found`);

    const feedLock = createFeedLock(feedId, 600000);
    const acquired = await feedLock.acquire();
    if (!acquired) throw new Error('Feed is currently being processed by another worker');

    try {
      const result = await memoryGuard.execute(
        () => this.service.processFeed(feed),
        `manual-feed-${feedId}`
      );
      await this.repo.updateLastFetched(feedId, null);
      return { postsCreated: result.postsCreated, itemsProcessed: result.itemsProcessed };
    } finally {
      await feedLock.release();
    }
  }

  async processItemJob(job: Job): Promise<void> {
    if (job.type !== JobType.RSS_ITEM_PROCESS) {
      throw new Error(`Invalid job type: ${job.type}`);
    }
    log.warn('RSS_ITEM_PROCESS not implemented, skipping', { jobId: job.id });
  }
}
