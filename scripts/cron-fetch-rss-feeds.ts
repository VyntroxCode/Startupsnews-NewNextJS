/**
 * Cron script: fetch all enabled RSS feeds, create posts with images on S3.
 * Run every 10 minutes (e.g. via system cron or scheduler).
 *
 * Requires: DB_* and AWS_* (S3) in .env.local.
 * Usage: npm run cron:rss-feeds
 *        npx tsx scripts/cron-fetch-rss-feeds.ts
 */

import { loadEnvConfig } from '@next/env';
import { RssFeedsService } from '../src/modules/rss-feeds/service/rss-feeds.service';
import { closeDbConnection } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

function log(msg: string) {
  const ts = new Date().toISOString();
  console.log(`[%s] %s`, ts, msg);
}

async function main() {
  log('RSS cron starting');
  const service = new RssFeedsService();
  const result = await service.processAllFeeds();
  await closeDbConnection();

  log(`RSS cron done: feeds=${result.totalFeeds} (all processed) processed=${result.processed} created=${result.created} errors=${result.errors.length}`);
  result.feedSummaries.forEach((s) => {
    log(`  ${s.feedName}: items=${s.itemsInFeed} new=${s.newItems} created=${s.created}`);
  });
  if (result.errors.length > 0) {
    result.errors.forEach((e) => console.error(`  Feed ${e.feedId} (${e.feedName}): ${e.error}`));
  }
}

main().catch((err) => {
  console.error('[%s] RSS cron failed:', new Date().toISOString(), err);
  process.exit(1);
});
