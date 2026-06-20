/**
 * One-shot: send Morning Signal to a single test address.
 * Usage: npx tsx scripts/send-test-newsletter.ts <email>
 */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { getDbConnection, closeDbConnection } from '@/shared/database/connection';
import { getRedisClient, closeRedisClient } from '@/shared/cache/redis.client';
import { MorningSignalJob } from '../cron/jobs/morning-signal.job';

// Patch: override recipients to only the test address
const testEmail = process.argv[2] || 'adityarana206@gmail.com';
const testName  = process.argv[3] || 'Aditya';

// Temporarily monkey-patch query so only test recipient is returned for the recipient SELECT
import { query as originalQuery } from '@/shared/database/connection';

// We'll just call the job but intercept at the DB level — simpler to just duplicate the send logic inline.
// So let's do it directly:

import nodemailer from 'nodemailer';
import { queryOne, query } from '@/shared/database/connection';
import { RssFeedsRepository } from '@/modules/rss-feeds/repository/rss-feeds.repository';
import { EventsRepository } from '@/modules/events/repository/events.repository';
import { entityToEvent } from '@/modules/events/utils/events.utils';

async function getSetting(key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>('SELECT value FROM site_settings WHERE `key` = ?', [key]);
  return row?.value ?? null;
}

async function main() {
  await getDbConnection();
  await getRedisClient();

  const rssRepo = new RssFeedsRepository();
  const eventsRepo = new EventsRepository();

  const [allItems, eventEntities] = await Promise.all([
    rssRepo.findNewsletterItems(100),
    eventsRepo.findAll({ status: 'upcoming', limit: 5 }),
  ]);

  const events = eventEntities.map((e) => {
    const ev = entityToEvent(e);
    return { title: ev.title, url: ev.url, location: ev.location, date: ev.date };
  });

  // No category filter for test — send all
  const items = allItems;
  const leadRaw      = items[0]  ?? null;
  const briefingRaw  = items.slice(1, 4);
  const theNewsRaw   = items.slice(4, 7);
  const mustReadsRaw = items.slice(7, 11);

  function escHtml(s: string | null | undefined): string {
    return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function todayFormatted(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
    });
  }

  // Import buildHtml indirectly — re-use the job
  // Actually easier: just instantiate the job but override recipients
  // Re-use logic from MorningSignalJob by calling internal build via a small workaround:
  // We'll just send via the existing send API route logic duplicated here.

  const host   = await getSetting('nl_smtp_host')   || process.env.SMTP_HOST   || '';
  const port   = await getSetting('nl_smtp_port')   || process.env.SMTP_PORT   || '465';
  const secure = await getSetting('nl_smtp_secure') || process.env.SMTP_SECURE || 'true';
  const user   = await getSetting('nl_smtp_user')   || process.env.SMTP_USER   || '';
  const pass   = await getSetting('nl_smtp_pass')   || process.env.SMTP_PASS   || '';
  const from   = await getSetting('nl_smtp_from')   || process.env.SMTP_FROM   || '';

  if (!host || !user || !pass) {
    console.error('SMTP not configured');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host, port: Number(port), secure: secure === 'true', auth: { user, pass },
  });

  const date = todayFormatted();

  // Inline minimal HTML builder (mirrors morning-signal.job.ts sections)
  function buildEventsSection(evs: typeof events): string {
    if (!evs.length) return '';
    const rows = evs.map((e, i) => {
      const parts = e.date.split(' ');
      const short = parts.length >= 2 ? `${parseInt(parts[1] ?? '0')} ${(parts[0] ?? '').slice(0,3).toUpperCase()}` : e.date;
      return `<a href="${escHtml(e.url)}" target="_blank" style="text-decoration:none;color:inherit;display:block;${i < evs.length-1 ? 'padding-bottom:14px;' : ''}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="58" style="vertical-align:top"><span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:1px;color:#c66b92;text-transform:uppercase;">${escHtml(short)}</span></td>
          <td><div style="font-family:Georgia,serif;font-size:15px;line-height:21px;color:#2c2820;">${escHtml(e.title)}</div>
              <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#a39a87;padding-top:2px;">${escHtml(e.location)}</div></td>
        </tr></table></a>`;
    }).join('');
    return `<tr><td style="padding:32px 48px 0;"><div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.5px;color:#e6005c;">&#9656;&nbsp;&nbsp;Events Near You</div></td></tr>
<tr><td style="padding:16px 48px 0;">${rows}<div style="padding-top:14px;"><a href="https://startupnews.fyi/startup-events" target="_blank" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;color:#e6005c;text-decoration:none;text-transform:uppercase;">See all events &rarr;</a></div></td></tr>`;
  }

  function buildNewsLinks(its: typeof theNewsRaw): string {
    return its.map((item) => `<a href="${escHtml(item.link)}" target="_blank" style="text-decoration:none;color:inherit;display:block;padding-bottom:14px;">
      <div style="font-family:Georgia,serif;font-size:15px;line-height:23px;color:#2c2820;">
        <span style="font-weight:600;color:#c66b92;">${escHtml(item.feed_name)} &mdash;</span> ${escHtml(item.title)}
      </div></a>`).join('');
  }

  function buildBriefing(its: typeof briefingRaw): string {
    return its.map((item, i) => {
      const img = item.image_url || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&h=300&fit=crop';
      return `${i > 0 ? `<tr><td style="padding:20px 48px 0;"><div style="border-top:1px solid #ede8dc;font-size:0;line-height:0;">&nbsp;</div></td></tr>` : ''}
<tr><td style="padding:${i===0?'18':'20'}px 48px 0;">
  <a href="${escHtml(item.link)}" target="_blank" style="text-decoration:none;color:inherit;display:block;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="140" style="vertical-align:top;padding-right:20px;">
        <img src="${escHtml(img)}" width="140" height="105" alt="" style="width:140px;height:105px;object-fit:cover;border-radius:2px;"/>
      </td>
      <td style="vertical-align:top;">
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:1.5px;color:#a39a87;text-transform:uppercase;padding-bottom:6px;">${escHtml(item.feed_name)}</div>
        <div style="font-family:Georgia,serif;font-size:18px;line-height:24px;color:#1c1a15;">${escHtml(item.title)}</div>
        ${item.description ? `<div style="font-family:Georgia,serif;font-size:13px;line-height:20px;color:#6e665a;padding-top:6px;">${escHtml(item.description.slice(0,140))}</div>` : ''}
      </td>
    </tr></table>
  </a>
</td></tr>`;
    }).join('');
  }

  const leadHtml = leadRaw ? `
<tr><td style="padding:28px 48px 0;">
  <a href="${escHtml(leadRaw.link)}" target="_blank" style="text-decoration:none;color:inherit;display:block;">
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:2px;color:#e6005c;text-transform:uppercase;padding-bottom:14px;">Lead&nbsp;Story &middot; <span style="color:#b3aa98;">${escHtml(leadRaw.feed_name)}</span></div>
    <img src="${escHtml(leadRaw.image_url || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1040&h=540&fit=crop')}"
         width="504" height="auto" alt="" style="width:100%;max-width:504px;height:auto;border-radius:2px;"/>
    <div style="font-family:Georgia,serif;font-size:27px;line-height:34px;font-weight:400;color:#1c1a15;padding-top:18px;">${escHtml(leadRaw.title)}</div>
    ${leadRaw.description ? `<div style="font-family:Georgia,serif;font-size:15px;line-height:24px;color:#5a5347;padding-top:11px;">${escHtml(leadRaw.description.slice(0,220))}</div>` : ''}
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:1.5px;color:#e6005c;padding-top:16px;text-transform:uppercase;">Read on ${escHtml(leadRaw.feed_name)} &rarr;</div>
  </a>
</td></tr>
<tr><td style="padding:30px 48px 0;"><div style="border-top:1px solid #e6e0d3;font-size:0;line-height:0;">&nbsp;</div></td></tr>` : '';

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>The Morning Signal</title>
<style>body,table,td,a{-webkit-text-size-adjust:100%;}table{border-collapse:collapse!important;}body{margin:0!important;padding:0!important;}a{text-decoration:none;}
@media only screen and (max-width:620px){.container{width:100%!important;}.px{padding-left:24px!important;padding-right:24px!important;}}
</style></head>
<body style="margin:0;padding:0;background-color:#f3f0e9;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f3f0e9;">Good morning ${testName} — today's briefing from StartupNews.fyi.&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f0e9;">
<tr><td align="center" style="padding:32px 12px 52px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" class="container" style="width:600px;max-width:600px;background-color:#fcfbf7;">

