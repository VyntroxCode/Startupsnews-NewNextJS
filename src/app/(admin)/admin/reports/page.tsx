'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getAuthHeaders, withAdminToken } from '@/lib/admin-auth';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import type { ReportEntity } from '@/modules/reports/domain/types';
import type { ReportSectionEntity } from '@/modules/reports/domain/section-types';
import Image from 'next/image';

interface ReportWithMeta extends ReportEntity {
  fileSizeFormatted: string;
  publishedAtFormatted: string;
}

type Tab = 'reports' | 'sections';

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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '0.9rem',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
};

export default function AdminReportsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('reports');
  const [sectionFilter, setSectionFilter] = useState<number | null>(
    searchParams.get('section') ? Number(searchParams.get('section')) : null
  );

  // Sync sectionFilter when URL changes (sidebar nav click)
  useEffect(() => {
    const id = searchParams.get('section');
    setSectionFilter(id ? Number(id) : null);
    if (id) setActiveTab('reports');
  }, [searchParams]);

  const [reports, setReports] = useState<ReportWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sections, setSections] = useState<ReportSectionEntity[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [editingSection, setEditingSection] = useState<ReportSectionEntity | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [savingSection, setSavingSection] = useState(false);
  const [deletingSection, setDeletingSection] = useState<number | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(withAdminToken('/api/admin/reports'), { headers: getAuthHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load reports');
      setReports(data.data.map((r: ReportEntity) => ({
        ...r,
        fileSizeFormatted: formatBytes(r.file_size),
        publishedAtFormatted: formatDateTime((r.publish_at || r.created_at).toString().replace(' ', 'T')),
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSections = useCallback(async () => {
    setSectionsLoading(true);
    setSectionsError('');
    try {
      const res = await fetch(withAdminToken('/api/admin/report-sections'), { headers: getAuthHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load sections');
      setSections(data.data);
    } catch (err) {
      setSectionsError(err instanceof Error ? err.message : 'Failed to load sections');
    } finally {
      setSectionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    fetchSections();
  }, [fetchReports, fetchSections]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchReports();
        fetchSections();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchReports, fetchSections]);

  const handleDeleteReport = async (id: number, title: string) => {
    if (!confirm(`Delete report "${title}"? This cannot be undone.`)) return;
    setError('');
    try {
      const res = await fetch(withAdminToken(`/api/admin/reports/${id}`), { method: 'DELETE', headers: getAuthHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete report');
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete report');
    }
  };

  const handleAddSection = async () => {
    const title = newSectionTitle.trim();
    if (!title) return;
    setAddingSection(true);
    setSectionsError('');
    try {
      const res = await fetch(withAdminToken('/api/admin/report-sections'), {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create section');
      setNewSectionTitle('');
      await fetchSections();
    } catch (err) {
      setSectionsError(err instanceof Error ? err.message : 'Failed to create section');
    } finally {
      setAddingSection(false);
    }
  };

  const handleSaveSection = async () => {
    if (!editingSection || !editTitle.trim()) return;
    setSavingSection(true);
    setSectionsError('');
    try {
      const res = await fetch(withAdminToken(`/api/admin/report-sections/${editingSection.id}`), {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim(), sortOrder: editingSection.sort_order }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update section');
      setEditingSection(null);
      setEditTitle('');
      await fetchSections();
    } catch (err) {
      setSectionsError(err instanceof Error ? err.message : 'Failed to update section');
    } finally {
      setSavingSection(false);
    }
  };

  const handleDeleteSection = async (section: ReportSectionEntity) => {
    const count = reports.filter((r) => r.section_id === section.id).length;
    const msg = count > 0
      ? `Delete section "${section.title}"? The ${count} report(s) in it will become ungrouped.`
      : `Delete section "${section.title}"?`;
    if (!confirm(msg)) return;
    setDeletingSection(section.id);
    setSectionsError('');
    try {
      const res = await fetch(withAdminToken(`/api/admin/report-sections/${section.id}`), { method: 'DELETE', headers: getAuthHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete section');
      await Promise.all([fetchSections(), fetchReports()]);
    } catch (err) {
      setSectionsError(err instanceof Error ? err.message : 'Failed to delete section');
    } finally {
      setDeletingSection(null);
    }
  };

  const sectionMap = Object.fromEntries(sections.map((s) => [s.id, s.title]));

  const visibleReports = sectionFilter
    ? reports.filter((r) => r.section_id === sectionFilter)
    : reports;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'reports', label: 'Reports', count: reports.length },
    { id: 'sections', label: 'Title Sections', count: sections.length },
  ];

  return (
    <AdminErrorBoundary>
      <div style={{ padding: '1.5rem' }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>Reports</h2>
          <p style={{ color: '#64748b', fontSize: '0.9375rem', margin: '4px 0 0' }}>Manage reports and section groupings.</p>
        </div>

        {/* ── Tab Bar ── */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: '1.5rem', background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: active ? '700' : '500',
                  fontSize: '0.875rem',
                  color: active ? '#0f172a' : '#64748b',
                  background: active ? '#ffffff' : 'transparent',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 20,
                    height: 20,
                    padding: '0 6px',
                    borderRadius: 999,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    background: active ? '#6366f1' : '#e2e8f0',
                    color: active ? '#fff' : '#64748b',
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════
            TAB: REPORTS
        ══════════════════════════════════════ */}
        {activeTab === 'reports' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
              <Link
                href="/admin/reports/create"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: 'white',
                  fontWeight: '600',
                  padding: '0.7rem 1.4rem',
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)'; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add New Report
              </Link>
            </div>

            {/* Active section filter pill */}
            {sectionFilter && sectionMap[sectionFilter] && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Showing:</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.3rem 0.75rem', background: '#eef2ff', color: '#4f46e5', borderRadius: '999px', fontSize: '0.8125rem', fontWeight: '700' }}>
                  {sectionMap[sectionFilter]}
                  <button
                    onClick={() => setSectionFilter(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', padding: 0, display: 'flex', alignItems: 'center', lineHeight: 1 }}
                    title="Clear filter"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </span>
                <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{visibleReports.length} report{visibleReports.length !== 1 ? 's' : ''}</span>
              </div>
            )}

            {error && (
              <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.875rem 1.25rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.875rem', border: '1px solid #fca5a5' }}>
                <strong>Error:</strong> {error}
              </div>
            )}

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>Loading reports...</div>
            ) : (
              <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                        {['#', 'Thumbnail', 'Title', 'Section', 'File Info', 'Status', 'Published At', ''].map((h) => (
                          <th key={h} scope="col" style={{ padding: '0.875rem 1.25rem', textAlign: h === '' ? 'right' : 'left', fontWeight: '600', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)', whiteSpace: 'nowrap' }}>
                            {h === '' ? <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Actions</span> : h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleReports.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '1rem' }}>
                            {sectionFilter ? `No reports in this section yet.` : `No reports yet. Click "Add New Report" to create one.`}
                          </td>
                        </tr>
                      ) : visibleReports.map((report, index) => (
                        <tr
                          key={report.id}
                          style={{ borderBottom: index < visibleReports.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', transition: 'background-color 0.15s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: '#64748b' }}>{index + 1}</td>
                          <td style={{ padding: '0.875rem 1.25rem' }}>
                            {report.thumbnail_url ? (
                              <Image src={report.thumbnail_url} alt={report.title} width={60} height={60} style={{ objectFit: 'cover', borderRadius: '0.375rem' }} />
                            ) : (
                              <div style={{ width: 60, height: 60, background: '#e2e8f0', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.7rem' }}>No Thumb</div>
                            )}
                          </td>
                          <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.9375rem', fontWeight: '500', color: '#0f172a' }}>{report.title}</td>
                          <td style={{ padding: '0.875rem 1.25rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                            {report.section_id && sectionMap[report.section_id] ? (
                              <span style={{ padding: '0.2rem 0.6rem', background: '#eef2ff', color: '#4f46e5', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                                {sectionMap[report.section_id]}
                              </span>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontSize: '0.8125rem' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '0.875rem 1.25rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#64748b' }}>
                            {report.file_name || '—'} ({report.fileSizeFormatted})
                          </td>
                          <td style={{ padding: '0.875rem 1.25rem', whiteSpace: 'nowrap' }}>
                            <span style={{
                              padding: '0.2rem 0.55rem',
                              display: 'inline-flex',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              borderRadius: '9999px',
                              background: report.publish_at && report.is_active === 0 ? '#fffbeb' : report.is_active === 1 ? '#ecfdf5' : '#fef2f2',
                              color: report.publish_at && report.is_active === 0 ? '#92400e' : report.is_active === 1 ? '#047857' : '#991b1b',
                            }}>
                              {report.publish_at && report.is_active === 0
                                ? `⏰ ${new Date(report.publish_at!.toString().replace(' ', 'T')).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}`
                                : report.is_active === 1 ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ padding: '0.875rem 1.25rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#64748b' }}>{report.publishedAtFormatted}</td>
                          <td style={{ padding: '0.875rem 1.25rem', whiteSpace: 'nowrap', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
                              <Link
                                href={`/admin/reports/edit/${report.id}`}
                                style={{ color: '#d97706', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.875rem', fontWeight: '500' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#b45309'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#d97706'; }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                                Edit
                              </Link>
                              <button
                                onClick={() => handleDeleteReport(report.id, report.title)}
                                style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.875rem', fontWeight: '500' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#b91c1c'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(0,0,0,0.04)', color: '#64748b', fontSize: '0.8125rem', background: '#f8fafc' }}>
                  {visibleReports.length} report{visibleReports.length !== 1 ? 's' : ''}{sectionFilter ? ` in "${sectionMap[sectionFilter]}"` : ' total'}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            TAB: TITLE SECTIONS
        ══════════════════════════════════════ */}
        {activeTab === 'sections' && (
          <div style={{ maxWidth: 720 }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Title Sections</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                Create named section headers that group reports together on the public reports page.
              </p>
            </div>

            {sectionsError && (
              <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8125rem', border: '1px solid #fca5a5' }}>
                {sectionsError}
              </div>
            )}

            {/* Add new section */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <p style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>Add New Section</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Section title (e.g. Featured Reports)"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddSection(); }}
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <button
                  onClick={handleAddSection}
                  disabled={addingSection || !newSectionTitle.trim()}
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: addingSection || !newSectionTitle.trim() ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: addingSection || !newSectionTitle.trim() ? '#94a3b8' : 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: addingSection || !newSectionTitle.trim() ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: addingSection || !newSectionTitle.trim() ? 'none' : '0 2px 8px rgba(99,102,241,0.3)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {addingSection ? 'Adding...' : 'Add Section'}
                </button>
              </div>
            </div>

            {/* Sections list */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {sections.length} section{sections.length !== 1 ? 's' : ''}
                </span>
              </div>

              {sectionsLoading ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Loading sections...</div>
              ) : sections.length === 0 ? (
                <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                    </svg>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic' }}>No sections yet. Add one above to start grouping reports.</p>
                </div>
              ) : (
                <div>
                  {sections.map((section, idx) => {
                    const reportCount = reports.filter((r) => r.section_id === section.id).length;
                    const isEditing = editingSection?.id === section.id;
                    const isDeleting = deletingSection === section.id;
                    const isLast = idx === sections.length - 1;

                    return (
                      <div
                        key={section.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '1rem 1.25rem',
                          borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={(e) => { if (!isEditing) e.currentTarget.style.background = '#fafbff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        {/* Index badge */}
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
                          {idx + 1}
                        </div>

                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSection(); if (e.key === 'Escape') { setEditingSection(null); } }}
                              autoFocus
                              style={{ ...inputStyle, flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                            />
                            <button
                              onClick={handleSaveSection}
                              disabled={savingSection || !editTitle.trim()}
                              style={{ padding: '0.5rem 0.875rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '7px', fontSize: '0.8125rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              {savingSection ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => { setEditingSection(null); setEditTitle(''); }}
                              style={{ padding: '0.5rem 0.875rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '7px', fontSize: '0.8125rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#0f172a' }}>{section.title}</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap', fontWeight: '600' }}>
                              {reportCount} report{reportCount !== 1 ? 's' : ''}
                            </span>
                            <button
                              onClick={() => { setEditingSection(section); setEditTitle(section.title); }}
                              style={{ padding: '0.4rem 0.75rem', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '7px', color: '#d97706', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#fde68a'; e.currentTarget.style.background = '#fffbeb'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'transparent'; }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSection(section)}
                              disabled={isDeleting}
                              style={{ padding: '0.4rem 0.75rem', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '7px', color: '#dc2626', cursor: isDeleting ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              onMouseEnter={(e) => { if (!isDeleting) { e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.background = '#fef2f2'; } }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'transparent'; }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                              {isDeleting ? '...' : 'Delete'}
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <p style={{ margin: '1rem 0 0', fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.6 }}>
              Tip: Assign a section to each report from the report&apos;s Edit page. Reports without a section appear at the bottom of the public page, ungrouped.
            </p>
          </div>
        )}

      </div>
    </AdminErrorBoundary>
  );
}
