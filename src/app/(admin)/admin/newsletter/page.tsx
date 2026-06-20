'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuthHeaders } from '@/lib/admin-auth';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';

/* ─── Types ──────────────────────────────────────────────── */
interface NewsletterFeed { id: number; name: string; url: string; logo_url: string | null; enabled: number; last_fetched_at: string | null; }
interface NewsletterItem { id: number; rss_feed_id: number; feed_name: string; feed_url: string; feed_logo_url: string | null; title: string; link: string; image_url: string | null; description: string | null; published_at: string | null; }
interface NLCategory { id: number; name: string; slug: string; color: string; }
interface MailConfig { host: string; port: string; secure: string; user: string; pass: string; from: string; source: 'db' | 'env'; }

type Tab = 'overview' | 'mail-config' | 'compose';

/* ─── Shared input style ──────────────────────────────────── */
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 13px', border: '1px solid #e2e8f0',
  borderRadius: 8, fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box',
};

export default function NewsletterPage() {
  const [tab, setTab] = useState<Tab>('overview');

  /* ── Overview state ── */
  const [feeds, setFeeds] = useState<NewsletterFeed[]>([]);
  const [items, setItems] = useState<NewsletterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [overviewError, setOverviewError] = useState('');

  /* ── Mail Config state ── */
  const [config, setConfig] = useState<MailConfig>({ host: '', port: '465', secure: 'true', user: '', pass: '', from: '' , source: 'env' });
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState('');
  const [configError, setConfigError] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testMsg, setTestMsg] = useState('');

  /* ── Compose state ── */
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [recipientMode, setRecipientMode] = useState<'subscribers' | 'custom'>('subscribers');
  const [recipientFilter, setRecipientFilter] = useState<'all' | string[]>('all');
  const [customEmailsText, setCustomEmailsText] = useState('');
  const [customEmailsFile, setCustomEmailsFile] = useState<File | null>(null);
  const [nlCategories, setNlCategories] = useState<NLCategory[]>([]);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; total: number; errors: string[] } | null>(null);
  const [sendError, setSendError] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  /* ── Scheduler state ── */
  type SendMode = 'now' | 'schedule';
  const [sendMode, setSendMode] = useState<SendMode>('now');
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<{ id: number; scheduled_at: string } | null>(null);
  const [scheduleError, setScheduleError] = useState('');

  interface ScheduleRow { id: number; subject: string; recipient_filter: string; scheduled_at: string; status: string; sent_count: number; total_count: number; created_at: string; sent_at: string | null; }
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  /* ── Load overview ── */
  const loadOverview = useCallback(async () => {
    setOverviewError('');
    try {
      const res = await fetch('/api/admin/newsletter', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) { setFeeds(data.data.newsletterFeeds); setItems(data.data.items); }
      else setOverviewError(data.error || 'Failed to load');
    } catch { setOverviewError('Failed to load newsletter data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  /* ── Load mail config when tab changes ── */
  useEffect(() => {
    if (tab !== 'mail-config') return;
    setConfigLoading(true);
    fetch('/api/admin/newsletter/mail-config', { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setConfig(d.data); })
      .catch(() => {})
      .finally(() => setConfigLoading(false));
  }, [tab]);

  /* ── Load categories + recipient count + schedules for compose ── */
  const loadSchedules = useCallback(async () => {
    setSchedulesLoading(true);
    fetch('/api/admin/newsletter/schedule', { headers: getAuthHeaders() })
      .then(r => r.json()).then(d => { if (d.success) setSchedules(d.data); })
      .catch(() => {}).finally(() => setSchedulesLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'compose') return;
    fetch('/api/newsletter/categories').then(r => r.json()).then(d => { if (d.success) setNlCategories(d.data); });
    loadSchedules();
  }, [tab, loadSchedules]);

  useEffect(() => {
    if (tab !== 'compose' || recipientMode !== 'subscribers') return;
    const filter = Array.isArray(recipientFilter) ? recipientFilter.join(',') : 'all';
    fetch(`/api/admin/newsletter/send?filter=${filter}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setRecipientCount(d.count); });
  }, [tab, recipientFilter, recipientMode]);

  /* ── Overview: delete all ── */
  const handleDeleteAll = async () => {
    if (!confirm('Delete all articles from newsletter feeds? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/newsletter', { method: 'DELETE', headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setItems([]);
      else setOverviewError(data.error || 'Delete failed');
    } catch { setOverviewError('Delete request failed'); }
    finally { setDeleting(false); }
  };

  /* ── Mail Config: save ── */
  const handleSaveConfig = async () => {
    setConfigError(''); setConfigMsg(''); setConfigSaving(true);
    try {
      const res = await fetch('/api/admin/newsletter/mail-config', {
        method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const d = await res.json();
      if (d.success) { setConfigMsg('SMTP configuration saved.'); setTimeout(() => setConfigMsg(''), 4000); }
      else setConfigError(d.error || 'Save failed');
    } catch { setConfigError('Save request failed'); }
    finally { setConfigSaving(false); }
  };

  /* ── Mail Config: test ── */
  const handleTestMail = async () => {
    if (!testEmail.trim()) { setTestMsg('Enter a test email address.'); return; }
    setTestMsg(''); setTestSending(true);
    try {
      const res = await fetch('/api/admin/newsletter/send', {
        method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'Test Email from StartupNews', html: '<p>This is a test email from your newsletter SMTP configuration.</p>', recipientFilter: 'all', testEmail: testEmail.trim() }),
      });
      const d = await res.json();
      setTestMsg(d.success ? `✓ Test email sent to ${testEmail}` : `✗ ${d.error}`);
    } catch { setTestMsg('✗ Send failed'); }
    finally { setTestSending(false); }
  };

  /* ── Default template ── */
  const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>The Morning Signal</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; display:block; }
    table { border-collapse:collapse !important; }
    body { margin:0 !important; padding:0 !important; width:100% !important; }
    a { text-decoration:none; }
    @media screen {
      .news-link:hover .nl-title { color:#E6005C !important; }
      .card-link:hover .card-title { color:#E6005C !important; }
      .card-link:hover .read-arrow { transform:translateX(3px); }
      .read-arrow { transition:transform .25s ease; }
    }
    @media (prefers-color-scheme: dark) {
      .bg-page  { background:#15130F !important; }
      .bg-card  { background:#1C1A15 !important; }
      .bg-tint  { background:#241A1E !important; }
      .txt-dark { color:#EDE8DD !important; }
      .txt-body { color:#B8B0A1 !important; }
      .txt-mute { color:#8E8676 !important; }
      .rule     { border-color:#2E2A23 !important; }
      .rule-h   { border-color:#46402F !important; }
    }
    @media only screen and (max-width:620px) {
      .container { width:100% !important; }
      .px        { padding-left:24px !important; padding-right:24px !important; }
      .stack     { display:block !important; width:100% !important; }
      .thumb     { width:100% !important; height:auto !important; max-width:100% !important; }
      .thumb-cell{ padding-bottom:16px !important; padding-right:0 !important; }
      .hero-title{ font-size:26px !important; line-height:32px !important; }
      .card-title{ font-size:18px !important; line-height:24px !important; }
    }
  </style>
</head>
<body class="bg-page" style="margin:0; padding:0; background-color:#F3F0E9;">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#F3F0E9;">
    Good morning &mdash; today in FinTech &amp; AI, gathered from the world's best desks. &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg-page" style="background-color:#F3F0E9;">
    <tr>
      <td align="center" style="padding:32px 12px 52px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="container bg-card" style="width:600px; max-width:600px; background-color:#FCFBF7;">

          <!-- MASTHEAD -->
          <tr>
            <td class="px" style="padding:34px 48px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td align="left" style="vertical-align:middle;">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td style="vertical-align:middle;">
                      <span style="display:inline-block; width:18px; height:18px; vertical-align:middle;">
                        <img src="https://startupnews.fyi/logo.png" width="18" height="18" alt="StartupNews.fyi" style="display:block; width:18px; height:18px; object-fit:contain;">
                      </span>
                    </td>
                    <td width="7" style="font-size:0;">&nbsp;</td>
                    <td style="vertical-align:middle;">
                      <span style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:12px; font-weight:700; letter-spacing:.5px; color:#E6005C;">StartupNews</span><span style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:12px; font-weight:700; letter-spacing:.5px; color:#1C1A15;">.fyi</span>
                    </td>
                  </tr></table>
                </td>
                <td align="right" class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; letter-spacing:2.5px; color:#A39A87; text-transform:uppercase; vertical-align:middle;">The Morning Signal</td>
              </tr></table>
            </td>
          </tr>

          <tr>
            <td class="px" align="center" style="padding:24px 48px 0;">
              <div class="txt-dark" style="font-family:Georgia,'Times New Roman',serif; font-size:36px; line-height:40px; font-weight:400; color:#1C1A15; letter-spacing:-0.5px;">The Morning <span style="color:#E6005C;">Signal</span></div>
              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:15px auto 0;"><tr>
                <td width="40" style="border-top:1px solid #F0B9CE; font-size:0; line-height:0;">&nbsp;</td>
                <td width="10" style="font-size:0; line-height:0;">&nbsp;</td>
                <td style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:9px; letter-spacing:3px; color:#C66B92; text-transform:uppercase;">Startup &amp; Tech</td>
                <td width="10" style="font-size:0; line-height:0;">&nbsp;</td>
                <td width="40" style="border-top:1px solid #F0B9CE; font-size:0; line-height:0;">&nbsp;</td>
              </tr></table>
              <div class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; letter-spacing:2.5px; color:#A39A87; text-transform:uppercase; padding-top:13px;">{{date}}</div>
            </td>
          </tr>

          <!-- EDITOR'S NOTE -->
          <tr>
            <td class="px" style="padding:30px 48px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="padding-bottom:14px;"><tr>
                <td width="34" style="vertical-align:middle;">
                  <div style="width:34px; height:34px; border-radius:50%; background:#FBE3ED; text-align:center; line-height:34px; font-family:Georgia,serif; font-size:15px; color:#E6005C;">M</div>
                </td>
                <td width="12" style="font-size:0;">&nbsp;</td>
                <td style="vertical-align:middle;">
                  <div class="txt-dark" style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:12px; font-weight:600; color:#2C2820; letter-spacing:.3px;">From the desk of Madhur Malik</div>
                  <div class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:11px; color:#A39A87;">Editor, StartupNews.fyi</div>
                </td>
              </tr></table>
              <div class="txt-dark" style="font-family:Georgia,serif; font-size:16px; font-weight:700; color:#1C1A15; padding-top:4px;">Good morning, {{name}}</div>
              <div class="txt-body" style="font-family:Georgia,serif; font-size:15px; line-height:24px; color:#5A5347; padding-top:10px;">
                [Write your editor's note here — set the tone for the week in 2–3 sentences.]
              </div>
            </td>
          </tr>

          <tr><td class="px" style="padding:28px 48px 0;"><div class="rule" style="border-top:1px solid #E6E0D3; font-size:0; line-height:0;">&nbsp;</div></td></tr>

          <!-- LEAD STORY -->
          <tr>
            <td class="px" style="padding:28px 48px 0;">
              <a href="LEAD_STORY_URL" target="_blank" class="card-link" style="text-decoration:none; color:inherit; display:block;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="padding-bottom:14px;"><tr>
                  <td style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; font-weight:600; letter-spacing:2px; color:#E6005C; text-transform:uppercase;">Lead&nbsp;Story</td>
                  <td width="12" style="font-size:0;">&nbsp;</td>
                  <td class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; letter-spacing:2px; color:#B3AA98; text-transform:uppercase;">&middot;&nbsp;&nbsp;Source Name</td>
                </tr></table>
                <img src="LEAD_STORY_IMAGE_URL" width="504" height="auto" alt="" class="thumb" style="width:100%; max-width:504px; height:auto; border-radius:2px;">
                <div class="txt-dark card-title hero-title" style="font-family:Georgia,serif; font-size:27px; line-height:34px; font-weight:400; color:#1C1A15; padding-top:18px; letter-spacing:-0.3px;">Lead Story Headline Goes Here</div>
                <div class="txt-body" style="font-family:Georgia,serif; font-size:15px; line-height:24px; color:#5A5347; padding-top:11px;">A short 1–2 sentence description of the lead story. Keep it punchy and informative.</div>
                <div style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.5px; color:#E6005C; padding-top:16px; text-transform:uppercase;">Read more&nbsp;<span class="read-arrow" style="display:inline-block;">&rarr;</span></div>
              </a>
            </td>
          </tr>

          <tr><td class="px" style="padding:30px 48px 0;"><div class="rule" style="border-top:1px solid #E6E0D3; font-size:0; line-height:0;">&nbsp;</div></td></tr>

          <!-- THE BRIEFING -->
          <tr><td class="px" style="padding:24px 48px 0;">
            <div style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:13px; font-weight:700; letter-spacing:.5px; color:#E6005C;">&#9656;&nbsp;&nbsp;The Briefing</div>
          </td></tr>

          <tr><td class="px" style="padding:18px 48px 0;"><a href="STORY_2_URL" target="_blank" class="card-link" style="text-decoration:none; color:inherit; display:block;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td class="stack thumb-cell" width="140" style="vertical-align:top; padding-right:20px;"><img src="STORY_2_IMAGE_URL" width="140" height="105" alt="" class="thumb" style="width:140px; height:105px; object-fit:cover; border-radius:2px;"></td>
            <td class="stack" style="vertical-align:top;"><div class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; font-weight:600; letter-spacing:1.5px; color:#A39A87; text-transform:uppercase; padding-bottom:6px;">Source Name</div><div class="txt-dark card-title" style="font-family:Georgia,serif; font-size:18px; line-height:24px; font-weight:400; color:#1C1A15;">Story 2 headline goes here</div><div class="txt-body" style="font-family:Georgia,serif; font-size:13px; line-height:20px; color:#6E665A; padding-top:6px;">Short description — one sentence.</div></td>
          </tr></table></a></td></tr>
          <tr><td class="px" style="padding:20px 48px 0;"><div class="rule" style="border-top:1px solid #EDE8DC; font-size:0; line-height:0;">&nbsp;</div></td></tr>

          <tr><td class="px" style="padding:20px 48px 0;"><a href="STORY_3_URL" target="_blank" class="card-link" style="text-decoration:none; color:inherit; display:block;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td class="stack thumb-cell" width="140" style="vertical-align:top; padding-right:20px;"><img src="STORY_3_IMAGE_URL" width="140" height="105" alt="" class="thumb" style="width:140px; height:105px; object-fit:cover; border-radius:2px;"></td>
            <td class="stack" style="vertical-align:top;"><div class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; font-weight:600; letter-spacing:1.5px; color:#A39A87; text-transform:uppercase; padding-bottom:6px;">Source Name</div><div class="txt-dark card-title" style="font-family:Georgia,serif; font-size:18px; line-height:24px; font-weight:400; color:#1C1A15;">Story 3 headline goes here</div><div class="txt-body" style="font-family:Georgia,serif; font-size:13px; line-height:20px; color:#6E665A; padding-top:6px;">Short description — one sentence.</div></td>
          </tr></table></a></td></tr>
          <tr><td class="px" style="padding:20px 48px 0;"><div class="rule" style="border-top:1px solid #EDE8DC; font-size:0; line-height:0;">&nbsp;</div></td></tr>

          <tr><td class="px" style="padding:20px 48px 0;"><a href="STORY_4_URL" target="_blank" class="card-link" style="text-decoration:none; color:inherit; display:block;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td class="stack thumb-cell" width="140" style="vertical-align:top; padding-right:20px;"><img src="STORY_4_IMAGE_URL" width="140" height="105" alt="" class="thumb" style="width:140px; height:105px; object-fit:cover; border-radius:2px;"></td>
            <td class="stack" style="vertical-align:top;"><div class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; font-weight:600; letter-spacing:1.5px; color:#A39A87; text-transform:uppercase; padding-bottom:6px;">Source Name</div><div class="txt-dark card-title" style="font-family:Georgia,serif; font-size:18px; line-height:24px; font-weight:400; color:#1C1A15;">Story 4 headline goes here</div><div class="txt-body" style="font-family:Georgia,serif; font-size:13px; line-height:20px; color:#6E665A; padding-top:6px;">Short description — one sentence.</div></td>
          </tr></table></a></td></tr>

          <!-- SIGNAL TALKS (event block) -->
          <tr><td class="px" style="padding:30px 48px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg-tint" style="background-color:#FCF0F5; border-radius:4px;"><tr><td style="padding:22px 24px;">
              <div style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:11px; font-weight:700; letter-spacing:1.5px; color:#E6005C; text-transform:uppercase; padding-bottom:8px;">Signal Talks</div>
              <div class="txt-dark" style="font-family:Georgia,serif; font-size:18px; line-height:24px; font-weight:400; color:#1C1A15;">[Event title goes here]</div>
              <div class="txt-body" style="font-family:Georgia,serif; font-size:13px; line-height:20px; color:#6E665A; padding-top:8px;">[Event description — date, speakers, topic]</div>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr><td style="background-color:#E6005C;"><a href="EVENT_URL" target="_blank" style="display:inline-block; padding:10px 24px; font-family:'Helvetica Neue',Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.5px; color:#FFFFFF; text-decoration:none; text-transform:uppercase;">Save your spot</a></td></tr></table>
            </td></tr></table>
          </td></tr>

          <!-- THE NEWS -->
          <tr><td class="px" style="padding:32px 48px 0;">
            <div style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:13px; font-weight:700; letter-spacing:.5px; color:#E6005C;">&#9656;&nbsp;&nbsp;The News</div>
          </td></tr>
          <tr><td class="px" style="padding:16px 48px 0;">
            <a href="NEWS_1_URL" target="_blank" class="news-link" style="text-decoration:none; color:inherit; display:block; padding-bottom:14px;"><div class="txt-dark nl-title" style="font-family:Georgia,serif; font-size:15px; line-height:23px; color:#2C2820;"><span style="font-weight:600; color:#C66B92;">Source &mdash;</span> News headline one goes here.</div></a>
            <a href="NEWS_2_URL" target="_blank" class="news-link" style="text-decoration:none; color:inherit; display:block; padding-bottom:14px;"><div class="txt-dark nl-title" style="font-family:Georgia,serif; font-size:15px; line-height:23px; color:#2C2820;"><span style="font-weight:600; color:#C66B92;">Source &mdash;</span> News headline two goes here.</div></a>
            <a href="NEWS_3_URL" target="_blank" class="news-link" style="text-decoration:none; color:inherit; display:block;"><div class="txt-dark nl-title" style="font-family:Georgia,serif; font-size:15px; line-height:23px; color:#2C2820;"><span style="font-weight:600; color:#C66B92;">Source &mdash;</span> News headline three goes here.</div></a>
          </td></tr>

          <!-- MUST READS -->
          <tr><td class="px" style="padding:30px 48px 0;">
            <div style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:13px; font-weight:700; letter-spacing:.5px; color:#E6005C;">&#9656;&nbsp;&nbsp;Must Reads</div>
          </td></tr>
          <tr><td class="px" style="padding:16px 48px 0;">
            <a href="READ_1_URL" target="_blank" class="news-link" style="text-decoration:none; color:inherit; display:block; padding-bottom:14px;"><div class="txt-dark nl-title" style="font-family:Georgia,serif; font-size:15px; line-height:23px; color:#2C2820;"><span style="font-weight:600; color:#C66B92;">Source &mdash;</span> Must-read headline one.</div></a>
            <a href="READ_2_URL" target="_blank" class="news-link" style="text-decoration:none; color:inherit; display:block; padding-bottom:14px;"><div class="txt-dark nl-title" style="font-family:Georgia,serif; font-size:15px; line-height:23px; color:#2C2820;"><span style="font-weight:600; color:#C66B92;">Source &mdash;</span> Must-read headline two.</div></a>
            <a href="READ_3_URL" target="_blank" class="news-link" style="text-decoration:none; color:inherit; display:block;"><div class="txt-dark nl-title" style="font-family:Georgia,serif; font-size:15px; line-height:23px; color:#2C2820;"><span style="font-weight:600; color:#C66B92;">Source &mdash;</span> Must-read headline three.</div></a>
          </td></tr>

          <!-- EVENTS NEAR YOU -->
          <tr><td class="px" style="padding:32px 48px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:13px; font-weight:700; letter-spacing:.5px; color:#E6005C;">&#9656;&nbsp;&nbsp;Events Near You</td>
              <td align="right" style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; letter-spacing:1.5px; color:#A39A87; text-transform:uppercase; vertical-align:middle;">India &middot; This week</td>
            </tr></table>
          </td></tr>
          <tr><td class="px" style="padding:16px 48px 0;">
            <a href="EVENT_1_URL" target="_blank" class="news-link" style="text-decoration:none; color:inherit; display:block; padding-bottom:14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td width="58" style="vertical-align:top;"><span class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; font-weight:600; letter-spacing:1px; color:#C66B92; text-transform:uppercase;">DD Mon</span></td>
              <td><div class="txt-dark nl-title" style="font-family:Georgia,serif; font-size:15px; line-height:21px; color:#2C2820;">Event Name Goes Here</div><div class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:11px; color:#A39A87; padding-top:2px;">Venue &middot; City</div></td>
            </tr></table></a>
            <div style="padding-top:14px;"><a href="https://startupnews.fyi/events" target="_blank" style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1px; color:#E6005C; text-decoration:none; text-transform:uppercase;">See all events&nbsp;&rarr;</a></div>
          </td></tr>

          <!-- ADVERTISE -->
          <tr><td class="px" align="center" style="padding:30px 48px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF7F0; border-top:1px solid #EDE8DC; border-bottom:1px solid #EDE8DC;"><tr><td align="center" style="padding:16px 20px;">
              <span class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:12px; line-height:18px; color:#8A8170;">Reach 10M+ founders &amp; investors across 24 countries.&nbsp;</span><a href="https://startupnews.fyi/advertise-with-us" target="_blank" style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:12px; font-weight:600; color:#E6005C; text-decoration:none;">Advertise with us&nbsp;&rarr;</a>
            </td></tr></table>
          </td></tr>

          <!-- CTA -->
          <tr><td class="px" align="center" style="padding:38px 48px 0;">
            <div style="border-top:1px solid #F0B9CE; font-size:0; line-height:0; width:40px; margin:0 auto;">&nbsp;</div>
            <div class="txt-dark" style="font-family:Georgia,serif; font-size:18px; line-height:25px; color:#1C1A15; padding-top:20px;">A different beat tomorrow?</div>
            <div class="txt-body" style="font-family:Georgia,serif; font-size:14px; line-height:21px; color:#6E665A; padding-top:8px;">Adjust your sectors, add markets, or change the hour your Signal arrives.</div>
            <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:18px auto 0;"><tr>
              <td style="border:1px solid #E6005C;"><a href="https://startupnews.fyi/dashboard/settings" target="_blank" style="display:inline-block; padding:12px 30px; font-family:'Helvetica Neue',Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.5px; color:#E6005C; text-decoration:none; text-transform:uppercase;">Tune my feed</a></td>
            </tr></table>
          </td></tr>

          <!-- FOOTER -->
          <tr><td class="px" align="center" style="padding:42px 48px 44px;">
            <div class="rule" style="border-top:1px solid #E6E0D3; font-size:0; line-height:0; margin-bottom:22px;">&nbsp;</div>
            <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
              <td style="vertical-align:middle;"><img src="https://startupnews.fyi/logo.png" width="16" height="16" alt="StartupNews.fyi" style="display:block; width:16px; height:16px; object-fit:contain;"></td>
              <td width="6" style="font-size:0;">&nbsp;</td>
              <td style="vertical-align:middle;"><span style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:13px; font-weight:700; color:#E6005C;">StartupNews</span><span style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:13px; font-weight:700; color:#1C1A15;">.fyi</span></td>
            </tr></table>
            <div class="txt-mute" style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:11px; line-height:18px; color:#9A917E; padding-top:10px;">The Morning Signal &middot; curated from 250+ global media partners.<br>Headlines and images link to original publishers; all rights remain theirs.</div>
            <div style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:11px; padding-top:16px;"><a href="https://startupnews.fyi/dashboard/settings" style="color:#8A8170; text-decoration:underline;">Preferences</a> &nbsp;&middot;&nbsp; <a href="#" style="color:#8A8170; text-decoration:underline;">View in browser</a> &nbsp;&middot;&nbsp; <a href="#" style="color:#8A8170; text-decoration:underline;">Unsubscribe</a></div>
          </td></tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  /* ── Compose: parse custom emails from text or file ── */
  const parseCustomEmails = async (): Promise<{ email: string; name: string }[]> => {
    let raw = customEmailsText;
    if (customEmailsFile) raw = await customEmailsFile.text();
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    return lines.map(line => {
      const parts = line.split(',');
      const email = parts[0].replace(/^["']|["']$/g, '').trim();
      const name = (parts[1] || '').replace(/^["']|["']$/g, '').trim() || email.split('@')[0];
      return { email, name };
    }).filter(r => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
  };

  /* ── Compose: send ── */
  const handleSend = async () => {
    setSendError(''); setSendResult(null);
    if (!subject.trim()) { setSendError('Subject is required.'); return; }
    if (!html.trim()) { setSendError('Email body is required.'); return; }

    if (recipientMode === 'custom') {
      const rows = await parseCustomEmails();
      if (rows.length === 0) { setSendError('No valid emails found in the list.'); return; }
      if (!confirm(`Send to ${rows.length} custom recipient(s)? This cannot be undone.`)) return;
      setSending(true);
      try {
        const res = await fetch('/api/admin/newsletter/send', {
          method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, html, customRecipients: rows }),
        });
        const d = await res.json();
        if (d.success) setSendResult({ sent: d.sent, total: d.total, errors: d.errors || [] });
        else setSendError(d.error || 'Send failed');
      } catch { setSendError('Send request failed'); }
      finally { setSending(false); }
    } else {
      if (!confirm(`Send to ${recipientCount ?? '?'} subscriber(s)? This cannot be undone.`)) return;
      setSending(true);
      try {
        const res = await fetch('/api/admin/newsletter/send', {
          method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, html, recipientFilter }),
        });
        const d = await res.json();
        if (d.success) setSendResult({ sent: d.sent, total: d.total, errors: d.errors || [] });
        else setSendError(d.error || 'Send failed');
      } catch { setSendError('Send request failed'); }
      finally { setSending(false); }
    }
  };

  /* ── Schedule: create ── */
  const handleSchedule = async () => {
    setScheduleError(''); setScheduleResult(null);
    if (!subject.trim()) { setScheduleError('Subject is required.'); return; }
    if (!html.trim()) { setScheduleError('Email body is required.'); return; }
    if (!scheduleAt) { setScheduleError('Pick a date and time.'); return; }
    if (new Date(scheduleAt) <= new Date()) { setScheduleError('Scheduled time must be in the future.'); return; }

    const filterPayload = recipientMode === 'custom'
      ? { customRecipients: await parseCustomEmails() }
      : recipientFilter;

    if (recipientMode === 'custom' && typeof filterPayload === 'object' && 'customRecipients' in filterPayload && filterPayload.customRecipients.length === 0) {
      setScheduleError('No valid emails found in the custom list.'); return;
    }

    setScheduling(true);
    try {
      const res = await fetch('/api/admin/newsletter/schedule', {
        method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, html, recipientFilter: filterPayload, scheduledAt: new Date(scheduleAt).toISOString() }),
      });
      const d = await res.json();
      if (d.success) {
        setScheduleResult({ id: d.data.id, scheduled_at: d.data.scheduled_at });
        await loadSchedules();
      } else {
        setScheduleError(d.error || 'Scheduling failed');
      }
    } catch { setScheduleError('Schedule request failed'); }
    finally { setScheduling(false); }
  };

  /* ── Schedule: cancel ── */
  const handleCancelSchedule = async (id: number) => {
    if (!confirm('Cancel this scheduled send?')) return;
    try {
      await fetch(`/api/admin/newsletter/schedule/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      await loadSchedules();
    } catch { /* silent */ }
  };

  /* ── Grouped articles ── */
  const grouped = items.reduce<Record<number, { feedName: string; feedUrl: string; feedLogoUrl: string | null; items: NewsletterItem[] }>>((acc, item) => {
    if (!acc[item.rss_feed_id]) acc[item.rss_feed_id] = { feedName: item.feed_name, feedUrl: item.feed_url, feedLogoUrl: item.feed_logo_url, items: [] };
    acc[item.rss_feed_id].items.push(item);
    return acc;
  }, {});

  /* ── Category filter toggle ── */
  const toggleCatFilter = (slug: string) => {
    setRecipientFilter(prev => {
      if (prev === 'all') return [slug];
      const arr = prev as string[];
      return arr.includes(slug) ? (arr.length === 1 ? 'all' : arr.filter(s => s !== slug)) : [...arr, slug];
    });
  };

  return (
    <AdminErrorBoundary>
      <div style={{ width: '100%', maxWidth: '100%', padding: 'clamp(1rem, 2vw, 2rem)', boxSizing: 'border-box' as const }}>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap' as const, gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 700, marginBottom: '0.25rem', color: '#0f172a' }}>Newsletter</h2>
            <p style={{ color: '#64748b', fontSize: '0.9375rem', margin: 0 }}>Manage feeds, configure mail, and send newsletters to your subscribers.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' as const }}>
            <Link href="/admin/newsletter/categories" style={{ padding: '0.75rem 1.25rem', background: '#ede9fe', color: '#6366f1', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
              Categories
            </Link>
            <Link href="/admin/rss-feeds" style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
              Manage RSS Feeds
            </Link>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', marginBottom: '2rem' }}>
          {([
            { id: 'overview', label: 'Overview' },
            { id: 'mail-config', label: 'Mail Config' },
            { id: 'compose', label: 'Compose & Send' },
          ] as { id: Tab; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '0.75rem 1.5rem', background: 'none', border: 'none',
              borderBottom: tab === t.id ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom: '-2px', fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? '#6366f1' : '#64748b', cursor: 'pointer', fontSize: '0.9375rem',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════
            TAB 1 — OVERVIEW
        ══════════════════════════════════════ */}
        {tab === 'overview' && (
          <>
            {overviewError && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>{overviewError}</div>}
            {items.length > 0 && (
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleDeleteAll} disabled={deleting} style={{ padding: '0.625rem 1.25rem', background: deleting ? '#94a3b8' : '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                  {deleting ? 'Deleting…' : 'Delete All Articles'}
                </button>
              </div>
            )}
            {loading ? <p style={{ padding: '2rem', textAlign: 'center' as const, color: '#64748b' }}>Loading…</p> : (
              <>
                {/* Feeds */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#0f172a', margin: '0 0 1rem' }}>
                    Newsletter RSS Feeds <span style={{ marginLeft: '0.5rem', background: '#e0e7ff', color: '#3730a3', padding: '0.15rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>{feeds.length}</span>
                  </h3>
                  {feeds.length === 0 ? (
                    <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: '10px', padding: '1.5rem', textAlign: 'center' as const }}>
                      <p style={{ color: '#92400e', fontWeight: 600, marginBottom: '0.5rem' }}>No newsletter feeds configured</p>
                      <p style={{ color: '#a16207', fontSize: '0.875rem', margin: 0 }}>Go to <Link href="/admin/rss-feeds" style={{ color: '#6366f1', fontWeight: 600 }}>RSS Feeds</Link> and set <strong>Feed For → Newsletter</strong>.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                      {feeds.map((feed) => (
                        <div key={feed.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', display: 'flex', gap: '0.875rem', alignItems: 'flex-start', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                          <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f1f5f9', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {feed.logo_url ? <img src={feed.logo_url} alt={feed.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /> : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></svg>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#0f172a', marginBottom: 4 }}>{feed.name}</div>
                            <div style={{ fontSize: '0.8125rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, marginBottom: 6 }}>{feed.url}</div>
                            <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 4, background: feed.enabled ? '#dcfce7' : '#f1f5f9', color: feed.enabled ? '#166534' : '#64748b', fontWeight: 600 }}>{feed.enabled ? 'Enabled' : 'Disabled'}</span>
                          </div>
                          <Link href={`/admin/rss-feeds/edit/${feed.id}`} style={{ fontSize: '0.75rem', color: '#6366f1', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>Edit</Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Articles */}
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#0f172a', margin: '0 0 1rem' }}>
                    Articles <span style={{ marginLeft: '0.5rem', background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>{items.length}</span>
                  </h3>
                  {items.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center' as const, background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                      <p style={{ color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>No articles yet.</p>
                      <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>{feeds.length > 0 ? 'Articles will appear after the RSS cron runs.' : 'Add newsletter feeds first.'}</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '2rem' }}>
                      {Object.values(grouped).map((group) => (
                        <section key={group.feedUrl}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem', paddingBottom: '0.75rem', borderBottom: '2px solid #e2e8f0' }}>
                            {group.feedLogoUrl && <img src={group.feedLogoUrl} alt={group.feedName} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>{group.feedName}</div>
                              <div style={{ fontSize: '0.8125rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{group.feedUrl}</div>
                            </div>
                            <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>{group.items.length} article{group.items.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                            {group.items.map((item) => (
                              <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column' as const, background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}>
                                <div style={{ width: '100%', height: 150, background: '#f1f5f9', overflow: 'hidden', flexShrink: 0 }}>
                                  {item.image_url ? <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /> : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                    </div>
                                  )}
                                </div>
                                <div style={{ padding: '0.875rem', flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '0.375rem' }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{item.title}</div>
                                  {item.description && <div style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{item.description}</div>}
                                  {item.published_at && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 'auto' }}>{new Date(item.published_at).toLocaleString()}</div>}
                                </div>
                              </a>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            TAB 2 — MAIL CONFIG
        ══════════════════════════════════════ */}
        {tab === 'mail-config' && (
          <div style={{ maxWidth: 680 }}>
            {configLoading ? (
              <p style={{ color: '#64748b' }}>Loading SMTP configuration…</p>
            ) : (
              <>
                {/* Source badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', padding: '4px 12px', borderRadius: 20, background: config.source === 'db' ? '#dcfce7' : '#fef9c3', color: config.source === 'db' ? '#166534' : '#854d0e', fontWeight: 600 }}>
                    {config.source === 'db' ? '✓ Using DB config' : '⚠ Using .env fallback — save below to override'}
                  </span>
                </div>

                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#0f172a', margin: '0 0 1.25rem' }}>SMTP Settings</h3>

                  {configMsg && <div style={{ background: '#dcfce7', color: '#166534', padding: '10px 14px', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>✓ {configMsg}</div>}
                  {configError && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>{configError}</div>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>SMTP Host</label>
                      <input style={inp} value={config.host} onChange={e => setConfig(c => ({ ...c, host: e.target.value }))} placeholder="smtp.gmail.com" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>Port</label>
                      <input style={inp} value={config.port} onChange={e => setConfig(c => ({ ...c, port: e.target.value }))} placeholder="465" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>Secure (SSL)</label>
                      <select style={{ ...inp, cursor: 'pointer' }} value={config.secure} onChange={e => setConfig(c => ({ ...c, secure: e.target.value }))}>
                        <option value="true">Yes</option>
                        <option value="false">No (TLS)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>SMTP Username</label>
                      <input style={inp} value={config.user} onChange={e => setConfig(c => ({ ...c, user: e.target.value }))} placeholder="you@gmail.com" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>SMTP Password / App Password</label>
                      <input style={inp} type="password" value={config.pass} onChange={e => setConfig(c => ({ ...c, pass: e.target.value }))} placeholder="Leave blank to keep existing" />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>From (display name + email)</label>
                    <input style={inp} value={config.from} onChange={e => setConfig(c => ({ ...c, from: e.target.value }))} placeholder='StartupNews.fyi <hello@startupnews.fyi>' />
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Format: Name &lt;email@domain.com&gt;</p>
                  </div>

                  <button onClick={handleSaveConfig} disabled={configSaving} style={{ padding: '0.75rem 2rem', background: configSaving ? '#94a3b8' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.9375rem', cursor: configSaving ? 'not-allowed' : 'pointer' }}>
                    {configSaving ? 'Saving…' : 'Save Configuration'}
                  </button>
                </div>

                {/* Test email */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#0f172a', margin: '0 0 1rem' }}>Send Test Email</h3>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>Test recipient email</label>
                      <input style={inp} type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" />
                    </div>
                    <button onClick={handleTestMail} disabled={testSending} style={{ padding: '9px 20px', background: testSending ? '#94a3b8' : '#0ea5e9', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: testSending ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                      {testSending ? 'Sending…' : 'Send Test'}
                    </button>
                  </div>
                  {testMsg && <p style={{ marginTop: 10, fontSize: '0.875rem', color: testMsg.startsWith('✓') ? '#166534' : '#991b1b', fontWeight: 600 }}>{testMsg}</p>}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 3 — COMPOSE & SEND
        ══════════════════════════════════════ */}
        {tab === 'compose' && (
          <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start' }}>

            {/* LEFT — compose form */}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '1rem' }}>

              {/* Compose card */}
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' as const, gap: 8 }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#0f172a', margin: 0 }}>Compose Newsletter</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setHtml(DEFAULT_TEMPLATE)} style={{ padding: '6px 14px', background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a', borderRadius: 8, fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}>
                      Load Default Template
                    </button>
                    <button onClick={() => setPreviewMode(p => !p)} style={{ padding: '6px 14px', background: previewMode ? '#6366f1' : '#f1f5f9', color: previewMode ? '#fff' : '#475569', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}>
                      {previewMode ? 'Edit' : 'Preview'}
                    </button>
                  </div>
                </div>

                {sendResult && (
                  <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#166534', fontSize: '0.9375rem' }}>✓ Sent to {sendResult.sent} of {sendResult.total} recipients</p>
                    {sendResult.errors.length > 0 && <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: '#92400e' }}>Errors: {sendResult.errors.join('; ')}</p>}
                  </div>
                )}
                {sendError && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>{sendError}</div>}

                {/* Subject */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>Subject <span style={{ color: '#ef4444' }}>*</span></label>
                  <input style={{ ...inp, fontSize: '1rem', fontWeight: 600 }} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Your Weekly Startup Digest" />
                </div>

                {/* Body */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                    Email Body (HTML) <span style={{ color: '#ef4444' }}>*</span>
                    <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Use {'{{name}}'} to personalise</span>
                  </label>
                  {previewMode ? (
                    <div style={{ minHeight: 400, border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', background: '#fafafa', overflowY: 'auto' as const }}
                      dangerouslySetInnerHTML={{ __html: html || '<p style="color:#94a3b8">Nothing to preview yet.</p>' }} />
                  ) : (
                    <textarea
                      value={html}
                      onChange={e => setHtml(e.target.value)}
                      rows={20}
                      placeholder={'<h1>Hello {{name}},</h1>\n<p>This week in startups...</p>'}
                      style={{ ...inp, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8125rem', lineHeight: 1.6 }}
                    />
                  )}
                </div>

                {/* Send mode toggle */}
                <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
                  {(['now', 'schedule'] as SendMode[]).map(m => (
                    <button key={m} onClick={() => { setSendMode(m); setScheduleResult(null); setScheduleError(''); setSendResult(null); setSendError(''); }} style={{
                      flex: 1, padding: '8px 0', fontWeight: 600, fontSize: '0.875rem', border: 'none', borderRadius: 8, cursor: 'pointer',
                      background: sendMode === m ? '#6366f1' : '#f1f5f9',
                      color: sendMode === m ? '#fff' : '#475569',
                    }}>
                      {m === 'now' ? 'Send Now' : 'Schedule'}
                    </button>
                  ))}
                </div>

                {/* Schedule picker */}
                {sendMode === 'schedule' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>Send Date &amp; Time <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="datetime-local" style={{ ...inp, fontSize: '0.9375rem' }} value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} />
                  </div>
                )}

                {scheduleResult && (
                  <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#166534', fontSize: '0.875rem' }}>✓ Scheduled (ID #{scheduleResult.id}) — {new Date(scheduleResult.scheduled_at).toLocaleString()}</p>
                  </div>
                )}
                {scheduleError && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>{scheduleError}</div>}

                {sendMode === 'now' ? (
                  <button onClick={handleSend} disabled={sending || !subject.trim() || !html.trim()} style={{
                    width: '100%', padding: '0.875rem', fontWeight: 700, fontSize: '1rem', border: 'none', borderRadius: 8, cursor: (sending || !subject.trim() || !html.trim()) ? 'not-allowed' : 'pointer',
                    background: (sending || !subject.trim() || !html.trim()) ? '#e2e8f0' : 'linear-gradient(135deg, #e91e63 0%, #f97316 100%)',
                    color: (sending || !subject.trim() || !html.trim()) ? '#94a3b8' : '#fff',
                  }}>
                    {sending ? 'Sending…' : recipientMode === 'custom' ? 'Send to Custom List' : `Send Newsletter → ${recipientCount !== null ? recipientCount : '…'} recipients`}
                  </button>
                ) : (
                  <button onClick={handleSchedule} disabled={scheduling || !subject.trim() || !html.trim() || !scheduleAt} style={{
                    width: '100%', padding: '0.875rem', fontWeight: 700, fontSize: '1rem', border: 'none', borderRadius: 8, cursor: (scheduling || !subject.trim() || !html.trim() || !scheduleAt) ? 'not-allowed' : 'pointer',
                    background: (scheduling || !subject.trim() || !html.trim() || !scheduleAt) ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: (scheduling || !subject.trim() || !html.trim() || !scheduleAt) ? '#94a3b8' : '#fff',
                  }}>
                    {scheduling ? 'Scheduling…' : 'Schedule Newsletter'}
                  </button>
                )}
              </div>

              {/* Custom recipients upload (shown when custom mode selected) */}
              {recipientMode === 'custom' && (
                <div style={{ background: 'white', border: '1.5px solid #6366f1', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a', margin: '0 0 0.5rem' }}>Custom Recipient List</h4>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: '#64748b' }}>
                    Upload a CSV or paste emails. Format: <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>email, name (optional)</code> — one per line.
                  </p>

                  {/* File drop zone */}
                  <div
                    onClick={() => document.getElementById('compose-csv-input')?.click()}
                    style={{ border: '2px dashed #c7d2fe', borderRadius: 8, padding: '1.25rem', textAlign: 'center' as const, cursor: 'pointer', background: customEmailsFile ? '#f0fdf4' : '#fafafe', marginBottom: '0.875rem' }}
                    onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.background = '#eff6ff'; }}
                    onDragLeave={e => { (e.currentTarget as HTMLElement).style.background = customEmailsFile ? '#f0fdf4' : '#fafafe'; }}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setCustomEmailsFile(f); setCustomEmailsText(''); } }}
                  >
                    <input id="compose-csv-input" type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setCustomEmailsFile(f); setCustomEmailsText(''); } }} />
                    {customEmailsFile ? (
                      <p style={{ margin: 0, fontWeight: 600, color: '#166534', fontSize: '0.875rem' }}>✓ {customEmailsFile.name} — click to change</p>
                    ) : (
                      <p style={{ margin: 0, color: '#6366f1', fontWeight: 600, fontSize: '0.875rem' }}>Drop CSV here or click to browse</p>
                    )}
                  </div>

                  <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' as const }}>— or paste —</p>

                  <textarea
                    value={customEmailsText}
                    onChange={e => { setCustomEmailsText(e.target.value); if (e.target.value) setCustomEmailsFile(null); }}
                    rows={6}
                    placeholder={'jane@example.com, Jane\njohn@example.com\nbob@example.com, Bob'}
                    style={{ ...inp, fontFamily: 'monospace', fontSize: '0.8125rem', resize: 'vertical' }}
                  />
                </div>
              )}
            </div>

            {/* RIGHT — recipients panel */}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '1rem' }}>

              {/* Mode toggle */}
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h4 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a', margin: '0 0 0.75rem' }}>Send To</h4>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  <button onClick={() => setRecipientMode('subscribers')} style={{ padding: '10px 14px', background: recipientMode === 'subscribers' ? '#ede9fe' : '#f8fafc', color: recipientMode === 'subscribers' ? '#6366f1' : '#475569', border: recipientMode === 'subscribers' ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left' as const }}>
                    {recipientMode === 'subscribers' && '✓ '}DB Subscribers
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 400, color: recipientMode === 'subscribers' ? '#818cf8' : '#94a3b8', marginTop: 2 }}>Filter by category below</span>
                  </button>
                  <button onClick={() => setRecipientMode('custom')} style={{ padding: '10px 14px', background: recipientMode === 'custom' ? '#ede9fe' : '#f8fafc', color: recipientMode === 'custom' ? '#6366f1' : '#475569', border: recipientMode === 'custom' ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left' as const }}>
                    {recipientMode === 'custom' && '✓ '}Custom List
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 400, color: recipientMode === 'custom' ? '#818cf8' : '#94a3b8', marginTop: 2 }}>Upload CSV or paste emails</span>
                  </button>
                </div>
              </div>

              {/* Subscriber count + filter — only when in subscriber mode */}
              {recipientMode === 'subscribers' && (
                <>
                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'center' as const }}>
                    <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#6366f1', margin: '0 0 4px' }}>{recipientCount ?? '—'}</p>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, fontWeight: 500 }}>Subscribers matched</p>
                  </div>

                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a', margin: '0 0 0.875rem' }}>Filter by Category</h4>
                    <button onClick={() => setRecipientFilter('all')} style={{ width: '100%', padding: '8px 14px', marginBottom: 8, background: recipientFilter === 'all' ? '#ede9fe' : '#f8fafc', color: recipientFilter === 'all' ? '#6366f1' : '#475569', border: recipientFilter === 'all' ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left' as const }}>
                      {recipientFilter === 'all' && '✓ '}All Subscribers
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                      {nlCategories.map(cat => {
                        const isSelected = Array.isArray(recipientFilter) && recipientFilter.includes(cat.slug);
                        return (
                          <button key={cat.slug} onClick={() => toggleCatFilter(cat.slug)} style={{
                            padding: '7px 12px', background: isSelected ? cat.color + '18' : '#f8fafc',
                            color: isSelected ? cat.color : '#475569', border: isSelected ? `1.5px solid ${cat.color}` : '1.5px solid #e2e8f0',
                            borderRadius: 8, fontWeight: isSelected ? 700 : 500, fontSize: '0.8125rem', cursor: 'pointer', textAlign: 'left' as const,
                            display: 'flex', alignItems: 'center', gap: 7,
                          }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isSelected ? cat.color : '#cbd5e1', flexShrink: 0, display: 'inline-block' }} />
                            {isSelected && '✓ '}{cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Custom mode hint */}
              {recipientMode === 'custom' && (
                <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '1rem', fontSize: '0.8125rem', color: '#854d0e', lineHeight: 1.6 }}>
                  <strong>Custom list:</strong> emails in the panel on the left will be used as recipients. They are <strong>not</strong> saved to the DB.
                </div>
              )}
            </div>
          </div>

          {/* ── Scheduled Sends list ── */}
          <div style={{ marginTop: '2rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#0f172a', margin: 0 }}>Scheduled Sends</h3>
              <button onClick={loadSchedules} style={{ padding: '5px 14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}>Refresh</button>
            </div>
            {schedulesLoading ? (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading…</p>
            ) : schedules.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>No scheduled sends yet. Use the Compose form above to schedule a newsletter.</p>
            ) : (
              <div style={{ overflowX: 'auto' as const }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      {['#', 'Subject', 'Recipients', 'Scheduled For', 'Status', 'Result', ''].map(h => (
                        <th key={h} style={{ textAlign: 'left' as const, padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((s, i) => {
                      let filterLabel = 'All subscribers';
                      try {
                        const f = JSON.parse(s.recipient_filter);
                        if (Array.isArray(f) && f.length > 0) filterLabel = `Categories: ${f.join(', ')}`;
                        else if (typeof f === 'object' && 'customRecipients' in f) filterLabel = `Custom (${f.customRecipients.length})`;
                      } catch { /* keep default */ }
                      const statusColor: Record<string, string> = { pending: '#f59e0b', sending: '#3b82f6', sent: '#22c55e', cancelled: '#94a3b8', failed: '#ef4444' };
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>#{s.id}</td>
                          <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: 600, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{s.subject}</td>
                          <td style={{ padding: '10px 12px', color: '#475569', whiteSpace: 'nowrap' as const }}>{filterLabel}</td>
                          <td style={{ padding: '10px 12px', color: '#475569', whiteSpace: 'nowrap' as const }}>{new Date(s.scheduled_at).toLocaleString()}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: (statusColor[s.status] || '#94a3b8') + '20', color: statusColor[s.status] || '#94a3b8', textTransform: 'capitalize' as const }}>
                              {s.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap' as const }}>
                            {s.status === 'sent' ? `${s.sent_count}/${s.total_count} sent` : s.sent_at ? new Date(s.sent_at).toLocaleString() : '—'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {s.status === 'pending' && (
                              <button onClick={() => handleCancelSchedule(s.id)} style={{ padding: '4px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
        )}

      </div>
    </AdminErrorBoundary>
  );
}
