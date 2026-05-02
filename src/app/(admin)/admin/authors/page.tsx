'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { getAuthHeaders } from '@/lib/admin-auth';
import { useAdminData } from '@/hooks/useAdminData';
import Pagination from '@/components/admin/Pagination';
import SearchBar from '@/components/admin/SearchBar';
import LoadingSkeleton from '@/components/admin/LoadingSkeleton';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';

interface Author {
  id: number;
  name: string;
  avatarUrl?: string;
  authorDescription?: string;
  isDefaultAuthor?: boolean;
  isActive: boolean;
}

export default function AuthorsPage() {
  const {
    data: authors,
    loading,
    error,
    refetch,
    pagination,
    search,
    setSearch,
    setPage,
    setLimit,
  } = useAdminData<Author>({
    endpoint: '/api/admin/authors?includeInactive=true',
    limit: 50,
    disableCache: true,
  });

  const handleDelete = useCallback(
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
        refetch();
      } catch {
        alert('An error occurred while removing the author');
      }
    },
    [refetch]
  );

  const handleSetDefault = useCallback(
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
        refetch();
      } catch {
        alert('An error occurred while setting default author');
      }
    },
    [refetch]
  );

  return (
    <AdminErrorBoundary>
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '2.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '2.25rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
                color: '#0f172a',
                letterSpacing: '-0.02em',
              }}
            >
              Authors
            </h2>
            <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>
              Manage authors used for manual news posts.
            </p>
          </div>
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
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name or description..." />
        </div>

        {error && (
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
            {error}
          </div>
        )}

        {loading ? (
          <LoadingSkeleton rows={8} columns={5} />
        ) : authors.length === 0 ? (
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
                      <th style={{ padding: '1.1rem', textAlign: 'left', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase' }}>Photo</th>
                      <th style={{ padding: '1.1rem', textAlign: 'left', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase' }}>Name</th>
                      <th style={{ padding: '1.1rem', textAlign: 'left', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase' }}>Description</th>
                      <th style={{ padding: '1.1rem', textAlign: 'left', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase' }}>Default</th>
                      <th style={{ padding: '1.1rem', textAlign: 'left', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '1.1rem', textAlign: 'right', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {authors.map((author) => (
                      <tr key={author.id} style={{ borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <td style={{ padding: '1.1rem' }}>
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
                        <td style={{ padding: '1.1rem', fontWeight: 600, color: '#0f172a' }}>{author.name}</td>
                        <td style={{ padding: '1.1rem', color: '#64748b', maxWidth: 320 }}>
                          <span style={{ display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
                            {author.authorDescription || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '1.1rem' }}>
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
                              onClick={() => handleSetDefault(author.id)}
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
                        <td style={{ padding: '1.1rem' }}>
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
                        <td style={{ padding: '1.1rem', textAlign: 'right' }}>
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
                              onClick={() => handleDelete(author.id)}
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
