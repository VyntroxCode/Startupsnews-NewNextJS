'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getAdminUser, getAuthHeaders } from '@/lib/admin-auth';
import { isPathAllowed } from '@/lib/admin-role-access';
import { useAdminData } from '@/hooks/useAdminData';
import Pagination from '@/components/admin/Pagination';
import SearchBar from '@/components/admin/SearchBar';
import LoadingSkeleton from '@/components/admin/LoadingSkeleton';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import { fetchAndDownloadCsv } from '@/shared/utils/csv-utils';
import { getPostPath } from '@/lib/post-utils';

type Tab = 'posts' | 'industry' | 'authors';

interface FilterCategory {
  id: number;
  name: string;
  slug: string;
}

interface FilterAuthor {
  id: number;
  name: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  categorySlug: string;
  status?: string;
  httpStatus?: number;
  isGone410?: boolean;
  featured?: boolean;
  date: string;
  category: string;
  source?: 'manual' | 'rss';
  rssFeedName?: string;
  authorName?: string;
}

type BulkScope = 'selected' | 'published' | 'draft' | 'archived' | 'unpublished';
type TargetHttpCode = '200' | '404' | '410';

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  sortOrder?: number;
  description?: string;
}

interface AuthorItem {
  id: number;
  name: string;
  avatarUrl?: string;
  authorDescription?: string;
  isDefaultAuthor?: boolean;
  isActive: boolean;
}

