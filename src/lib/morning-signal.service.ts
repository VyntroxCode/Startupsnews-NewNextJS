import { createLogger } from '@/shared/utils/logger';
import { query, queryOne } from '@/shared/database/connection';
import { RssFeedsRepository } from '@/modules/rss-feeds/repository/rss-feeds.repository';
import { markNewsletterSent } from '@/modules/public-users/repository/public-users.repository';
import { getAmazonProducts, buildAmazonNativeBlock, buildAmazonBannerBlock } from './amazon-affiliate';
import { buildNewsletterTransporter, getNewsletterFrom } from './newsletter-mailer';

const log = createLogger('morning-signal');
const rssRepo = new RssFeedsRepository();

interface NewsletterItem {
  rss_feed_id: number;
  feed_name: string;
  feed_url?: string | null;
  feed_logo_url?: string | null;
  category_slug: string | null;
  title: string;
  link: string;
  image_url: string | null;
  description: string | null;
  published_at: Date | string | null;
}

interface Recipient { id: number; name: string; email: string; newsletter_category_slugs: string | null; timezone: string | null; last_newsletter_sent_date: string | null; city: string | null; country: string | null; }

const SECTOR_META: Record<string, { label: string; emoji: string }> = {
  'ai-deeptech':     { label: 'AI & Deeptech',     emoji: '🤖' },
  'business':        { label: 'Business',           emoji: '💼' },
  'climate-energy':  { label: 'Climate & Energy',   emoji: '🌱' },
  'consumer-d2c':    { label: 'Consumer & D2C',     emoji: '🛍️' },
  'cyber-security':  { label: 'Cyber Security',     emoji: '🔒' },
  'ecommerce':       { label: 'eCommerce',           emoji: '🛒' },
  'ev-mobility':     { label: 'EV & Mobility',       emoji: '🚗' },
  'fintech':         { label: 'Fintech',             emoji: '💜' },
  'funding':         { label: 'Funding',             emoji: '💰' },
  'gaming':          { label: 'Gaming',              emoji: '🎮' },
  'healthtech':      { label: 'HealthTech',          emoji: '🏥' },
  'press-release':   { label: 'Press Release',       emoji: '📋' },
  'robotics':        { label: 'Robotics',            emoji: '🦾' },
  'saas-enterprise': { label: 'SaaS & Enterprise',   emoji: '🏢' },
  'social-media':    { label: 'Social Media',        emoji: '📱' },
  'tech':            { label: 'Tech',                emoji: '⚡' },
  'web3-blockchain': { label: 'Web3 & Blockchain',   emoji: '🔗' },
};

interface UpcomingEvent { title: string; url: string | null; location: string; event_date: string; event_time?: string | null; image_url?: string | null; }

export async function getUpcomingEvents(limit = 2): Promise<UpcomingEvent[]> {
  try {
    return await query<UpcomingEvent>(
      `SELECT title, external_url AS url, location, event_date, event_time, image_url FROM events WHERE status = 'upcoming' AND event_date >= CURDATE() ORDER BY event_date ASC LIMIT ?`,
      [limit]
    );
  } catch { return []; }
}

/**
 * Picks events near the recipient's "Location" (the same city/country fields shown
 * in the admin Registered Users table), matched as a normalized substring against
 * `location`, which is a free-text field drawn from the event_regions vocabulary.
 * Tries city first, then country, then falls back to the soonest global events —
 * there's no real geo-distance data, just city/country names.
 */
export function pickEventsForCity(allUpcomingEvents: UpcomingEvent[], city: string | null | undefined, limit = 2, country?: string | null): UpcomingEvent[] {
  const matches = (needle: string) => allUpcomingEvents.filter(ev => {
    const loc = (ev.location || '').toLowerCase();
    return loc.includes(needle) || needle.includes(loc);
  });

  const normalizedCity = (city || '').trim().toLowerCase();
  if (normalizedCity) {
    const nearby = matches(normalizedCity);
    if (nearby.length > 0) return nearby.slice(0, limit);
  }

  const normalizedCountry = (country || '').trim().toLowerCase();
  if (normalizedCountry) {
    const nearby = matches(normalizedCountry);
    if (nearby.length > 0) return nearby.slice(0, limit);
  }

  return allUpcomingEvents.slice(0, limit);
}

