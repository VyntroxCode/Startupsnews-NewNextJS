/**
 * One-off test send using the real Morning Signal rendering + mail pipeline.
 * Read-only against the DB (does not touch newsletter_items / recipients / last_newsletter_sent_date).
 * Usage: npx tsx scripts/send-test-newsletter.mjs you@example.com
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
register('tsx/esm', pathToFileURL('./'));

const to = process.argv[2];
if (!to) {
  console.error('Usage: node scripts/send-test-newsletter.mjs <email>');
  process.exit(1);
}

const { RssFeedsRepository } = await import('../src/modules/rss-feeds/repository/rss-feeds.repository.ts');
const { getAmazonProducts, buildAmazonNativeBlock, buildAmazonBannerBlock } = await import('../src/lib/amazon-affiliate.ts');
const { buildNewsletterTransporter, getNewsletterFrom } = await import('../src/lib/newsletter-mailer.ts');
const {
  buildSectorBlock,
  buildNewsletterHtml,
  buildEventsBlock,
  getUpcomingEvents,
  pickEventsForCity,
} = await import('../src/lib/morning-signal.service.ts');

const rssRepo = new RssFeedsRepository();

const [allItems, upcomingEvents, amazonProducts] = await Promise.all([
  rssRepo.findNewsletterItems(400),
  getUpcomingEvents(50),
  getAmazonProducts(3),
]);

const itemsBySlug = {};
for (const item of allItems) {
  const slug = item.category_slug || 'uncategorized';
  if (!itemsBySlug[slug]) itemsBySlug[slug] = [];
  if (itemsBySlug[slug].length < 4) itemsBySlug[slug].push(item);
}

const slugsToSend = Object.keys(itemsBySlug).slice(0, 3);
if (slugsToSend.length === 0) {
  console.error('No newsletter items found in rss_feed_items — nothing to send.');
  process.exit(1);
}

const sectorBlocks = slugsToSend.map((s) => buildSectorBlock(s, itemsBySlug[s])).join('');
const amazonNativeBlock = amazonProducts.length ? buildAmazonNativeBlock(amazonProducts[0]) : '';
const amazonBannerBlock = buildAmazonBannerBlock(amazonProducts.slice(1));
const eventsBlock = buildEventsBlock(pickEventsForCity(upcomingEvents, null, 2, null));

const date = new Date().toLocaleDateString('en-IN', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata',
});
const html = buildNewsletterHtml('Test', date, sectorBlocks, amazonNativeBlock, eventsBlock, amazonBannerBlock);

const transporter = await buildNewsletterTransporter();
const from = await getNewsletterFrom();
const subject = `[TEST] Morning Signal — image fix check — ${date}`;

const info = await transporter.sendMail({ from, to, subject, html });
console.log('Sent:', info.messageId, '->', to);
process.exit(0);
