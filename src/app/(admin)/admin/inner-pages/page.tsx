'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAuthHeaders, withAdminToken } from '@/lib/admin-auth';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import ImageUpload from '@/components/admin/ImageUpload';
import RichTextEditor from '@/components/admin/RichTextEditor';
import type { PartnerLogo } from '@/modules/inner-pages/domain/types';
import { PARTNER_LOGO_SECTIONS } from '@/modules/inner-pages/domain/types';

type InnerPageKey = 'our-partners' | 'contact-us' | 'about-us';
type InnerPageSection = { key: InnerPageKey; label: string };

// One entry per manageable "inner page" — a single sidebar link ("Inner Pages"), with each
// page as an internal tab here rather than its own sidebar item. More can be added to this list
// later without touching the sidebar at all.
const INNER_PAGE_SECTIONS: InnerPageSection[] = [
  { key: 'our-partners', label: 'Our Partners' },
  { key: 'contact-us', label: 'Contact Us' },
  { key: 'about-us', label: 'About Us' },
];

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

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  padding: '1.25rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

/**
 * Rich-text "Page Content" card shared by every Inner Pages tab — loads/saves a single
 * `content_html` blob for the given `pageKey` via the generic `/api/admin/inner-pages/[pageKey]`
 * route. The public page for that `pageKey` renders this HTML when non-empty, falling back to
 * its own hardcoded default copy otherwise (see e.g. `src/app/our-partners/page.tsx`).
 */
function PageContentEditor({ pageKey, title = 'Page Content', description, placeholder, minHeight = 320 }: {
  pageKey: InnerPageKey;
  title?: string;
  description: string;
  placeholder?: string;
  minHeight?: number;
}) {
  const [contentHtml, setContentHtml] = useState('');
  const [contentLoading, setContentLoading] = useState(true);
  const [savingContent, setSavingContent] = useState(false);
  const [contentSaved, setContentSaved] = useState(false);
  const [contentError, setContentError] = useState('');

  const fetchContent = useCallback(async () => {
    setContentLoading(true);
    setContentError('');
    try {
      const res = await fetch(withAdminToken(`/api/admin/inner-pages/${pageKey}`), { headers: getAuthHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load page content');
      setContentHtml(data.data.contentHtml || '');
    } catch (err) {
      setContentError(err instanceof Error ? err.message : 'Failed to load page content');
    } finally {
      setContentLoading(false);
    }
  }, [pageKey]);

  const saveContent = async () => {
    setSavingContent(true);
    setContentError('');
    setContentSaved(false);
    try {
      const res = await fetch(withAdminToken(`/api/admin/inner-pages/${pageKey}`), {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentHtml }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save page content');
      setContentSaved(true);
      setTimeout(() => setContentSaved(false), 3000);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : 'Failed to save page content');
    } finally {
      setSavingContent(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: '0.875rem' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{title}</h3>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>{description}</p>
      </div>
      {contentError && (
        <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '0.875rem', fontSize: '0.8125rem', border: '1px solid #fca5a5' }}>
          {contentError}
        </div>
      )}
      {contentLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Loading…</div>
      ) : (
        <>
          <RichTextEditor value={contentHtml} onChange={setContentHtml} minHeight={minHeight} placeholder={placeholder} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: '0.875rem' }}>
            <button
              onClick={saveContent}
              disabled={savingContent}
              style={{ padding: '0.625rem 1.25rem', background: savingContent ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: savingContent ? '#94a3b8' : 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: savingContent ? 'not-allowed' : 'pointer' }}
            >
              {savingContent ? 'Saving…' : 'Save Content'}
            </button>
            {contentSaved && <span style={{ color: '#059669', fontSize: '0.8125rem', fontWeight: 600 }}>Saved ✓</span>}
          </div>
        </>
      )}
    </div>
  );
}

function ContactUsSection() {
  return (
    <div style={{ maxWidth: 920 }}>
      <PageContentEditor
        pageKey="contact-us"
        description="Replaces the whole body of the public Contact Us page (support/press/careers sections) when non-empty. Leave blank to keep showing the built-in default content."
        placeholder="Write the Contact Us page content…"
      />
    </div>
  );
}

function AboutUsSection() {
  return (
    <div style={{ maxWidth: 920 }}>
      <PageContentEditor
        pageKey="about-us"
        description="Replaces the “About Us” narrative paragraphs on the public About Us page when non-empty (the stats band and “What We Offer” cards below it are unaffected). Leave blank to keep the built-in default copy."
        placeholder="Write the About Us page content…"
      />
    </div>
  );
}

