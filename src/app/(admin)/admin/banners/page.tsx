'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { getAuthHeaders } from '@/lib/admin-auth';
import { useAdminData } from '@/hooks/useAdminData';
import Pagination from '@/components/admin/Pagination';
import SearchBar from '@/components/admin/SearchBar';
import LoadingSkeleton from '@/components/admin/LoadingSkeleton';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';

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

export default function BannersPage() {
  const {
    data: banners,
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
  } = useAdminData<Banner>({
    endpoint: '/api/admin/banners',
    limit: 20,
  });

  const handleDelete = useCallback(async (id: string) => {
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

      refetch();
    } catch {
      alert('An error occurred while deleting the banner');
    }
  }, [refetch]);

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

  const handleStatusFilter = useCallback((isActive: string | null) => {
    setFilters((prev) => {
      if (isActive !== null) return { ...prev, isActive };
      const { isActive: _, ...rest } = prev;
      return rest;
    });
  }, [setFilters]);

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
              Banners
            </h2>
            <p style={{
              color: '#64748b',
              fontSize: '1rem',
            }}>
              Manage carousel banners displayed on the homepage
            </p>
          </div>
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
        </div>

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
              value={search}
              onChange={setSearch}
              placeholder="Search banners..."
            />
            <div style={{
              display: 'flex',
              gap: '0.5rem',
            }}>
              <button
                onClick={() => handleStatusFilter(null)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  background: filters.isActive === undefined ? '#48bb78' : 'white',
                  color: filters.isActive === undefined ? 'white' : '#4a5568',
                  cursor: 'pointer',
                }}
              >
                All
              </button>
              <button
                onClick={() => handleStatusFilter('true')}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  background: filters.isActive === 'true' ? '#48bb78' : 'white',
                  color: filters.isActive === 'true' ? 'white' : '#4a5568',
                  cursor: 'pointer',
                }}
              >
                Active
              </button>
              <button
                onClick={() => handleStatusFilter('false')}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  background: filters.isActive === 'false' ? '#48bb78' : 'white',
                  color: filters.isActive === 'false' ? 'white' : '#4a5568',
                  cursor: 'pointer',
                }}
              >
                Inactive
              </button>
            </div>
          </div>
        </div>

        {loading && <LoadingSkeleton rows={5} columns={6} />}

        {error && (
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
            <span>{error}</span>
            <button type="button" onClick={() => refetch()} style={{ padding: '0.5rem 1rem', background: '#b91c1c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: '600' }}>Retry</button>
          </div>
        )}

        {!loading && !error && (
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
                              onClick={() => handleDelete(banner.id)}
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

            {pagination && pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                limit={pagination.limit}
                total={pagination.total}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            )}
          </>
        )}
      </div>
    </AdminErrorBoundary>
  );
}