<tr><td style="padding:34px 48px 0;" align="center">
  <img src="https://startupnews.fyi/logo.png" width="180" alt="StartupNews.fyi" style="display:block;width:180px;height:auto;margin:0 auto;"/>
</td></tr>

<tr><td align="center" style="padding:24px 48px 0;">
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:40px;font-weight:400;color:#1c1a15;letter-spacing:-0.5px;">
    The Morning <span style="color:#e6005c;">Signal</span></div>
  <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;letter-spacing:2.5px;color:#a39a87;text-transform:uppercase;padding-top:13px;">${date}</div>
</td></tr>

<tr><td style="padding:30px 48px 0;">
  <div style="font-family:Georgia,serif;font-size:16px;font-weight:700;color:#1c1a15;">Good morning, ${testName},</div>
  <div style="font-family:Georgia,serif;font-size:15px;line-height:24px;color:#5a5347;padding-top:10px;">
    Here is your daily briefing from the startup and tech world, curated fresh from our trusted sources.
  </div>
</td></tr>
<tr><td style="padding:28px 48px 0;"><div style="border-top:1px solid #e6e0d3;font-size:0;line-height:0;">&nbsp;</div></td></tr>

${leadHtml}

${briefingRaw.length > 0 ? `<tr><td style="padding:24px 48px 0;"><div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.5px;color:#e6005c;">&#9656;&nbsp;&nbsp;The Briefing</div></td></tr>${buildBriefing(briefingRaw)}` : ''}

