'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { getAuthHeaders } from '@/lib/admin-auth';
import { useAdminData } from '@/hooks/useAdminData';
import Pagination from '@/components/admin/Pagination';
import SearchBar from '@/components/admin/SearchBar';
import LoadingSkeleton from '@/components/admin/LoadingSkeleton';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';

interface Category {
  id: number;
  name: string;
  slug: string;
  sortOrder?: number;
  description?: string;
}

export default function CategoriesPage() {
  const {
    data: categories,
    loading,
    error,
    refetch,
    pagination,
    search,
    setSearch,
    setPage,
    setLimit,
  } = useAdminData<Category>({
    endpoint: '/api/admin/categories',
    limit: 50,
  });

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to delete this category? Posts and RSS feeds using it may need to be reassigned first.')) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        console.error('Failed to delete category:', { id, status: response.status, response: data });
        alert(data.error || `Failed to delete category (${response.status})`);
        return;
      }
      console.log('Category deleted successfully, refetching list.');
      // Broadcast data refresh event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('admin:data-updated'));
      }
      // Wait briefly for cache to clear
      await new Promise(resolve => setTimeout(resolve, 100));
      await refetch();
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('An error occurred while deleting the category');
    }
  }, [refetch]);

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
              Categories
            </h2>
            <p style={{
              color: '#64748b',
              fontSize: '1rem',
              margin: 0,
            }}>
              Manage news categories (used by posts and RSS feeds)
            </p>
          </div>
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
            Create Category
          </Link>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name or slug..."
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
          }}>
            <span>{error}</span>
            <button type="button" onClick={() => refetch()} style={{ padding: '0.5rem 1rem', background: '#b91c1c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: '600' }}>Retry</button>
          </div>
        )}

        {loading ? (
          <LoadingSkeleton rows={10} columns={4} />
        ) : categories.length === 0 ? (
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            padding: '4rem 2rem',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid rgba(0, 0, 0, 0.04)',
          }}>
            <h3 style={{ color: '#0f172a', fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>No categories found</h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>Create the 15 canonical categories or add your first category.</p>
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
              Create Category
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
                      <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Sort</th>
                      <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat, index) => (
                      <tr
                        key={cat.id}
                        style={{
                          borderBottom: index < categories.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                        }}
                      >
                        <td style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: '#0f172a' }}>{cat.name}</td>
                        <td style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.9375rem' }}>{cat.slug}</td>
                        <td style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.9375rem' }}>{cat.sortOrder ?? 0}</td>
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
                              onClick={() => handleDelete(cat.id)}
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
            {pagination && pagination.totalPages > 1 && (
              <div style={{ marginTop: '1.5rem' }}>
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                  total={pagination.total}
                  limit={pagination.limit}
                  onLimitChange={setLimit}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AdminErrorBoundary>
  );
}
