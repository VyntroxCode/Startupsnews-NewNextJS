'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { getPublicToken } from '@/lib/public-auth';
import type { BrandStorySectionEntity } from '@/modules/brand-stories/domain/section-types';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface BrandStory {
  id: string;
  title: string;
  desc: string;
  category: string;
  date: string;
  month: string;
  shortMonth: string;
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
  sectionId: number | null;
}

const STORY_COLORS: { [key: string]: { color: string; bg: string; tagColor: string; tagBg: string } } = {
  Funding:        { color: '#6366f1', bg: '#eef2ff', tagColor: '#059669', tagBg: '#ecfdf5' },
  'AI & Deeptech':{ color: '#ec4899', bg: '#fdf2f8', tagColor: '#d97706', tagBg: '#fffbeb' },
  Fintech:        { color: '#10b981', bg: '#ecfdf5', tagColor: '#059669', tagBg: '#ecfdf5' },
  'EV & Mobility':{ color: '#f59e0b', bg: '#fffbeb', tagColor: '#d97706', tagBg: '#fffbeb' },
  Ecommerce:      { color: '#3b82f6', bg: '#eff6ff', tagColor: '#059669', tagBg: '#ecfdf5' },
  Web3:           { color: '#8b5cf6', bg: '#f5f3ff', tagColor: '#d97706', tagBg: '#fffbeb' },
  Healthtech:     { color: '#ef4444', bg: '#fef2f2', tagColor: '#059669', tagBg: '#ecfdf5' },
  SaaS:           { color: '#06b6d4', bg: '#ecfeff', tagColor: '#d97706', tagBg: '#ecfeff' },
};

