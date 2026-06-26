import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/shared/database/connection';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

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

function buildSectorBlock(slug: string, items: NewsletterItem[]): string {
  if (!items.length) return '';
  const meta = SECTOR_META[slug] || { label: slug, emoji: '📰' };
  const hero = items[0];
  const compacts = items.slice(1, 4);
  const heroImg = hero.image_url || `https://placehold.co/516x210/f3f0f8/FF4D8F?text=${encodeURIComponent(meta.label)}`;
  const heroDesc = hero.description ? esc(hero.description.substring(0, 160)) + (hero.description.length > 160 ? '&hellip;' : '') : '';
  const heroAgo = timeAgo(hero.published_at);

  const compactRowsHtml = compacts.map(item => {
    const thumb = item.image_url || 'https://placehold.co/82x82/e8e0f0/FF4D8F?text=News';
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
          <img src="${esc(heroImg)}" width="516" alt="" class="event-img" style="display:block;width:100%;max-width:516px;height:auto;border-bottom:1px solid #e8e0f0;">
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

function buildUnsubscribeToken(email: string): string {
  return jwt.sign({ email, purpose: 'unsubscribe' }, JWT_SECRET, { expiresIn: '90d' });
}

function buildNewsletterHtml(name: string, date: string, sectorBlocks: string, unsubscribeUrl = 'https://startupnews.fyi/unsubscribe'): string {
  const safeName = esc(name);
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

/* Light mode defaults */
.body-bg{background-color:#f4f4f5!important;}
.topbar-td{background-color:#ffffff!important;border-color:#e4e4e7!important;}
.topbar-label{color:#71717a!important;}
.view-online{color:#FF4D8F!important;}
.founder-card{background-color:#ffffff!important;border-color:#e4e4e7!important;}
.text-primary{color:#111111!important;}
.text-secondary{color:#444444!important;}
.text-muted{color:#71717a!important;}
.hero-card{background-color:#ffffff!important;border-color:#e4e4e7!important;}
.compact-card{background-color:#ffffff!important;border-color:#e4e4e7!important;}
.source-badge{color:#FF4D8F!important;background:rgba(255,77,143,0.1)!important;}
.divider-row{border-color:#e4e4e7!important;}
.adv-btn{background:#111111!important;color:#ffffff!important;}
.signoff-name{color:#FF4D8F!important;}
.footer-td{background-color:#e4e4e7!important;}
.footer-text{color:#71717a!important;}
.footer-link{color:#FF4D8F!important;}
.unsubscribe{color:#a1a1aa!important;}

/* Dark mode overrides */
@media (prefers-color-scheme: dark){
  .body-bg{background-color:#0B0A0F!important;}
  .topbar-td{background-color:#131019!important;border-color:#221C2B!important;}
  .topbar-label{color:#FF92AE!important;}
  .view-online{color:#FF4D8F!important;}
  .founder-card{background-color:#15131C!important;border-color:#2A2435!important;}
  .text-primary{color:#F2EDF7!important;}
  .text-secondary{color:#B6ACC4!important;}
  .text-muted{color:#9089A0!important;}
  .hero-card{background-color:#15131C!important;border-color:#2A2435!important;}
  .compact-card{background-color:#15131C!important;border-color:#211C29!important;}
  .source-badge{color:#FF92AE!important;background:rgba(255,77,143,0.16)!important;}
  .divider-row{border-color:#2A2435!important;}
  .adv-btn{background:#0B0A0F!important;color:#ffffff!important;}
  .signoff-name{color:#FF4D8F!important;}
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
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;">Good morning ${safeName}. Your personalised startup briefing is ready. Your sectors, your stories. &#9749;</div>
<center style="width:100%;">

<!-- TOP BAR -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td class="topbar-td" align="center" style="background:#ffffff;border-bottom:2px solid #e4e4e7;padding:18px 16px;">
    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
      <tr><td align="center" style="padding-bottom:8px;">
        <img src="https://startupnews.fyi/logo.png" alt="StartupNews.fyi" width="230" style="display:block;width:230px;height:auto;">
      </td></tr>
      <tr><td align="center" class="topbar-label" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;color:#71717a;text-transform:uppercase;font-weight:bold;">
        Morning Signal &nbsp;&middot;&nbsp; ${esc(date)} &nbsp;&middot;&nbsp; <a href="https://startupnews.fyi" class="view-online" style="color:#FF4D8F;text-decoration:underline;">View online</a>
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
          <a href="https://startupnews.fyi/advertise-with-us" class="adv-btn" style="display:inline-block;background:#1a1025;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;padding:13px 26px;border-radius:30px;">Advertise With Us &rarr;</a>
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
      <p class="signoff-name" style="margin:4px 0 0 0;font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#FF4D8F;">Madhur Mohan Malik</p>
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
          <a href="${unsubscribeUrl}" class="unsubscribe" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe</a><br>
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
    // Fetch up to 8 latest items per category from newsletter_items
    const rawItems = await query<NewsletterItem>(
      `SELECT id, title, link, image_url, description, published_at, feed_name, category_slug
       FROM newsletter_items
       ORDER BY published_at DESC, id DESC
       LIMIT 400`
    );

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

      const slugsToSend = testSlugs.length > 0
        ? testSlugs.filter(slug => itemsBySlug[slug]?.length > 0)
        : Object.keys(itemsBySlug).filter(slug => itemsBySlug[slug].length > 0);

      const sectorHtml = slugsToSend
        .map(slug => buildSectorBlock(slug, itemsBySlug[slug]))
        .join('');

      const testUnsubToken = buildUnsubscribeToken(testEmail);
      const testUnsubUrl = `https://startupnews.fyi/unsubscribe?token=${testUnsubToken}`;
      const html = buildNewsletterHtml(testName, dateStr, sectorHtml || '<p style="color:#fff;padding:20px;">No newsletter items available for your selected categories.</p>', testUnsubUrl);
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

        // Fall back to all available sectors if subscriber has no preference set
        const slugsToUse = userSlugs.length > 0
          ? userSlugs.filter(slug => itemsBySlug[slug]?.length > 0)
          : Object.keys(itemsBySlug).filter(slug => itemsBySlug[slug].length > 0);

        if (slugsToUse.length === 0) continue;

        const sectorBlocks = slugsToUse
          .map(slug => buildSectorBlock(slug, itemsBySlug[slug]))
          .join('');

        const unsubToken = buildUnsubscribeToken(r.email);
        const unsubUrl = `https://startupnews.fyi/unsubscribe?token=${unsubToken}`;
        const html = buildNewsletterHtml(r.name, dateStr, sectorBlocks, unsubUrl);

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