function OurPartnersSection() {
  // ---- Partner logos ----
  const [logos, setLogos] = useState<PartnerLogo[]>([]);
  const [logosLoading, setLogosLoading] = useState(true);
  const [logosError, setLogosError] = useState('');
  const [newSection, setNewSection] = useState<string>(PARTNER_LOGO_SECTIONS[0]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [addingLogo, setAddingLogo] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchLogos = useCallback(async () => {
    setLogosLoading(true);
    setLogosError('');
    try {
      const res = await fetch(withAdminToken('/api/admin/partner-logos'), { headers: getAuthHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load partner logos');
      setLogos(data.data);
    } catch (err) {
      setLogosError(err instanceof Error ? err.message : 'Failed to load partner logos');
    } finally {
      setLogosLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogos();
  }, [fetchLogos]);

  const handleAddLogo = async () => {
    if (!newImageUrl) return;
    setAddingLogo(true);
    setLogosError('');
    try {
      const res = await fetch(withAdminToken('/api/admin/partner-logos'), {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: newSection, imageUrl: newImageUrl, linkUrl: newLinkUrl.trim() || null }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to add partner logo');
      setNewImageUrl('');
      setNewLinkUrl('');
      await fetchLogos();
    } catch (err) {
      setLogosError(err instanceof Error ? err.message : 'Failed to add partner logo');
    } finally {
      setAddingLogo(false);
    }
  };

  const handleDeleteLogo = async (id: number) => {
    if (!confirm('Remove this partner logo? This cannot be undone.')) return;
    setDeletingId(id);
    setLogosError('');
    try {
      const res = await fetch(withAdminToken(`/api/admin/partner-logos/${id}`), { method: 'DELETE', headers: getAuthHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete partner logo');
      setLogos((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setLogosError(err instanceof Error ? err.message : 'Failed to delete partner logo');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ maxWidth: 920, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageContentEditor
        pageKey="our-partners"
        description="The intro heading and paragraphs shown at the top of the public Our Partners page. Add, remove, or rewrite paragraphs freely."
        placeholder="Write the Our Partners page intro…"
        minHeight={220}
      />

      {/* Add logo */}
      <div style={cardStyle}>
        <div style={{ marginBottom: '0.875rem' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Add Partner Logo</h3>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
            Pick International or National, upload the logo, and optionally add a link — clicking the logo on the public page will open it. Each category shows as two auto-scrolling rows on the public page; logos alternate into them in the order you add them here (1st → row 1, 2nd → row 2, 3rd → row 1, and so on).
          </p>
        </div>
        {logosError && (
          <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '0.875rem', fontSize: '0.8125rem', border: '1px solid #fca5a5' }}>
            {logosError}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Section</label>
            <select value={newSection} onChange={(e) => setNewSection(e.target.value)} style={inputStyle}>
              {PARTNER_LOGO_SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <ImageUpload value={newImageUrl} onChange={setNewImageUrl} label="Logo" required />
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Link (optional)</label>
            <input
              type="url"
              placeholder="https://partner-website.com"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <button
              onClick={handleAddLogo}
              disabled={addingLogo || !newImageUrl}
              style={{ padding: '0.625rem 1.25rem', background: addingLogo || !newImageUrl ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: addingLogo || !newImageUrl ? '#94a3b8' : 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: addingLogo || !newImageUrl ? 'not-allowed' : 'pointer' }}
            >
              {addingLogo ? 'Adding…' : 'Add Logo'}
            </button>
          </div>
        </div>
      </div>

      {/* Logo list, grouped by section */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
          Partner Logos ({logos.length})
        </h3>
        {logosLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Loading…</div>
        ) : (
          PARTNER_LOGO_SECTIONS.map((section) => {
            const sectionLogos = logos.filter((l) => l.section === section);
            return (
              <div key={section} style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 10 }}>
                  {section} <span style={{ color: '#94a3b8', fontWeight: 500 }}>({sectionLogos.length})</span>
                </div>
                {sectionLogos.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic' }}>No logos in this section yet.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                    {sectionLogos.map((logo) => (
                      <div key={logo.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, position: 'relative' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail preview of an arbitrary uploaded/external URL */}
                        <img src={logo.imageUrl} alt="" style={{ width: '100%', height: 60, objectFit: 'contain' }} />
                        {logo.linkUrl ? (
                          <a href={logo.linkUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 6, fontSize: '0.6875rem', color: '#6366f1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {logo.linkUrl}
                          </a>
                        ) : (
                          <div style={{ marginTop: 6, fontSize: '0.6875rem', color: '#cbd5e1' }}>No link</div>
                        )}
                        <button
                          onClick={() => handleDeleteLogo(logo.id)}
                          disabled={deletingId === logo.id}
                          title="Delete"
                          style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#fee2e2', color: '#dc2626', cursor: deletingId === logo.id ? 'not-allowed' : 'pointer', fontSize: '0.75rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function AdminInnerPagesPage() {
  const [activePage, setActivePage] = useState<InnerPageKey>('our-partners');

  return (
    <AdminErrorBoundary>
      <div>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a', letterSpacing: '-0.02em' }}>Inner Pages</h2>
          <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>Manage content and images for standalone site pages.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: '1.5rem', background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {INNER_PAGE_SECTIONS.map((section) => {
            const active = activePage === section.key;
            return (
              <button
                key={section.key}
                onClick={() => setActivePage(section.key)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.875rem',
                  color: active ? '#0f172a' : '#64748b',
                  background: active ? '#ffffff' : 'transparent',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {section.label}
              </button>
            );
          })}
        </div>

        {activePage === 'our-partners' && <OurPartnersSection />}
        {activePage === 'contact-us' && <ContactUsSection />}
        {activePage === 'about-us' && <AboutUsSection />}
      </div>
    </AdminErrorBoundary>
  );
}