export function buildEventsBlock(events: UpcomingEvent[]): string {
  if (!events.length) return '';
  const cards = events.map(ev => {
    const d = new Date(ev.event_date);
    const day = d.getDate();
    const mon = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const img = ev.image_url || `https://placehold.co/264x150/EFEAFB/5B3FA8?text=${encodeURIComponent(ev.location || 'Event')}`;
    const meta = [ev.event_time, ev.location].filter(Boolean).join(' · ');
    const link = ev.url || '#';
    return `
      <td width="48%" valign="top" class="stack" style="padding:0 3px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EEE2E6;border-radius:8px;overflow:hidden;">
          <tr><td>
            <a href="${esc(link)}" style="display:block;text-decoration:none;">
              <img src="${esc(img)}" width="264" height="150" alt="" style="display:block;border-radius:8px 8px 0 0;width:100%;height:auto;">
            </a>
          </td></tr>
          <tr><td style="padding:12px 14px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td width="54" valign="top">
                <div style="background:#9C2A57;color:#fff;text-align:center;border-radius:6px;width:54px;padding:8px 0;">
                  <span style="font-size:18px;font-weight:bold;display:block;line-height:1;">${day}</span>
                  <span style="font-size:10px;text-transform:uppercase;display:block;margin-top:2px;">${mon}</span>
                </div>
              </td>
              <td valign="top" style="padding-left:10px;">
                <p style="margin:0 0 3px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1A1A1A;">${esc(ev.title)}</p>
                <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8A8A8A;">${esc(meta)}</span>
              </td>
            </tr></table>
          </td></tr>
        </table>
      </td>`;
  });
  return `
      <tr><td style="padding:28px 24px 0;border-top:1px solid #EEE2E6;"></td></tr>
      <tr>
        <td style="padding:20px 24px 6px;">
          <span style="display:inline-block;background:#EFEAFB;color:#5B3FA8;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;padding:5px 10px;border-radius:3px;">&#128205; Happening Near You</span>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            ${cards.join('<td width="4%" class="hide-mobile">&nbsp;</td>')}
          </tr></table>
        </td>
      </tr>`;
}

async function getSetting(key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>('SELECT value FROM site_settings WHERE `key` = ?', [key]);
  return row?.value ?? null;
}