export default function PostsPage() {
  const role = getAdminUser()?.role || '';
  const canIndustry = isPathAllowed(role, '/admin/categories');
  const canAuthors = isPathAllowed(role, '/admin/authors');
  const tabs = useMemo(() => ([
    { id: 'posts' as Tab, label: 'Posts' },
    ...(canIndustry ? [{ id: 'industry' as Tab, label: 'Industry' }] : []),
    ...(canAuthors ? [{ id: 'authors' as Tab, label: 'Authors' }] : []),
  ]), [canIndustry, canAuthors]);

  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab') as Tab | null;
  const initialTab: Tab = requestedTab && tabs.some((t) => t.id === requestedTab) ? requestedTab : 'posts';
  const [tab, setTab] = useState<Tab>(initialTab);

  /* ── Posts tab state ── */
  const [categories, setCategories] = useState<FilterCategory[]>([]);
  const [filterAuthors, setFilterAuthors] = useState<FilterAuthor[]>([]);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkScope, setBulkScope] = useState<BulkScope>('selected');
  const [targetHttpCode, setTargetHttpCode] = useState<TargetHttpCode>('410');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const isAdmin = getAdminUser()?.role === 'admin';
  const isEventAdmin = getAdminUser()?.role === 'event_admin';

  const {
    data: posts,
    loading,
    error,
    refetch,
    pagination,
    search,
    filters,
    setPage,
    setLimit,
    setSearch,
    setFilters,
  } = useAdminData<Post>({
    endpoint: '/api/admin/posts',
    limit: 20,
    disableCache: true,
    enabled: tab === 'posts',
  });

  // Load categories and authors for the filter dropdowns on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch('/api/admin/categories?limit=500', { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) setCategories(data.data);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    const loadAuthors = async () => {
      try {
        const res = await fetch('/api/admin/authors', { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) setFilterAuthors(data.data);
      } catch (err) {
        console.error('Failed to load authors:', err);
      }
    };
    loadCategories();
    loadAuthors();
  }, []);

  const handleDeletePost = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/posts/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error || 'Failed to delete post');
        return;
      }

      // Optimistic update - remove from list immediately
      refetch();
    } catch {
      alert('An error occurred while deleting the post');
    }
  }, [refetch]);

  const handleStatusFilter = useCallback((status: string | null) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (status) {
        next.status = status;
      } else {
        delete next.status;
      }
      // Clear scheduled date filters when changing away from scheduled
      if (status !== 'scheduled') {
        delete next.scheduledFrom;
        delete next.scheduledTo;
      }
      return next;
    });
  }, [setFilters]);

  const handleScheduledFromChange = useCallback((value: string) => {
    setFilters((prev) => {
      if (!value) { const { scheduledFrom: _, ...rest } = prev; return rest; }
      return { ...prev, scheduledFrom: value };
    });
  }, [setFilters]);

  const handleScheduledToChange = useCallback((value: string) => {
    setFilters((prev) => {
      if (!value) { const { scheduledTo: _, ...rest } = prev; return rest; }
      return { ...prev, scheduledTo: value };
    });
  }, [setFilters]);

  const handleSourceFilter = useCallback((source: string | null) => {
    setFilters((prev) => {
      if (source === 'manual' || source === 'rss') return { ...prev, source };
      const { source: _, ...rest } = prev;
      return rest;
    });
  }, [setFilters]);

  const handleCategoryFilter = useCallback((categoryId: string | null) => {
    setFilters((prev) => {
      if (categoryId) return { ...prev, categoryId };
      const { categoryId: _, ...rest } = prev;
      return rest;
    });
  }, [setFilters]);

  const handleAuthorFilter = useCallback((authorId: string | null) => {
    setFilters((prev) => {
      if (authorId) return { ...prev, authorId };
      const { authorId: _, ...rest } = prev;
      return rest;
    });
  }, [setFilters]);

  const handleDateFromChange = useCallback((value: string) => {
    setFilters((prev) => {
      if (!value) { const { dateFrom: _, ...rest } = prev; return rest; }
      return { ...prev, dateFrom: value };
    });
  }, [setFilters]);

  const handleDateToChange = useCallback((value: string) => {
    setFilters((prev) => {
      if (!value) { const { dateTo: _, ...rest } = prev; return rest; }
      return { ...prev, dateTo: value };
    });
  }, [setFilters]);

  const clearDateFilter = useCallback(() => {
    setFilters((prev) => {
      const { dateFrom: _f, dateTo: _t, ...rest } = prev;
      return rest;
    });
  }, [setFilters]);

  useEffect(() => {
    setSelectedPostIds(new Set());
  }, [posts]);

  const toggleSelectPost = useCallback((postId: string, checked: boolean) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(postId);
      else next.delete(postId);
      return next;
    });
  }, []);

  const toggleSelectAllOnPage = useCallback((checked: boolean) => {
    setSelectedPostIds(() => {
      if (!checked) return new Set();
      return new Set(posts.map((p) => p.id));
    });
  }, [posts]);

  useEffect(() => {
    if (!actionNotice) return;
    const t = setTimeout(() => setActionNotice(null), 3500);
    return () => clearTimeout(t);
  }, [actionNotice]);

  const applyBulkStatus = useCallback(async () => {
    const targetLabel = targetHttpCode;
    const confirmed = confirm(
      bulkScope === 'selected'
        ? `Set ${selectedPostIds.size} selected post(s) to HTTP ${targetLabel}?`
        : `Set all ${bulkScope} posts (with current source/category/search filters) to HTTP ${targetLabel}?`
    );
    if (!confirmed) return;

    if (bulkScope === 'selected' && selectedPostIds.size === 0) {
      setActionNotice({ type: 'error', text: 'Select at least one post first.' });
      return;
    }

    setBulkLoading(true);
    setActionNotice(null);
    try {
      const source = filters.source === 'manual' || filters.source === 'rss' ? filters.source : null;
      const categoryId = filters.categoryId ? Number(filters.categoryId) : null;
      const body = bulkScope === 'selected'
        ? {
          selectionMode: 'selected',
          targetHttpStatus: Number(targetHttpCode),
          postIds: Array.from(selectedPostIds).map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0),
        }
        : {
          selectionMode: 'byStatus',
          targetHttpStatus: Number(targetHttpCode),
          statusScope: bulkScope,
          source,
          categoryId: Number.isFinite(categoryId) ? categoryId : null,
          search,
        };

      const response = await fetch('/api/admin/posts/bulk-status', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!data.success) {
        setActionNotice({ type: 'error', text: data.error || 'Failed to apply status code.' });
        return;
      }

      setActionNotice({ type: 'success', text: data.message || `Updated ${data?.data?.updated || 0} post(s).` });
      setSelectedPostIds(new Set());
      await refetch();
    } catch {
      setActionNotice({ type: 'error', text: 'An error occurred while applying the status update.' });
    } finally {
      setBulkLoading(false);
    }
  }, [bulkScope, filters.categoryId, filters.source, refetch, search, selectedPostIds, targetHttpCode]);

  const allOnPageSelected = posts.length > 0 && posts.every((p) => selectedPostIds.has(p.id));

  const handleExportCsv = useCallback(async () => {
    try {
      await fetchAndDownloadCsv(
        '/api/admin/posts/export-csv',
        `posts-${new Date().toISOString().split('T')[0]}.csv`,
        getAuthHeaders()
      );
      setActionNotice({ type: 'success', text: 'Posts exported successfully!' });
    } catch (error) {
      console.error('Export failed:', error);
      setActionNotice({ type: 'error', text: 'Failed to export posts.' });
    }
  }, []);

  /* ── Industry tab state ── */
  const {
    data: industryItems,
    loading: industryLoading,
    error: industryError,
    refetch: refetchIndustry,
    pagination: industryPagination,
    search: industrySearch,
    setSearch: setIndustrySearch,
    setPage: setIndustryPage,
    setLimit: setIndustryLimit,
  } = useAdminData<CategoryItem>({
    endpoint: '/api/admin/categories',
    limit: 50,
    enabled: tab === 'industry',
  });

  const handleDeleteIndustry = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to delete this Industry? Posts and RSS feeds using it may need to be reassigned first.')) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        console.error('Failed to delete Industry:', { id, status: response.status, response: data });
        alert(data.error || `Failed to delete Industry (${response.status})`);
        return;
      }
      // Broadcast data refresh event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('admin:data-updated'));
      }
      // Wait briefly for cache to clear
      await new Promise(resolve => setTimeout(resolve, 100));
      await refetchIndustry();
    } catch (err) {
      console.error('Error deleting Industry:', err);
      alert('An error occurred while deleting the Industry');
    }
  }, [refetchIndustry]);

  /* ── Authors tab state ── */
  const {
    data: authorItems,
    loading: authorsLoading,
    error: authorsError,
    refetch: refetchAuthors,
    pagination: authorsPagination,
    search: authorsSearch,
    setSearch: setAuthorsSearch,
    setPage: setAuthorsPage,
    setLimit: setAuthorsLimit,
  } = useAdminData<AuthorItem>({
    endpoint: '/api/admin/authors?includeInactive=true',
    limit: 50,
    disableCache: true,
    enabled: tab === 'authors',
  });

  const handleDeleteAuthor = useCallback(
    async (id: number) => {
      if (!confirm('Are you sure you want to remove this author?')) return;
      try {
        const response = await fetch(`/api/admin/authors/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!data.success) {
          alert(data.error || 'Failed to remove author');
          return;
        }
        refetchAuthors();
      } catch {
        alert('An error occurred while removing the author');
      }
    },
    [refetchAuthors]
  );

  const handleSetDefaultAuthor = useCallback(
    async (id: number) => {
      try {
        const response = await fetch(`/api/admin/authors/${id}`, {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ setAsDefault: true }),
        });
        const data = await response.json();
        if (!data.success) {
          alert(data.error || 'Failed to set default author');
          return;
        }
        refetchAuthors();
      } catch {
        alert('An error occurred while setting default author');
      }
    },
    [refetchAuthors]
  );

  return (
    <AdminErrorBoundary>
      <div>
        {/* ── Page Header ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <h2 style={{
              fontSize: '2.25rem',
              fontWeight: '700',
              marginBottom: '1rem',
              color: '#0f172a',
              letterSpacing: '-0.02em',
            }}>
              Posts
            </h2>
            <p style={{
              color: '#64748b',
              fontSize: '1rem',
              margin: 0,
            }}>
              Manage posts, industries, and authors
            </p>
          </div>
          {tab === 'posts' && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Link
                href="/admin/posts/create"
                style={{
                  padding: '0.875rem 1.75rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '0.9375rem',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create New Post
              </Link>
              <button
                onClick={handleExportCsv}
                style={{
                  padding: '0.875rem 1.75rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '0.9375rem',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export CSV
              </button>
            </div>
          )}
          {tab === 'industry' && (
            <Link
              href="/admin/categories/create"
              style={{
                padding: '0.875rem 1.75rem',
                background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9375rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(237, 137, 54, 0.3)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create Industry
            </Link>
          )}
          {tab === 'authors' && (
            <Link
              href="/admin/authors/create"
              style={{
                padding: '0.875rem 1.75rem',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9375rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              }}
            >
              + Add Author
            </Link>
          )}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', marginBottom: '2rem' }}>
          {tabs.map(t => (
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
            TAB 1 — POSTS
        ══════════════════════════════════════ */}
        {tab === 'posts' && (
          <>
            {/* Search and Filters */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search posts by title, excerpt, or slug..."
              />
              {/* Status filter buttons */}
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {([
                  { value: '', label: 'All' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'archived', label: 'Archived' },
                ] as const).map(({ value, label }) => {
                  const active = (filters.status ?? '') === value;
                  const colorMap: Record<string, { bg: string; color: string; border: string; activeBg: string; activeColor: string; activeBorder: string }> = {
                    '':          { bg: 'white',    color: '#475569', border: '#e2e8f0', activeBg: '#0f172a',  activeColor: 'white',   activeBorder: '#0f172a' },
                    draft:       { bg: 'white',    color: '#991b1b', border: '#fca5a5', activeBg: '#ef4444',  activeColor: 'white',   activeBorder: '#ef4444' },
                    published:   { bg: 'white',    color: '#065f46', border: '#a7f3d0', activeBg: '#10b981',  activeColor: 'white',   activeBorder: '#10b981' },
                    scheduled:   { bg: 'white',    color: '#1e40af', border: '#bfdbfe', activeBg: '#3b82f6',  activeColor: 'white',   activeBorder: '#3b82f6' },
                    archived:    { bg: 'white',    color: '#475569', border: '#cbd5e1', activeBg: '#64748b',  activeColor: 'white',   activeBorder: '#64748b' },
                  };
                  const c = colorMap[value];
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleStatusFilter(value || null)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        border: `2px solid ${active ? c.activeBorder : c.border}`,
                        background: active ? c.activeBg : c.bg,
                        color: active ? c.activeColor : c.color,
                        fontWeight: '600',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {/* Scheduled date/time range picker */}
              {filters.status === 'scheduled' && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <input
                    type="datetime-local"
                    value={String(filters.scheduledFrom ?? '')}
                    onChange={(e) => handleScheduledFromChange(e.target.value)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '2px solid #bfdbfe',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      background: 'white',
                      color: '#1e40af',
                      cursor: 'pointer',
                    }}
                    placeholder="From"
                  />
                  <span style={{ color: '#64748b', fontSize: '0.8125rem', fontWeight: '500' }}>to</span>
                  <input
                    type="datetime-local"
                    value={String(filters.scheduledTo ?? '')}
                    onChange={(e) => handleScheduledToChange(e.target.value)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '2px solid #bfdbfe',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      background: 'white',
                      color: '#1e40af',
                      cursor: 'pointer',
                    }}
                    placeholder="To"
                  />
                </div>
              )}
              <select
                value={String(filters.source ?? '')}
                onChange={(e) => handleSourceFilter(e.target.value || null)}
                style={{
                  padding: '0.75rem 1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  background: 'white',
                  cursor: 'pointer',
                  color: '#475569',
                  minWidth: '150px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#6366f1';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="">All Sources</option>
                <option value="manual">Manual Posts</option>
                <option value="rss">RSS Posts</option>
              </select>
              {!isEventAdmin && (
                <select
                  value={String(filters.categoryId ?? '')}
                  onChange={(e) => handleCategoryFilter(e.target.value || null)}
                  style={{
                    padding: '0.75rem 1rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9375rem',
                    background: 'white',
                    cursor: 'pointer',
                    color: '#475569',
                    minWidth: '150px',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={String(filters.authorId ?? '')}
                onChange={(e) => handleAuthorFilter(e.target.value || null)}
                style={{
                  padding: '0.75rem 1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  background: 'white',
                  cursor: 'pointer',
                  color: '#475569',
                  minWidth: '150px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#6366f1';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="">All Authors</option>
                {filterAuthors.map((author) => (
                  <option key={author.id} value={String(author.id)}>
                    {author.name}
                  </option>
                ))}
              </select>

              {/* Published date range filter */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <input
                  type="date"
                  value={String(filters.dateFrom ?? '')}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  style={{
                    padding: '0.6rem 0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    background: 'white',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                  title="Published from"
                />
                <span style={{ color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 500 }}>—</span>
                <input
                  type="date"
                  value={String(filters.dateTo ?? '')}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  style={{
                    padding: '0.6rem 0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    background: 'white',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                  title="Published to"
                />
                {(filters.dateFrom || filters.dateTo) && (
                  <button
                    type="button"
                    onClick={clearDateFilter}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      background: 'white',
                      color: '#64748b',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                    title="Clear date filter"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {isAdmin && (
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}>
                <select
                  value={bulkScope}
                  onChange={(e) => setBulkScope(e.target.value as BulkScope)}
                  style={{
                    padding: '0.65rem 0.9rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    color: '#0f172a',
                    fontWeight: '600',
                    minWidth: '220px',
                  }}
                >
                  <option value="selected">Selected posts ({selectedPostIds.size})</option>
                  <option value="published">All published posts</option>
                  <option value="draft">All draft posts</option>
                  <option value="archived">All archived posts</option>
                  <option value="unpublished">All unpublished (draft + archived)</option>
                </select>

                <select
                  value={targetHttpCode}
                  onChange={(e) => setTargetHttpCode(e.target.value as TargetHttpCode)}
                  style={{
                    padding: '0.65rem 0.9rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    color: '#0f172a',
                    fontWeight: '600',
                    minWidth: '170px',
                  }}
                >
                  <option value="200">Set HTTP 200</option>
                  <option value="404">Set HTTP 404</option>
                  <option value="410">Set HTTP 410</option>
                </select>

                <button
                  type="button"
                  disabled={bulkLoading || (bulkScope === 'selected' && selectedPostIds.size === 0)}
                  onClick={applyBulkStatus}
                  style={{
                    padding: '0.65rem 0.9rem',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    background: '#0f172a',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {bulkLoading ? 'Applying...' : 'Apply'}
                </button>
              </div>
            )}

            {actionNotice && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.9rem 1rem',
                borderRadius: '8px',
                border: `1px solid ${actionNotice.type === 'success' ? '#86efac' : '#fca5a5'}`,
                background: actionNotice.type === 'success' ? '#dcfce7' : '#fee2e2',
                color: actionNotice.type === 'success' ? '#166534' : '#991b1b',
                fontWeight: '600',
                fontSize: '0.875rem',
              }}>
                {actionNotice.text}
              </div>
            )}

            {error && (
              <div style={{
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                color: '#991b1b',
                padding: '1rem 1.25rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                border: '1px solid #fca5a5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => refetch()}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#b91c1c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {loading ? (
              <LoadingSkeleton rows={10} columns={8} />
            ) : posts.length === 0 ? (
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                padding: '4rem 2rem',
                borderRadius: '12px',
                textAlign: 'center',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 1.5rem',
                  background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <h3 style={{ color: '#0f172a', fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  No posts found
                </h3>
                <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                  Get started by creating your first blog post
                </p>
                <Link
                  href="/admin/posts/create"
                  style={{
                    padding: '0.875rem 1.75rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.9375rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Create Your First Post
                </Link>
              </div>
            ) : (
              <>
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
                  border: '1px solid rgba(0, 0, 0, 0.04)',
                }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'separate',
                      borderSpacing: 0,
                    }}>
                      <thead>
                        <tr style={{
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        }}>
                          {isAdmin && (
                            <th style={{
                              padding: '1.25rem 0.75rem',
                              textAlign: 'center',
                              fontWeight: '600',
                              fontSize: '0.75rem',
                              color: '#475569',
                              borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                              width: '40px',
                            }}>
                              <input
                                type="checkbox"
                                checked={allOnPageSelected}
                                onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                              />
                            </th>
                          )}
                          <th style={{
                            padding: '1.25rem 1.5rem',
                            textAlign: 'left',
                            fontWeight: '600',
                            fontSize: '0.75rem',
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                          }}>
                            Title
                          </th>
                          <th style={{
                            padding: '1.25rem 1.5rem',
                            textAlign: 'left',
                            fontWeight: '600',
                            fontSize: '0.75rem',
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                          }}>
                            Category
                          </th>
                          <th style={{
                            padding: '1.25rem 1.5rem',
                            textAlign: 'left',
                            fontWeight: '600',
                            fontSize: '0.75rem',
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                          }}>
                            Author
                          </th>
                          <th style={{
                            padding: '1.25rem 1.5rem',
                            textAlign: 'left',
                            fontWeight: '600',
                            fontSize: '0.75rem',
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                          }}>
                            Source
                          </th>
                          <th style={{
                            padding: '1.25rem 1.5rem',
                            textAlign: 'left',
                            fontWeight: '600',
                            fontSize: '0.75rem',
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                          }}>
                            HTTP
                          </th>
                          <th style={{
                            padding: '1.25rem 1.5rem',
                            textAlign: 'left',
                            fontWeight: '600',
                            fontSize: '0.75rem',
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                          }}>
                            Status
                          </th>
                          <th style={{
                            padding: '1.25rem 1.5rem',
                            textAlign: 'left',
                            fontWeight: '600',
                            fontSize: '0.75rem',
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                          }}>
                            Date
                          </th>
                          <th style={{
                            padding: '1.25rem 1.5rem',
                            textAlign: 'right',
                            fontWeight: '600',
                            fontSize: '0.75rem',
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                          }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {posts.map((post, index) => (
                          <tr
                            key={post.id || post.slug || `post-${index}`}
                            style={{
                              borderBottom: index < posts.length - 1 ? '1px solid rgba(0, 0, 0, 0.04)' : 'none',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f8fafc';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            {isAdmin && (
                              <td style={{ padding: '1.25rem 0.75rem', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedPostIds.has(post.id)}
                                  onChange={(e) => toggleSelectPost(post.id, e.target.checked)}
                                />
                              </td>
                            )}
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '0.25rem' }}>
                                {post.title}
                              </div>
                              {Boolean(post.featured) && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.125rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                  color: '#78350f',
                                  marginTop: '0.5rem',
                                }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                  </svg>
                                  Featured
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.9375rem' }}>
                              {post.category}
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.9375rem' }}>
                              {post.authorName || '—'}
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '0.375rem 0.875rem',
                                  borderRadius: '6px',
                                  fontSize: '0.8125rem',
                                  fontWeight: '600',
                                  background: post.source === 'rss'
                                    ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
                                    : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                                  color: post.source === 'rss' ? '#1e40af' : '#374151',
                                  border: `1px solid ${post.source === 'rss' ? '#bfdbfe' : '#e5e7eb'}`,
                                  width: 'fit-content',
                                }}>
                                  {post.source === 'rss' ? (
                                    <>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '0.25rem' }}>
                                        <path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248-1.796 0-3.252-1.454-3.252-3.248 0-1.794 1.456-3.248 3.252-3.248 1.795.001 3.251 1.454 3.251 3.248zm-6.503-12.572v4.811c6.05.062 10.96 4.966 11.022 11.009h4.817c-.062-8.71-7.118-15.758-15.839-15.82zm0-3.368c10.58.046 19.152 8.594 19.183 19.188h4.817c-.03-13.231-10.755-23.954-24-24v4.812z"/>
                                      </svg>
                                      RSS
                                    </>
                                  ) : (
                                    <>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.25rem' }}>
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                      </svg>
                                      Manual
                                    </>
                                  )}
                                </span>
                                {post.source === 'rss' && post.rssFeedName && (
                                  <span style={{
                                    fontSize: '0.75rem',
                                    color: '#64748b',
                                    marginTop: '0.125rem',
                                  }}>
                                    {post.rssFeedName}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.375rem 0.875rem',
                                borderRadius: '6px',
                                fontSize: '0.8125rem',
                                fontWeight: '700',
                                ...(post.httpStatus === 410
                                  ? { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }
                                  : post.httpStatus === 200
                                    ? { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }
                                    : { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }),
                              }}>
                                {post.httpStatus || 404}
                              </span>
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.375rem 0.875rem',
                                borderRadius: '6px',
                                fontSize: '0.8125rem',
                                fontWeight: '600',
                                ...(post.status === 'published'
                                  ? { background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', color: '#065f46', border: '1px solid #a7f3d0' }
                                  : post.status === 'archived'
                                    ? { background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', color: '#475569', border: '1px solid #cbd5e1' }
                                    : post.status === 'scheduled'
                                      ? { background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', color: '#1e40af', border: '1px solid #bfdbfe' }
                                      : { background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', color: '#991b1b', border: '1px solid #fca5a5' }
                                ),
                              }}>
                                {post.status || 'draft'}
                              </span>
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.9375rem' }}>
                              {post.date}
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <a
                                  href={getPostPath(post)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View on website"
                                  style={{
                                    padding: '0.5rem 0.75rem',
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    color: 'white',
                                    borderRadius: '6px',
                                    textDecoration: 'none',
                                    fontSize: '0.8125rem',
                                    fontWeight: '600',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                  </svg>
                                  View
                                </a>
                                <Link
                                  href={`/admin/posts/edit/${post.id}`}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    color: 'white',
                                    borderRadius: '6px',
                                    textDecoration: 'none',
                                    fontSize: '0.8125rem',
                                    fontWeight: '600',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(245, 158, 11, 0.3)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(245, 158, 11, 0.2)';
                                  }}
                                >
                                  Edit
                                </Link>
                                <button
                                  onClick={() => handleDeletePost(post.id)}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.8125rem',
                                    fontWeight: '600',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.2)';
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {pagination && pagination.totalPages > 1 && (
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                    limit={pagination.limit}
                    total={pagination.total}
                    onLimitChange={setLimit}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            TAB 2 — INDUSTRY
        ══════════════════════════════════════ */}
        {tab === 'industry' && (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <SearchBar
                value={industrySearch}
                onChange={setIndustrySearch}
                placeholder="Search by name or slug..."
              />
            </div>

            {industryError && (
              <div style={{
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                color: '#991b1b',
                padding: '1rem 1.25rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                border: '1px solid #fca5a5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}>
                <span>{industryError}</span>
                <button type="button" onClick={() => refetchIndustry()} style={{ padding: '0.5rem 1rem', background: '#b91c1c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: '600' }}>Retry</button>
              </div>
            )}

            {industryLoading ? (
              <LoadingSkeleton rows={10} columns={4} />
            ) : industryItems.length === 0 ? (
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                padding: '4rem 2rem',
                borderRadius: '12px',
                textAlign: 'center',
                border: '1px solid rgba(0, 0, 0, 0.04)',
              }}>
                <h3 style={{ color: '#0f172a', fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>No categories found</h3>
                <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>Create the 15 canonical categories or add your first Industry.</p>
                <Link
                  href="/admin/categories/create"
                  style={{
                    padding: '0.875rem 1.75rem',
                    background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.9375rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  Create Industry
                </Link>
              </div>
            ) : (
              <>
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                  border: '1px solid rgba(0, 0, 0, 0.04)',
                }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                          <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Name</th>
                          <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Slug</th>
                          <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {industryItems.map((cat, index) => (
                          <tr
                            key={cat.id}
                            style={{
                              borderBottom: index < industryItems.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <td style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: '#0f172a' }}>{cat.name}</td>
                            <td style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.9375rem' }}>{cat.slug}</td>
                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <Link
                                  href={`/admin/categories/edit/${cat.id}`}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    color: 'white',
                                    borderRadius: '6px',
                                    textDecoration: 'none',
                                    fontSize: '0.8125rem',
                                    fontWeight: '600',
                                  }}
                                >
                                  Edit
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteIndustry(cat.id)}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '0.8125rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {industryPagination && industryPagination.totalPages > 1 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <Pagination
                      currentPage={industryPagination.page}
                      totalPages={industryPagination.totalPages}
                      onPageChange={setIndustryPage}
                      total={industryPagination.total}
                      limit={industryPagination.limit}
                      onLimitChange={setIndustryLimit}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            TAB 3 — AUTHORS
        ══════════════════════════════════════ */}
        {tab === 'authors' && (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <SearchBar value={authorsSearch} onChange={setAuthorsSearch} placeholder="Search by name or description..." />
            </div>

            {authorsError && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                  color: '#991b1b',
                  padding: '1rem 1.25rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  fontSize: '0.875rem',
                  border: '1px solid #fca5a5',
                }}
              >
                {authorsError}
              </div>
            )}

            {authorsLoading ? (
              <LoadingSkeleton rows={8} columns={5} />
            ) : authorItems.length === 0 ? (
              <div
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  padding: '3rem 2rem',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid rgba(0, 0, 0, 0.04)',
                }}
              >
                <h3 style={{ color: '#0f172a' }}>No authors found</h3>
                <p style={{ color: '#64748b' }}>Create your first author to assign on manual posts.</p>
              </div>
            ) : (
              <>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                    border: '1px solid rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                          <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Photo</th>
                          <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Name</th>
                          <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Description</th>
                          <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Default</th>
                          <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Status</th>
                          <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {authorItems.map((author, index) => (
                          <tr
                            key={author.id}
                            style={{ borderBottom: index < authorItems.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              {author.avatarUrl ? (
                                <img
                                  src={author.avatarUrl}
                                  alt={author.name}
                                  style={{ width: 40, height: 40, borderRadius: '999px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                                />
                              ) : (
                                <div style={{ width: 40, height: 40, borderRadius: '999px', background: '#e2e8f0' }} />
                              )}
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600, color: '#0f172a' }}>{author.name}</td>
                            <td style={{ padding: '1.25rem 1.5rem', color: '#64748b', maxWidth: 320 }}>
                              <span style={{ display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
                                {author.authorDescription || '-'}
                              </span>
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              {author.isDefaultAuthor ? (
                                <span
                                  style={{
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    background: '#dbeafe',
                                    color: '#1e40af',
                                  }}
                                >
                                  Default
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultAuthor(author.id)}
                                  style={{
                                    padding: '0.35rem 0.7rem',
                                    borderRadius: '6px',
                                    border: '1px solid #93c5fd',
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Set Default
                                </button>
                              )}
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <span
                                style={{
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '999px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: author.isActive ? '#dcfce7' : '#e2e8f0',
                                  color: author.isActive ? '#166534' : '#475569',
                                }}
                              >
                                {author.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                <Link
                                  href={`/admin/authors/edit/${author.id}`}
                                  style={{
                                    padding: '0.45rem 0.85rem',
                                    background: '#0ea5e9',
                                    color: 'white',
                                    borderRadius: '6px',
                                    textDecoration: 'none',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                  }}
                                >
                                  Edit
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAuthor(author.id)}
                                  style={{
                                    padding: '0.45rem 0.85rem',
                                    background: '#ef4444',
                                    color: 'white',
                                    borderRadius: '6px',
                                    border: 'none',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {authorsPagination && authorsPagination.totalPages > 1 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <Pagination
                      currentPage={authorsPagination.page}
                      totalPages={authorsPagination.totalPages}
                      onPageChange={setAuthorsPage}
                      total={authorsPagination.total}
                      limit={authorsPagination.limit}
                      onLimitChange={setAuthorsLimit}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AdminErrorBoundary>
  );
}
