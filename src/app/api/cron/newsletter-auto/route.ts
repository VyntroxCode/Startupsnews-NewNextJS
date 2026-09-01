import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/shared/database/connection';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { getAmazonProducts, buildAmazonNativeBlock, buildAmazonBannerBlock } from '@/lib/amazon-affiliate';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-secret';

const CRON_SECRET = process.env.CRON_SECRET;

interface NewsletterItem {
  id: number;
  title: string;
  link: string;
  image_url: string | null;
  description: string | null;
  published_at: string | null;
  feed_name: string;
  category_slug: string | null;
}

interface Recipient {
  id: number;
  name: string;
  email: string;
  newsletter_category_slugs: string | null;
}

const SECTOR_META: Record<string, { label: string; emoji: string }> = {
  'ai-deeptech':     { label: 'AI & Deeptech',      emoji: '🤖' },
  'business':        { label: 'Business',            emoji: '💼' },
  'climate-energy':  { label: 'Climate & Energy',    emoji: '🌱' },
  'consumer-d2c':    { label: 'Consumer & D2C',      emoji: '🛍️' },
  'cyber-security':  { label: 'Cyber Security',      emoji: '🔒' },
  'ecommerce':       { label: 'eCommerce',            emoji: '🛒' },
  'ev-mobility':     { label: 'EV & Mobility',        emoji: '🚗' },
  'fintech':         { label: 'Fintech',              emoji: '💜' },
  'funding':         { label: 'Funding',              emoji: '💰' },
  'gaming':          { label: 'Gaming',               emoji: '🎮' },
  'healthtech':      { label: 'HealthTech',           emoji: '🏥' },
  'press-release':   { label: 'Press Release',        emoji: '📋' },
  'robotics':        { label: 'Robotics',             emoji: '🦾' },
  'saas-enterprise': { label: 'SaaS & Enterprise',    emoji: '🏢' },
  'social-media':    { label: 'Social Media',         emoji: '📱' },
  'tech':            { label: 'Tech',                 emoji: '⚡' },
  'web3-blockchain': { label: 'Web3 & Blockchain',    emoji: '🔗' },
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface UpcomingEvent { title: string; url: string | null; location: string; event_date: string; event_time?: string | null; image_url?: string | null; }

async function getUpcomingEvents(limit = 2): Promise<UpcomingEvent[]> {
  try {
    return await query<UpcomingEvent>(
      `SELECT event_name AS title, website AS url, COALESCE(NULLIF(city, ''), country) AS location,
              event_start_date AS event_date, event_start_time AS event_time, poster_url AS image_url
       FROM partnership_events WHERE site_status = 'upcoming' AND event_start_date >= CURDATE()
       ORDER BY event_start_date ASC LIMIT ?`,
      [limit]
    );
  } catch { return []; }
}

function buildEventsBlock(events: UpcomingEvent[]): string {
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

function buildSectorBlock(slug: string, items: NewsletterItem[]): string {
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
            <a href="${esc(item.link)}" style="text-decoration:none;display:block;">
              <img src="${esc(thumb)}" width="64" height="48" alt="" style="display:block;border-radius:6px;width:64px;height:48px;object-fit:cover;">
            </a>
          </td>
          <td valign="top" style="padding-left:12px;${isLast ? '' : 'padding-bottom:14px;'}">
            <a href="${esc(item.link)}" style="text-decoration:none;">
              <p style="margin:0 0 3px;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;line-height:1.4;font-weight:bold;color:#1A1A1A;">${esc(item.title)}</p>
            </a>
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

function buildUnsubscribeToken(email: string): string {
  return jwt.sign({ email, purpose: 'unsubscribe' }, JWT_SECRET, { expiresIn: '90d' });
}

function buildNewsletterHtml(name: string, date: string, sectorBlocks: string, amazonNativeBlock: string, eventsBlock: string, amazonBannerBlock: string, unsubscribeUrl = 'https://startupnews.fyi/unsubscribe'): string {
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

async function getSetting(key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>('SELECT value FROM site_settings WHERE `key` = ?', [key]);
  return row?.value ?? null;
}

async function buildTransporter() {
  const host   = await getSetting('nl_smtp_host')   || process.env.SMTP_HOST  || '';
  const port   = await getSetting('nl_smtp_port')   || process.env.SMTP_PORT  || '465';
  const secure = await getSetting('nl_smtp_secure') || process.env.SMTP_SECURE || 'true';
  const user   = await getSetting('nl_smtp_user')   || process.env.SMTP_USER  || '';
  const pass   = await getSetting('nl_smtp_pass')   || process.env.SMTP_PASS  || '';
  if (!host || !user || !pass) throw new Error('SMTP not configured');
  return {
    transporter: nodemailer.createTransport({
      host,
      port: Number(port),
      secure: secure.toLowerCase() === 'true',
      auth: { user, pass },
    }),
    from: await getSetting('nl_smtp_from') || process.env.SMTP_FROM || user,
  };
}

/**
 * GET /api/cron/newsletter-auto?secret=...
 *
 * Sends personalised newsletters: each subscriber receives only the sectors
 * they opted into, populated with the latest items from newsletter_items.
 *
 * Optional query params:
 *   testEmail — send a preview to a single address (all sectors, not saved)
 *   subject   — custom subject line
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
     const enabledRow = await queryOne<{ value: string }>('SELECT value FROM site_settings WHERE `key` = ?', ['nl_morning_signal_enabled']);
    if (enabledRow?.value !== '1') {
      return NextResponse.json({ success: true, sent: 0, message: 'Newsletter disabled via admin settings' });
    }
    const [rawItems, upcomingEvents, amazonProducts] = await Promise.all([
      query<NewsletterItem>(
        `SELECT id, title, link, image_url, description, published_at, feed_name, category_slug
         FROM newsletter_items
         ORDER BY published_at DESC, id DESC
         LIMIT 400`
      ),
      getUpcomingEvents(2),
      getAmazonProducts(3),
    ]);

    const eventsBlock = buildEventsBlock(upcomingEvents);
    const amazonNativeBlock = amazonProducts.length ? buildAmazonNativeBlock(amazonProducts[0]) : '';
    const amazonBannerBlock = buildAmazonBannerBlock(amazonProducts.slice(1));

    // Group into { slug -> items[] }, capped at 4 per category (1 hero + 3 compact)
    const itemsBySlug: Record<string, NewsletterItem[]> = {};
    for (const item of rawItems) {
      const slug = item.category_slug || 'uncategorized';
      if (!itemsBySlug[slug]) itemsBySlug[slug] = [];
      if (itemsBySlug[slug].length < 4) itemsBySlug[slug].push(item);
    }

    const testEmail = request.nextUrl.searchParams.get('testEmail');
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const subject = request.nextUrl.searchParams.get('subject') || `Morning Signal — ${dateStr}`;

    const { transporter, from } = await buildTransporter();

    // Test mode: look up the recipient's actual category preferences and send accordingly
    if (testEmail) {
      const testRecipient = await queryOne<Recipient>(
        'SELECT id, name, email, newsletter_category_slugs FROM public_registrations WHERE email = ? LIMIT 1',
        [testEmail]
      );

      const testName = testRecipient?.name || 'Friend';
      const testSlugs = (testRecipient?.newsletter_category_slugs || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const slugsToSend = testSlugs.filter(slug => itemsBySlug[slug]?.length > 0);

      const sectorHtml = slugsToSend
        .map(slug => buildSectorBlock(slug, itemsBySlug[slug]))
        .join('');

      const testUnsubToken = buildUnsubscribeToken(testEmail);
      const testUnsubUrl = `https://startupnews.fyi/unsubscribe?token=${testUnsubToken}`;
      const html = buildNewsletterHtml(testName, dateStr, sectorHtml || '<p style="padding:20px;color:#9A9A9A;">No newsletter items available for your selected categories.</p>', amazonNativeBlock, eventsBlock, amazonBannerBlock, testUnsubUrl);
      await transporter.sendMail({ from, to: testEmail, subject: `[TEST] ${subject}`, html });
      return NextResponse.json({ success: true, sent: 1, mode: 'test', to: testEmail, categories: slugsToSend });
    }

    // Fetch all active, non-unsubscribed subscribers
    const recipients = await query<Recipient>(
      'SELECT id, name, email, newsletter_category_slugs FROM public_registrations WHERE is_active = 1 AND (newsletter_unsubscribed IS NULL OR newsletter_unsubscribed = 0)'
    );

    if (recipients.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No active subscribers' });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const r of recipients) {
      try {
        // Parse subscriber's chosen category slugs
        const userSlugs = (r.newsletter_category_slugs || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

        if (userSlugs.length === 0) continue;
        const slugsToUse = userSlugs.filter(slug => itemsBySlug[slug]?.length > 0);

        if (slugsToUse.length === 0) continue;

        const sectorBlocks = slugsToUse
          .map(slug => buildSectorBlock(slug, itemsBySlug[slug]))
          .join('');

        const unsubToken = buildUnsubscribeToken(r.email);
        const unsubUrl = `https://startupnews.fyi/unsubscribe?token=${unsubToken}`;
        const html = buildNewsletterHtml(r.name, dateStr, sectorBlocks, amazonNativeBlock, eventsBlock, amazonBannerBlock, unsubUrl);

        await transporter.sendMail({ from, to: r.email, subject, html });
        sent++;
      } catch (err) {
        errors.push(`${r.email}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      total: recipients.length,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
