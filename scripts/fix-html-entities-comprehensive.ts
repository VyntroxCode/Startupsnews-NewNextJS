import { loadEnvConfig } from '@next/env';
import { getDbConnection, closeDbConnection, query } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

// Comprehensive HTML entity mapping
const HTML_ENTITIES: { [key: string]: string } = {
  // Quotes
  '&#8216;': "'",  // left single quotation mark
  '&#8217;': "'",  // right single quotation mark
  '&#8220;': '"',  // left double quotation mark
  '&#8221;': '"',  // right double quotation mark
  '&#x2018;': "'", // left single quotation mark (hex)
  '&#x2019;': "'", // right single quotation mark (hex)
  '&#x201C;': '"', // left double quotation mark (hex)
  '&#x201D;': '"', // right double quotation mark (hex)

  // Dashes
  '&#8211;': '–',  // en dash
  '&#8212;': '—',  // em dash
  '&#x2013;': '–', // en dash (hex)
  '&#x2014;': '—', // em dash (hex)

  // Other common entities
  '&#8230;': '…',  // ellipsis
  '&#8226;': '•',  // bullet
  '&#8304;': '⁰',  // superscript 0
  '&#038;': '&',   // ampersand
  '&#x2022;': '•', // bullet (hex)
  '&#x2026;': '…', // ellipsis (hex)
  '&#x00E9;': 'é', // é
  '&#x00E8;': 'è', // è
  '&#x00EA;': 'ê', // ê
  '&#x00FC;': 'ü', // ü
  '&#x00F1;': 'ñ', // ñ
  '&#x00E0;': 'à', // à
  '&#x00E2;': 'â', // â
  '&#x00F4;': 'ô', // ô
  '&#x20AC;': '€', // euro
  '&#x00A9;': '©', // copyright
  '&#x00AE;': '®', // registered
  '&#x2122;': '™', // trademark
};

function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  let result = text;

  // Replace all known entities
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    const regex = new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, char);
  }

  // Also decode common numeric entities (e.g., &#8217; format)
  result = result.replace(/&#(\d+);/g, (match, dec) => {
    try {
      return String.fromCharCode(parseInt(dec, 10));
    } catch (e) {
      return match;
    }
  });

  // Decode hex entities (e.g., &#x2019; format)
  result = result.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch (e) {
      return match;
    }
  });

  return result;
}

async function fixHtmlEntitiesInPosts() {
  console.log('🔍 Scanning for HTML entities in posts...\n');

  try {
    // Get all posts with entities
    const postsWithEntities = await query(`
      SELECT id, title, excerpt, content
      FROM posts
      WHERE title LIKE '%&#%' OR excerpt LIKE '%&#%' OR content LIKE '%&#%'
      ORDER BY id
    `) as any[];

    console.log(`Found ${postsWithEntities.length} posts with HTML entities\n`);

    if (postsWithEntities.length === 0) {
      console.log('✓ No HTML entities found!');
      return;
    }

    let fixedCount = 0;
    let totalReplacements = 0;

    for (const post of postsWithEntities) {
      let changed = false;
      const updates: { field: string; before: string; after: string }[] = [];

      // Fix title
      if (post.title && post.title.includes('&#')) {
        const newTitle = decodeHtmlEntities(post.title);
        if (newTitle !== post.title) {
          changed = true;
          updates.push({ field: 'title', before: post.title, after: newTitle });
          await query('UPDATE posts SET title = ? WHERE id = ?', [newTitle, post.id]);
          totalReplacements++;
        }
      }

      // Fix excerpt
      if (post.excerpt && post.excerpt.includes('&#')) {
        const newExcerpt = decodeHtmlEntities(post.excerpt);
        if (newExcerpt !== post.excerpt) {
          changed = true;
          updates.push({ field: 'excerpt', before: post.excerpt.substring(0, 50), after: newExcerpt.substring(0, 50) });
          await query('UPDATE posts SET excerpt = ? WHERE id = ?', [newExcerpt, post.id]);
          totalReplacements++;
        }
      }

      // Fix content
      if (post.content && post.content.includes('&#')) {
        const newContent = decodeHtmlEntities(post.content);
        if (newContent !== post.content) {
          changed = true;
          updates.push({ field: 'content', before: post.content.substring(0, 50), after: newContent.substring(0, 50) });
          await query('UPDATE posts SET content = ? WHERE id = ?', [newContent, post.id]);
          totalReplacements++;
        }
      }

      if (changed) {
        fixedCount++;
        console.log(`✓ Post ${post.id}: Fixed ${updates.length} field(s)`);
        updates.forEach(u => {
          console.log(`  - ${u.field}: decoded entities`);
        });
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} posts with ${totalReplacements} field updates\n`);

    // Verify the fix
    const stillWithEntities = await query(`
      SELECT COUNT(*) as count 
      FROM posts 
      WHERE title LIKE '%&#%' OR excerpt LIKE '%&#%' OR content LIKE '%&#%'
    `) as any[];

    console.log(`✓ Posts still with entities: ${stillWithEntities[0].count}`);

    const totalPosts = await query('SELECT COUNT(*) as count FROM posts') as any[];
    console.log(`✓ Total posts: ${totalPosts[0].count}`);

  } finally {
    await closeDbConnection();
  }
}

fixHtmlEntitiesInPosts()
  .then(() => {
    console.log('\n✅ HTML entity fix complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fixing HTML entities:', error);
    process.exit(1);
  });
