/**
 * Re-hosts partner_logos rows that hotlink third-party domains onto our own S3/CDN.
 *
 * Why this exists: agent.md #619-621 traced the recurring "logos vanish from /our-partners"
 * complaint to `PartnerLogoTile`'s onError handler (src/components/PartnerLogoTile.tsx) — it
 * hides a tile the instant its <img> 404s/errors, silently, with nothing logged anywhere. Of the
 * 127 logos seeded from the old hardcoded JSX list, 104 hotlink third-party hosts, 72 of them
 * `encrypted-tbn0.gstatic.com` — Google's cached Image-Search thumbnail links, which carry no
 * uptime guarantee and can be invalidated or rate-limited at any time with no warning. Restoring
 * from the DB snapshot (scripts/partner-logos-snapshot.ts) only re-inserts those same fragile
 * URLs, so every "restore" just resets the clock on the next rot — it was flagged as the real
 * long-term fix in #621 but never actually done. This does that: download each hotlinked logo
 * once and re-host it on our own bucket, so there's nothing left to rot.
 *
 * Usage:
 *   npx tsx scripts/rehost-partner-logos.ts            # dry run — lists what would change
 *   npx tsx scripts/rehost-partner-logos.ts --apply    # downloads, uploads, updates the DB
 *
 * After --apply:
 *   npm run logos:snapshot
 *   redis-cli DEL 'partner-logos:by-section'
 */
import { loadEnvConfig } from '@next/env';

// tsx doesn't read .env.local the way `next` does — see partner-logos-snapshot.ts for why this
// is safe above the connection/S3 imports despite ESM hoisting.
loadEnvConfig(process.cwd());

import { query, closeDbConnection } from '@/shared/database/connection';
import {
  downloadImage,
  uploadImageToS3,
  getContentType,
  isOurS3ImageUrl,
  s3KeyForPartnerLogo,
} from '@/modules/rss-feeds/utils/image-to-s3';

// The CloudFront distribution in front of the S3 bucket (see next.config.ts) — already ours and
// already stable, so these never need re-hosting even though isOurS3ImageUrl() only recognizes
// the raw S3 hostnames.
const SAFE_HOST_PATTERNS = [/(^|\.)images\.startupnews\.fyi$/, /(^|\.)startupnews\.fyi$/];

function isAlreadySafe(url: string): boolean {
  if (isOurS3ImageUrl(url)) return true;
  try {
    return SAFE_HOST_PATTERNS.some((re) => re.test(new URL(url).hostname));
  } catch {
    return false;
  }
}

async function main() {
  const apply = process.argv.includes('--apply');

  const rows = await query<{ id: number; image_url: string }>(
    'SELECT id, image_url FROM partner_logos ORDER BY id'
  );
  const toMigrate = rows.filter((r) => !isAlreadySafe(r.image_url));

  console.log(`${rows.length} partner logos total, ${toMigrate.length} hotlinked to third-party hosts.`);
  if (!apply) {
    for (const r of toMigrate) console.log(`  [dry-run] #${r.id}  ${r.image_url}`);
    console.log('\nRe-run with --apply to download and re-host these onto our own S3 bucket.');
    return;
  }

  let migrated = 0;
  let failed = 0;
  for (const r of toMigrate) {
    const buf = await downloadImage(r.image_url);
    if (!buf) {
      console.error(`FAILED to download #${r.id}: ${r.image_url}`);
      failed++;
      continue;
    }
    try {
      const key = s3KeyForPartnerLogo(r.id, r.image_url);
      const s3Url = await uploadImageToS3(key, buf, getContentType(r.image_url));
      await query('UPDATE partner_logos SET image_url = ? WHERE id = ?', [s3Url, r.id]);
      console.log(`Migrated #${r.id} -> ${s3Url}`);
      migrated++;
    } catch (err) {
      console.error(`FAILED to upload #${r.id}:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\nDone: ${migrated} migrated, ${failed} failed (left on their original URL).`);
  console.log('Now run:');
  console.log('  npm run logos:snapshot');
  console.log("  redis-cli DEL 'partner-logos:by-section'");
}

main()
  .then(() => closeDbConnection())
  .catch(async (err) => {
    console.error(err instanceof Error ? err.message : err);
    await closeDbConnection().catch(() => {});
    process.exit(1);
  });