function timeAgo(d: Date | string | null): string {
  if (!d) return '';
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function esc(s: string | null | undefined): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SECTOR_COLORS: Record<string, { bg: string; color: string; link: string }> = {
  'ai-deeptech':     { bg: '#E8EEFC', color: '#1F4DA1', link: '#1F4DA1' },
  'business':        { bg: '#F0F0F0', color: '#444444', link: '#555555' },
  'climate-energy':  { bg: '#E8F7EF', color: '#1A7A55', link: '#1A7A55' },
  'consumer-d2c':    { bg: '#FEF3E2', color: '#8C5A00', link: '#B07000' },
  'cyber-security':  { bg: '#E8EEFC', color: '#1F4DA1', link: '#1F4DA1' },
  'ecommerce':       { bg: '#FEF3E2', color: '#8C5A00', link: '#B07000' },
  'ev-mobility':     { bg: '#E8EEFC', color: '#2A5FA8', link: '#2A5FA8' },
  'fintech':         { bg: '#FCE8EF', color: '#9C2A57', link: '#C13E70' },
  'funding':         { bg: '#E8F5FC', color: '#0A6080', link: '#0A6080' },
  'gaming':          { bg: '#FEE8F8', color: '#8C2A7A', link: '#8C2A7A' },
  'healthtech':      { bg: '#E8F7EF', color: '#1A7A55', link: '#1A7A55' },
  'press-release':   { bg: '#F0F0F0', color: '#444444', link: '#555555' },
  'robotics':        { bg: '#E8EEFC', color: '#1F4DA1', link: '#1F4DA1' },
  'saas-enterprise': { bg: '#EFEAFB', color: '#5B3FA8', link: '#5B3FA8' },
  'social-media':    { bg: '#FCE8EF', color: '#9C2A57', link: '#C13E70' },
  'tech':            { bg: '#EFEAFB', color: '#5B3FA8', link: '#5B3FA8' },
  'web3-blockchain': { bg: '#EFEAFB', color: '#5B3FA8', link: '#5B3FA8' },
};
const DEFAULT_SECTOR_COLOR = { bg: '#FCE8EF', color: '#9C2A57', link: '#C13E70' };

export function buildSectorBlock(slug: string, items: NewsletterItem[]): string {
  if (!items.length) return '';
  const meta = SECTOR_META[slug] || { label: slug, emoji: '📰' };
  const sc = SECTOR_COLORS[slug] || DEFAULT_SECTOR_COLOR;
  const hero = items[0];
  const compacts = items.slice(1, 4);
  const heroImg = hero.image_url || `https://placehold.co/552x225/${sc.bg.replace('#', '')}/${sc.color.replace('#', '')}?text=${encodeURIComponent(meta.label)}`;
  const heroDesc = hero.description
    ? esc(hero.description.substring(0, 180)) + (hero.description.length > 180 ? '&hellip;' : '')
    : '';

  const compactRowsHtml = compacts.map((item, i) => {
    const thumb = item.image_url || 'https://placehold.co/64x48/F7F4F5/C8C8C8?text=News';
    const ago = timeAgo(item.published_at);
    const isLast = i === compacts.length - 1;
    return `
        <tr>
          <td width="68" valign="top"${isLast ? '' : ' style="padding-bottom:14px;"'}>
            <img src="${esc(thumb)}" width="64" height="48" alt="" style="display:block;border-radius:6px;width:64px;height:48px;object-fit:cover;">
          </td>
          <td valign="top" style="padding-left:12px;${isLast ? '' : 'padding-bottom:14px;'}">
            <p style="margin:0 0 3px;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;line-height:1.4;font-weight:bold;color:#1A1A1A;">${esc(item.title)}</p>
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:11.5px;color:#9A9A9A;">${esc(item.feed_name)}${ago ? ' &middot; ' + ago : ''}</span>
          </td>
        </tr>`;
  }).join('');

  return `
      <tr><td style="padding:28px 24px 0;border-top:1px solid #EEE2E6;"></td></tr>
      <tr>
        <td style="padding:20px 24px 0;">
          <span style="display:inline-block;background:${sc.bg};color:${sc.color};font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;padding:5px 10px;border-radius:3px;">${esc(meta.label)}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 24px 0;">
          <a href="${esc(hero.link)}" style="text-decoration:none;display:block;">
            <img src="${esc(heroImg)}" width="552" height="225" alt="" style="display:block;border-radius:8px;width:100%;max-width:552px;height:auto;" class="feat-img">
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 24px 0;">
          <a href="${esc(hero.link)}" style="text-decoration:none;">
            <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.3;font-weight:bold;color:#1A1A1A;">${esc(hero.title)}</p>
          </a>
          ${heroDesc ? `<p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#4A4A4A;">${heroDesc}</p>` : ''}
          <a href="${esc(hero.link)}" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:${sc.link};text-decoration:none;">Read full story &rarr;</a>
        </td>
      </tr>
      ${compacts.length > 0 ? `
      <tr><td style="padding:18px 24px 0;border-top:1px solid #EEE2E6;"></td></tr>
      <tr>
        <td style="padding:14px 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${compactRowsHtml}
          </table>
        </td>
      </tr>` : ''}`;
}

export function buildNewsletterHtml(name: string, date: string, sectorBlocks: string, amazonNativeBlock: string, eventsBlock: string, amazonBannerBlock: string, unsubscribeUrl = 'https://startupnews.fyi/unsubscribe'): string {
  const safeName = esc(name);
  const safeDate = esc(date);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StartupNews.fyi — Daily Industry Digest</title>
<style>
  body, table, td { font-family: Arial, Helvetica, sans-serif; }
  body { margin:0; padding:0; background:#F7F4F5; }
  table { border-collapse: collapse; }
  img { border:0; display:block; }
  a { text-decoration:none; }
  @media only screen and (max-width:620px) {
    .container { width:100% !important; }
    .pad { padding-left:16px !important; padding-right:16px !important; }
    .feat-img { width:100% !important; height:auto !important; }
    .hide-mobile { display:none !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F7F4F5;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;">Hey ${safeName} — your personalised startup briefing is ready. &#9749;</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4F5;padding:24px 0;">
  <tr><td align="center">

    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;">

      <!-- HEADER -->
      <tr>
        <td class="pad" style="padding:24px 24px 16px;border-bottom:3px solid #E8B7CC;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <a href="https://startupnews.fyi" style="display:inline-block;text-decoration:none;">
                  <img src="https://startupnews.fyi/logo.png" width="180" alt="StartupNews.fyi" style="display:block;height:auto;border:0;">
                </a>
              </td>
              <td align="right" style="font-size:11px;color:#B9B9B9;white-space:nowrap;">${safeDate}</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- INTRO LINE -->
      <tr>
        <td class="pad" style="padding:16px 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6A6A6A;line-height:1.6;">
          Hey ${safeName} — here's your personalised startup briefing for today. Every story was picked from the sectors you care about.
        </td>
      </tr>

      <!-- SECTOR BLOCKS -->
      ${sectorBlocks}

      <!-- NATIVE AD (after sectors) -->
      ${amazonNativeBlock}

      <!-- EVENTS -->
      ${eventsBlock}

      <!-- RECTANGLE AD (before footer) -->
      ${amazonBannerBlock}

      <!-- FOOTER -->
      <tr>
        <td style="padding:32px 24px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px solid #EEE2E6;padding-top:18px;">
              <p style="margin:0;font-size:11px;color:#9A9A9A;line-height:1.6;">
                You're receiving this because you subscribed to StartupNews.fyi.<br>
                <a href="${unsubscribeUrl}" style="color:#9A9A9A;text-decoration:underline;">Unsubscribe</a>
              </p>
              <p style="margin:10px 0 0;font-size:11px;color:#9A9A9A;">DOTFYI Media Ventures Pvt. Ltd. &middot; New Delhi, India</p>
            </td></tr>
          </table>
        </td>
      </tr>

    </table>

  </td></tr>
</table>

</body>
</html>`;
}

function isEightAMInTimezone(tz: string): boolean {
  try {
    const hour = parseInt(
      new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz }).format(new Date()),
      10
    );
    return hour === 8;
  } catch {
    return false;
  }
}

