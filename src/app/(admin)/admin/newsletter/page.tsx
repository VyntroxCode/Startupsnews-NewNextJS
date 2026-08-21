'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getAuthHeaders } from '@/lib/admin-auth';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';

/* ─── Types ──────────────────────────────────────────────── */
interface NewsletterFeed { id: number; name: string; url: string; logo_url: string | null; enabled: number; last_fetched_at: string | null; }
interface NewsletterItem { id: number; rss_feed_id: number; feed_name: string; feed_url: string; feed_logo_url: string | null; title: string; link: string; image_url: string | null; description: string | null; published_at: string | null; }
interface NLCategory { id: number; name: string; slug: string; color: string; }
interface MailConfig { host: string; port: string; secure: string; user: string; pass: string; from: string; source: 'db' | 'env'; }

interface RssFeed {
  id: number;
  name: string;
  url: string;
  category_id: number;
  author_id: number;
  enabled: number;
  fetch_interval_minutes: number;
  last_fetched_at: string | null;
  last_error: string | null;
  error_count: number;
  max_items_per_fetch: number;
  auto_publish: number;
  feed_for: string;
  category_name?: string;
}

interface RssCategory {
  id: number;
  name: string;
  slug: string;
}

type Tab = 'overview' | 'rss-feeds' | 'mail-config' | 'compose' | 'cron';

/* ─── Shared input style ──────────────────────────────────── */
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 13px', border: '1px solid #e2e8f0',
  borderRadius: 8, fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box',
};

/* ─── RSS Feeds tab styles ──────────────────────────────────── */
const rssStyles = {
  tableWrapper: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid rgba(0,0,0,0.04)',
    overflowX: 'auto' as const,
    WebkitOverflowScrolling: 'touch' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    minWidth: '800px',
  },
  tableHeader: {
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
  },
  tableHeaderCell: {
    padding: 'clamp(0.75rem, 2vw, 1.25rem) clamp(0.875rem, 2vw, 1.5rem)',
    textAlign: 'left' as const,
    fontWeight: 600,
    fontSize: 'clamp(0.6875rem, 1.5vw, 0.75rem)',
    color: '#475569',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap' as const,
    borderBottom: '1px solid rgba(0,0,0,0.06)',
  },
  tableCell: {
    padding: 'clamp(0.75rem, 2vw, 1rem) clamp(0.875rem, 2vw, 1.25rem)',
    fontSize: 'clamp(0.8125rem, 1.8vw, 0.875rem)',
  },
  urlCell: {
    maxWidth: 'clamp(150px, 20vw, 280px)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    color: '#64748b',
  },
  statusBadge: {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: 'clamp(0.75rem, 1.5vw, 0.8125rem)',
    display: 'inline-block',
  },
  actionsCell: {
    textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const,
  },
  actionButton: {
    padding: 'clamp(0.375rem, 1vw, 0.5rem) clamp(0.625rem, 1.5vw, 1rem)',
    fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)',
    fontWeight: 600,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginRight: '0.5rem',
    marginBottom: '0.25rem',
    whiteSpace: 'nowrap' as const,
    display: 'inline-block',
  },
  actionLink: {
    padding: 'clamp(0.375rem, 1vw, 0.5rem) clamp(0.625rem, 1.5vw, 1rem)',
    fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)',
    fontWeight: 600,
    borderRadius: '6px',
    textDecoration: 'none',
    marginRight: '0.5rem',
    marginBottom: '0.25rem',
    whiteSpace: 'nowrap' as const,
    display: 'inline-block',
  },
  emptyState: {
    padding: 'clamp(2rem, 5vw, 3rem)',
    textAlign: 'center' as const,
    background: '#f8fafc',
    borderRadius: '8px',
  },
  errorBox: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
  },
  // Mobile card styles
  cardContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  cardHeader: {
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e2e8f0',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '0.5rem',
    wordBreak: 'break-word' as const,
  },
  cardUrl: {
    fontSize: '0.8125rem',
    color: '#64748b',
    wordBreak: 'break-all' as const,
    marginBottom: '0.5rem',
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
    fontSize: '0.875rem',
  },
  cardLabel: {
    color: '#64748b',
    fontWeight: 500,
  },
  cardValue: {
    color: '#0f172a',
    fontWeight: 500,
  },
  cardActions: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0',
  },
  cardButton: {
    flex: '1 1 auto',
    minWidth: '80px',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8125rem',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  cardLink: {
    flex: '1 1 auto',
    minWidth: '80px',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8125rem',
    borderRadius: '6px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    fontWeight: 600,
    display: 'inline-block',
  },
};

const FEED_FOR_COLORS: Record<string, { bg: string; color: string }> = {
  website: { bg: '#dbeafe', color: '#1e40af' },
  newsletter: { bg: '#fce7f3', color: '#9d174d' },
};

