/**
 * Cron entry: scheduler + queue workers for RSS feeds.
 * Run: npx tsx cron/index.ts (daemon) or RUN_ONCE=1 npx tsx cron/index.ts (one-shot).
 */

import { loadEnvConfig } from '@next/env';
import cron from 'node-cron';
import { createLogger } from '@/shared/utils/logger';
import { getDbConnection, closeDbConnection } from '@/shared/database/connection';
import { getRedisClient, closeRedisClient } from '@/shared/cache/redis.client';
import { featureFlags, validateFeatureFlags } from '@/shared/config/feature-flags';
import { validateEnvironmentOrExit } from '@/shared/config/env-validation';
import { ExecutionGuard } from '@/shared/utils/execution-guard';
import { withTimeout } from '@/shared/utils/timeout';
import { getQueue } from '@/queue/queue.memory';
import { JobType } from '@/queue/job-types';
import { createCronLock } from '@/shared/locks/redis-lock';
import { RssFeedsSchedulerJob } from './jobs/rss-feeds-scheduler.job';
import { RssFeedWorker } from '@/workers/rss.worker';
import { MorningSignalJob } from './jobs/morning-signal.job';
import { ReportSchedulerJob } from './jobs/report-scheduler.job';
import { BrandStorySchedulerJob } from './jobs/brand-story-scheduler.job';

loadEnvConfig(process.cwd());

const log = createLogger('cron');
const runOnce = process.env.RUN_ONCE === '1' || process.env.RUN_ONCE === 'true';

const jobTimeoutMs = parseInt(process.env.CRON_JOB_TIMEOUT_MS || '300000', 10);
const executionGuard = new ExecutionGuard(jobTimeoutMs, () => {
  log.warn('Scheduler execution timeout', { timeoutMs: jobTimeoutMs });
});

async function gracefulShutdown(signal: string) {
  log.info('Shutting down', { signal });
  try {
    await closeDbConnection();
    await closeRedisClient();
  } catch (e) {
    log.error('Shutdown error', e);
  }
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function runSchedulerOnce(): Promise<void> {
  if (executionGuard.isExecuting()) {
    log.warn('Scheduler skipped – previous run still active');
    return;
  }
  if (!featureFlags.ENABLE_RSS_PROCESSING) {
    log.info('RSS processing disabled by feature flag');
    return;
  }

  const cronLock = createCronLock(jobTimeoutMs);
  const acquired = await cronLock.acquire();
  if (!acquired) {
    log.info('Scheduler skipped – lock held by another instance');
    return;
  }

  try {
    const result = await executionGuard.execute(async () =>
      withTimeout(
        (async () => {
          const scheduler = new RssFeedsSchedulerJob();
          return scheduler.execute();
        })(),
        jobTimeoutMs,
        `RSS scheduler timeout ${jobTimeoutMs}ms`
      )
    );
    log.info('Scheduler completed', result);
    const stats = await getQueue().getStats();
    log.info('Queue stats', { waiting: stats.waiting, active: stats.active, completed: stats.completed, failed: stats.failed });
  } catch (error) {
    log.error('Scheduler failed', error);
  } finally {
    await cronLock.release();
  }
}

async function start(): Promise<void> {
  validateEnvironmentOrExit();
  validateFeatureFlags();
  if (!featureFlags.ENABLE_CRON) {
    log.warn('Cron disabled via ENABLE_CRON');
    process.exit(0);
  }

  await getDbConnection();
  await getRedisClient();

  const queue = getQueue();
  const worker = new RssFeedWorker();
  queue.process(JobType.RSS_FEED_PROCESS, (job) => worker.processFeedJob(job));
  queue.process(JobType.RSS_ITEM_PROCESS, (job) => worker.processItemJob(job));
  log.info('Queue workers registered', { workers: [JobType.RSS_FEED_PROCESS, JobType.RSS_ITEM_PROCESS] });

  const schedule = process.env.RSS_FEEDS_CRON_SCHEDULE || '*/10 * * * *';

  if (runOnce) {
    log.info('RUN_ONCE=1: running scheduler once then exiting');
    await runSchedulerOnce();
    const drainWait = parseInt(process.env.CRON_DRAIN_WAIT_MS || '60000', 10);
    log.info('Waiting for queue to drain', { drainWaitMs: drainWait });
    await new Promise((r) => setTimeout(r, drainWait));
    await gracefulShutdown('run-once');
    return;
  }

  cron.schedule(schedule, runSchedulerOnce, { timezone: process.env.TZ || 'UTC' });
  log.info('Cron started', { schedule, timezone: process.env.TZ || 'UTC' });

  // Morning Signal: every hour — job filters by subscriber timezone (sends at 8 AM their local time)
  const morningSignalSchedule = process.env.MORNING_SIGNAL_CRON || '0 * * * *';
  cron.schedule(morningSignalSchedule, async () => {
    log.info('Morning Signal triggered');
    try {
      const job = new MorningSignalJob();
      const result = await job.execute();
      log.info('Morning Signal done', { ...result });

      // Record last run stats in site_settings for admin UI
      const { query: dbQuery } = await import('@/shared/database/connection');
      const now = new Date().toISOString();
      await Promise.all([
        dbQuery('INSERT INTO site_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?, updated_at = NOW()', ['nl_morning_signal_last_run', now, now]),
        dbQuery('INSERT INTO site_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?, updated_at = NOW()', ['nl_morning_signal_last_sent', String(result.sent), String(result.sent)]),
        dbQuery('INSERT INTO site_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?, updated_at = NOW()', ['nl_morning_signal_last_total', String(result.total), String(result.total)]),
      ]);
    } catch (err) {
      log.error('Morning Signal failed', err);
    }
  }, { timezone: 'UTC' });
  log.info('Morning Signal cron registered', { schedule: morningSignalSchedule });

  // Report scheduler: every 5 minutes — publishes reports whose publish_at has passed
  cron.schedule('*/5 * * * *', async () => {
    try {
      const job = new ReportSchedulerJob();
      await job.execute();
    } catch (err) {
      log.error('Report scheduler failed', err);
    }
  }, { timezone: 'UTC' });
  log.info('Report scheduler cron registered', { schedule: '*/5 * * * *' });

  // Brand story scheduler: every 5 minutes — publishes brand stories whose publish_at has passed
  cron.schedule('*/5 * * * *', async () => {
    try {
      const job = new BrandStorySchedulerJob();
      await job.execute();
    } catch (err) {
      log.error('Brand story scheduler failed', err);
    }
  }, { timezone: 'UTC' });
  log.info('Brand story scheduler cron registered', { schedule: '*/5 * * * *' });
}

start().catch((err) => {
  log.error('Cron startup failed', err);
  process.exit(1);
});

