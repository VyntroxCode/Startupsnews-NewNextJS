'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getAuthHeaders } from '@/lib/admin-auth';

interface Category { id: number; name: string; slug?: string; }
interface UserOption { id: number; name: string; }
interface RssFeed {
  id: number; name: string; url: string; category_id: number; author_id: number;
  enabled: number; fetch_interval_minutes: number; max_items_per_fetch: number; auto_publish: number;
}

export default function EditRssFeedPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === 'string' ? parseInt(params.id, 10) : NaN;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    categoryId: '',
    authorId: '',
    enabled: true,
    fetchIntervalMinutes: 10,
    maxItemsPerFetch: 10,
    autoPublish: true,
  });
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState('');

  useEffect(() => {
    if (isNaN(id)) return;
    (async () => {
      try {
        const [feedRes, catRes, userRes] = await Promise.all([
          fetch(`/api/admin/rss-feeds/${id}`, { headers: getAuthHeaders() }),
          fetch('/api/admin/categories?limit=500', { headers: getAuthHeaders() }),
          fetch('/api/admin/users', { headers: getAuthHeaders() }),
        ]);
        const feedData = await feedRes.json();
        const catData = await catRes.json();
        const userData = await userRes.json();
        if (feedData.success && feedData.data) {
          const f: RssFeed = feedData.data;
          setFormData({
            name: f.name,
            url: f.url,
            categoryId: String(f.category_id),
            authorId: String(f.author_id),
            enabled: !!f.enabled,
            fetchIntervalMinutes: f.fetch_interval_minutes,
            maxItemsPerFetch: f.max_items_per_fetch,
            autoPublish: !!f.auto_publish,
          });
        }
        if (catData.success && catData.data?.length) setCategories(catData.data);
        if (userData.success && userData.data?.length) setUsers(userData.data);
      } catch {}
    })();
  }, [id]);

  const handleSuggestCategory = async () => {
    if (!formData.name.trim() && !formData.url.trim()) return;
    setSuggesting(true);
    setSuggestError('');
    try {
      const res = await fetch(
        `/api/admin/rss-feeds/suggest-category?name=${encodeURIComponent(formData.name)}&url=${encodeURIComponent(formData.url)}`,
        { headers: getAuthHeaders() }
      );
      const data = await res.json();
      if (data.success && data.data?.categoryId != null) {
        setFormData((prev) => ({ ...prev, categoryId: String(data.data.categoryId) }));
      } else if (data.success && data.data?.slug) {
        setSuggestError(`Suggested "${data.data.slug}" not in DB – select manually.`);
      }
    } catch {
      setSuggestError('Could not suggest category.');
    } finally {
      setSuggesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(id)) return;
    setError('');
    const categoryId = parseInt(formData.categoryId, 10);
    const authorId = parseInt(formData.authorId, 10);
    if (!formData.name.trim() || !formData.url.trim()) {
      setError('Name and URL are required.');
      return;
    }
    if (!categoryId || !authorId) {
      setError('Please select a category and an author.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/rss-feeds/${id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          url: formData.url.trim(),
          categoryId,
          authorId,
          enabled: formData.enabled,
          fetchIntervalMinutes: formData.fetchIntervalMinutes,
          maxItemsPerFetch: formData.maxItemsPerFetch,
          autoPublish: formData.autoPublish,
        }),
      });
      const data = await res.json();
      if (data.success) router.push('/admin/rss-feeds');
      else setError(data.error || 'Failed to update feed');
    } catch {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: 'clamp(1rem, 2vw, 2rem)', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 'clamp(1.5rem, 3vw, 2rem)' }}>
        <Link href="/admin/rss-feeds" style={{ color: '#ed8936', textDecoration: 'none', display: 'inline-block', marginBottom: '0.5rem', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>← Back to RSS Feeds</Link>
        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 'bold', color: '#1a202c', marginTop: '0.5rem' }}>Edit RSS Feed</h1>
      </div>
      {error && <div style={{ background: '#fed7d7', color: '#c53030', padding: 'clamp(0.75rem, 2vw, 1rem)', borderRadius: '4px', marginBottom: '1rem', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ background: 'white', padding: 'clamp(1.25rem, 3vw, 2rem)', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#4a5568', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Name *</label>
          <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: 'clamp(0.625rem, 1.5vw, 0.75rem)', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: 'clamp(0.875rem, 2vw, 1rem)', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#4a5568', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Feed URL *</label>
          <input type="url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} required style={{ width: '100%', padding: 'clamp(0.625rem, 1.5vw, 0.75rem)', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: 'clamp(0.875rem, 2vw, 1rem)', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#4a5568', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Category *</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} required style={{ flex: '1 1 200px', minWidth: 0, padding: 'clamp(0.625rem, 1.5vw, 0.75rem)', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: 'clamp(0.875rem, 2vw, 1rem)', boxSizing: 'border-box' }}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.slug ? ` (${c.slug})` : ''}</option>)}
            </select>
            <button type="button" onClick={handleSuggestCategory} disabled={suggesting} style={{ padding: 'clamp(0.5rem, 1vw, 0.625rem) clamp(1rem, 2vw, 1.25rem)', background: suggesting ? '#cbd5e1' : '#0ea5e9', color: 'white', border: 'none', borderRadius: '4px', fontSize: 'clamp(0.8125rem, 1.8vw, 0.875rem)', cursor: suggesting ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
              {suggesting ? '…' : 'Suggest category'}
            </button>
          </div>
          {suggestError && <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#b45309' }}>{suggestError}</p>}
        </div>
        <div style={{ marginBottom: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#4a5568', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Author *</label>
          <select value={formData.authorId} onChange={(e) => setFormData({ ...formData, authorId: e.target.value })} required style={{ width: '100%', padding: 'clamp(0.625rem, 1.5vw, 0.75rem)', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: 'clamp(0.875rem, 2vw, 1rem)', boxSizing: 'border-box' }}>
            <option value="">Select author</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#4a5568', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Fetch interval (minutes)</label>
          <input type="number" min={1} value={formData.fetchIntervalMinutes} onChange={(e) => setFormData({ ...formData, fetchIntervalMinutes: parseInt(e.target.value) || 10 })} style={{ width: '100%', padding: 'clamp(0.625rem, 1.5vw, 0.75rem)', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: 'clamp(0.875rem, 2vw, 1rem)', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#4a5568', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Max items per fetch</label>
          <input type="number" min={1} value={formData.maxItemsPerFetch} onChange={(e) => setFormData({ ...formData, maxItemsPerFetch: parseInt(e.target.value) || 10 })} style={{ width: '100%', padding: 'clamp(0.625rem, 1.5vw, 0.75rem)', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: 'clamp(0.875rem, 2vw, 1rem)', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 'clamp(1.25rem, 2.5vw, 1.5rem)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" id="enabled" checked={formData.enabled} onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })} style={{ width: 'clamp(18px, 2vw, 20px)', height: 'clamp(18px, 2vw, 20px)' }} />
          <label htmlFor="enabled" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Enabled</label>
        </div>
        <div style={{ marginBottom: 'clamp(1.25rem, 2.5vw, 1.5rem)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" id="autoPublish" checked={formData.autoPublish} onChange={(e) => setFormData({ ...formData, autoPublish: e.target.checked })} style={{ width: 'clamp(18px, 2vw, 20px)', height: 'clamp(18px, 2vw, 20px)' }} />
          <label htmlFor="autoPublish" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Auto-publish posts</label>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button type="submit" disabled={loading} style={{ padding: 'clamp(0.625rem, 1.5vw, 0.75rem) clamp(1.5rem, 4vw, 2rem)', background: loading ? '#a0aec0' : '#ed8936', color: 'white', border: 'none', borderRadius: '4px', fontSize: 'clamp(0.875rem, 2vw, 1rem)', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', flex: '1 1 auto', minWidth: '120px' }}>
            {loading ? 'Saving...' : 'Save'}
          </button>
          <Link href="/admin/rss-feeds" style={{ padding: 'clamp(0.625rem, 1.5vw, 0.75rem) clamp(1.5rem, 4vw, 2rem)', background: '#e2e8f0', color: '#4a5568', borderRadius: '4px', textDecoration: 'none', fontSize: 'clamp(0.875rem, 2vw, 1rem)', fontWeight: 500, display: 'inline-block', flex: '1 1 auto', minWidth: '120px', textAlign: 'center' }}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}
