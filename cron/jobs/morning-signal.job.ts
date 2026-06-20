/**
 * Morning Signal Job — builds the newsletter from live RSS + events and sends at 8 PM IST (14:30 UTC).
 */

import nodemailer from 'nodemailer';
import { createLogger } from '@/shared/utils/logger';
import { query, queryOne } from '@/shared/database/connection';
import { RssFeedsRepository } from '@/modules/rss-feeds/repository/rss-feeds.repository';
import { EventsRepository } from '@/modules/events/repository/events.repository';
import { entityToEvent } from '@/modules/events/utils/events.utils';

const log = createLogger('morning-signal');
const rssRepo = new RssFeedsRepository();
const eventsRepo = new EventsRepository();

interface Recipient { name: string; email: string; newsletter_category_slugs: string | null; }

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

function todayFormatted(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
}

function escHtml(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildEventsHtml(events: Array<{ title: string; url: string; location: string; date: string }>): string {
  if (events.length === 0) return '';

  const rows = events.map((e, i) => {
    const dayMonth = e.date.split(',')[0]?.trim() ?? e.date; // e.g. "June 17"
    const parts = dayMonth.split(' ');
    const shortDate = parts.length >= 2 ? `${parseInt(parts[1])} ${parts[0].slice(0, 3).toUpperCase()}` : dayMonth;
    const isLast = i === events.length - 1;
    return `
<a href="${escHtml(e.url)}" target="_blank" class="news-link"
   style="text-decoration:none;color:inherit;display:block;${isLast ? '' : 'padding-bottom:14px;'}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="58" style="vertical-align:top">
        <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:600;
                     letter-spacing:1px;color:#c66b92;text-transform:uppercase;">${escHtml(shortDate)}</span>
      </td>
      <td>
        <div class="txt-dark nl-title" style="font-family:Georgia,serif;font-size:15px;line-height:21px;color:#2c2820;">
          ${escHtml(e.title)}
        </div>
        <div class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#a39a87;padding-top:2px;">
          ${escHtml(e.location)}
        </div>
      </td>
    </tr>
  </table>
</a>`;
  }).join('');

  return `
<!-- ============ EVENTS NEAR YOU ============ -->
<tr>
  <td class="px" style="padding:32px 48px 0">
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.5px;color:#e6005c;">
      &#9656;&nbsp;&nbsp;Events Near You
    </div>
  </td>
</tr>
<tr>
  <td class="px" style="padding:16px 48px 0">
    ${rows}
    <div style="padding-top:14px;">
      <a href="https://startupnews.fyi/startup-events" target="_blank"
         style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:600;
                letter-spacing:1px;color:#e6005c;text-decoration:none;text-transform:uppercase;">
        See all events &rarr;
      </a>
    </div>
  </td>
</tr>`;
}

function buildBriefingCards(items: Array<{ title: string; link: string; description: string | null; image_url: string | null; feed_name: string }>): string {
  return items.map((item, i) => {
    const img = item.image_url || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&h=300&fit=crop';
    return `
${i > 0 ? `<tr><td class="px" style="padding:20px 48px 0"><div class="rule" style="border-top:1px solid #ede8dc;font-size:0;line-height:0;">&nbsp;</div></td></tr>` : ''}
<tr>
  <td class="px" style="padding:${i === 0 ? '18' : '20'}px 48px 0">
    <a href="${escHtml(item.link)}" target="_blank" class="card-link"
       style="text-decoration:none;color:inherit;display:block;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td class="stack thumb-cell" width="140" style="vertical-align:top;padding-right:20px;">
            <img src="${escHtml(img)}" width="140" height="105" alt=""
                 style="width:140px;height:105px;object-fit:cover;border-radius:2px;" />
          </td>
          <td class="stack" style="vertical-align:top;">
            <div class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;
                 font-weight:600;letter-spacing:1.5px;color:#a39a87;text-transform:uppercase;padding-bottom:6px;">
              ${escHtml(item.feed_name)}
            </div>
            <div class="txt-dark card-title" style="font-family:Georgia,serif;font-size:18px;line-height:24px;
                 font-weight:400;color:#1c1a15;">${escHtml(item.title)}</div>
            ${item.description ? `<div class="txt-body" style="font-family:Georgia,serif;font-size:13px;
                 line-height:20px;color:#6e665a;padding-top:6px;">${escHtml(item.description.slice(0, 140))}</div>` : ''}
          </td>
        </tr>
      </table>
    </a>
  </td>
</tr>`;
  }).join('');
}

function buildNewsLinks(items: Array<{ title: string; link: string; feed_name: string }>, isLast = false): string {
  return items.map((item, i) => `
<a href="${escHtml(item.link)}" target="_blank" class="news-link"
   style="text-decoration:none;color:inherit;display:block;${i < items.length - 1 || !isLast ? 'padding-bottom:14px;' : ''}">
  <div class="txt-dark nl-title" style="font-family:Georgia,serif;font-size:15px;line-height:23px;color:#2c2820;">
    <span style="font-weight:600;color:#c66b92;">${escHtml(item.feed_name)} &mdash;</span>
    ${escHtml(item.title)}
  </div>
</a>`).join('');
}

function buildHtml(params: {
  date: string;
  leadStory: { title: string; link: string; description: string; image_url: string; feed_name: string } | null;
  briefing: Array<{ title: string; link: string; description: string | null; image_url: string | null; feed_name: string }>;
  theNews: Array<{ title: string; link: string; feed_name: string }>;
  mustReads: Array<{ title: string; link: string; feed_name: string }>;
  events: Array<{ title: string; url: string; location: string; date: string }>;
  recipientName: string;
}): string {
  const { date, leadStory, briefing, theNews, mustReads, events, recipientName } = params;

  const leadHtml = leadStory ? `
<!-- ============ LEAD STORY ============ -->
<tr>
  <td class="px" style="padding:28px 48px 0">
    <a href="${escHtml(leadStory.link)}" target="_blank" class="card-link"
       style="text-decoration:none;color:inherit;display:block;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="padding-bottom:14px;">
        <tr>
          <td style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:600;
               letter-spacing:2px;color:#e6005c;text-transform:uppercase;">Lead&nbsp;Story</td>
          <td width="12" style="font-size:0;">&nbsp;</td>
          <td class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;
               letter-spacing:2px;color:#b3aa98;text-transform:uppercase;">&middot;&nbsp;&nbsp;${escHtml(leadStory.feed_name)}</td>
        </tr>
      </table>
      <img src="${escHtml(leadStory.image_url || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1040&h=540&fit=crop')}"
           width="504" height="auto" alt="" class="thumb"
           style="width:100%;max-width:504px;height:auto;border-radius:2px;" />
      <div class="txt-dark card-title hero-title"
           style="font-family:Georgia,serif;font-size:27px;line-height:34px;font-weight:400;
                  color:#1c1a15;padding-top:18px;letter-spacing:-0.3px;">
        ${escHtml(leadStory.title)}
      </div>
      <div class="txt-body" style="font-family:Georgia,serif;font-size:15px;line-height:24px;color:#5a5347;padding-top:11px;">
        ${escHtml((leadStory.description || '').slice(0, 220))}
      </div>
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:600;
           letter-spacing:1.5px;color:#e6005c;padding-top:16px;text-transform:uppercase;">
        Read on ${escHtml(leadStory.feed_name)}&nbsp;<span style="display:inline-block;">&rarr;</span>
      </div>
    </a>
  </td>
</tr>
<tr><td class="px" style="padding:30px 48px 0">
  <div class="rule" style="border-top:1px solid #e6e0d3;font-size:0;line-height:0;">&nbsp;</div>
</td></tr>` : '';

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml"
  xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>The Morning Signal</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;display:block;}
    table{border-collapse:collapse!important;}
    body{margin:0!important;padding:0!important;width:100%!important;}
    a{text-decoration:none;}
    @media screen{
      .news-link:hover .nl-title{color:#e6005c!important;}
      .card-link:hover .card-title{color:#e6005c!important;}
    }
    @media(prefers-color-scheme:dark){
      .bg-page{background:#15130f!important;}.bg-card{background:#1c1a15!important;}
      .txt-dark{color:#ede8dd!important;}.txt-body{color:#b8b0a1!important;}
      .txt-mute{color:#8e8676!important;}.rule{border-color:#2e2a23!important;}
    }
    @media only screen and (max-width:620px){
      .container{width:100%!important;}.px{padding-left:24px!important;padding-right:24px!important;}
      .stack{display:block!important;width:100%!important;}
      .thumb{width:100%!important;height:auto!important;max-width:100%!important;}
      .thumb-cell{padding-bottom:16px!important;padding-right:0!important;}
      .hero-title{font-size:26px!important;line-height:32px!important;}
      .card-title{font-size:18px!important;line-height:24px!important;}
    }
  </style>
</head>
<body class="bg-page" style="margin:0;padding:0;background-color:#f3f0e9;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f3f0e9;">
  Good morning ${recipientName} &mdash; today's briefing from StartupNews.fyi.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg-page" style="background-color:#f3f0e9;">
  <tr>
    <td align="center" style="padding:32px 12px 52px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
             class="container bg-card" style="width:600px;max-width:600px;background-color:#fcfbf7;">

        <!-- MASTHEAD -->
        <tr>
          <td class="px" style="padding:34px 48px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <img src="https://startupnews.fyi/logo.png" width="180" alt="StartupNews.fyi"
                       style="display:block;width:180px;height:auto;margin:0 auto;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="px" align="center" style="padding:24px 48px 0;">
            <div class="txt-dark" style="font-family:Georgia,'Times New Roman',serif;font-size:36px;
                 line-height:40px;font-weight:400;color:#1c1a15;letter-spacing:-0.5px;">
              The Morning <span style="color:#e6005c;">Signal</span>
            </div>
            <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:15px auto 0;">
              <tr>
                <td width="40" style="border-top:1px solid #f0b9ce;font-size:0;line-height:0;">&nbsp;</td>
                <td width="10" style="font-size:0;">&nbsp;</td>
                <td style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:9px;letter-spacing:3px;
                     color:#c66b92;text-transform:uppercase;">Startup &amp; Tech</td>
                <td width="10" style="font-size:0;">&nbsp;</td>
                <td width="40" style="border-top:1px solid #f0b9ce;font-size:0;line-height:0;">&nbsp;</td>
              </tr>
            </table>
            <div class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;
                 letter-spacing:2.5px;color:#a39a87;text-transform:uppercase;padding-top:13px;">
              ${date}
            </div>
          </td>
        </tr>

        <!-- EDITOR'S NOTE -->
        <tr>
          <td class="px" style="padding:30px 48px 0;">
            <div class="txt-dark" style="font-family:Georgia,serif;font-size:16px;font-weight:700;color:#1c1a15;padding-top:4px;">
              Good morning, ${recipientName},
            </div>
            <div class="txt-body" style="font-family:Georgia,serif;font-size:15px;line-height:24px;color:#5a5347;padding-top:10px;">
              Here is your daily briefing from the startup and tech world, curated fresh from our trusted sources.
              Stories picked before 8 PM — read what matters before the rest of the world wakes up.
            </div>
          </td>
        </tr>

        <tr>
          <td class="px" style="padding:28px 48px 0;">
            <div class="rule" style="border-top:1px solid #e6e0d3;font-size:0;line-height:0;">&nbsp;</div>
          </td>
        </tr>

        ${leadHtml}

        <!-- THE BRIEFING -->
        ${briefing.length > 0 ? `
        <tr>
          <td class="px" style="padding:24px 48px 0;">
            <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;
                 letter-spacing:0.5px;color:#e6005c;">&#9656;&nbsp;&nbsp;The Briefing</div>
          </td>
        </tr>
        ${buildBriefingCards(briefing)}` : ''}

        <!-- THE NEWS -->
        ${theNews.length > 0 ? `
        <tr>
          <td class="px" style="padding:32px 48px 0;">
            <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;
                 letter-spacing:0.5px;color:#e6005c;">&#9656;&nbsp;&nbsp;The News</div>
          </td>
        </tr>
        <tr>
          <td class="px" style="padding:16px 48px 0;">
            ${buildNewsLinks(theNews)}
          </td>
        </tr>` : ''}

        <!-- MUST READS -->
        ${mustReads.length > 0 ? `
        <tr>
          <td class="px" style="padding:30px 48px 0;">
            <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;
                 letter-spacing:0.5px;color:#e6005c;">&#9656;&nbsp;&nbsp;Must Reads</div>
          </td>
        </tr>
        <tr>
          <td class="px" style="padding:16px 48px 0;">
            ${buildNewsLinks(mustReads, true)}
          </td>
        </tr>` : ''}

        ${buildEventsHtml(events)}

        <!-- ADVERTISE -->
        <tr>
          <td class="px" align="center" style="padding:30px 48px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background-color:#faf7f0;border-top:1px solid #ede8dc;border-bottom:1px solid #ede8dc;">
              <tr>
                <td align="center" style="padding:16px 20px;">
                  <span class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;
                       line-height:18px;color:#8a8170;">Reach 10M+ founders &amp; investors across 24 countries.&nbsp;</span>
                  <a href="https://startupnews.fyi/advertise-with-us" target="_blank"
                     style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:600;
                            color:#e6005c;text-decoration:none;">Advertise with us&nbsp;&rarr;</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td class="px" align="center" style="padding:42px 48px 44px;">
            <div class="rule" style="border-top:1px solid #e6e0d3;font-size:0;line-height:0;margin-bottom:22px;">&nbsp;</div>
            <img src="https://startupnews.fyi/logo.png" width="180" alt="StartupNews.fyi"
                 style="display:block;width:180px;height:auto;margin:0 auto;" />
            <div class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;
                 line-height:18px;color:#9a917e;padding-top:10px;">
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
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export class MorningSignalJob {
  async execute(): Promise<{ sent: number; total: number; errors: number }> {
    log.info('Morning Signal job started');

    // 1. Fetch all newsletter RSS items (with category_slug) and upcoming events in parallel
    const [allItems, eventEntities, recipients] = await Promise.all([
      rssRepo.findNewsletterItems(100),
      eventsRepo.findAll({ status: 'upcoming', limit: 5 }),
      query<Recipient>(
        'SELECT name, email, newsletter_category_slugs FROM public_registrations WHERE is_active = 1'
      ),
    ]);

    // 2. Refresh newsletter_items snapshot — delete old, insert current top items
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

    if (recipients.length === 0) {
      log.info('Morning Signal: no active recipients, skipping');
      return { sent: 0, total: 0, errors: 0 };
    }

    const events = eventEntities.map((e) => {
      const ev = entityToEvent(e);
      return { title: ev.title, url: ev.url, location: ev.location, date: ev.date };
    });

    // 2. Build SMTP once
    const fromSetting = await getSetting('nl_smtp_from') || process.env.SMTP_FROM || '';
    const transporter = await buildTransporter();
    const date = todayFormatted();
    const subject = `The Morning Signal — ${date}`;

    let sent = 0;
    let errors = 0;

    for (const r of recipients) {
      try {
        // Filter RSS items to only the categories this user opted into.
        // If a user has no preferences set, send all newsletter items.
        const userSlugs = r.newsletter_category_slugs
          ? r.newsletter_category_slugs.split(',').map((s) => s.trim()).filter(Boolean)
          : [];

        const userItems = userSlugs.length === 0
          ? allItems
          : allItems.filter((item) => item.category_slug && userSlugs.includes(item.category_slug));

        // Fallback: if no items matched their categories, send all items so inbox isn't empty
        const items = userItems.length >= 4 ? userItems : allItems;

        const leadRaw     = items[0]  ?? null;
        const briefingRaw = items.slice(1, 4);
        const theNewsRaw  = items.slice(4, 7);
        const mustReadsRaw = items.slice(7, 11);

        const leadStory = leadRaw ? {
          title: leadRaw.title,
          link: leadRaw.link,
          description: leadRaw.description ?? '',
          image_url: leadRaw.image_url ?? '',
          feed_name: leadRaw.feed_name,
        } : null;

        const html = buildHtml({
          date,
          leadStory,
          briefing: briefingRaw,
          theNews: theNewsRaw,
          mustReads: mustReadsRaw,
          events,
          recipientName: r.name || 'there',
        });

        await transporter.sendMail({ from: fromSetting, to: r.email, subject, html });
        sent++;
      } catch (err) {
        errors++;
        log.error('Failed to send to recipient', { email: r.email, err });
      }
    }

    log.info('Morning Signal job completed', { sent, total: recipients.length, errors });
    return { sent, total: recipients.length, errors };
  }
}
