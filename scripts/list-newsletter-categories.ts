import { query } from '@/shared/database/connection';

interface RawCategory { id: number; name: string; slug: string; }

async function main() {
  const rows = await query<RawCategory>(
    `SELECT DISTINCT c.id, c.name, c.slug
     FROM categories c
     INNER JOIN rss_feeds rf ON rf.category_id = c.id
     WHERE rf.enabled = 1 AND FIND_IN_SET('newsletter', rf.feed_for) > 0
     ORDER BY c.name ASC`
  );
  console.table(rows);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
