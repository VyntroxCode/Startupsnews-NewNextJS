import { loadEnvConfig } from '@next/env';
import { getDbConnection, closeDbConnection, query, queryOne } from '../src/shared/database/connection';
import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';

loadEnvConfig(process.cwd());

const DUMP_FILE = path.join(process.cwd(), 'zox_db_dump_20260406_231923.sql');

/**
 * Parse SQL values from INSERT statement
 * Handles escaped quotes, newlines, and NULL values
 */
function parseSqlValues(valueString: string): (string | null)[] {
  const values: (string | null)[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < valueString.length) {
    const char = valueString[i];
    const nextChar = valueString[i + 1];

    // Handle escaped quotes
    if (char === '\\' && nextChar === "'" && inQuotes) {
      current += "'";
      i += 2;
      continue;
    }

    // Handle quote toggling
    if (char === "'" && !inQuotes) {
      inQuotes = true;
      i++;
      continue;
    }

    if (char === "'" && inQuotes) {
      inQuotes = false;
      i++;
      continue;
    }

    // Handle comma (field separator)
    if (char === ',' && !inQuotes) {
      const trimmed = current.trim();
      if (trimmed === 'NULL') {
        values.push(null);
      } else {
        values.push(trimmed);
      }
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  // Add final value
  const trimmed = current.trim();
  if (trimmed === 'NULL') {
    values.push(null);
  } else {
    values.push(trimmed);
  }

  return values;
}

async function main() {
  try {
    console.log('Starting dump import with line-by-line processing...');

    // Get existing slugs to avoid duplicates
    const existingSlugs = await query<{ slug: string }>(
      'SELECT slug FROM posts ORDER BY slug'
    );
    const slugSet = new Set(existingSlugs.map(r => r.slug));
    console.log(`Database already has ${slugSet.size} unique post slugs`);

    // Use object to track state in async context
    const stats = { imported: 0, skipped: 0, errors: 0 };
    let inPostsData = false;

    const fileStream = fs.createReadStream(DUMP_FILE);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let currentInsertBuffer = '';

    for await (const line of rl) {
      // Skip until we reach posts data section
      if (!inPostsData) {
        if (line.includes('-- Dumping data for table `posts`')) {
          inPostsData = true;
        }
        continue;
      }

      // Stop if we hit the next table
      if (line.includes('-- Dumping data for table `') && !line.includes('`posts`')) {
        break;
      }

      // Skip lock/key management lines
      if (
        line.includes('LOCK TABLES') ||
        line.includes('ALTER TABLE') ||
        line.includes('UNLOCK TABLES') ||
        line.startsWith('--') ||
        line.startsWith('/*') ||
        line.startsWith('!')
      ) {
        continue;
      }

      // Skip empty lines
      if (!line.trim()) {
        continue;
      }

      currentInsertBuffer += line + '\n';

      // Check if this line ends an INSERT statement (ends with ;)
      if (line.includes(');')) {
        // Extract the INSERT VALUES part
        const insertMatch = currentInsertBuffer.match(
          /INSERT INTO `posts` VALUES\s*\(([\s\S]*)\);/
        );

        if (insertMatch) {
          const valueString = insertMatch[1];

          // Split into individual row inserts
          // Rows are separated by ),(
          let rowBuffer = '';
          let depth = 0;

          for (let i = 0; i < valueString.length; i++) {
            const char = valueString[i];

            if (char === '(') depth++;
            if (char === ')') depth--;

            if (char === ',' && depth === 0) {
              // This is a row separator
              const rowValues = parseSqlValues(rowBuffer);
              await processRow(rowValues, slugSet, stats);
              rowBuffer = '';
              continue;
            }

            rowBuffer += char;
          }

          // Process last row
          if (rowBuffer.trim()) {
            const rowValues = parseSqlValues(rowBuffer);
            await processRow(rowValues, slugSet, stats);
          }
        }

        currentInsertBuffer = '';
      }
    }

    console.log(`\nImport Summary:`);
    console.log(`  Imported: ${stats.imported} new posts`);
    console.log(`  Skipped: ${stats.skipped} duplicate posts`);
    console.log(`  Errors: ${stats.errors}`);

    const finalCount = await queryOne<{ total: number }>(
      'SELECT COUNT(*) as total FROM posts'
    );
    const totalPosts = finalCount?.total || 0;
    console.log(`\nFinal total posts in database: ${totalPosts}`);

  } catch (error) {
    console.error('Fatal import error:', error);
    process.exit(1);
  } finally {
    await closeDbConnection();
  }
}

async function processRow(
  values: (string | null)[],
  slugSet: Set<string>,
  stats: { imported: number; skipped: number; errors: number }
): Promise<void> {
  try {
    // Column order from CREATE TABLE:
    // id, title, slug, excerpt, meta_description, content, category_id, author_id,
    // featured_image_url, featured_image_small_url, format, status, is_gone_410,
    // featured, trending_score, view_count, published_at, created_at, updated_at

    const id = values[0] ? parseInt(values[0]) : 0;
    let title = values[1] || '';
    let slug = values[2] || '';
    let excerpt = values[3] || '';
    let metaDesc = values[4] || '';
    let content = values[5] || '';
    let categoryId = values[6] ? parseInt(values[6]) : 2;
    let authorId = values[7] ? parseInt(values[7]) : 1;
    let featuredImg = values[8] || null;
    let featuredImgSmall = values[9] || null;
    let format = values[10] || 'standard';
    let status = values[11] || 'draft';
    let isGone410 = values[12] ? parseInt(values[12]) : 0;
    let featured = values[13] ? parseInt(values[13]) : 0;
    let trendingScore = values[14] ? parseFloat(values[14]) : 0;
    let viewCount = values[15] ? parseInt(values[15]) : 0;
    let publishedAt = values[16] || null;
    let createdAt = values[17] || null;
    let updatedAt = values[18] || null;

    // Check for valid slug and category
    if (!slug || !title) {
      stats.skipped++;
      return;
    }

    // Check if already exists
    if (slugSet.has(slug)) {
      stats.skipped++;
      return;
    }

    // Default to Tech category (ID 2) for dump data
    const mappedCategoryId = 2;

    // Insert into database
    await query(
      `INSERT INTO posts (
        title, slug, excerpt, meta_description, content, category_id, author_id,
        featured_image_url, featured_image_small_url, format, status, featured,
        trending_score, view_count, published_at, created_at, updated_at, is_gone_410
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        title,
        slug,
        excerpt,
        metaDesc,
        content,
        mappedCategoryId,
        authorId,
        featuredImg,
        featuredImgSmall,
        format,
        status,
        featured,
        trendingScore,
        viewCount,
        publishedAt,
        createdAt,
        updatedAt,
        isGone410,
      ]
    );

    slugSet.add(slug);
    stats.imported++;

    if (stats.imported % 100 === 0) {
      console.log(`Progress: Imported ${stats.imported}, Skipped ${stats.skipped}`);
    }
  } catch (err: any) {
    stats.errors++;
    if (stats.errors <= 5) {
      console.error(`Error processing row: ${err.message?.slice(0, 150)}`);
    }
  }
}

main().catch(err => {
  console.error('Critical error:', err);
  process.exit(1);
});
