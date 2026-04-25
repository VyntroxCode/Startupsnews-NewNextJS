import { loadEnvConfig } from '@next/env';
import * as fs from 'node:fs';
import * as path from 'node:path';

loadEnvConfig(process.cwd());

const INPUT_DEFAULT = 'DataNotCopiedFromBackend.csv';
const OUTPUT_DEFAULT = 'post-url-title-report.csv';

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      cells.push(cur.trim());
      cur = '';
      continue;
    }

    cur += ch;
  }

  cells.push(cur.trim());
  return cells;
}

function cleanTitle(raw: string): string {
  return (raw || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function quoteCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function main() {
  const inputArg = process.argv.find((a) => a.startsWith('--input='));
  const outputArg = process.argv.find((a) => a.startsWith('--output='));
  const inputPath = path.resolve(process.cwd(), inputArg?.split('=').slice(1).join('=') || INPUT_DEFAULT);
  const outputPath = path.resolve(process.cwd(), outputArg?.split('=').slice(1).join('=') || OUTPUT_DEFAULT);

  const raw = fs.readFileSync(inputPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) {
    fs.writeFileSync(outputPath, 'title,post_url\n', 'utf8');
    console.log(`Report generated: ${outputPath}`);
    console.log('Rows exported: 0');
    return;
  }

  const out: string[] = ['title,post_url'];
  let count = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length < 5) continue;
    const title = cleanTitle(cells[0] || '');
    const postUrl = (cells[cells.length - 1] || '').trim();
    if (!postUrl) continue;
    out.push(`${quoteCsv(title)},${quoteCsv(postUrl)}`);
    count++;
  }

  fs.writeFileSync(outputPath, `${out.join('\n')}\n`, 'utf8');
  console.log(`Report generated: ${outputPath}`);
  console.log(`Rows exported: ${count}`);
}

main().catch((error) => {
  console.error('Failed to generate URL-title report:', error);
  process.exit(1);
});
