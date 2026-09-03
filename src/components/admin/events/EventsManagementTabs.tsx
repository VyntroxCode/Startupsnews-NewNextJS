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

type Tab = 'events' | 'regions' | 'banners';

interface FilterRegion { id: number; name: string; }

interface Event {
  id: string;
  title: string;
  slug: string;
  location: string;
  date: string;
  status?: string;
  url?: string;
}

interface RegionItem {
  id: number;
  name: string;
  sort_order: number;
  eventCount: number;
}

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  linkText?: string;
  order: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export default function EventsManagementTabs() {
  const role = getAdminUser()?.role || '';
  // const canRegions = isPathAllowed(role, '/admin/event-regions'); // unused while the Event Regions tab is disabled
  const canBanners = isPathAllowed(role, '/admin/banners');
  // ── Events / Event Regions tabs disabled ──
  // partnership_events is now the direct public source for /events and
  // /startup-events, so the legacy `events` + `event_regions` tables are no
  // longer what the site reads. The tabs are commented out rather than deleted
  // so this is a one-line revert if the old tables are ever needed again; all
  // the render blocks and handlers below are left intact but unreachable.
  const tabs = useMemo(() => ([
    // { id: 'events' as Tab, label: 'Events' },
    // ...(canRegions ? [{ id: 'regions' as Tab, label: 'Event Regions' }] : []),
    ...(canBanners ? [{ id: 'banners' as Tab, label: 'Banners' }] : []),
  ]), [canBanners]);

  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab') as Tab | null;
  // Falls back to the first tab the role can actually see (null when none),
  // so a stale ?tab=events / ?tab=regions link can't re-open a disabled tab.
  const initialTab: Tab | null = requestedTab && tabs.some((t) => t.id === requestedTab)
    ? requestedTab
    : (tabs[0]?.id ?? null);
  const [tab, setTab] = useState<Tab | null>(initialTab);

  /* ── Events tab state ── */
  const [filterRegions, setFilterRegions] = useState<FilterRegion[]>([]);

  useEffect(() => {
    fetch('/api/admin/event-regions', { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => { if (d.success) setFilterRegions(d.data); })
      .catch(() => {});
  }, []);

  const {
    data: events,
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
  } = useAdminData<Event>({
    endpoint: '/api/admin/events',
    limit: 20,
    enabled: tab === 'events',
  });

  const handleDeleteEvent = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/events/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error || 'Failed to delete event');
        return;
      }

      refetch();
    } catch {
      alert('An error occurred while deleting the event');
    }
  }, [refetch]);

  const handleStatusFilter = useCallback((status: string | null) => {
    setFilters((prev) => {
      if (status) return { ...prev, status };
      const { status: _, ...rest } = prev;
      return rest;
    });
  }, [setFilters]);

  const handleLocationFilter = useCallback((location: string | null) => {
    setFilters((prev) => {
      if (location) return { ...prev, location };
      const { location: _, ...rest } = prev;
      return rest;
    });
  }, [setFilters]);

  const handleExportCsv = useCallback(async () => {
    try {
      await fetchAndDownloadCsv(
        '/api/admin/events/export-csv',
        `events-${new Date().toISOString().split('T')[0]}.csv`,
        getAuthHeaders()
      );
      alert('Events exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export events.');
    }
  }, []);

  /* ── Event Regions tab state ── */
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState('');
  const [newRegionName, setNewRegionName] = useState('');
  const [addingRegion, setAddingRegion] = useState(false);
  const [editingRegionId, setEditingRegionId] = useState<number | null>(null);
  const [editRegionName, setEditRegionName] = useState('');
  const [savingRegion, setSavingRegion] = useState(false);
  const [letterFilter, setLetterFilter] = useState<string | null>(null);

  const fetchRegions = useCallback(async () => {
    setRegionsLoading(true);
    setRegionsError('');
    try {
      const res = await fetch('/api/admin/event-regions', { headers: getAuthHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load regions');
      setRegions(data.data);
    } catch (err) {
      setRegionsError(err instanceof Error ? err.message : 'Failed to load regions');
    } finally {
      setRegionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== 'regions') return;
    fetchRegions();
  }, [tab, fetchRegions]);

  const handleAddRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newRegionName.trim();
    if (!name) return;
    setAddingRegion(true);
    setRegionsError('');
    try {
      const res = await fetch('/api/admin/event-regions', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to add region');
      setNewRegionName('');
      await fetchRegions();
    } catch (err) {
      setRegionsError(err instanceof Error ? err.message : 'Failed to add region');
    } finally {
      setAddingRegion(false);
    }
  };

  const startEditRegion = (region: RegionItem) => {
    setEditingRegionId(region.id);
    setEditRegionName(region.name);
  };

  const cancelEditRegion = () => {
    setEditingRegionId(null);
    setEditRegionName('');
  };

  const handleSaveRegion = async (id: number) => {
    const name = editRegionName.trim();
    if (!name) return;
    setSavingRegion(true);
    setRegionsError('');
    try {
      const res = await fetch(`/api/admin/event-regions/${id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update region');
      setEditingRegionId(null);
      await fetchRegions();
    } catch (err) {
      setRegionsError(err instanceof Error ? err.message : 'Failed to update region');
    } finally {
      setSavingRegion(false);
    }
  };

  const handleDeleteRegion = async (id: number, name: string) => {
    if (!confirm(`Delete region "${name}"? Events using this region will keep their current location text.`)) return;
    setRegionsError('');
    try {
      const res = await fetch(`/api/admin/event-regions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete region');
      await fetchRegions();
    } catch (err) {
      setRegionsError(err instanceof Error ? err.message : 'Failed to delete region');
    }
  };

  /* ── Banners tab state ── */
  const {
    data: banners,
    loading: bannersLoading,
    error: bannersError,
    refetch: refetchBanners,
    pagination: bannersPagination,
    search: bannersSearch,
    filters: bannersFilters,
    setPage: setBannersPage,
    setLimit: setBannersLimit,
    setSearch: setBannersSearch,
    setFilters: setBannersFilters,
  } = useAdminData<Banner>({
    endpoint: '/api/admin/banners',
    limit: 20,
    enabled: tab === 'banners',
  });

  const handleDeleteBanner = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error || 'Failed to delete banner');
        return;
      }

      refetchBanners();
    } catch {
      alert('An error occurred while deleting the banner');
    }
  }, [refetchBanners]);

  const getScheduleStatus = useCallback((banner: Banner) => {
    if (!banner.isActive) {
      return { label: 'Inactive', bg: '#fed7d7', color: '#742a2a' };
    }
    const now = Date.now();
    if (banner.startDate && new Date(banner.startDate).getTime() > now) {
      return { label: 'Scheduled', bg: '#feebc8', color: '#7b341e' };
    }
    if (banner.endDate && new Date(banner.endDate).getTime() < now) {
      return { label: 'Expired', bg: '#e2e8f0', color: '#4a5568' };
    }
    return { label: 'Live', bg: '#c6f6d5', color: '#22543d' };
  }, []);

  const handleBannerStatusFilter = useCallback((isActive: string | null) => {
    setBannersFilters((prev) => {
      if (isActive !== null) return { ...prev, isActive };
      const { isActive: _, ...rest } = prev;
      return rest;
    });
  }, [setBannersFilters]);

  const filteredRegions = letterFilter
    ? regions.filter((r) => r.name.trim().charAt(0).toUpperCase() === letterFilter)
    : regions;

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
              Events
            </h2>
            <p style={{
              color: '#64748b',
              fontSize: '1rem',
              margin: 0,
            }}>
              {/* Was: "Manage events, regions, and homepage banners" — restore if the
                  Events / Event Regions tabs are ever re-enabled. */}
              Manage homepage banners
            </p>
          </div>
          {tab === 'events' && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Link
                href="/admin/events/create"
                style={{
                  padding: '0.875rem 1.75rem',
                  background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '0.9375rem',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 12px rgba(72, 187, 120, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(72, 187, 120, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(72, 187, 120, 0.3)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create New Event
              </Link>
              <button
                onClick={handleExportCsv}
                style={{
                  padding: '0.875rem 1.75rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '0.9375rem',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
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
          {tab === 'banners' && (
            <Link
              href="/admin/banners/create"
              style={{
                padding: '0.875rem 1.75rem',
                background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9375rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(72, 187, 120, 0.3)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create Banner
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

        {/* With Events / Event Regions disabled, a role without Banners access has
            nothing left on this page — say so instead of rendering a blank screen. */}
        {tabs.length === 0 && (
          <p style={{ color: '#64748b', fontSize: '0.9375rem', margin: 0 }}>
            No sections are available to your role on this page.
          </p>
        )}

        {/* ══════════════════════════════════════
            TAB 1 — EVENTS (disabled — see the tabs array above)
        ══════════════════════════════════════ */}
        {tab === 'events' && (
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
                placeholder="Search events by title, location, or slug..."
              />
              <select
                value={String(filters.status ?? '')}
                onChange={(e) => handleStatusFilter(e.target.value || null)}
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
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={String(filters.location ?? '')}
                onChange={(e) => handleLocationFilter(e.target.value || null)}
                style={{
                  padding: '0.75rem 1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  background: 'white',
                  cursor: 'pointer',
                  color: '#475569',
                  minWidth: '160px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="">All Locations</option>
                {filterRegions.map((r) => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>

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
                <button type="button" onClick={() => refetch()} style={{ padding: '0.5rem 1rem', background: '#b91c1c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: '600' }}>Retry</button>
              </div>
            )}

            {loading ? (
              <LoadingSkeleton rows={10} columns={5} />
            ) : events.length === 0 ? (
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
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <h3 style={{ color: '#0f172a', fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  No events found
                </h3>
                <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                  Get started by creating your first event
                </p>
                <Link
                  href="/admin/events/create"
                  style={{
                    padding: '0.875rem 1.75rem',
                    background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.9375rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(72, 187, 120, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(72, 187, 120, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(72, 187, 120, 0.3)';
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Create Your First Event
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
                            Location
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
                        {events.map((event, index) => (
                          <tr
                            key={event.id || event.slug || `event-${index}`}
                            style={{
                              borderBottom: index < events.length - 1 ? '1px solid rgba(0, 0, 0, 0.04)' : 'none',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f8fafc';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <div style={{ fontWeight: '600', color: '#0f172a' }}>
                                {event.title}
                              </div>
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.9375rem' }}>
                              {event.location}
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.9375rem' }}>
                              {event.date}
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.375rem 0.875rem',
                                borderRadius: '6px',
                                fontSize: '0.8125rem',
                                fontWeight: '600',
                                background: event.status === 'upcoming'
                                  ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
                                  : event.status === 'completed'
                                  ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                                  : event.status === 'draft'
                                  ? 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)'
                                  : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                                color: event.status === 'upcoming'
                                  ? '#1e40af'
                                  : event.status === 'completed'
                                  ? '#065f46'
                                  : event.status === 'draft'
                                  ? '#854d0e'
                                  : '#475569',
                                border: `1px solid ${
                                  event.status === 'upcoming' ? '#bfdbfe' :
                                  event.status === 'completed' ? '#a7f3d0' :
                                  event.status === 'draft' ? '#fef08a' : '#cbd5e1'
                                }`,
                              }}>
                                {event.status || 'upcoming'}
                              </span>
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <Link
                                  href={`/admin/events/edit/${event.id}`}
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
                                  onClick={() => handleDeleteEvent(event.id)}
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
            TAB 2 — EVENT REGIONS (disabled — see the tabs array above)
        ══════════════════════════════════════ */}
        {tab === 'regions' && (
          <>
            {/* Add form */}
            <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#0f172a', marginBottom: '1rem' }}>Add New Region</h3>
              <form onSubmit={handleAddRegion} style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={newRegionName}
                  onChange={(e) => setNewRegionName(e.target.value)}
                  placeholder="Region name (e.g. Jordan, Canada...)"
                  required
                  style={{ flex: 1, minWidth: 220, padding: '0.75rem 1rem', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9375rem', color: '#0f172a', outline: 'none' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#48bb78'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
                />
                <button
                  type="submit"
                  disabled={addingRegion || !newRegionName.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: addingRegion ? '#a0aec0' : 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.9375rem',
                    cursor: addingRegion ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(72,187,120,0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {addingRegion ? 'Adding...' : 'Add Region'}
                </button>
              </form>
            </div>

            {regionsError && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.875rem 1.25rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid #fca5a5' }}>
                {regionsError}
              </div>
            )}

            {/* Alphabet filter */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1.5rem' }}>
              <button
                onClick={() => setLetterFilter(null)}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid ' + (letterFilter === null ? '#48bb78' : '#e2e8f0'),
                  background: letterFilter === null ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' : '#fff',
                  color: letterFilter === null ? '#fff' : '#475569',
                  fontWeight: '600',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                All
              </button>
              {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((letter) => {
                const hasRegions = regions.some((r) => r.name.trim().charAt(0).toUpperCase() === letter);
                const active = letterFilter === letter;
                return (
                  <button
                    key={letter}
                    onClick={() => setLetterFilter(active ? null : letter)}
                    disabled={!hasRegions}
                    style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '6px',
                      border: '1px solid ' + (active ? '#48bb78' : '#e2e8f0'),
                      background: active ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' : '#fff',
                      color: active ? '#fff' : hasRegions ? '#475569' : '#cbd5e1',
                      fontWeight: '600',
                      fontSize: '0.8125rem',
                      cursor: hasRegions ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>

            {/* Regions table */}
            {regionsLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading regions...</div>
            ) : (
              <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.04)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                        {['#', 'Region Name', 'Event Count', 'Actions'].map((h, i) => (
                          <th key={h} style={{
                            padding: '1.25rem 1.5rem',
                            textAlign: i === 3 ? 'right' : 'left',
                            fontWeight: '600',
                            fontSize: '0.75rem',
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid rgba(0,0,0,0.06)',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegions.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                            {letterFilter ? `No regions starting with "${letterFilter}".` : 'No regions found. Add one above.'}
                          </td>
                        </tr>
                      ) : filteredRegions.map((region, index) => (
                        <tr
                          key={region.id}
                          style={{ borderBottom: index < filteredRegions.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', transition: 'background 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <td style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem', width: '48px' }}>{index + 1}</td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            {editingRegionId === region.id ? (
                              <input
                                type="text"
                                value={editRegionName}
                                onChange={(e) => setEditRegionName(e.target.value)}
                                style={{ padding: '0.5rem 0.75rem', border: '2px solid #48bb78', borderRadius: '6px', fontSize: '0.9375rem', outline: 'none', width: '100%', maxWidth: 280 }}
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRegion(region.id); if (e.key === 'Escape') cancelEditRegion(); }}
                              />
                            ) : (
                              <span style={{ fontWeight: '600', color: '#0f172a' }}>{region.name}</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', width: '140px' }}>
                            <span style={{ color: '#64748b', fontSize: '0.9375rem' }}>{region.eventCount}</span>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              {editingRegionId === region.id ? (
                                <>
                                  <button
                                    onClick={() => handleSaveRegion(region.id)}
                                    disabled={savingRegion}
                                    style={{ padding: '0.4rem 0.875rem', background: savingRegion ? '#a0aec0' : 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)', color: 'white', border: 'none', borderRadius: '6px', cursor: savingRegion ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', fontWeight: '600' }}
                                  >
                                    {savingRegion ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={cancelEditRegion}
                                    style={{ padding: '0.4rem 0.875rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: '600' }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditRegion(region)}
                                    style={{ padding: '0.4rem 0.875rem', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: '600', boxShadow: '0 2px 4px rgba(245,158,11,0.2)', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(245,158,11,0.3)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(245,158,11,0.2)'; }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRegion(region.id, region.name)}
                                    style={{ padding: '0.4rem 0.875rem', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: '600', boxShadow: '0 2px 4px rgba(239,68,68,0.2)', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(239,68,68,0.3)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(239,68,68,0.2)'; }}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.04)', color: '#64748b', fontSize: '0.8125rem', background: '#f8fafc' }}>
                  {filteredRegions.length} region{filteredRegions.length !== 1 ? 's' : ''}{letterFilter ? ` starting with "${letterFilter}"` : ' total'}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            TAB 3 — BANNERS
        ══════════════════════════════════════ */}
        {tab === 'banners' && (
          <>
            <div style={{
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}>
                <SearchBar
                  value={bannersSearch}
                  onChange={setBannersSearch}
                  placeholder="Search banners..."
                />
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                }}>
                  <button
                    onClick={() => handleBannerStatusFilter(null)}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      background: bannersFilters.isActive === undefined ? '#48bb78' : 'white',
                      color: bannersFilters.isActive === undefined ? 'white' : '#4a5568',
                      cursor: 'pointer',
                    }}
                  >
                    All
                  </button>
                  <button
                    onClick={() => handleBannerStatusFilter('true')}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      background: bannersFilters.isActive === 'true' ? '#48bb78' : 'white',
                      color: bannersFilters.isActive === 'true' ? 'white' : '#4a5568',
                      cursor: 'pointer',
                    }}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => handleBannerStatusFilter('false')}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      background: bannersFilters.isActive === 'false' ? '#48bb78' : 'white',
                      color: bannersFilters.isActive === 'false' ? 'white' : '#4a5568',
                      cursor: 'pointer',
                    }}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>

            {bannersLoading && <LoadingSkeleton rows={5} columns={6} />}

            {bannersError && (
              <div style={{
                background: '#fed7d7',
                color: '#c53030',
                padding: '1rem',
                borderRadius: '4px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}>
                <span>{bannersError}</span>
                <button type="button" onClick={() => refetchBanners()} style={{ padding: '0.5rem 1rem', background: '#b91c1c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: '600' }}>Retry</button>
              </div>
            )}

            {!bannersLoading && !bannersError && (
              <>
                <div style={{
                  background: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                  }}>
                    <thead>
                      <tr style={{
                        background: '#f7fafc',
                        borderBottom: '2px solid #e2e8f0',
                      }}>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#4a5568',
                          fontSize: '0.875rem',
                          textTransform: 'uppercase',
                        }}>Image</th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#4a5568',
                          fontSize: '0.875rem',
                          textTransform: 'uppercase',
                        }}>Title</th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#4a5568',
                          fontSize: '0.875rem',
                          textTransform: 'uppercase',
                        }}>Status</th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#4a5568',
                          fontSize: '0.875rem',
                          textTransform: 'uppercase',
                        }}>Link</th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'right',
                          fontWeight: '600',
                          color: '#4a5568',
                          fontSize: '0.875rem',
                          textTransform: 'uppercase',
                        }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {banners.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{
                            padding: '3rem',
                            textAlign: 'center',
                            color: '#a0aec0',
                          }}>
                            No banners found
                          </td>
                        </tr>
                      ) : (
                        banners.map((banner) => (
                          <tr key={banner.id} style={{
                            borderBottom: '1px solid #e2e8f0',
                          }}>
                            <td style={{ padding: '1rem' }}>
                              <img
                                src={banner.imageUrl}
                                alt={banner.title}
                                style={{
                                  width: '100px',
                                  height: '60px',
                                  objectFit: 'cover',
                                  borderRadius: '4px',
                                }}
                                onError={(e) => {
                                  // Prevent recursive onError if fallback also fails.
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = '/images/banner-fallback.svg';
                                }}
                              />
                            </td>
                            <td style={{
                              padding: '1rem',
                              fontWeight: '500',
                              color: '#2d3748',
                            }}>
                              {banner.title}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              {(() => {
                                const status = getScheduleStatus(banner);
                                return (
                                  <span style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    background: status.bg,
                                    color: status.color,
                                  }}>
                                    {status.label}
                                  </span>
                                );
                              })()}
                              {(banner.startDate || banner.endDate) && (
                                <div style={{ fontSize: '0.7rem', color: '#a0aec0', marginTop: '0.25rem' }}>
                                  {banner.startDate ? new Date(banner.startDate).toLocaleString() : 'No start'}
                                  {' – '}
                                  {banner.endDate ? new Date(banner.endDate).toLocaleString() : 'No end'}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              {banner.linkUrl ? (
                                <a
                                  href={banner.linkUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: '#48bb78',
                                    textDecoration: 'none',
                                  }}
                                >
                                  {banner.linkText || 'View Link'}
                                </a>
                              ) : (
                                <span style={{ color: '#a0aec0' }}>—</span>
                              )}
                            </td>
                            <td style={{
                              padding: '1rem',
                              textAlign: 'right',
                            }}>
                              <div style={{
                                display: 'flex',
                                gap: '0.5rem',
                                justifyContent: 'flex-end',
                              }}>
                                <Link
                                  href={`/admin/banners/edit/${banner.id}`}
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
                                  onClick={() => handleDeleteBanner(banner.id)}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.8125rem',
                                    fontWeight: '600',
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {bannersPagination && bannersPagination.totalPages > 1 && (
                  <Pagination
                    currentPage={bannersPagination.page}
                    totalPages={bannersPagination.totalPages}
                    limit={bannersPagination.limit}
                    total={bannersPagination.total}
                    onPageChange={setBannersPage}
                    onLimitChange={setBannersLimit}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </AdminErrorBoundary>
  );
}
