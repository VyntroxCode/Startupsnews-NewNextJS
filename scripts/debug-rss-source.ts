import { loadEnvConfig } from '@next/env';
import { query } from '../src/shared/database/connection';
loadEnvConfig(process.cwd());

(async () => {
  const postIds = [641738, 641739, 641740, 641741, 641742];

  // Exact query the admin API runs
  const rssRows = await query(
    `SELECT i.post_id, f.name FROM rss_feed_items i
     JOIN rss_feeds f ON f.id = i.rss_feed_id
     WHERE i.post_id IS NOT NULL AND i.post_id IN (${postIds.map(() => '?').join(',')})`,
    postIds
  ) as any[];
  console.log('RSS rows from admin query:', JSON.stringify(rssRows));

  // Raw rss_feed_items
  const items = await query('SELECT id, rss_feed_id, post_id, processed FROM rss_feed_items') as any[];
  console.log('All rss_feed_items:', JSON.stringify(items));

  // Type check on post id
  const p = await query('SELECT id FROM posts WHERE id = 641738 LIMIT 1') as any[];
  if (p[0]) console.log('post.id type:', typeof p[0].id, '| value:', p[0].id);
})().catch(console.error).finally(() => process.exit());
