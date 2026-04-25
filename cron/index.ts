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
}

start().catch((err) => {
  log.error('Cron startup failed', err);
  process.exit(1);
});

