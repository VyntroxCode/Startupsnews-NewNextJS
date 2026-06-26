import { loadEnvConfig } from '@next/env';
import { query } from '../src/shared/database/connection';
import { closeDbConnection } from '../src/shared/database/connection';
loadEnvConfig(process.cwd());

(async () => {
  console.log('Deleting all rss_feed_items...');
  await query('DELETE FROM rss_feed_items');

  console.log('Deleting all post_tags...');
  await query('DELETE FROM post_tags');

  console.log('Deleting all posts...');
  await query('DELETE FROM posts');

  const [cnt] = await query('SELECT COUNT(*) as c FROM posts') as any[];
  console.log('Posts remaining:', cnt.c);
  console.log('Done.');
  await closeDbConnection();
})().catch(console.error).finally(() => process.exit());
