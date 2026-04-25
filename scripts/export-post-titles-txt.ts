import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';
import * as fs from 'fs';
import * as path from 'path';

loadEnvConfig(process.cwd());

interface TitleRow {
  title: string | null;
}

async function main() {
  const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
  const outputFile = outputArg?.split('=')[1] || 'all-post-titles.txt';
  const outPath = path.resolve(process.cwd(), outputFile);

  const rows = await query<TitleRow>(
    `SELECT title
     FROM posts
     WHERE title IS NOT NULL AND TRIM(title) != ''
     ORDER BY id DESC`
  );

  const titles = rows.map((r) => String(r.title).replace(/\r?\n/g, ' ').trim());
  fs.writeFileSync(outPath, `${titles.join('\n')}\n`, 'utf8');

  console.log(`TXT generated: ${outPath}`);
  console.log(`Titles exported: ${titles.length}`);

  await closeDbConnection();
}

main().catch(async (error) => {
  console.error('Failed to export post titles TXT:', error);
  await closeDbConnection();
  process.exit(1);
});