export default function BrandStoriesPage() {
  const searchParams = useSearchParams();
  const sectionFilter = searchParams.get('section') ? Number(searchParams.get('section')) : 1;

  const [search, setSearch] = useState('');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [stories, setStories] = useState<BrandStory[]>([]);
  const [sections, setSections] = useState<BrandStorySectionEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [brokenPreviewImages, setBrokenPreviewImages] = useState<Record<string, boolean>>({});
  const [selectedStory, setSelectedStory] = useState<BrandStory | null>(null);
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [pdfViewportWidth, setPdfViewportWidth] = useState(0);
  const pdfViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setIsMobile(window.innerWidth <= 768);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  useEffect(() => {
    setPdfNumPages(0);
  }, [selectedStory]);

  useEffect(() => {
    if (!selectedStory) return;
    const el = pdfViewportRef.current;
    if (!el) return;
    const sync = () => setPdfViewportWidth(el.clientWidth);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [selectedStory]);

  useEffect(() => {
    setSelectedStory(null);
    setSearch('');
  }, [sectionFilter]);

  useEffect(() => {
    if (!selectedStory) return;
    const blockKeys = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (key === 'p' || key === 's')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', blockKeys, true);
    return () => window.removeEventListener('keydown', blockKeys, true);
  }, [selectedStory]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = getPublicToken();
        if (!token) return;

        const [storiesRes, sectionsRes] = await Promise.all([
          fetch('/api/brand-stories', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/brand-story-sections').catch(() => null),
        ]);

        const storiesData = await storiesRes.json();
        if (!storiesData.success) return;

        if (sectionsRes?.ok) {
          const sd = await sectionsRes.json();
          if (sd.success) setSections(sd.data);
        }

        setStories(storiesData.data.map((r: any) => {
          const rc = STORY_COLORS[r.category] || { color: '#64748b', bg: '#f1f5f9', tagColor: '#64748b', tagBg: '#f1f5f9' };
          const dateObj = new Date((r.publish_at || r.created_at).toString().replace(' ', 'T'));
          return {
            id: String(r.id),
            title: String(r.title || ''),
            desc: String(r.description || ''),
            category: String(r.category || 'General'),
            date: dateObj.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
            month: dateObj.toLocaleDateString('en-IN', { month: 'long' }),
            shortMonth: dateObj.toLocaleDateString('en-IN', { month: 'short' }),
            pages: Number(r.page_count || 0) > 0 ? Number(r.page_count) : null,
            tag: r.is_active ? 'Free' : 'Premium',
            color: rc.color, bg: rc.bg, tagColor: rc.tagColor, tagBg: rc.tagBg,
            fileUrl: r.file_url,
            fileName: r.file_name || `${r.title}.pdf`,
            mimeType: r.mime_type || null,
            thumbnailUrl: r.thumbnail_url || null,
            sectionId: r.section_id ? Number(r.section_id) : null,
          };
        }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const markPreviewBroken = (id: string) =>
    setBrokenPreviewImages((p) => p[id] ? p : { ...p, [id]: true });

  const closePreview = () => setSelectedStory(null);

  const isPdf = selectedStory?.mimeType === 'application/pdf' || selectedStory?.fileUrl.toLowerCase().endsWith('.pdf');
  const isImage = Boolean(selectedStory?.mimeType?.startsWith('image/'));

  const activeSection = sections.find((s) => s.id === sectionFilter) ?? null;

  const sectionStories = sectionFilter === null
    ? []
    : stories.filter((r) => r.sectionId === sectionFilter);

  const filtered = sectionStories.filter((r) => {
    const q = search.trim().toLowerCase();
    return !q || r.title.toLowerCase().includes(q) || r.month.toLowerCase().includes(q) || r.shortMonth.toLowerCase().includes(q);
  });

  // ── No section selected ────────────────────────────────────────────────────
  if (!sectionFilter) {
    return (
      <div style={{ padding: isMobile ? '1rem' : '1.5rem', minHeight: '100vh', boxSizing: 'border-box' }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: isMobile ? '1.25rem' : '1.75rem 2rem', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
          <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: 6, background: '#fde8f0', color: '#ee1761', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Member Research Hub
          </span>
          <h1 style={{ fontSize: isMobile ? '1.7rem' : '2.1rem', fontWeight: 800, color: '#111827', margin: '10px 0 6px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Brand Stories
          </h1>
          <p style={{ fontSize: 15, color: '#4b5563', margin: 0 }}>
            Select a section from the sidebar to browse brand stories.
          </p>
        </div>

      </div>
    );
  }

  // ── Section stories view ───────────────────────────────────────────────────
  return (
    <div style={{ padding: isMobile ? '1rem' : '1.5rem', minHeight: '100vh', boxSizing: 'border-box', width: '100%' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderRadius: 12, padding: isMobile ? '1.25rem' : '1.75rem 2rem', border: '1px solid #e5e7eb', marginBottom: '1.25rem' }}>
        <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: 6, background: '#fde8f0', color: '#ee1761', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Section
        </span>
        <h1 style={{ fontSize: isMobile ? '1.7rem' : '2.1rem', fontWeight: 800, color: '#111827', margin: '10px 0 6px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          {activeSection ? activeSection.title : 'Brand Stories'}
        </h1>
        <p style={{ fontSize: 15, color: '#4b5563', margin: 0 }}>
          {filtered.length} brand stor{filtered.length !== 1 ? 'ies' : 'y'} in this section
        </p>
      </div>

      {/* Search */}
      <div style={{ background: '#fff', borderRadius: 12, padding: isMobile ? '12px' : '12px 16px', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            placeholder="Search by name or month…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 16px 10px 36px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', background: '#fff', color: '#111827', boxSizing: 'border-box' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#ee1761'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(238,23,97,0.1)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      {/* Stories grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8', fontSize: 15 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: '4rem 2rem', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>No brand stories found</p>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Try adjusting your search.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: isMobile ? 14 : 18 }}>
          {filtered.map((story) => {
            const hovered = hoveredCard === story.id;
            const imagePreviewUrl = story.thumbnailUrl || (story.mimeType?.startsWith('image/') ? story.fileUrl : null);
            const hasPreview = Boolean(imagePreviewUrl) && !brokenPreviewImages[story.id];

            return (
              <div
                key={story.id}
                style={{ background: '#fff', borderRadius: 0, border: hovered ? '1px solid #d7dce5' : '1px solid #dfe5ee', boxShadow: hovered ? '0 18px 40px rgba(15,23,42,0.08)' : '0 10px 24px rgba(15,23,42,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transform: hovered ? 'translateY(-2px)' : 'none', transition: 'all 0.2s ease' }}
                onMouseEnter={() => setHoveredCard(story.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <button
                  type="button"
                  onClick={() => setSelectedStory(story)}
                  style={{ display: 'block', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ position: 'relative', width: '100%', aspectRatio: isMobile ? '4 / 3' : '16 / 9.5', background: hasPreview ? '#f9fafb' : `linear-gradient(135deg, ${story.bg}, #ffffff)`, overflow: 'hidden' }}>
                    {hasPreview ? (
                      <>
                        <Image src={imagePreviewUrl!} alt="" fill sizes="360px" style={{ objectFit: 'cover', filter: 'blur(28px) saturate(1.5)', opacity: 0.6, transform: 'scale(1.2)' }} onError={() => markPreviewBroken(story.id)} />
                        <Image src={imagePreviewUrl!} alt={story.title} fill sizes="360px" style={{ objectFit: 'contain', zIndex: 1 }} onError={() => markPreviewBroken(story.id)} />
                      </>
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 20, background: `linear-gradient(135deg, ${story.color}, ${story.color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: `0 14px 28px ${story.color}30` }}>
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Brand Story Preview</span>
                      </div>
                    )}
                  </div>
                </button>

                <div style={{ padding: isMobile ? '14px 14px 16px' : '16px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: 0, fontSize: isMobile ? 20 : 21, fontWeight: 500, color: '#1f1f1f', lineHeight: 1.1, letterSpacing: '-0.04em' }}>{story.title}</h3>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, paddingTop: 14, borderTop: '1px solid #e5e7eb', color: '#7a7a7a' }}>
                    <span style={{ fontSize: isMobile ? 16 : 17, fontWeight: 500 }}>{story.date}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview modal */}
      {selectedStory && (
        <div onClick={closePreview} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center', padding: isMobile ? 0 : '20px' }}>
          <div onClick={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()} style={{ position: 'relative', width: '100%', maxWidth: isMobile ? '100%' : 680, height: isMobile ? '100dvh' : '92vh', background: '#fff', borderRadius: isMobile ? 0 : 18, boxShadow: isMobile ? 'none' : '0 30px 80px rgba(15,23,42,0.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row', gap: 16, padding: isMobile ? '14px 52px 14px 16px' : '24px 28px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 10, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ee1761', flexShrink: 0 }}>Brand Story Preview</p>
                <h2 style={{ margin: 0, fontSize: isMobile ? 13 : 16, fontWeight: 700, color: '#111827', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedStory.title}</h2>
              </div>
              <button type="button" onClick={closePreview} style={{ position: 'absolute', top: isMobile ? 10 : 12, right: isMobile ? 10 : 12, width: isMobile ? 32 : 36, height: isMobile ? 32 : 36, borderRadius: 999, border: 'none', background: '#f3f4f6', color: '#6b7280', cursor: 'pointer', fontSize: isMobile ? 18 : 20, flexShrink: 0 }}>×</button>
            </div>
            <div style={{ flex: 1, background: '#f8fafc', padding: isMobile ? 8 : 18, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {isPdf ? (
                <div ref={pdfViewportRef} onContextMenu={(e) => e.preventDefault()} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', borderRadius: isMobile ? 8 : 12, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 10 : 16, padding: isMobile ? '10px 0' : '16px 0' }}>
                  <Document
                    file={selectedStory.fileUrl}
                    onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}
                    loading={<p style={{ padding: 24, color: '#64748b', fontSize: 14 }}>Loading document…</p>}
                    error={<p style={{ padding: 24, color: '#dc2626', fontSize: 14 }}>Failed to load PDF.</p>}
                  >
                    {pdfViewportWidth > 0 && Array.from({ length: pdfNumPages }, (_, i) => (
                      <div key={i} style={{ marginBottom: isMobile ? 10 : 16, boxShadow: '0 1px 6px rgba(15,23,42,0.12)' }}>
                        <Page
                          pageNumber={i + 1}
                          width={pdfViewportWidth}
                          renderAnnotationLayer={false}
                        />
                      </div>
                    ))}
                  </Document>
                </div>
              ) : isImage ? (
                <div onContextMenu={(e) => e.preventDefault()} style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }}>
                  <Image src={selectedStory.fileUrl} alt={selectedStory.title} fill sizes="100vw" style={{ objectFit: 'contain' }} />
                </div>
              ) : (
                <div style={{ height: '100%', borderRadius: 12, background: '#fff', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#111827' }}>Preview unavailable</p>
                  <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>This file type cannot be previewed here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
