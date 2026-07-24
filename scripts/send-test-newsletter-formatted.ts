/**
 * One-shot: send the real production-format newsletter (category sector blocks)
 * to a single test address, filtered to that recipient's subscribed categories.
 * Usage: npx tsx scripts/send-test-newsletter-formatted.ts <email>
 */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { query, closeDbConnection } from '@/shared/database/connection';
import { closeRedisClient } from '@/shared/cache/redis.client';
import { RssFeedsRepository } from '@/modules/rss-feeds/repository/rss-feeds.repository';
import { getAmazonProducts, buildAmazonNativeBlock, buildAmazonBannerBlock } from '@/lib/amazon-affiliate';
import { buildNewsletterTransporter, getNewsletterFrom } from '@/lib/newsletter-mailer';
import { getUpcomingEvents, pickEventsForCity, buildEventsBlock, buildSectorBlock, buildNewsletterHtml } from '@/lib/morning-signal.service';

interface Recipient { id: number; name: string; email: string; newsletter_category_slugs: string | null; city: string | null; country: string | null; }

async function main() {
  const testEmail = process.argv[2] || 'adityarana206@gmail.com';
  const rssRepo = new RssFeedsRepository();

  const [recipientRows, allItems, upcomingEvents, amazonProducts] = await Promise.all([
    query<Recipient>('SELECT id, name, email, newsletter_category_slugs, city, country FROM public_registrations WHERE email = ?', [testEmail]),
    rssRepo.findNewsletterItems(400),
    getUpcomingEvents(50),
    getAmazonProducts(3),
  ]);

  const recipient = recipientRows[0];
  if (!recipient) {
    console.error(`No public_registrations row found for ${testEmail}`);
    process.exit(1);
  }

  const userSlugs = (recipient.newsletter_category_slugs || '').split(',').map(s => s.trim()).filter(Boolean);
  if (userSlugs.length === 0) {
    console.error(`${testEmail} has no subscribed newsletter categories`);
    process.exit(1);
  }

  const itemsBySlug: Record<string, typeof allItems> = {};
  for (const item of allItems) {
    const slug = item.category_slug || 'uncategorized';
    if (!itemsBySlug[slug]) itemsBySlug[slug] = [];
    if (itemsBySlug[slug].length < 4) itemsBySlug[slug].push(item);
  }

  const slugsToSend = userSlugs.filter(s => itemsBySlug[s]?.length > 0);
  if (slugsToSend.length === 0) {
    console.error(`No newsletter items available for subscribed categories: ${userSlugs.join(', ')}`);
    process.exit(1);
  }

  const eventsBlock = buildEventsBlock(pickEventsForCity(upcomingEvents, recipient.city, 2, recipient.country));
  const amazonNativeBlock = amazonProducts.length ? buildAmazonNativeBlock(amazonProducts[0]) : '';
  const amazonBannerBlock = buildAmazonBannerBlock(amazonProducts.slice(1));

  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
  const sectorBlocks = slugsToSend.map(s => buildSectorBlock(s, itemsBySlug[s])).join('');
  const html = buildNewsletterHtml(recipient.name || 'there', date, sectorBlocks, amazonNativeBlock, eventsBlock, amazonBannerBlock);

  const fromSetting = await getNewsletterFrom();
  const transporter = await buildNewsletterTransporter();
  const subject = `[TEST] Morning Signal — ${date}`;

  console.log(`Sending to ${testEmail} — categories: ${slugsToSend.join(', ')}`);
  await transporter.sendMail({ from: fromSetting, to: testEmail, subject, html });
  console.log(`✓ Sent to ${testEmail}`);

  await closeDbConnection();
  await closeRedisClient();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
