/**
 * Invalidate Redis post list cache so the next request uses the DB (with current filters, e.g. no Unsplash).
 * Run after deploy or when you change which posts are shown (e.g. thumbnail/Unsplash filter).
 *
 * Usage: npx tsx scripts/invalidate-post-cache.ts
 */
import { loadEnvConfig } from '@next/env';
import { invalidatePostsListCache, closeRedisClient } from '../src/shared/cache/redis.client';

loadEnvConfig(process.cwd());

async function main() {
  await invalidatePostsListCache();
  await closeRedisClient();
  console.log('Post list cache invalidated. Next page load will fetch fresh data from DB.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
