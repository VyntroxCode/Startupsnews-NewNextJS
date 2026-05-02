'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { getAuthHeaders } from '@/lib/admin-auth';
import { useAdminData } from '@/hooks/useAdminData';
import Pagination from '@/components/admin/Pagination';
import SearchBar from '@/components/admin/SearchBar';
import LoadingSkeleton from '@/components/admin/LoadingSkeleton';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import { fetchAndDownloadCsv } from '@/shared/utils/csv-utils';

interface Event {
  id: string;
  title: string;
  slug: string;
  location: string;
  date: string;
  status?: string;
  url?: string;
}

export default function EventsPage() {
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
  });

  const handleDelete = useCallback(async (id: string) => {
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

  return (
    <AdminErrorBoundary>
      <div>
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
              marginBottom: '0.5rem',
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
              Manage and organize your events
            </p>
          </div>
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
        </div>

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
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="past">Past</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            type="text"
            placeholder="Filter by location..."
            value={String(filters.location ?? '')}
            onChange={(e) => handleLocationFilter(e.target.value || null)}
            style={{
              padding: '0.75rem 1rem',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              background: 'white',
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
          />
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
                              : event.status === 'past'
                              ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
                              : event.status === 'ongoing'
                              ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                              : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                            color: event.status === 'upcoming' 
                              ? '#1e40af' 
                              : event.status === 'past'
                              ? '#991b1b'
                              : event.status === 'ongoing'
                              ? '#065f46'
                              : '#475569',
                            border: `1px solid ${
                              event.status === 'upcoming' ? '#bfdbfe' : 
                              event.status === 'past' ? '#fca5a5' :
                              event.status === 'ongoing' ? '#a7f3d0' : '#cbd5e1'
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
                              onClick={() => handleDelete(event.id)}
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
      </div>
    </AdminErrorBoundary>
  );
}
