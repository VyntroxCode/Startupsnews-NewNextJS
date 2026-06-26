'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getPublicToken } from '@/lib/public-auth';

interface Report {
  id: string;
  title: string;
  desc: string;
  category: string;
  date: string;
  pages: number | null;
  tag: string;
  color: string;
  bg: string;
  tagColor: string;
  tagBg: string;
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  thumbnailUrl: string | null;
}

const REPORT_COLORS: { [key: string]: { color: string; bg: string; tagColor: string; tagBg: string } } = {
  Funding: { color: '#6366f1', bg: '#eef2ff', tagColor: '#059669', tagBg: '#ecfdf5' },
  'AI & Deeptech': { color: '#ec4899', bg: '#fdf2f8', tagColor: '#d97706', tagBg: '#fffbeb' },
  Fintech: { color: '#10b981', bg: '#ecfdf5', tagColor: '#059669', tagBg: '#ecfdf5' },
  'EV & Mobility': { color: '#f59e0b', bg: '#fffbeb', tagColor: '#d97706', tagBg: '#fffbeb' },
  Ecommerce: { color: '#3b82f6', bg: '#eff6ff', tagColor: '#059669', tagBg: '#ecfdf5' },
  Web3: { color: '#8b5cf6', bg: '#f5f3ff', tagColor: '#d97706', tagBg: '#fffbeb' },
  Healthtech: { color: '#ef4444', bg: '#fef2f2', tagColor: '#059669', tagBg: '#ecfdf5' },
  SaaS: { color: '#06b6d4', bg: '#ecfeff', tagColor: '#d97706', tagBg: '#ecfeff' },
};

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export default function ReportsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [isMobile, setIsMobile] = useState(false);
  const [brokenPreviewImages, setBrokenPreviewImages] = useState<Record<string, boolean>>({});
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const handleReportClick = (report: Report) => {
    const token = getPublicToken();

    if (token) {
      setSelectedReport(report);
      return;
    }

    router.push('/?auth=login');
  };

  useEffect(() => {
    const syncViewport = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const token = getPublicToken();
        if (!token) {
          console.error('Auth token not found for reports');
          return;
        }

        const res = await fetch('/api/reports', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();

        if (!data.success) {
          console.error('Failed to fetch reports:', data.error);
          return;
        }

        const fetchedReports: Report[] = data.data.map((report: any) => {
          const reportColor = REPORT_COLORS[report.category] || {
            color: '#64748b',
            bg: '#f1f5f9',
            tagColor: '#64748b',
            tagBg: '#f1f5f9',
          };

          const storedPageCount = Number(report.page_count || 0);

          return {
            id: String(report.id),
            title: String(report.title || ''),
            desc: String(report.description || ''),
            category: String(report.category || 'General'),
            date: new Date(
              (report.publish_at || report.created_at).toString().replace(' ', 'T')
            ).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
            pages: storedPageCount > 0 ? storedPageCount : null,
            tag: report.is_active ? 'Free' : 'Premium',
            color: reportColor.color,
            bg: reportColor.bg,
            tagColor: reportColor.tagColor,
            tagBg: reportColor.tagBg,
            fileUrl: report.file_url,
            fileName: report.file_name || `${report.title}.pdf`,
            mimeType: report.mime_type || null,
            thumbnailUrl: report.thumbnail_url || null,
          };
        });

        setReports(fetchedReports);
        setCategories(['All', ...Array.from(new Set(fetchedReports.map((report) => report.category)))]);
      } catch (err) {
        console.error('Error fetching reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const filtered = reports.filter((report) => {
    const query = search.trim().toLowerCase();
    const searchableText = [
      report.title,
      report.category,
      report.desc,
      report.fileName,
      report.date,
      report.pages ? `${report.pages} pages` : 'page count pending',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchSearch = !query || searchableText.includes(query);
    const matchCategory = activeCategory === 'All' || report.category === activeCategory;

    return matchSearch && matchCategory;
  });

  const markPreviewBroken = (reportId: string) => {
    setBrokenPreviewImages((current) => {
      if (current[reportId]) {
        return current;
      }

      return {
        ...current,
        [reportId]: true,
      };
    });
  };

  const closePreview = () => {
    setSelectedReport(null);
  };

  const selectedReportIsPdf = selectedReport?.mimeType === 'application/pdf' || selectedReport?.fileUrl.toLowerCase().endsWith('.pdf');
  const selectedReportIsImage = Boolean(selectedReport?.mimeType?.startsWith('image/'));

  return (
    <div style={{ padding: isMobile ? '1rem' : '1.5rem', maxWidth: '100%', minHeight: '100vh', boxSizing: 'border-box', width: '100%' }}>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 12,
          padding: isMobile ? '1.25rem' : '2rem',
          marginBottom: '1.5rem',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 720, flex: '1 1 520px' }}>
            <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: 6, background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Member Research Hub
            </span>
            <h1 style={{ fontSize: isMobile ? '1.7rem' : '2.1rem', fontWeight: 800, color: '#111827', margin: '14px 0 8px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Startup Reports
            </h1>
            <p style={{ fontSize: 15, color: '#4b5563', margin: 0, lineHeight: 1.6 }}>
              Browse curated startup intelligence, sector deep-dives, and premium market reports in a cleaner member workspace.
            </p>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: isMobile ? '16px' : '16px 20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 420px', maxWidth: 520 }}>
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="search"
              placeholder="Search reports, sectors, or keywords"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: '100%', padding: '10px 16px 10px 38px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', background: '#fff', color: '#111827', boxSizing: 'border-box', transition: 'all 0.15s' }}
              onFocus={(event) => {
                event.currentTarget.style.borderColor = '#dc2626';
                event.currentTarget.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.1)';
              }}
              onBlur={(event) => {
                event.currentTarget.style.borderColor = '#d1d5db';
                event.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ background: '#fff', borderRadius: 22, padding: '5rem 2rem', textAlign: 'center', border: '1px dashed #cbd5e1', boxShadow: '0 18px 50px rgba(15,23,42,0.04)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 14px' }}>🔍</div>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Loading reports...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 22, padding: '5rem 2rem', textAlign: 'center', border: '1px dashed #cbd5e1', boxShadow: '0 18px 50px rgba(15,23,42,0.04)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 14px' }}>🔍</div>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>No reports found</p>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Try adjusting your search or switching filters.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))',
            gap: isMobile ? 14 : 18,
          }}
        >
          {filtered.map((report, index) => {
            const hovered = hoveredCard === index;
            const imagePreviewUrl = report.thumbnailUrl || (report.mimeType?.startsWith('image/') ? report.fileUrl : null);
            const hasPreviewImage = Boolean(imagePreviewUrl) && !brokenPreviewImages[report.id];

            return (
              <div
                key={report.id}
                style={{
                  background: '#fff',
                  borderRadius: 0,
                  border: hovered ? '1px solid #d7dce5' : '1px solid #dfe5ee',
                  boxShadow: hovered ? '0 18px 40px rgba(15,23,42,0.08)' : '0 10px 24px rgba(15,23,42,0.04)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transform: hovered ? 'translateY(-2px)' : 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <button
                  type="button"
                  onClick={() => handleReportClick(report)}
                  style={{ display: 'block', textDecoration: 'none', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div
                    className="reports-card-media"
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: isMobile ? '4 / 3' : '16 / 9.5',
                      background: hasPreviewImage ? '#f9fafb' : `linear-gradient(135deg, ${report.bg}, #ffffff)`,
                      overflow: 'hidden',
                    }}
                  >
                    {hasPreviewImage ? (
                      <>
                        <Image
                          src={imagePreviewUrl!}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 100vw, 360px"
                          style={{ objectFit: 'cover', filter: 'blur(28px) saturate(1.5)', opacity: 0.6, transform: 'scale(1.2)' }}
                          onError={() => markPreviewBroken(report.id)}
                        />
                        <Image
                          src={imagePreviewUrl!}
                          alt={report.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 360px"
                          style={{ objectFit: 'contain', objectPosition: 'center', zIndex: 1 }}
                          onError={() => markPreviewBroken(report.id)}
                        />
                      </>
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 20, background: `linear-gradient(135deg, ${report.color}, ${report.color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: `0 14px 28px ${report.color}30` }}>
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Report Preview</span>
                      </div>
                    )}
                  </div>
                </button>

                <div style={{ padding: isMobile ? '14px 14px 16px' : '16px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: 0, fontSize: isMobile ? 20 : 21, fontWeight: 500, color: '#1f1f1f', lineHeight: 1.1, letterSpacing: '-0.04em' }}>{report.title}</h3>

                  <div className="reports-card-footer" style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: 12, marginTop: 18, paddingTop: 14, borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', color: '#7a7a7a' }}>
                      <span style={{ fontSize: isMobile ? 14 : 15, fontWeight: 500 }}>
                        {report.pages ? `${report.pages} Pages` : 'Page count pending'}
                      </span>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d4d4d4', display: 'inline-block' }} />
                      <span style={{ fontSize: isMobile ? 14 : 15, fontWeight: 500 }}>{report.date}</span>
                    </div>
                    <div className="reports-card-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: isMobile ? 'stretch' : 'flex-end', width: isMobile ? '100%' : 'auto' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedReport && (
        <div
          onClick={closePreview}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '16px' : '28px',
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 1120,
              height: isMobile ? '88vh' : '90vh',
              background: '#ffffff',
              borderRadius: 18,
              boxShadow: '0 30px 80px rgba(15,23,42,0.35)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexDirection: isMobile ? 'column' : 'row',
                padding: isMobile ? '14px 16px' : '18px 22px',
                borderBottom: '1px solid #e5e7eb',
                background: '#ffffff',
              }}
            >
              <div style={{ minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#dc2626' }}>Report Preview</p>
                <h2 style={{ margin: '4px 0 0', fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#111827', whiteSpace: isMobile ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2, paddingRight: isMobile ? 0 : 8 }}>{selectedReport.title}</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
                <button
                  type="button"
                  onClick={closePreview}
                  style={{ width: 40, height: 40, borderRadius: 999, border: 'none', background: '#f3f4f6', color: '#6b7280', cursor: 'pointer', fontSize: 22, lineHeight: 1, flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ flex: 1, background: '#f8fafc', padding: isMobile ? 12 : 18 }}>
              {selectedReportIsPdf ? (
                <iframe
                  src={`${selectedReport.fileUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                  title={selectedReport.title}
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12, background: '#ffffff' }}
                />
              ) : selectedReportIsImage ? (
                <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', background: '#ffffff' }}>
                  <Image src={selectedReport.fileUrl} alt={selectedReport.title} fill sizes="100vw" style={{ objectFit: 'contain' }} />
                </div>
              ) : (
                <div style={{ height: '100%', borderRadius: 12, background: '#ffffff', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
                  <div style={{ width: 72, height: 72, borderRadius: 24, background: 'linear-gradient(135deg, #dc2626, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 16 }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#111827' }}>Preview unavailable</p>
                  <p style={{ margin: 0, maxWidth: 420, fontSize: 14, lineHeight: 1.6, color: '#64748b' }}>This file type cannot be embedded directly here. Use the open file button to view or download the report.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
