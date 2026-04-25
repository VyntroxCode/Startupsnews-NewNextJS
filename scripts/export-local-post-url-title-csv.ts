import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';
import { getPostPath } from '../src/lib/post-utils';
import * as fs from 'node:fs';
import * as path from 'node:path';

loadEnvConfig(process.cwd());

type Row = {
  title: string | null;
  slug: string | null;
  category_slug: string | null;
};

function esc(value: unknown): string {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  return `"${text.replace(/"/g, '""')}"`;
}

async function main() {
  const outputArg = process.argv.find((a) => a.startsWith('--output='));
  const outputFile = outputArg?.split('=')[1] || 'local-db-post-url-title-report.csv';
  const outPath = path.resolve(process.cwd(), outputFile);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://startupnews.fyi').replace(/\/$/, '');
  const publishedOnly = process.argv.includes('--published-only');

  const statusClause = publishedOnly ? ` AND p.status = 'published'` : '';

  const rows = await query<Row>(
    `SELECT p.title,
            p.slug,
            COALESCE(NULLIF(TRIM(c.slug), ''), 'uncategorized') AS category_slug
     FROM posts p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.slug IS NOT NULL AND TRIM(p.slug) != ''
     ${statusClause}
     ORDER BY p.id DESC`
  );

  const stream = fs.createWriteStream(outPath, { encoding: 'utf8' });
  stream.write('title,post_url\n');
  for (const row of rows) {
    const pathPart = getPostPath({
      categorySlug: row.category_slug || 'uncategorized',
      slug: row.slug || '',
    });
    const url = `${siteUrl}${pathPart}`;
    stream.write(`${esc(row.title)},${esc(url)}\n`);
  }

  await new Promise<void>((resolve, reject) => {
    stream.end(() => resolve());
    stream.on('error', reject);
  });

  console.log(`CSV generated: ${outPath}`);
  console.log(`Rows exported: ${rows.length}`);
  if (publishedOnly) {
    console.log('Filter: status = published only');
  } else {
    console.log('Filter: all posts with a slug (use --published-only for public posts only)');
  }
  await closeDbConnection();
}

main().catch(async (error) => {
  console.error('Failed to export local DB title/url CSV:', error);
  await closeDbConnection();
  process.exit(1);
});
