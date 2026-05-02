'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuthHeaders } from '@/lib/admin-auth';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';

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
  category_name?: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

// Responsive styles
const styles = {
  container: {
    width: '100%',
    maxWidth: '100%',
    padding: 'clamp(1rem, 2vw, 2rem)',
    boxSizing: 'border-box' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    flexWrap: 'wrap' as const,
    gap: '1rem',
  },
  headerText: {
    flex: '1 1 300px',
    minWidth: 0,
  },
  title: {
    fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
    fontWeight: 700,
    marginBottom: '0.5rem',
    color: '#0f172a',
    lineHeight: '1.2',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
    margin: 0,
  },
  addButton: {
    padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(1.25rem, 3vw, 1.75rem)',
    background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
    color: 'white',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)',
    whiteSpace: 'nowrap' as const,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
  },
  emptyState: {
    padding: 'clamp(2rem, 5vw, 3rem)',
    textAlign: 'center' as const,
    background: '#f8fafc',
    borderRadius: '8px',
  },
  tableWrapper: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    overflowX: 'auto' as const,
    WebkitOverflowScrolling: 'touch' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    minWidth: '800px',
  },
  tableHeader: {
    background: '#f8fafc',
  },
  tableHeaderCell: {
    padding: 'clamp(0.75rem, 2vw, 1rem) clamp(0.875rem, 2vw, 1.25rem)',
    textAlign: 'left' as const,
    fontWeight: 600,
    fontSize: 'clamp(0.6875rem, 1.5vw, 0.75rem)',
    color: '#475569',
    textTransform: 'uppercase' as const,
    whiteSpace: 'nowrap' as const,
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
    padding: 'clamp(0.25rem, 1vw, 0.375rem) clamp(0.5rem, 1.5vw, 0.75rem)',
    fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginRight: '0.5rem',
    marginBottom: '0.25rem',
    whiteSpace: 'nowrap' as const,
    display: 'inline-block',
  },
  actionLink: {
    padding: 'clamp(0.25rem, 1vw, 0.375rem) clamp(0.5rem, 1.5vw, 0.75rem)',
    fontSize: 'clamp(0.6875rem, 1.5vw, 0.8125rem)',
    borderRadius: '6px',
    textDecoration: 'none',
    marginRight: '0.5rem',
    marginBottom: '0.25rem',
    whiteSpace: 'nowrap' as const,
    display: 'inline-block',
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

export default function RssFeedsPage() {
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fetchingId, setFetchingId] = useState<number | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [feedsRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/rss-feeds', { headers: getAuthHeaders() }),
        fetch('/api/admin/categories?limit=500', { headers: getAuthHeaders() }) // Filtered to sectors only via API
      ]);
      const feedsData = await feedsRes.json();
      const categoriesData = await categoriesRes.json();
      
      if (feedsData.success) setFeeds(feedsData.data);
      else setError(feedsData.error || 'Failed to load feeds');
      
      if (categoriesData.success) setCategories(categoriesData.data);
    } catch (e) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
        load();
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
      if (data.success) load();
      else alert(data.error || 'Update failed');
    } catch {
      alert('Update failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this RSS feed? Items and links will be removed.')) return;
    try {
      const res = await fetch(`/api/admin/rss-feeds/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) load();
      else alert(data.error || 'Delete failed');
    } catch {
      alert('Delete failed');
    }
  };

  // Hook to detect mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter feeds by category
  const filteredFeeds = selectedCategoryId 
    ? feeds.filter(feed => String(feed.category_id) === selectedCategoryId)
    : feeds;

  // Render feed card for mobile
  const renderFeedCard = (feed: RssFeed) => (
    <div key={feed.id} style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>{feed.name}</div>
        <div style={styles.cardUrl} title={feed.url}>{feed.url}</div>
      </div>
      <div style={styles.cardRow}>
        <span style={styles.cardLabel}>Category:</span>
        <span style={styles.cardValue}>{feed.category_name ?? '—'}</span>
      </div>
      <div style={styles.cardRow}>
        <span style={styles.cardLabel}>Interval:</span>
        <span style={styles.cardValue}>{feed.fetch_interval_minutes} min</span>
      </div>
      <div style={styles.cardRow}>
        <span style={styles.cardLabel}>Last Fetch:</span>
        <span style={styles.cardValue}>
          {feed.last_fetched_at ? new Date(feed.last_fetched_at).toLocaleString() : '—'}
        </span>
      </div>
      <div style={styles.cardRow}>
        <span style={styles.cardLabel}>Status:</span>
        <span>
          <span style={{
            ...styles.statusBadge,
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
      <div style={styles.cardActions}>
        <button
          type="button"
          onClick={() => handleFetch(feed.id)}
          disabled={!!fetchingId}
          style={{
            ...styles.cardButton,
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
            ...styles.cardButton,
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
            ...styles.cardButton,
            background: '#64748b',
            color: 'white',
          }}
        >
          {feed.enabled ? 'Disable' : 'Enable'}
        </button>
        <Link
          href={`/admin/rss-feeds/edit/${feed.id}`}
          style={{
            ...styles.cardLink,
            background: '#f59e0b',
            color: 'white',
          }}
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={() => handleDelete(feed.id)}
          style={{
            ...styles.cardButton,
            background: '#dc2626',
            color: 'white',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );

  return (
    <AdminErrorBoundary>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerText}>
            <h2 style={styles.title}>RSS Feeds</h2>
            <p style={styles.subtitle}>Manage feeds; fetch or test from dashboard.</p>
          </div>
          <Link href="/admin/rss-feeds/create" style={styles.addButton}>
            + Add RSS Feed
          </Link>
        </div>

        {/* Category Filter */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label htmlFor="category-filter" style={{ fontWeight: 500, color: '#475569', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
            Filter by Category:
          </label>
          <select
            id="category-filter"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
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
            {categories.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>
                {cat.name}
              </option>
            ))}
          </select>
          {selectedCategoryId && (
            <button
              type="button"
              onClick={() => setSelectedCategoryId('')}
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
        </div>

        {error && (
          <div style={styles.errorBox}>{error}</div>
        )}

        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading...</p>
        ) : filteredFeeds.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
              {selectedCategoryId ? 'No feeds found in this category.' : 'No RSS feeds yet.'}
            </p>
            {!selectedCategoryId && (
              <Link href="/admin/rss-feeds/create" style={{ color: '#ed8936', fontWeight: 600, fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                Add your first feed
              </Link>
            )}
          </div>
        ) : isMobile ? (
          // Mobile Card View
          <div style={styles.cardContainer}>
            {filteredFeeds.map(renderFeedCard)}
          </div>
        ) : (
          // Desktop Table View
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableHeaderCell}>Name</th>
                  <th style={styles.tableHeaderCell}>URL</th>
                  <th style={styles.tableHeaderCell}>Category</th>
                  <th style={styles.tableHeaderCell}>Interval</th>
                  <th style={styles.tableHeaderCell}>Last fetch</th>
                  <th style={styles.tableHeaderCell}>Status</th>
                  <th style={{ ...styles.tableHeaderCell, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeeds.map((feed, i) => (
                  <tr key={feed.id} style={{ borderTop: i ? '1px solid #e2e8f0' : undefined }}>
                    <td style={{ ...styles.tableCell, fontWeight: 500 }}>{feed.name}</td>
                    <td style={{ ...styles.tableCell, ...styles.urlCell }} title={feed.url}>
                      {feed.url}
                    </td>
                    <td style={{ ...styles.tableCell, color: '#64748b' }}>
                      {feed.category_name ?? '—'}
                    </td>
                    <td style={{ ...styles.tableCell, color: '#64748b' }}>
                      {feed.fetch_interval_minutes} min
                    </td>
                    <td style={{ ...styles.tableCell, color: '#64748b' }}>
                      {feed.last_fetched_at ? new Date(feed.last_fetched_at).toLocaleString() : '—'}
                    </td>
                    <td style={styles.tableCell}>
                      <span style={{
                        ...styles.statusBadge,
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
                    <td style={{ ...styles.tableCell, ...styles.actionsCell }}>
                      <button
                        type="button"
                        onClick={() => handleFetch(feed.id)}
                        disabled={!!fetchingId}
                        style={{
                          ...styles.actionButton,
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
                          ...styles.actionButton,
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
                          ...styles.actionButton,
                          background: '#64748b',
                          color: 'white',
                        }}
                      >
                        {feed.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <Link
                        href={`/admin/rss-feeds/edit/${feed.id}`}
                        style={{
                          ...styles.actionLink,
                          background: '#f59e0b',
                          color: 'white',
                        }}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(feed.id)}
                        style={{
                          ...styles.actionButton,
                          background: '#dc2626',
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
      </div>
    </AdminErrorBoundary>
  );
}
