'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getAuthHeaders, withAdminToken } from '@/lib/admin-auth';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import type { ReportEntity } from '@/modules/reports/domain/types';
import Image from 'next/image';

interface ReportWithMeta extends ReportEntity {
  fileSizeFormatted: string;
  createdAtFormatted: string;
}

const formatBytes = (bytes: number | null, decimals = 2) => {
  if (bytes === 0 || bytes === null) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: true,
  });
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(withAdminToken('/api/admin/reports'), { headers: getAuthHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load reports');
      const formattedReports = data.data.map((r: ReportEntity) => ({
        ...r,
        fileSizeFormatted: formatBytes(r.file_size),
        createdAtFormatted: formatDateTime(r.created_at),
      }));
      setReports(formattedReports);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete report "${title}"? This action cannot be undone.`)) return;
    setError('');
    try {
      const res = await fetch(withAdminToken(`/api/admin/reports/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete report');
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete report');
    }
  };

  const statusBadgeClass = (isActive: number) => {
    if (isActive === 1) return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <AdminErrorBoundary>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '2.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#0f172a', letterSpacing: '-0.02em' }}>Reports</h2>
            <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>Manage all available premium and free reports.</p>
          </div>
          <Link
            href="/admin/reports/create"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: 'white',
              fontWeight: '600',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add New Report
          </Link>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#991b1b',
            padding: '0.875rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            border: '1px solid #fca5a5',
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>Loading reports...</div>
        ) : (
          <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                    <th scope="col" style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>#</th>
                    <th scope="col" style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Thumbnail</th>
                    <th scope="col" style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Title</th>
                    <th scope="col" style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>File Info</th>
                    <th scope="col" style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Status</th>
                    <th scope="col" style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Created At</th>
                    <th scope="col" style={{ position: 'relative', padding: '1rem 1.5rem', textAlign: 'right' }}><span style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: '0' }}>Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '1.125rem' }}>
                        No reports found. Click &quot;Add New Report&quot; to create one.
                      </td>
                    </tr>
                  ) : reports.map((report, index) => (
                    <tr key={report.id} style={{ borderBottom: index < reports.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#64748b' }}>{index + 1}</td>
                      <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap' }}>
                        {report.thumbnail_url ? (
                          <Image src={report.thumbnail_url} alt={report.title} width={64} height={64} style={{ objectFit: 'cover', borderRadius: '0.375rem' }} />
                        ) : (
                          <div style={{ width: '4rem', height: '4rem', background: '#e2e8f0', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.75rem' }}>No Thumb</div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.9375rem', fontWeight: '500', color: '#0f172a' }}>{report.title}</td>
                      <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#64748b' }}>
                        {report.file_name || '—'} ({report.fileSizeFormatted})
                      </td>
                      <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          display: 'inline-flex',
                          fontSize: '0.75rem',
                          lineHeight: '1.25rem',
                          fontWeight: '600',
                          borderRadius: '9999px',
                          background: report.is_active === 1 ? '#ecfdf5' : '#fef2f2',
                          color: report.is_active === 1 ? '#047857' : '#991b1b',
                        }}>
                          {report.is_active === 1 ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#64748b' }}>{report.createdAtFormatted}</td>
                      <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', textAlign: 'right', fontSize: '0.875rem', fontWeight: '500' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                          <Link
                            href={`/admin/reports/edit/${report.id}`}
                            style={{
                              color: '#d97706',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              transition: 'color 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#b45309'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#d97706'; }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(report.id, report.title)}
                            style={{
                              color: '#dc2626',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              transition: 'color 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#b91c1c'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.04)', color: '#64748b', fontSize: '0.8125rem', background: '#f8fafc' }}>
              {reports.length} report{reports.length !== 1 ? 's' : ''} total
            </div>
          </div>
        )}
      </div>
    </AdminErrorBoundary>
  );
}
