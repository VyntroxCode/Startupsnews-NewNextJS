import nodemailer from 'nodemailer';
import { createLogger } from '@/shared/utils/logger';
import { query, queryOne } from '@/shared/database/connection';
import { RssFeedsRepository } from '@/modules/rss-feeds/repository/rss-feeds.repository';
import { markNewsletterSent } from '@/modules/public-users/repository/public-users.repository';

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

interface Recipient { id: number; name: string; email: string; newsletter_category_slugs: string | null; timezone: string | null; last_newsletter_sent_date: string | null; }

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

async function getSetting(key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>('SELECT value FROM site_settings WHERE `key` = ?', [key]);
  return row?.value ?? null;
}

async function buildTransporter() {
  const host   = await getSetting('nl_smtp_host')   || process.env.SMTP_HOST   || '';
  const port   = await getSetting('nl_smtp_port')   || process.env.SMTP_PORT   || '465';
  const secure = await getSetting('nl_smtp_secure') || process.env.SMTP_SECURE || 'true';
  const user   = await getSetting('nl_smtp_user')   || process.env.SMTP_USER   || '';
  const pass   = await getSetting('nl_smtp_pass')   || process.env.SMTP_PASS   || '';
  if (!host || !user || !pass) throw new Error('SMTP not configured');
  return nodemailer.createTransport({ host, port: Number(port), secure: secure === 'true', auth: { user, pass } });
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

function buildSectorBlock(slug: string, items: NewsletterItem[]): string {
  if (!items.length) return '';
  const meta = SECTOR_META[slug] || { label: slug, emoji: '📰' };
  const hero = items[0];
  const compacts = items.slice(1, 4);
  const heroImg = hero.image_url || `https://placehold.co/516x210/f4f4f5/FF4D8F?text=${encodeURIComponent(meta.label)}`;
  const heroDesc = hero.description
    ? esc(hero.description.substring(0, 160)) + (hero.description.length > 160 ? '&hellip;' : '')
    : '';
  const heroAgo = timeAgo(hero.published_at);

  const compactRowsHtml = compacts.map(item => {
    const thumb = item.image_url || 'https://placehold.co/82x82/e4e4e7/FF4D8F?text=News';
    const ago = timeAgo(item.published_at);
    return `
      <tr><td class="px" style="padding:14px 40px 0 40px;">
        <a href="${esc(item.link)}" class="compact-card" style="display:block;background:#ffffff;border:1px solid #e4e4e7;border-radius:14px;text-decoration:none;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="96" valign="top" style="padding:14px 0 14px 14px;">
              <img src="${esc(thumb)}" width="82" height="82" alt="" style="display:block;width:82px;height:82px;border-radius:10px;object-fit:cover;">
            </td>
            <td valign="top" style="padding:14px 16px 14px 14px;">
              <span class="source-badge" style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;color:#FF4D8F;background:rgba(255,77,143,0.1);padding:3px 9px;border-radius:20px;">${esc(item.feed_name)}</span>
              <p class="text-primary" style="margin:8px 0 4px 0;font-family:Georgia,serif;font-size:16px;line-height:21px;font-weight:bold;color:#111111;">${esc(item.title)}</p>
              <span class="text-muted" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#71717a;">${ago ? ago + ' &middot; ' : ''}Read &rarr;</span>
            </td>
          </tr></table>
        </a>
      </td></tr>`;
  }).join('');

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="body-bg" style="background:#f4f4f5;">
  <tr><td align="center">
    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
      <tr><td class="px" style="padding:30px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td class="divider-row" style="border-top:1px solid #e4e4e7;padding-top:16px;">
            <span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#ffffff;background:#FF4D8F;padding:8px 16px;border-radius:30px;letter-spacing:1.5px;text-transform:uppercase;">${meta.emoji} ${esc(meta.label.toUpperCase())}</span>
          </td></tr>
        </table>
      </td></tr>
      <tr><td class="px" style="padding:16px 40px 0 40px;">
        <a href="${esc(hero.link)}" class="hero-card" style="display:block;background:#ffffff;border:1px solid #e4e4e7;border-radius:18px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);text-decoration:none;">
          <img src="${esc(heroImg)}" width="516" alt="" class="event-img" style="display:block;width:100%;max-width:516px;height:auto;border-bottom:1px solid #e4e4e7;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:18px 22px 20px 22px;">
              <span class="text-muted" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:#71717a;letter-spacing:0.5px;">${esc(hero.feed_name)}${heroAgo ? ' &middot; ' + heroAgo : ''}</span>
              <p class="text-primary" style="margin:8px 0 6px 0;font-family:Georgia,serif;font-size:22px;line-height:27px;font-weight:bold;color:#111111;">${esc(hero.title)}</p>
              ${heroDesc ? `<p class="text-secondary" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#444444;">${heroDesc}</p>` : ''}
              <span style="display:inline-block;margin-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#FF4D8F;">Read full story &rarr;</span>
            </td></tr>
          </table>
        </a>
      </td></tr>
      ${compactRowsHtml}
    </table>
  </td></tr>
</table>`;
}

function buildNewsletterHtml(name: string, date: string, sectorBlocks: string): string {
  const safeName = esc(name);
  const safeDate = esc(date);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>StartupNews.fyi Morning Signal</title>
<style>
body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse!important;}
body{margin:0!important;padding:0!important;width:100%!important;}
a{text-decoration:none;}
.body-bg{background-color:#f4f4f5!important;}
.topbar-td{background-color:#ffffff!important;border-color:#e4e4e7!important;}
.topbar-label{color:#71717a!important;}
.founder-card{background-color:#ffffff!important;border-color:#e4e4e7!important;}
.text-primary{color:#111111!important;}
.text-secondary{color:#444444!important;}
.text-muted{color:#71717a!important;}
.hero-card{background-color:#ffffff!important;border-color:#e4e4e7!important;}
.compact-card{background-color:#ffffff!important;border-color:#e4e4e7!important;}
.source-badge{color:#FF4D8F!important;background:rgba(255,77,143,0.1)!important;}
.divider-row{border-color:#e4e4e7!important;}
.footer-td{background-color:#e4e4e7!important;}
.footer-text{color:#71717a!important;}
.footer-link{color:#FF4D8F!important;}
.unsubscribe{color:#a1a1aa!important;}
@media (prefers-color-scheme: dark){
  .body-bg{background-color:#0B0A0F!important;}
  .topbar-td{background-color:#131019!important;border-color:#221C2B!important;}
  .topbar-label{color:#FF92AE!important;}
  .founder-card{background-color:#15131C!important;border-color:#2A2435!important;}
  .text-primary{color:#F2EDF7!important;}
  .text-secondary{color:#B6ACC4!important;}
  .text-muted{color:#9089A0!important;}
  .hero-card{background-color:#15131C!important;border-color:#2A2435!important;}
  .compact-card{background-color:#15131C!important;border-color:#211C29!important;}
  .source-badge{color:#FF92AE!important;background:rgba(255,77,143,0.16)!important;}
  .divider-row{border-color:#2A2435!important;}
  .footer-td{background-color:#0E0B13!important;}
  .footer-text{color:#b9adc9!important;}
  .footer-link{color:#FFD23F!important;}
  .unsubscribe{color:#b9adc9!important;}
}
@media screen and (max-width:620px){
  .container{width:100%!important;}
  .px{padding-left:22px!important;padding-right:22px!important;}
  .event-img{width:100%!important;height:auto!important;}
}
</style>
</head>
<body class="body-bg" style="margin:0;padding:0;background:#f4f4f5;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;">Good morning ${safeName}. Your personalised startup briefing is ready. &#9749;</div>
<center style="width:100%;">

<!-- TOP BAR -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td class="topbar-td" align="center" style="background:#ffffff;border-bottom:2px solid #e4e4e7;padding:18px 16px;">
    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
      <tr><td align="center" style="padding-bottom:8px;">
        <img src="https://startupnews.fyi/logo.png" alt="StartupNews.fyi" width="230" style="display:block;width:230px;height:auto;">
      </td></tr>
      <tr><td align="center" class="topbar-label" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;color:#71717a;text-transform:uppercase;font-weight:bold;">
        Morning Signal &nbsp;&middot;&nbsp; ${safeDate} &nbsp;&middot;&nbsp; <a href="https://startupnews.fyi" style="color:#FF4D8F;text-decoration:underline;">View online</a>
      </td></tr>
    </table>
  </td></tr>
</table>

<!-- FOUNDER NOTE -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="body-bg" style="background:#f4f4f5;">
  <tr><td align="center">
    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
      <tr><td class="px" style="padding:30px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="founder-card" style="background:#ffffff;border-radius:18px;border:1px solid #e4e4e7;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
          <tr><td style="padding:24px 26px 22px 26px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="48" valign="middle"><div style="width:44px;height:44px;border-radius:50%;background:#FF4D8F;color:#ffffff;font-family:Georgia,serif;font-size:20px;font-weight:bold;text-align:center;line-height:44px;">M</div></td>
              <td valign="middle" style="padding-left:12px;">
                <p class="text-primary" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#111111;">Madhur Mohan Malik</p>
                <p class="text-muted" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#71717a;">Founder, StartupNews.fyi</p>
              </td>
            </tr></table>
            <p class="text-primary" style="margin:16px 0 0 0;font-family:Georgia,serif;font-size:16px;line-height:25px;color:#111111;">Good morning ${safeName} &#128075;<br><br>Here is your personalised startup briefing. Every story was picked from the sectors you care about.</p>
            <p class="text-secondary" style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#444444;">Let&rsquo;s get into it. &#9889;</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>

<!-- SECTOR BLOCKS -->
${sectorBlocks}

<!-- ADVERTISE BANNER -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="body-bg" style="background:#f4f4f5;">
  <tr><td align="center"><table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
    <tr><td class="px" style="padding:34px 40px 0 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-image:linear-gradient(120deg,#FF4D8F,#FF8C3B);border-radius:18px;">
        <tr><td style="padding:26px 28px;">
          <p style="margin:0 0 4px 0;font-family:Georgia,serif;font-size:21px;font-weight:bold;color:#ffffff;">Want 100K+ founders &amp; operators reading you?</p>
          <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#FFE3EC;">Get your brand in front of the sharpest startup audience &mdash; one slot, every morning.</p>
          <a href="https://startupnews.fyi/advertise-with-us" style="display:inline-block;background:#111111;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;padding:13px 26px;border-radius:30px;">Advertise With Us &rarr;</a>
        </td></tr>
      </table>
    </td></tr>
  </table></td></tr>
</table>

<!-- SIGNOFF -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="body-bg" style="background:#f4f4f5;">
  <tr><td align="center"><table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
    <tr><td class="px" style="padding:28px 40px 0 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding:0 0 0 18px;border-left:3px solid #FF4D8F;">
          <p class="text-primary" style="margin:0;font-family:Georgia,serif;font-size:19px;line-height:27px;font-style:italic;color:#111111;">&ldquo;The best time to build was yesterday. The second best time is the next 24 hours.&rdquo;</p>
          <p class="text-muted" style="margin:6px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#71717a;">&mdash; On founder urgency</p>
        </td>
      </tr></table>
    </td></tr>
    <tr><td class="px" style="padding:22px 40px 6px 40px;">
      <p class="text-primary" style="margin:0;font-family:Georgia,serif;font-size:16px;line-height:24px;color:#111111;">Warm regards,</p>
      <p style="margin:4px 0 0 0;font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#FF4D8F;">Madhur Mohan Malik</p>
      <p class="text-muted" style="margin:2px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#71717a;">Founder, StartupNews.fyi</p>
    </td></tr>
  </table></td></tr>
</table>

<!-- FOOTER -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
  <tr><td class="footer-td" align="center" style="background:#e4e4e7;">
    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
      <tr><td class="px" style="padding:30px 40px;" align="center">
        <img src="https://startupnews.fyi/logo.png" alt="StartupNews.fyi" width="210" style="display:block;width:210px;height:auto;margin:0 auto 14px auto;">
        <p class="footer-text" style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#71717a;">The pulse of global startups &mdash; every morning, 8 AM.</p>
        <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;">
          <a href="https://instagram.com/startupnews.fyi" class="footer-link" style="color:#FF4D8F;padding:0 6px;">Instagram</a> &middot;
          <a href="https://linkedin.com/company/startupnews-fyi" class="footer-link" style="color:#FF4D8F;padding:0 6px;">LinkedIn</a> &middot;
          <a href="https://startupnews.fyi" class="footer-link" style="color:#FF4D8F;padding:0 6px;">Website</a>
        </p>
        <p class="footer-text" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#71717a;">
          You are receiving this because you subscribed to StartupNews.fyi.<br>
          <a href="https://startupnews.fyi/unsubscribe" class="unsubscribe" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe</a><br>
          DOTFYI Media Ventures Pvt. Ltd. &middot; New Delhi, India
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>

</center>
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
    if (enabledSetting === '0') {
      log.info('Morning Signal disabled via admin settings, skipping');
      return { sent: 0, total: 0, errors: 0, skipped: 0 };
    }
  }

  const [allItems, allRecipients] = await Promise.all([
    rssRepo.findNewsletterItems(400),
    query<Recipient>(
      'SELECT id, name, email, newsletter_category_slugs, timezone, last_newsletter_sent_date FROM public_registrations WHERE is_active = 1'
    ),
  ]);

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

  const fromSetting = await getSetting('nl_smtp_from') || process.env.SMTP_FROM || '';
  const transporter = await buildTransporter();
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

      const slugsToSend = userSlugs.length > 0
        ? userSlugs.filter(s => itemsBySlug[s]?.length > 0)
        : Object.keys(itemsBySlug).filter(s => itemsBySlug[s].length > 0);

      if (slugsToSend.length === 0) continue;

      const sectorBlocks = slugsToSend.map(s => buildSectorBlock(s, itemsBySlug[s])).join('');
      const html = buildNewsletterHtml(r.name || 'there', date, sectorBlocks);
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