function FeedForBadges({ feedFor }: { feedFor: string }) {
  const parts = feedFor ? String(feedFor).split(',').map((v) => v.trim()).filter(Boolean) : ['website'];
  return (
    <span style={{ display: 'inline-flex', gap: '0.25rem', flexWrap: 'wrap' }}>
      {parts.map((p) => {
        const c = FEED_FOR_COLORS[p] ?? { bg: '#f1f5f9', color: '#475569' };
        return (
          <span key={p} style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: c.bg, color: c.color, textTransform: 'capitalize' }}>
            {p}
          </span>
        );
      })}
    </span>
  );
}

const NEWSLETTER_TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'rss-feeds', label: 'RSS Feeds' },
  { id: 'mail-config', label: 'Mail Config' },
  { id: 'compose', label: 'Compose & Send' },
  { id: 'cron', label: 'Cron Settings' },
];

export default function NewsletterPage() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab') as Tab | null;
  const initialTab: Tab = requestedTab && NEWSLETTER_TABS.some((t) => t.id === requestedTab) ? requestedTab : 'overview';
  const [tab, setTab] = useState<Tab>(initialTab);

  /* ── Overview state ── */
  const [feeds, setFeeds] = useState<NewsletterFeed[]>([]);
  const [items, setItems] = useState<NewsletterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [overviewError, setOverviewError] = useState('');

  /* ── RSS Feeds tab state ── */
  const [rssFeeds, setRssFeeds] = useState<RssFeed[]>([]);
  const [rssLoading, setRssLoading] = useState(true);
  const [rssError, setRssError] = useState('');
  const [fetchingId, setFetchingId] = useState<number | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [disablingAll, setDisablingAll] = useState(false);
  const [rssCategories, setRssCategories] = useState<RssCategory[]>([]);
  const [selectedRssCategoryId, setSelectedRssCategoryId] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

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

  /* ── Cron state ── */
  interface CronConfig { enabled: boolean; cronExpr: string; lastRun: string | null; lastSent: number | null; lastTotal: number | null; }
  const [cronConfig, setCronConfig] = useState<CronConfig>({ enabled: true, cronExpr: '0 * * * *', lastRun: null, lastSent: null, lastTotal: null });
  const [cronLoading, setCronLoading] = useState(false);
  const [cronSaving, setCronSaving] = useState(false);
  const [cronMsg, setCronMsg] = useState('');
  const [cronError, setCronError] = useState('');
  const [cronTriggering, setCronTriggering] = useState(false);
  const [cronTriggerResult, setCronTriggerResult] = useState<{ sent: number; total: number; errors: number; skipped: number } | null>(null);
  const [cronTriggerError, setCronTriggerError] = useState('');

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

  /* ── Load RSS feeds + categories when tab changes ── */
  const loadRssFeeds = useCallback(async () => {
    setRssError('');
    try {
      const [feedsRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/rss-feeds', { headers: getAuthHeaders() }),
        fetch('/api/admin/categories?limit=500', { headers: getAuthHeaders() }),
      ]);
      const feedsData = await feedsRes.json();
      const categoriesData = await categoriesRes.json();

      if (feedsData.success) setRssFeeds(feedsData.data);
      else setRssError(feedsData.error || 'Failed to load feeds');

      if (categoriesData.success) setRssCategories(categoriesData.data);
    } catch {
      setRssError('Failed to load data');
    } finally {
      setRssLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== 'rss-feeds') return;
    loadRssFeeds();
  }, [tab, loadRssFeeds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  /* ── Load cron config ── */
  const loadCronConfig = useCallback(async () => {
    setCronLoading(true);
    try {
      const res = await fetch('/api/admin/newsletter/cron-config', { headers: getAuthHeaders() });
      const d = await res.json();
      if (d.success) setCronConfig(d.data);
    } catch { /* silent */ }
    finally { setCronLoading(false); }
  }, []);

  useEffect(() => {
    if (tab !== 'cron') return;
    loadCronConfig();
  }, [tab, loadCronConfig]);

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

  /* ── RSS Feeds: fetch/test/toggle/disable-all/delete ── */
  const handleFetch = async (id: number) => {
    setFetchingId(id);
    try {
      const res = await fetch(`/api/admin/rss-feeds/${id}/fetch`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Fetched: ${data.data.postsCreated} posts created, ${data.data.itemsProcessed} items processed.`);
        loadRssFeeds();
      } else alert(data.error || 'Fetch failed');
    } catch {
      alert('Fetch request failed');
    } finally {
      setFetchingId(null);
    }
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/admin/rss-feeds/${id}/test`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.data?.valid) {
        alert(`Feed OK: ${data.data.itemCount} items.`);
      } else {
        const message = !res.ok ? (data.error || `Test failed (${res.status})`) : (data.data?.error || data.error || 'Test failed');
        alert(message);
      }
    } catch {
      alert('Test request failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleEnabled = async (feed: RssFeed) => {
    try {
      const res = await fetch(`/api/admin/rss-feeds/${feed.id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: feed.enabled ? 0 : 1 }),
      });
      const data = await res.json();
      if (data.success) loadRssFeeds();
      else alert(data.error || 'Update failed');
    } catch {
      alert('Update failed');
    }
  };

  const handleDisableAll = async () => {
    if (!confirm('Disable ALL RSS feeds? This will stop all feeds from fetching.')) return;
    setDisablingAll(true);
    try {
      const res = await fetch('/api/admin/rss-feeds', {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable-all' }),
      });
      const data = await res.json();
      if (data.success) loadRssFeeds();
      else alert(data.error || 'Failed to disable all feeds');
    } catch {
      alert('Request failed');
    } finally {
      setDisablingAll(false);
    }
  };

  const handleDeleteRssFeed = async (id: number) => {
    if (!confirm('Delete this RSS feed? Items and links will be removed.')) return;
    try {
      const res = await fetch(`/api/admin/rss-feeds/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) loadRssFeeds();
      else alert(data.error || 'Delete failed');
    } catch {
      alert('Delete failed');
    }
  };

  const filteredRssFeeds = selectedRssCategoryId
    ? rssFeeds.filter((feed) => String(feed.category_id) === selectedRssCategoryId)
    : rssFeeds;

  const renderRssFeedCard = (feed: RssFeed) => (
    <div key={feed.id} style={rssStyles.card}>
      <div style={rssStyles.cardHeader}>
        <div style={rssStyles.cardTitle}>{feed.name}</div>
        <div style={rssStyles.cardUrl} title={feed.url}>{feed.url}</div>
      </div>
      <div style={rssStyles.cardRow}>
        <span style={rssStyles.cardLabel}>Category:</span>
        <span style={rssStyles.cardValue}>{feed.category_name ?? '—'}</span>
      </div>
      <div style={rssStyles.cardRow}>
        <span style={rssStyles.cardLabel}>Interval:</span>
        <span style={rssStyles.cardValue}>{feed.fetch_interval_minutes} min</span>
      </div>
      <div style={rssStyles.cardRow}>
        <span style={rssStyles.cardLabel}>Last Fetch:</span>
        <span style={rssStyles.cardValue}>
          {feed.last_fetched_at ? new Date(feed.last_fetched_at).toLocaleString() : '—'}
        </span>
      </div>
      <div style={rssStyles.cardRow}>
        <span style={rssStyles.cardLabel}>Feed For:</span>
        <span><FeedForBadges feedFor={feed.feed_for} /></span>
      </div>
      <div style={rssStyles.cardRow}>
        <span style={rssStyles.cardLabel}>Status:</span>
        <span>
          <span style={{
            ...rssStyles.statusBadge,
            background: feed.enabled ? '#dcfce7' : '#f1f5f9',
            color: feed.enabled ? '#166534' : '#64748b',
          }}>
            {feed.enabled ? 'On' : 'Off'}
          </span>
          {feed.last_error && (
            <span style={{ marginLeft: '0.5rem', color: '#b91c1c', fontSize: '0.75rem' }} title={feed.last_error}>
              ⚠️ Error
            </span>
          )}
        </span>
      </div>
      <div style={rssStyles.cardActions}>
        <button
          type="button"
          onClick={() => handleFetch(feed.id)}
          disabled={!!fetchingId}
          style={{
            ...rssStyles.cardButton,
            background: '#6366f1',
            color: 'white',
            cursor: fetchingId ? 'not-allowed' : 'pointer',
            opacity: fetchingId ? 0.6 : 1,
          }}
        >
          {fetchingId === feed.id ? 'Fetching…' : 'Fetch'}
        </button>
        <button
          type="button"
          onClick={() => handleTest(feed.id)}
          disabled={!!testingId}
          style={{
            ...rssStyles.cardButton,
            background: '#0ea5e9',
            color: 'white',
            cursor: testingId ? 'not-allowed' : 'pointer',
            opacity: testingId ? 0.6 : 1,
          }}
        >
          {testingId === feed.id ? 'Testing…' : 'Test'}
        </button>
        <button
          type="button"
          onClick={() => handleToggleEnabled(feed)}
          style={{
            ...rssStyles.cardButton,
            background: '#64748b',
            color: 'white',
          }}
        >
          {feed.enabled ? 'Disable' : 'Enable'}
        </button>
        <Link
          href={`/admin/rss-feeds/edit/${feed.id}`}
          style={{
            ...rssStyles.cardLink,
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
          }}
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={() => handleDeleteRssFeed(feed.id)}
          style={{
            ...rssStyles.cardButton,
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );

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

  /* ── Default template (Morning Signal — dark mode) ── */
  const DEFAULT_TEMPLATE = `<!DOCTYPE html>
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
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;">Hey {{name}} — your personalised startup briefing is ready. &#9749;</div>

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
              <td align="right" style="font-size:11px;color:#B9B9B9;white-space:nowrap;">{{date}}</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- INTRO LINE -->
      <tr>
        <td class="pad" style="padding:16px 24px 0;font-size:13px;color:#6A6A6A;line-height:1.6;">
          Hey {{name}} — here's what moved in <strong>[Sector 1]</strong> and <strong>[Sector 2]</strong> today.
        </td>
      </tr>

      <!-- ===== SECTOR 1: FINTECH ===== -->
      <tr><td style="padding:28px 24px 0;border-top:1px solid #EEE2E6;"></td></tr>
      <tr>
        <td style="padding:20px 24px 0;">
          <span style="display:inline-block;background:#FCE8EF;color:#9C2A57;font-size:11px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;padding:5px 10px;border-radius:3px;">&#128181; Fintech</span>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 24px 0;">
          <a href="#" style="text-decoration:none;display:block;">
            <img src="https://placehold.co/552x225/FCE8EF/9C2A57?text=Featured+Story+Image" width="552" height="225" alt="" style="display:block;border-radius:8px;width:100%;max-width:552px;height:auto;" class="feat-img">
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 24px 0;">
          <a href="#" style="text-decoration:none;">
            <p style="margin:0 0 8px;font-size:20px;line-height:1.3;font-weight:bold;color:#1A1A1A;">[Fintech Hero Headline — paste your story title here]</p>
          </a>
          <p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#4A4A4A;">[Two-line summary of the lead Fintech story. Keep it punchy — what happened, why it matters.]</p>
          <a href="#" style="font-size:13px;font-weight:bold;color:#C13E70;text-decoration:none;">Read full story &rarr;</a>
        </td>
      </tr>
      <tr><td style="padding:18px 24px 0;border-top:1px solid #EEE2E6;"></td></tr>
      <tr>
        <td style="padding:14px 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="68" valign="top" style="padding-bottom:14px;">
                <img src="https://placehold.co/64x48/F7F4F5/C8C8C8?text=News" width="64" height="48" alt="" style="display:block;border-radius:6px;width:64px;height:48px;object-fit:cover;">
              </td>
              <td valign="top" style="padding-left:12px;padding-bottom:14px;">
                <p style="margin:0 0 3px;font-size:14.5px;line-height:1.4;font-weight:bold;color:#1A1A1A;">[Fintech story 2 headline]</p>
                <span style="font-size:11.5px;color:#9A9A9A;">Source &middot; Xh ago</span>
              </td>
            </tr>
            <tr>
              <td width="68" valign="top" style="padding-bottom:14px;">
                <img src="https://placehold.co/64x48/F7F4F5/C8C8C8?text=News" width="64" height="48" alt="" style="display:block;border-radius:6px;width:64px;height:48px;object-fit:cover;">
              </td>
              <td valign="top" style="padding-left:12px;padding-bottom:14px;">
                <p style="margin:0 0 3px;font-size:14.5px;line-height:1.4;font-weight:bold;color:#1A1A1A;">[Fintech story 3 headline]</p>
                <span style="font-size:11.5px;color:#9A9A9A;">Source &middot; Xh ago</span>
              </td>
            </tr>
            <tr>
              <td width="68" valign="top">
                <img src="https://placehold.co/64x48/F7F4F5/C8C8C8?text=News" width="64" height="48" alt="" style="display:block;border-radius:6px;width:64px;height:48px;object-fit:cover;">
              </td>
              <td valign="top" style="padding-left:12px;">
                <p style="margin:0 0 3px;font-size:14.5px;line-height:1.4;font-weight:bold;color:#1A1A1A;">[Fintech story 4 headline]</p>
                <span style="font-size:11.5px;color:#9A9A9A;">Source &middot; Xh ago</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ===== SECTOR 2: AI ===== -->
      <tr><td style="padding:28px 24px 0;border-top:1px solid #EEE2E6;"></td></tr>
      <tr>
        <td style="padding:20px 24px 0;">
          <span style="display:inline-block;background:#E8EEFC;color:#1F4DA1;font-size:11px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;padding:5px 10px;border-radius:3px;">&#129504; Artificial Intelligence</span>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 24px 0;">
          <a href="#" style="text-decoration:none;display:block;">
            <img src="https://placehold.co/552x225/E8EEFC/1F4DA1?text=Featured+Story+Image" width="552" height="225" alt="" style="display:block;border-radius:8px;width:100%;max-width:552px;height:auto;" class="feat-img">
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 24px 0;">
          <a href="#" style="text-decoration:none;">
            <p style="margin:0 0 8px;font-size:20px;line-height:1.3;font-weight:bold;color:#1A1A1A;">[AI Hero Headline — paste your story title here]</p>
          </a>
          <p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#4A4A4A;">[Two-line summary of the lead AI story.]</p>
          <a href="#" style="font-size:13px;font-weight:bold;color:#1F4DA1;text-decoration:none;">Read full story &rarr;</a>
        </td>
      </tr>
      <tr><td style="padding:18px 24px 0;border-top:1px solid #EEE2E6;"></td></tr>
      <tr>
        <td style="padding:14px 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="68" valign="top" style="padding-bottom:14px;">
                <img src="https://placehold.co/64x48/F7F4F5/C8C8C8?text=News" width="64" height="48" alt="" style="display:block;border-radius:6px;width:64px;height:48px;object-fit:cover;">
              </td>
              <td valign="top" style="padding-left:12px;padding-bottom:14px;">
                <p style="margin:0 0 3px;font-size:14.5px;line-height:1.4;font-weight:bold;color:#1A1A1A;">[AI story 2 headline]</p>
                <span style="font-size:11.5px;color:#9A9A9A;">Source &middot; Xh ago</span>
              </td>
            </tr>
            <tr>
              <td width="68" valign="top">
                <img src="https://placehold.co/64x48/F7F4F5/C8C8C8?text=News" width="64" height="48" alt="" style="display:block;border-radius:6px;width:64px;height:48px;object-fit:cover;">
              </td>
              <td valign="top" style="padding-left:12px;">
                <p style="margin:0 0 3px;font-size:14.5px;line-height:1.4;font-weight:bold;color:#1A1A1A;">[AI story 3 headline]</p>
                <span style="font-size:11.5px;color:#9A9A9A;">Source &middot; Xh ago</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ===== AMAZON AFFILIATE / FOUNDER PICKS ===== -->
      <tr><td style="padding:28px 24px 0;border-top:1px solid #EEE2E6;"></td></tr>
      <tr>
        <td style="padding:0 24px;">
          <p style="margin:0 0 1px;font-size:11px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;color:#C13E70;">&#128722; Founder Picks</p>
          <span style="font-size:9px;color:#B9B9B9;">affiliate</span>
          <p style="margin:10px 0 12px;font-size:15px;font-weight:bold;color:#1A1A1A;">Gear that ships fast &rarr;</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" valign="top" style="padding-right:8px;">
                <a href="https://amazon.in/?tag=snf-21" style="display:block;text-decoration:none;">
                  <img src="https://placehold.co/200x200/FCE8EF/9C2A57?text=Product+1" width="100%" alt="" style="display:block;border-radius:8px;border:1px solid #EEE2E6;">
                </a>
                <p style="margin:6px 0 0;font-size:11px;line-height:1.4;color:#4A4A4A;">[Product Name 1]</p>
                <p style="margin:2px 0 0;font-size:12px;font-weight:bold;color:#C13E70;">&#8377;0,000</p>
              </td>
              <td width="33%" valign="top" style="padding:0 4px;">
                <a href="https://amazon.in/?tag=snf-21" style="display:block;text-decoration:none;">
                  <img src="https://placehold.co/200x200/FCE8EF/9C2A57?text=Product+2" width="100%" alt="" style="display:block;border-radius:8px;border:1px solid #EEE2E6;">
                </a>
                <p style="margin:6px 0 0;font-size:11px;line-height:1.4;color:#4A4A4A;">[Product Name 2]</p>
                <p style="margin:2px 0 0;font-size:12px;font-weight:bold;color:#C13E70;">&#8377;0,000</p>
              </td>
              <td width="33%" valign="top" style="padding-left:8px;">
                <a href="https://amazon.in/?tag=snf-21" style="display:block;text-decoration:none;">
                  <img src="https://placehold.co/200x200/FCE8EF/9C2A57?text=Product+3" width="100%" alt="" style="display:block;border-radius:8px;border:1px solid #EEE2E6;">
                </a>
                <p style="margin:6px 0 0;font-size:11px;line-height:1.4;color:#4A4A4A;">[Product Name 3]</p>
                <p style="margin:2px 0 0;font-size:12px;font-weight:bold;color:#C13E70;">&#8377;0,000</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="padding:32px 24px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px solid #EEE2E6;padding-top:18px;">
              <p style="margin:0;font-size:11px;color:#9A9A9A;line-height:1.6;">
                You're receiving this because you subscribed to StartupNews.fyi.<br>
                <a href="https://startupnews.fyi/unsubscribe" style="color:#9A9A9A;text-decoration:underline;">Unsubscribe</a>
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

  /* ── Cron: save config ── */
  const handleSaveCronConfig = async () => {
    setCronError(''); setCronMsg(''); setCronSaving(true);
    try {
      const res = await fetch('/api/admin/newsletter/cron-config', {
        method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: cronConfig.enabled, cronExpr: cronConfig.cronExpr }),
      });
      const d = await res.json();
      if (d.success) { setCronMsg('Cron configuration saved.'); setTimeout(() => setCronMsg(''), 4000); }
      else setCronError(d.error || 'Save failed');
    } catch { setCronError('Save request failed'); }
    finally { setCronSaving(false); }
  };

  /* ── Cron: trigger now ── */
  const handleCronTrigger = async () => {
    if (!confirm('Send Morning Signal now to ALL active subscribers? This bypasses the timezone filter and sends immediately regardless of their local time.')) return;
    setCronTriggerError(''); setCronTriggerResult(null); setCronTriggering(true);
    try {
      const res = await fetch('/api/admin/newsletter/cron-trigger', { method: 'POST', headers: getAuthHeaders() });
      const d = await res.json();
      if (d.success) { setCronTriggerResult({ sent: d.sent, total: d.total, errors: d.errors, skipped: d.skipped }); loadCronConfig(); }
      else setCronTriggerError(d.error || 'Trigger failed');
    } catch { setCronTriggerError('Trigger request failed'); }
    finally { setCronTriggering(false); }
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
      <div>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap' as const, gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '2.25rem', fontWeight: '700', marginBottom: '1rem', color: '#0f172a', letterSpacing: '-0.02em' }}>Newsletter</h2>
            <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>Manage feeds, configure mail, and send newsletters to your subscribers.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' as const }}>
            <Link href="/admin/newsletter/categories" style={{ padding: '0.75rem 1.25rem', background: '#ede9fe', color: '#6366f1', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
              Categories
            </Link>
            {tab === 'rss-feeds' && (
              <Link href="/admin/rss-feeds/create" style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
                + Add RSS Feed
              </Link>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', marginBottom: '2rem' }}>
          {NEWSLETTER_TABS.map(t => (
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
                      <p style={{ color: '#a16207', fontSize: '0.875rem', margin: 0 }}>Go to <button type="button" onClick={() => setTab('rss-feeds')} style={{ color: '#6366f1', fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>RSS Feeds</button> and set <strong>Feed For → Newsletter</strong>.</p>
                    </div>
                  ) : (
                    <div style={rssStyles.tableWrapper}>
                      <table style={rssStyles.table}>
                        <thead style={rssStyles.tableHeader}>
                          <tr>
                            <th style={rssStyles.tableHeaderCell}>Feed</th>
                            <th style={rssStyles.tableHeaderCell}>URL</th>
                            <th style={rssStyles.tableHeaderCell}>Last Fetch</th>
                            <th style={rssStyles.tableHeaderCell}>Status</th>
                            <th style={{ ...rssStyles.tableHeaderCell, textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feeds.map((feed) => (
                            <tr key={feed.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                              <td style={rssStyles.tableCell}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                  <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f1f5f9', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {feed.logo_url ? <img src={feed.logo_url} alt={feed.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /> : (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></svg>
                                    )}
                                  </div>
                                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{feed.name}</span>
                                </div>
                              </td>
                              <td style={{ ...rssStyles.tableCell, ...rssStyles.urlCell }} title={feed.url}>{feed.url}</td>
                              <td style={{ ...rssStyles.tableCell, color: '#64748b' }}>
                                {feed.last_fetched_at ? new Date(feed.last_fetched_at).toLocaleString() : 'Never'}
                              </td>
                              <td style={rssStyles.tableCell}>
                                <span style={{ ...rssStyles.statusBadge, background: feed.enabled ? '#dcfce7' : '#f1f5f9', color: feed.enabled ? '#166534' : '#64748b' }}>{feed.enabled ? 'Enabled' : 'Disabled'}</span>
                              </td>
                              <td style={{ ...rssStyles.tableCell, ...rssStyles.actionsCell }}>
                                <Link href={`/admin/rss-feeds/edit/${feed.id}`} style={{ ...rssStyles.actionLink, background: '#e0e7ff', color: '#3730a3' }}>Edit</Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
            TAB 2 — RSS FEEDS
        ══════════════════════════════════════ */}
        {tab === 'rss-feeds' && (
          <>
            {/* Category Filter */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label htmlFor="rss-category-filter" style={{ fontWeight: 500, color: '#475569', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                Filter by Category:
              </label>
              <select
                id="rss-category-filter"
                value={selectedRssCategoryId}
                onChange={(e) => setSelectedRssCategoryId(e.target.value)}
                style={{
                  padding: 'clamp(0.5rem, 1.5vw, 0.625rem) clamp(0.75rem, 2vw, 1rem)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                  background: 'white',
                  color: '#0f172a',
                  cursor: 'pointer',
                  minWidth: '200px',
                }}
              >
                <option value="">All Categories</option>
                {rssCategories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {selectedRssCategoryId && (
                <button
                  type="button"
                  onClick={() => setSelectedRssCategoryId('')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Clear Filter
                </button>
              )}
              <button
                type="button"
                onClick={handleDisableAll}
                disabled={disablingAll || rssFeeds.length === 0}
                style={{
                  marginLeft: 'auto',
                  padding: 'clamp(0.625rem, 1.5vw, 0.75rem) clamp(1rem, 2.5vw, 1.5rem)',
                  background: disablingAll || rssFeeds.length === 0 ? '#94a3b8' : '#dc2626',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 'clamp(0.8125rem, 1.8vw, 0.875rem)',
                  whiteSpace: 'nowrap' as const,
                  cursor: disablingAll || rssFeeds.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {disablingAll ? 'Disabling…' : 'Disable All'}
              </button>
            </div>

            {rssError && (
              <div style={rssStyles.errorBox}>{rssError}</div>
            )}

            {rssLoading ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading...</p>
            ) : filteredRssFeeds.length === 0 ? (
              <div style={rssStyles.emptyState}>
                <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                  {selectedRssCategoryId ? 'No feeds found in this category.' : 'No RSS feeds yet.'}
                </p>
                {!selectedRssCategoryId && (
                  <Link href="/admin/rss-feeds/create" style={{ color: '#ed8936', fontWeight: 600, fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                    Add your first feed
                  </Link>
                )}
              </div>
            ) : isMobile ? (
              // Mobile Card View
              <div style={rssStyles.cardContainer}>
                {filteredRssFeeds.map(renderRssFeedCard)}
              </div>
            ) : (
              // Desktop Table View
              <div style={rssStyles.tableWrapper}>
                <table style={rssStyles.table}>
                  <thead style={rssStyles.tableHeader}>
                    <tr>
                      <th style={rssStyles.tableHeaderCell}>Name</th>
                      <th style={rssStyles.tableHeaderCell}>URL</th>
                      <th style={rssStyles.tableHeaderCell}>Category</th>
                      <th style={rssStyles.tableHeaderCell}>Interval</th>
                      <th style={rssStyles.tableHeaderCell}>Last fetch</th>
                      <th style={rssStyles.tableHeaderCell}>Feed For</th>
                      <th style={rssStyles.tableHeaderCell}>Status</th>
                      <th style={{ ...rssStyles.tableHeaderCell, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRssFeeds.map((feed, i) => (
                      <tr
                        key={feed.id}
                        style={{ borderBottom: i < filteredRssFeeds.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ ...rssStyles.tableCell, fontWeight: 500 }}>{feed.name}</td>
                        <td style={{ ...rssStyles.tableCell, ...rssStyles.urlCell }} title={feed.url}>
                          {feed.url}
                        </td>
                        <td style={{ ...rssStyles.tableCell, color: '#64748b' }}>
                          {feed.category_name ?? '—'}
                        </td>
                        <td style={{ ...rssStyles.tableCell, color: '#64748b' }}>
                          {feed.fetch_interval_minutes} min
                        </td>
                        <td style={{ ...rssStyles.tableCell, color: '#64748b' }}>
                          {feed.last_fetched_at ? new Date(feed.last_fetched_at).toLocaleString() : '—'}
                        </td>
                        <td style={rssStyles.tableCell}>
                          <FeedForBadges feedFor={feed.feed_for} />
                        </td>
                        <td style={rssStyles.tableCell}>
                          <span style={{
                            ...rssStyles.statusBadge,
                            background: feed.enabled ? '#dcfce7' : '#f1f5f9',
                            color: feed.enabled ? '#166534' : '#64748b',
                          }}>
                            {feed.enabled ? 'On' : 'Off'}
                          </span>
                          {feed.last_error && (
                            <span style={{ marginLeft: '0.5rem', color: '#b91c1c', fontSize: '0.75rem' }} title={feed.last_error}>
                              ⚠️
                            </span>
                          )}
                        </td>
                        <td style={{ ...rssStyles.tableCell, ...rssStyles.actionsCell }}>
                          <button
                            type="button"
                            onClick={() => handleFetch(feed.id)}
                            disabled={!!fetchingId}
                            style={{
                              ...rssStyles.actionButton,
                              background: '#6366f1',
                              color: 'white',
                              cursor: fetchingId ? 'not-allowed' : 'pointer',
                              opacity: fetchingId ? 0.6 : 1,
                            }}
                          >
                            {fetchingId === feed.id ? 'Fetching…' : 'Fetch'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTest(feed.id)}
                            disabled={!!testingId}
                            style={{
                              ...rssStyles.actionButton,
                              background: '#0ea5e9',
                              color: 'white',
                              cursor: testingId ? 'not-allowed' : 'pointer',
                              opacity: testingId ? 0.6 : 1,
                            }}
                          >
                            {testingId === feed.id ? 'Testing…' : 'Test'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleEnabled(feed)}
                            style={{
                              ...rssStyles.actionButton,
                              background: '#64748b',
                              color: 'white',
                            }}
                          >
                            {feed.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <Link
                            href={`/admin/rss-feeds/edit/${feed.id}`}
                            style={{
                              ...rssStyles.actionLink,
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: 'white',
                            }}
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteRssFeed(feed.id)}
                            style={{
                              ...rssStyles.actionButton,
                              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              color: 'white',
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            TAB 3 — MAIL CONFIG
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
            TAB 4 — COMPOSE & SEND
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

        {/* ══════════════════════════════════════
            TAB 5 — CRON SETTINGS
        ══════════════════════════════════════ */}
        {tab === 'cron' && (
          <div style={{ maxWidth: 680 }}>
            {cronLoading ? (
              <p style={{ color: '#64748b' }}>Loading cron configuration…</p>
            ) : (
              <>
                {/* Morning Signal enable/disable */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.25rem' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#0f172a', margin: 0 }}>Morning Signal Newsletter</h3>
                    <span style={{ fontSize: '0.75rem', padding: '2px 10px', borderRadius: 20, fontWeight: 700, background: cronConfig.enabled ? '#dcfce7' : '#f1f5f9', color: cronConfig.enabled ? '#166534' : '#94a3b8' }}>
                      {cronConfig.enabled ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.5rem' }}>
                    When enabled, subscribers receive a personalised newsletter every morning at 8 AM in their local timezone. The newsletter category picker will also appear in the sign-up modal for new users.
                  </p>

                  {cronMsg && <div style={{ background: '#dcfce7', color: '#166534', padding: '10px 14px', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>✓ {cronMsg}</div>}
                  {cronError && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>{cronError}</div>}

                  {/* Enable toggle */}
                  <div
                    onClick={() => setCronConfig(c => ({ ...c, enabled: !c.enabled }))}
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1rem 1.25rem', background: cronConfig.enabled ? '#f0fdf4' : '#fafafa', border: `1.5px solid ${cronConfig.enabled ? '#86efac' : '#e2e8f0'}`, borderRadius: 10, cursor: 'pointer', userSelect: 'none' as const }}
                  >
                    <div style={{ width: 48, height: 26, borderRadius: 13, background: cronConfig.enabled ? '#22c55e' : '#cbd5e1', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                      <div style={{ position: 'absolute', top: 3, left: cronConfig.enabled ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>
                        {cronConfig.enabled ? 'Newsletter is ON' : 'Newsletter is OFF'}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>
                        {cronConfig.enabled
                          ? 'Automated morning sends active · Category picker shown on signup'
                          : 'No automated sends · Category picker hidden on signup'}
                      </div>
                    </div>
                  </div>

                  {/* Delivery time info */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: 4 }}>Delivery Time</div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      Every day at <strong>8:00 AM</strong> in each subscriber&apos;s local timezone. The cron runs every hour and sends only to subscribers whose local time is currently 8 AM and who haven&apos;t received it yet today.
                    </div>
                  </div>

                  <button onClick={handleSaveCronConfig} disabled={cronSaving} style={{ padding: '0.75rem 2rem', background: cronSaving ? '#94a3b8' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.9375rem', cursor: cronSaving ? 'not-allowed' : 'pointer' }}>
                    {cronSaving ? 'Saving…' : 'Save Settings'}
                  </button>
                </div>

                {/* Last run stats */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#0f172a', margin: '0 0 1rem' }}>Last Run Stats</h3>
                  {cronConfig.lastRun ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                      <div style={{ textAlign: 'center' as const, padding: '1rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6366f1' }}>{cronConfig.lastSent ?? '—'}</div>
                        <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>Emails sent</div>
                      </div>
                      <div style={{ textAlign: 'center' as const, padding: '1rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{cronConfig.lastTotal ?? '—'}</div>
                        <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>Total subscribers</div>
                      </div>
                      <div style={{ textAlign: 'center' as const, padding: '1rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569', marginTop: 6 }}>{new Date(cronConfig.lastRun).toLocaleString()}</div>
                        <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>Last run time</div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>No runs recorded yet. Stats will appear here after the first cron execution or manual trigger.</p>
                  )}
                </div>

                {/* Manual trigger */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#0f172a', margin: '0 0 0.5rem' }}>Manual Trigger</h3>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.25rem' }}>
                    Send the Morning Signal newsletter to <strong>all active subscribers right now</strong>, regardless of their local timezone. Deduplication still applies — subscribers who already received it today will be skipped.
                  </p>

                  {cronTriggerResult && (
                    <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', marginBottom: '1rem' }}>
                      <p style={{ margin: 0, fontWeight: 700, color: '#166534', fontSize: '0.9375rem' }}>
                        ✓ Trigger complete — sent {cronTriggerResult.sent}, skipped {cronTriggerResult.skipped}, errors {cronTriggerResult.errors}, out of {cronTriggerResult.total} total subscribers
                      </p>
                    </div>
                  )}
                  {cronTriggerError && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>{cronTriggerError}</div>}

                  <button onClick={handleCronTrigger} disabled={cronTriggering} style={{ padding: '0.75rem 1.75rem', background: cronTriggering ? '#94a3b8' : '#0ea5e9', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.9375rem', cursor: cronTriggering ? 'not-allowed' : 'pointer' }}>
                    {cronTriggering ? 'Running…' : 'Trigger Morning Signal Now'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </AdminErrorBoundary>
  );
}
