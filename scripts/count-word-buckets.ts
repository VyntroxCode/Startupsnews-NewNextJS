import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    });
}

function htmlToText(html: string): string {
  if (!html) return '';
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n')
    .replace(/<\s*\/div\s*>/gi, '\n')
    .replace(/<\s*\/li\s*>/gi, '\n')
    .replace(/<\s*\/h[1-6]\s*>/gi, '\n');
  const noTags = withBreaks.replace(/<[^>]*>/g, ' ');
  const decoded = decodeHtmlEntities(noTags);
  return decoded
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

function getWordCount(text: string): number {
  if (!text) return 0;
  return text
    .replace(/[^a-zA-Z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

async function main() {
  const batchSize = 1000;
  let offset = 0;
  let lessThan500 = 0;
  let greaterThan500 = 0;
  let exactly500 = 0;
  let total = 0;

  while (true) {
    const rows = await query<{ content: string }>(
      'SELECT content FROM posts ORDER BY id DESC LIMIT ? OFFSET ?',
      [batchSize, offset]
    );

    if (rows.length === 0) break;

    for (const row of rows) {
      const wc = getWordCount(htmlToText(row.content || ''));
      if (wc < 500) lessThan500++;
      else if (wc > 500) greaterThan500++;
      else exactly500++;
      total++;
    }

    if (rows.length < batchSize) break;
    offset += rows.length;
  }

  console.log({ totalPosts: total, lessThan500, greaterThan500, exactly500 });
  await closeDbConnection();
}

main().catch(async (e) => {
  console.error(e);
  await closeDbConnection();
  process.exit(1);
});