function todayDateString(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export interface MorningSignalResult {
  sent: number;
  total: number;
  errors: number;
  skipped: number;
}

export async function runMorningSignal(options?: { bypassEnabledCheck?: boolean; bypassTimezoneFilter?: boolean }): Promise<MorningSignalResult> {
  log.info('Morning Signal job started');

  if (!options?.bypassEnabledCheck) {
    const enabledSetting = await getSetting('nl_morning_signal_enabled');
     if (enabledSetting !== '1') {
      log.info('Morning Signal disabled via admin settings, skipping');
      return { sent: 0, total: 0, errors: 0, skipped: 0 };
    }
  }

  const [allItems, allRecipients, upcomingEvents, amazonProducts] = await Promise.all([
    rssRepo.findNewsletterItems(400),
    query<Recipient>(
      'SELECT id, name, email, newsletter_category_slugs, timezone, last_newsletter_sent_date, city, country FROM public_registrations WHERE is_active = 1 AND (newsletter_unsubscribed IS NULL OR newsletter_unsubscribed = 0)'
    ),
    getUpcomingEvents(50),
    getAmazonProducts(3),
  ]);

  const amazonNativeBlock = amazonProducts.length ? buildAmazonNativeBlock(amazonProducts[0]) : '';
  const amazonBannerBlock = buildAmazonBannerBlock(amazonProducts.slice(1));

  // Refresh newsletter_items snapshot
  await query('DELETE FROM newsletter_items');
  if (allItems.length > 0) {
    const placeholders = allItems.map(() => '(?,?,?,?,?,?,?,?,?,?)').join(',');
    const values = allItems.flatMap((item) => [
      item.rss_feed_id,
      item.feed_name,
      item.feed_url ?? null,
      item.feed_logo_url ?? null,
      item.category_slug ?? null,
      item.title,
      item.link,
      item.image_url ?? null,
      item.description ?? null,
      item.published_at ?? null,
    ]);
    await query(
      `INSERT INTO newsletter_items (rss_feed_id, feed_name, feed_url, feed_logo_url, category_slug, title, link, image_url, description, published_at) VALUES ${placeholders}`,
      values
    );
    log.info('Newsletter snapshot refreshed', { count: allItems.length });
  }

  if (allRecipients.length === 0) {
    log.info('Morning Signal: no active recipients, skipping');
    return { sent: 0, total: 0, errors: 0, skipped: 0 };
  }

  const DEFAULT_TZ = 'Asia/Kolkata';

  let recipients: Recipient[];
  if (options?.bypassTimezoneFilter) {
    // Manual trigger: send to ALL active subscribers regardless of their local time
    recipients = allRecipients;
  } else {
    recipients = allRecipients.filter(r => {
      const tz = r.timezone || DEFAULT_TZ;
      if (!isEightAMInTimezone(tz)) return false;
      const today = todayDateString(tz);
      const lastSent = r.last_newsletter_sent_date ? String(r.last_newsletter_sent_date).slice(0, 10) : null;
      return lastSent !== today;
    });
  }

  log.info('Morning Signal recipients due', { due: recipients.length, total: allRecipients.length });

  if (recipients.length === 0) {
    return { sent: 0, total: allRecipients.length, errors: 0, skipped: allRecipients.length };
  }

  const itemsBySlug: Record<string, typeof allItems> = {};
  for (const item of allItems) {
    const slug = item.category_slug || 'uncategorized';
    if (!itemsBySlug[slug]) itemsBySlug[slug] = [];
    if (itemsBySlug[slug].length < 4) itemsBySlug[slug].push(item);
  }

  const fromSetting = await getNewsletterFrom();
  const transporter = await buildNewsletterTransporter();
  const subject = `Morning Signal — ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

  let sent = 0;
  let errors = 0;
  const sentIds: number[] = [];

  for (const r of recipients) {
    try {
      const tz = r.timezone || DEFAULT_TZ;
      const date = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: tz,
      });

      const userSlugs = (r.newsletter_category_slugs || '')
        .split(',').map(s => s.trim()).filter(Boolean);

      if (userSlugs.length === 0) continue;
      const slugsToSend = userSlugs.filter(s => itemsBySlug[s]?.length > 0);

      if (slugsToSend.length === 0) continue;

      const sectorBlocks = slugsToSend.map(s => buildSectorBlock(s, itemsBySlug[s])).join('');
      const eventsBlock = buildEventsBlock(pickEventsForCity(upcomingEvents, r.city, 2, r.country));
      const html = buildNewsletterHtml(r.name || 'there', date, sectorBlocks, amazonNativeBlock, eventsBlock, amazonBannerBlock);
      await transporter.sendMail({ from: fromSetting, to: r.email, subject, html });
      sentIds.push(r.id);
      sent++;
    } catch (err) {
      errors++;
      log.error('Failed to send to recipient', { email: r.email, err });
    }
  }

  if (sentIds.length > 0) {
    await markNewsletterSent(sentIds);
  }

  const skipped = allRecipients.length - recipients.length;
  log.info('Morning Signal job completed', { sent, total: allRecipients.length, skipped, errors });
  return { sent, total: allRecipients.length, errors, skipped };
}
