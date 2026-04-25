/**
 * RSS Feeds Scheduler Job – enqueues due feeds; workers do the work.
 */

import { createLogger } from '@/shared/utils/logger';
import { RssFeedsRepository } from '@/modules/rss-feeds/repository/rss-feeds.repository';
import { getQueue } from '@/queue/queue.memory';
import { JobType } from '@/queue/job-types';

const log = createLogger('rss-scheduler');

export class RssFeedsSchedulerJob {
  private repo = new RssFeedsRepository();

  async execute(): Promise<{ scheduled: number; skipped: number; errors: Array<{ feedId: number; feedName: string; error: string }> }> {
    const result = { scheduled: 0, skipped: 0, errors: [] as Array<{ feedId: number; feedName: string; error: string }> };

    const feeds = await this.repo.findEnabledDue();
    if (feeds.length === 0) {
      log.info('No due RSS feeds');
      return result;
    }

    log.info('Scheduling due feeds', { count: feeds.length });
    const queue = getQueue();

    for (const feed of feeds) {
      try {
        await queue.add(JobType.RSS_FEED_PROCESS, {
          feedId: feed.id,
          feedUrl: feed.url,
          feedName: feed.name,
        });
        result.scheduled++;
        log.debug('Feed enqueued', { feedId: feed.id, feedName: feed.name });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        result.errors.push({ feedId: feed.id, feedName: feed.name, error: msg });
        log.error('Error enqueuing feed', error, { feedId: feed.id, feedName: feed.name });
      }
    }

    log.info('Scheduler done', { scheduled: result.scheduled, skipped: result.skipped, errors: result.errors.length });
    return result;
  }
}
