/**
 * Purge Cloudflare's cached copy of pages by hand — needed after changing posts directly in the
 * database (the app purges automatically on admin edits, but a raw SQL UPDATE bypasses it and
 * article pages stay cached at Cloudflare for up to a day).
 *
 * Usage:
 *   npx tsx scripts/cf-purge.ts /fintech/some-post /ai-deeptech/other-post
 *   npx tsx scripts/cf-purge.ts --all          # purge everything (after a bulk SQL change)
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function main() {
  const { isCloudflarePurgeConfigured, purgeCloudflareEverything, purgeCloudflarePathsNow } =
    await import('../src/lib/cloudflare-purge');

  if (!isCloudflarePurgeConfigured()) {
    console.error('CLOUDFLARE_ZONE_ID / CLOUDFLARE_API_TOKEN are not set in .env.local');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/cf-purge.ts <path...> | --all');
    process.exit(1);
  }

  const ok = args.includes('--all')
    ? await purgeCloudflareEverything()
    : await purgeCloudflarePathsNow(
        args.map((a) => (a.startsWith('http') ? new URL(a).pathname : a.startsWith('/') ? a : `/${a}`))
      );
  console.log(ok ? 'Purged.' : 'Purge failed — see error above.');
  process.exit(ok ? 0 : 1);
}

main();
