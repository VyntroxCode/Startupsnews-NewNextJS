/**
 * Seed rss_feeds from scripts/campaigns.json.
 * Run after migration: npm run db:seed-rss-feeds
 * Uses first category and first admin user for category_id and author_id.
 */

import { loadEnvConfig } from '@next/env';
import * as fs from 'fs';
import * as path from 'path';
import { getDbConnection, query, queryOne, closeDbConnection } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

interface CampaignRow {
  camp_id?: string;
  camp_name?: string;
  camp_post_title?: string;
  camp_post_content?: string;
  feeds?: string;
  camp_post_author?: string;
  camp_post_category?: string;
}

async function main() {
  const campaignsPath = path.join(process.cwd(), 'scripts', 'campaigns.json');
  if (!fs.existsSync(campaignsPath)) {
    console.log('No scripts/campaigns.json found. Create it with feed URLs to seed.');
    process.exit(0);
  }

  const raw = fs.readFileSync(campaignsPath, 'utf8');
  let campaigns: CampaignRow[];
  try {
    campaigns = JSON.parse(raw);
  } catch (e) {
    console.error('Invalid JSON in campaigns.json:', e);
    process.exit(1);
  }

  const defaultCategory = await queryOne<{ id: number }>('SELECT id FROM categories ORDER BY id LIMIT 1');
  const defaultAuthor = await queryOne<{ id: number }>("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");
  const categoryId = defaultCategory?.id ?? 1;
  const authorId = defaultAuthor?.id ?? 1;

  console.log('Seeding rss_feeds from campaigns.json (category_id=%s, author_id=%s)\n', categoryId, authorId);

  const conn = await getDbConnection();
  const connection = await conn.getConnection();
  let inserted = 0;

  try {
    for (const camp of campaigns) {
      const feedUrls = (camp.feeds || '').trim().split(/\s+/).filter(Boolean);
      const name = (camp.camp_name || camp.camp_id || 'Feed').trim().slice(0, 255);
      for (const url of feedUrls) {
        if (!url.startsWith('http')) continue;
        const existing = await queryOne<{ id: number }>('SELECT id FROM rss_feeds WHERE url = ?', [url]);
        if (existing) {
          console.log('   Skip (exists): %s', url.slice(0, 60) + '...');
          continue;
        }
        await connection.query(
          `INSERT INTO rss_feeds (name, url, category_id, author_id, enabled, fetch_interval_minutes, max_items_per_fetch, auto_publish)
           VALUES (?, ?, ?, ?, 1, 10, 10, 1)`,
          [name, url.slice(0, 500), categoryId, authorId]
        );
        inserted++;
        console.log('   Inserted: %s', name);
      }
    }
    console.log('\nDone. Inserted %s feed(s).', inserted);
  } finally {
    connection.release();
    await closeDbConnection();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
