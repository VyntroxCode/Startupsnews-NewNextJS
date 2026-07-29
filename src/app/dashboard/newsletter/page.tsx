'use client';

import { useState, useEffect } from 'react';

interface AuthUser { id: number; name: string; email: string; newsletter_category_slugs?: string; }
interface NLCategory { id: number; name: string; slug: string; color: string; }

export default function NewsletterPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [nlCategories, setNlCategories] = useState<NLCategory[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const sync = () => setIsMobile(window.innerWidth < 640);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pub_auth_user');
      if (raw) setUser(JSON.parse(raw));
    } catch {}

    fetch('/api/newsletter/categories')
      .then(r => r.json())
      .then(d => { if (d.success) setNlCategories(d.data); })
      .catch(() => {});

    const token = localStorage.getItem('pub_auth_token');
    if (token) {
      fetch('/api/public-auth/newsletter-preferences', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (d.success) setSelectedCats(d.data); })
        .catch(() => {});
    }
  }, []);

  const handleSave = async () => {
    if (selectedCats.length === 0) { setError('Please select at least 1 category.'); return; }
    setError(''); setSaving(true);
    try {
      const token = localStorage.getItem('pub_auth_token');
      const res = await fetch('/api/public-auth/newsletter-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ categories: selectedCats }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Save failed'); return; }
      const raw = localStorage.getItem('pub_auth_user');
      if (raw) {
        const u = JSON.parse(raw) as AuthUser;
        const updated = { ...u, newsletter_category_slugs: selectedCats.join(',') };
        localStorage.setItem('pub_auth_user', JSON.stringify(updated));
        setUser(updated);
        window.dispatchEvent(new Event('pub-auth-changed'));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: isMobile ? '1rem' : '2rem', minHeight: '100vh', background: '#f8fafc', boxSizing: 'border-box' }}>

      {/* Page header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12, fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <a href="/dashboard" style={{ color: '#94a3b8', textDecoration: 'none' }}>Dashboard</a>
          <span>›</span>
          <span style={{ color: '#64748b', fontWeight: 500 }}>Newsletter</span>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: '#fde8f0', color: '#ee1761', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Morning Signal
        </span>
        <h1 style={{ fontSize: isMobile ? '1.5rem' : '1.875rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          Newsletter Preferences
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 8px', lineHeight: 1.6 }}>
          Pick up to <strong style={{ color: '#0f172a' }}>3 newsletter categories</strong> and your Morning Signal briefing will be curated just for you.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: '1.5rem', alignItems: 'start', maxWidth: '100%' }}>

        {/* LEFT — Category picker */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

          {/* Card header */}
          <div style={{ padding: '1.125rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg, #fde8f0, #fff0f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #fecdd3' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ee1761" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Your Interests</h2>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.78rem' }}>Select newsletter categories you care about</p>
              </div>
            </div>
            {/* Progress indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 28, height: 5, borderRadius: 3, background: selectedCats.length > i ? '#ee1761' : '#e2e8f0', transition: 'background 0.2s' }} />
              ))}
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: selectedCats.length > 0 ? '#ee1761' : '#94a3b8', marginLeft: 4, whiteSpace: 'nowrap' }}>
                {selectedCats.length}/3
              </span>
            </div>
          </div>

          <div style={{ padding: isMobile ? '1.25rem' : '1.5rem' }}>
            {saved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '11px 14px', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#065f46', fontWeight: 600 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Saved! Your next briefing will match your choices.
              </div>
            )}
            {error && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '11px 14px', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#b42318', fontWeight: 500 }}>
                {error}
              </div>
            )}

            {/* Category chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 8 : 10, marginBottom: '1.5rem' }}>
              {nlCategories.map((cat) => {
                const isSelected = selectedCats.includes(cat.slug);
                const maxReached = selectedCats.length >= 3 && !isSelected;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    disabled={maxReached}
                    onClick={() => {
                      setError('');
                      setSelectedCats(prev => isSelected ? prev.filter(s => s !== cat.slug) : [...prev, cat.slug]);
                    }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      padding: isMobile ? '8px 14px' : '9px 18px',
                      borderRadius: 999,
                      border: isSelected ? `2px solid ${cat.color}` : '2px solid #e2e8f0',
                      background: isSelected ? cat.color + '15' : maxReached ? '#f9fafb' : '#fff',
                      color: isSelected ? cat.color : maxReached ? '#cbd5e1' : '#374151',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: isMobile ? '0.8125rem' : '0.875rem',
                      cursor: maxReached ? 'not-allowed' : 'pointer',
                      opacity: maxReached ? 0.45 : 1,
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? `0 2px 8px ${cat.color}25` : 'none',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: isSelected ? cat.color : '#e2e8f0', flexShrink: 0, transition: 'background 0.15s' }} />
                    {cat.name}
                    {isSelected && (
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 900, flexShrink: 0 }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSelectedCats([])}
                disabled={selectedCats.length === 0}
                style={{ fontSize: '0.8125rem', color: selectedCats.length === 0 ? '#e2e8f0' : '#94a3b8', background: 'none', border: 'none', cursor: selectedCats.length === 0 ? 'default' : 'pointer', fontWeight: 500, padding: 0, fontFamily: 'inherit' }}
              >
                Clear selection
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || selectedCats.length === 0}
                style={{
                  padding: '0.75rem 2rem',
                  background: selectedCats.length === 0 ? '#e2e8f0' : saving ? '#f9a8c9' : 'linear-gradient(135deg, #ee1761 0%, #c8114d 100%)',
                  color: selectedCats.length === 0 ? '#9ca3af' : '#fff',
                  border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.9375rem',
                  cursor: selectedCats.length === 0 || saving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  boxShadow: selectedCats.length === 0 ? 'none' : '0 2px 10px rgba(238,23,97,0.3)',
                  width: isMobile ? '100%' : 'auto', justifyContent: 'center',
                  fontFamily: 'inherit',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                {saving ? 'Saving…' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — Info sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* How it works */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>How it works</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icon: '🗓️', text: 'Your Morning Signal arrives daily at 8 AM in your timezone.' },
                { icon: '🎯', text: 'Pick up to 3 newsletter categories — only matching stories are included.' },
                { icon: '📬', text: 'Change your preferences anytime, it takes effect next send.' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Current selection summary */}
          {selectedCats.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg, #fde8f0 0%, #fff5f7 100%)', borderRadius: 16, border: '1px solid #fecdd3', padding: '1.125rem', boxShadow: '0 1px 4px rgba(238,23,97,0.06)' }}>
              <p style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: 700, color: '#ee1761', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Selected</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedCats.map(slug => {
                  const cat = nlCategories.find(c => c.slug === slug);
                  if (!cat) return null;
                  return (
                    <div key={slug} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{cat.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unsubscribe */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '1.125rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>Stop receiving emails?</p>
            <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>You can unsubscribe from Morning Signal at any time.</p>
            <a
              href="/unsubscribe"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', borderRadius: 8, background: '#fff5f7', color: '#ee1761', border: '1px solid #fecdd3', textDecoration: 'none', fontSize: '0.8125rem', fontWeight: 700 }}
            >
              Unsubscribe
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