${theNewsRaw.length > 0 ? `<tr><td style="padding:32px 48px 0;"><div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.5px;color:#e6005c;">&#9656;&nbsp;&nbsp;The News</div></td></tr>
<tr><td style="padding:16px 48px 0;">${buildNewsLinks(theNewsRaw)}</td></tr>` : ''}

${mustReadsRaw.length > 0 ? `<tr><td style="padding:30px 48px 0;"><div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.5px;color:#e6005c;">&#9656;&nbsp;&nbsp;Must Reads</div></td></tr>
<tr><td style="padding:16px 48px 0;">${buildNewsLinks(mustReadsRaw)}</td></tr>` : ''}

${buildEventsSection(events)}

<tr><td align="center" style="padding:30px 48px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf7f0;border-top:1px solid #ede8dc;border-bottom:1px solid #ede8dc;">
    <tr><td align="center" style="padding:16px 20px;">
      <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#8a8170;">Reach 10M+ founders &amp; investors across 24 countries.&nbsp;</span>
      <a href="https://startupnews.fyi/advertise-with-us" target="_blank" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:600;color:#e6005c;text-decoration:none;">Advertise with us &rarr;</a>
    </td></tr>
  </table>
</td></tr>

<tr><td align="center" style="padding:42px 48px 44px;">
  <div style="border-top:1px solid #e6e0d3;font-size:0;line-height:0;margin-bottom:22px;">&nbsp;</div>
  <img src="https://startupnews.fyi/logo.png" width="180" alt="StartupNews.fyi" style="display:block;width:180px;height:auto;margin:0 auto;"/>
  <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;line-height:18px;color:#9a917e;padding-top:10px;">
    The Morning Signal &middot; curated from 250+ global media partners.<br/>
    Headlines and images link to original publishers; all rights remain theirs.
  </div>
  <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;padding-top:16px;">
    <a href="https://startupnews.fyi/dashboard/settings" style="color:#8a8170;text-decoration:underline;">Preferences</a>
    &nbsp;&middot;&nbsp;
    <a href="https://startupnews.fyi" style="color:#8a8170;text-decoration:underline;">View in browser</a>
    &nbsp;&middot;&nbsp;
    <a href="https://startupnews.fyi/unsubscribe" style="color:#8a8170;text-decoration:underline;">Unsubscribe</a>
  </div>
</td></tr>

</table></td></tr></table>
</body></html>`;

  console.log(`Sending Morning Signal to ${testEmail}...`);
  await transporter.sendMail({
    from,
    to: testEmail,
    subject: `[TEST] The Morning Signal — ${date}`,
    html,
  });

  console.log(`✓ Sent to ${testEmail}`);
  await closeDbConnection();
  await closeRedisClient();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
