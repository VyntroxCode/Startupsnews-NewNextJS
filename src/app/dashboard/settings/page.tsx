'use client';

import { useState, useEffect } from 'react';

interface AuthUser { id: number; name: string; email: string; phone?: string; country?: string; city?: string; linkedin_url?: string; }
interface NLCategory { id: number; name: string; slug: string; color: string; }

const AVATAR_COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#06b6d4'];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Argentina','Australia','Austria','Bangladesh','Belgium',
  'Brazil','Canada','China','Colombia','Denmark','Egypt','Finland','France','Germany','Ghana',
  'Greece','Hong Kong','Hungary','India','Indonesia','Iran','Ireland','Israel','Italy','Japan',
  'Jordan','Kenya','Kuwait','Malaysia','Mexico','Morocco','Netherlands','New Zealand','Nigeria',
  'Norway','Pakistan','Philippines','Poland','Portugal','Qatar','Romania','Russia','Saudi Arabia',
  'Singapore','South Africa','South Korea','Spain','Sri Lanka','Sweden','Switzerland','Taiwan',
  'Thailand','Turkey','Ukraine','United Arab Emirates','United Kingdom','United States','Vietnam',
];

const input: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid #e2e8f0', fontSize: '0.9375rem', color: '#0f172a',
  background: '#fff', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const label: React.CSSProperties = {
  display: 'block', fontSize: '0.8125rem', fontWeight: 600,
  color: '#374151', marginBottom: 6,
};

export default function SettingsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [saved, setSaved] = useState(false);

  // Newsletter categories
  const [nlCategories, setNlCategories] = useState<NLCategory[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [nlSaving, setNlSaving] = useState(false);
  const [nlSaved, setNlSaved] = useState(false);
  const [nlError, setNlError] = useState('');

  useEffect(() => {
    const syncViewport = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pub_auth_user');
      if (raw) {
        const u = JSON.parse(raw) as AuthUser;
        setUser(u);
        setName(u.name || '');
        setPhone(u.phone || '');
        setCountry(u.country || '');
        setLinkedin(u.linkedin_url || '');
      }
    } catch {}
    const sync = () => {
      try {
        const r = localStorage.getItem('pub_auth_user');
        if (r) { const u = JSON.parse(r); setUser(u); setName(u.name||''); setPhone(u.phone||''); setCountry(u.country||''); setLinkedin(u.linkedin_url||''); }
      } catch {}
    };
    window.addEventListener('pub-auth-changed', sync);
    return () => window.removeEventListener('pub-auth-changed', sync);
  }, []);

  // Load newsletter categories + user's current prefs
  useEffect(() => {
    fetch('/api/newsletter/categories')
      .then(r => r.json())
      .then(d => { if (d.success) setNlCategories(d.data); })
      .catch(() => {});

    const token = localStorage.getItem('pub_auth_token');
    if (token) {
      fetch('/api/public-auth/newsletter-preferences', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => { if (d.success) setSelectedCats(d.data); })
        .catch(() => {});
    }
  }, []);

  const handleSaveNewsletter = async () => {
    if (selectedCats.length === 0) { setNlError('Please select at least 1 category.'); return; }
    setNlError('');
    setNlSaving(true);
    try {
      const token = localStorage.getItem('pub_auth_token');
      const res = await fetch('/api/public-auth/newsletter-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ categories: selectedCats }),
      });
      const d = await res.json();
      if (!d.success) { setNlError(d.error || 'Save failed'); return; }
      setNlSaved(true);
      setTimeout(() => setNlSaved(false), 3000);
    } catch {
      setNlError('Save failed. Please try again.');
    } finally {
      setNlSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const token = localStorage.getItem('pub_auth_token');
    if (token) {
      await fetch('/api/public-auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: phone || null, country: country || null, linkedin_url: linkedin || null }),
      }).catch(() => {});
    }
    const updated = { ...user, name, phone, country, linkedin_url: linkedin };
    localStorage.setItem('pub_auth_user', JSON.stringify(updated));
    setUser(updated);
    window.dispatchEvent(new Event('pub-auth-changed'));
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  };

  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#6366f1';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
  };
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#e2e8f0';
    e.currentTarget.style.boxShadow = 'none';
  };

  if (!user) return null;

  const initials = user.name.charAt(0).toUpperCase();
  const bg = avatarColor(user.name);

  return (
    <div style={{ padding: isMobile ? '1rem' : '2rem 2.5rem', minHeight: '100vh', background: '#f8fafc', boxSizing: 'border-box' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Settings
        </h1>
        <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>
          Manage your account, profile information and preferences
        </p>
      </div>

      {/* ── Success toast ── */}
      {saved && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: '1px solid #6ee7b7', borderRadius: 10, padding: '14px 18px', marginBottom: '1.5rem', fontSize: '0.9375rem', color: '#065f46', fontWeight: 600 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Profile updated successfully — changes will reflect across your dashboard.
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 320px', gap: '1.5rem', alignItems: 'start' }}>

        {/* LEFT — main form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Profile form card */}
          <div style={{ background: '#ffffff', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {/* Card header with avatar */}
            <div style={{ padding: isMobile ? '1.25rem' : '1.5rem 1.75rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 22, flexShrink: 0 }}>
                {initials}
              </div>
              <div>
                <h2 style={{ margin: '0 0 3px', fontSize: '1.25rem', fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>Profile Information</h2>
                <p style={{ margin: 0, color: '#4b5563', fontSize: '0.9375rem' }}>Update the details shown on your dashboard profile</p>
              </div>
            </div>

            <form onSubmit={handleSave} style={{ padding: isMobile ? '1.25rem' : '1.75rem' }}>
              {/* Row 1: Name + Email */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={label}>Full Name <span style={{ color: '#ee1761' }}>*</span></label>
                  <input value={name} onChange={e => setName(e.target.value)} required placeholder="Your full name" style={input} onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={label}>Email Address</label>
                  <input value={user.email} disabled style={{ ...input, background: '#f9fafb', color: '#9ca3af', cursor: 'not-allowed', border: '1px solid #e5e7eb' }} />
                  <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>Email cannot be changed</p>
                </div>
              </div>

              {/* Row 2: Phone + Country */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={label}>Phone Number</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" style={input} onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={label}>Country</label>
                  <select value={country} onChange={e => setCountry(e.target.value)} style={{ ...input, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                    onFocus={focus as unknown as React.FocusEventHandler<HTMLSelectElement>}
                    onBlur={blur as unknown as React.FocusEventHandler<HTMLSelectElement>}
                  >
                    <option value="">Select your country…</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 3: LinkedIn */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={label}>
                  LinkedIn URL{' '}
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </div>
                  <input
                    type="url"
                    value={linkedin}
                    onChange={e => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                    style={{ ...input, paddingLeft: 36 }}
                    onFocus={focus}
                    onBlur={blur}
                  />
                </div>
              </div>

              {/* Save button */}
              <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'flex-end', gap: '1rem', paddingTop: '0.25rem', flexDirection: isMobile ? 'column' : 'row' }}>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#9ca3af', textAlign: isMobile ? 'left' : 'right' }}>Fields marked <span style={{ color: '#dc2626' }}>*</span> are required</p>
                <button
                  type="submit"
                  style={{ padding: '0.875rem 1.75rem', background: '#dc2626', color: 'white', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer', transition: 'background 0.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: isMobile ? '100%' : 'auto' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#b91c1c'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#dc2626'; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
          {/* Newsletter category preferences card */}
          {nlCategories.length > 0 && (
            <div style={{ background: '#ffffff', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {/* Card header */}
              <div style={{ padding: isMobile ? '1.25rem' : '1.5rem 1.75rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #fce4ec, #fdf2f8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e91e63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div>
                  <h2 style={{ margin: '0 0 3px', fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>Newsletter Interests</h2>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                    Choose <strong>1–3 topics</strong> — we&apos;ll curate your newsletter around them
                  </p>
                </div>
              </div>

              <div style={{ padding: isMobile ? '1.25rem' : '1.75rem' }}>
                {/* Success / error messages */}
                {nlSaved && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem', fontSize: '0.875rem', color: '#065f46', fontWeight: 600 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Newsletter preferences saved!
                  </div>
                )}
                {nlError && (
                  <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem', fontSize: '0.875rem', color: '#b42318', fontWeight: 500 }}>
                    {nlError}
                  </div>
                )}

                {/* Selection counter */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                    {selectedCats.length === 0
                      ? 'No categories selected'
                      : <><strong style={{ color: '#e91e63' }}>{selectedCats.length}/3</strong> selected</>}
                  </span>
                  {selectedCats.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCats([])}
                      style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Category chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1.5rem' }}>
                  {nlCategories.map((cat) => {
                    const isSelected = selectedCats.includes(cat.slug);
                    const maxReached = selectedCats.length >= 3 && !isSelected;
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        disabled={maxReached}
                        onClick={() => {
                          setNlError('');
                          setSelectedCats(prev =>
                            isSelected ? prev.filter(s => s !== cat.slug) : [...prev, cat.slug]
                          );
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '8px 14px', borderRadius: 999,
                          border: isSelected ? `2px solid ${cat.color}` : '2px solid #e2e8f0',
                          background: isSelected ? cat.color + '18' : maxReached ? '#f8fafc' : '#fff',
                          color: isSelected ? cat.color : maxReached ? '#cbd5e1' : '#374151',
                          fontWeight: isSelected ? 700 : 500, fontSize: '0.8125rem',
                          cursor: maxReached ? 'not-allowed' : 'pointer',
                          opacity: maxReached ? 0.5 : 1,
                          transition: 'all 0.15s', whiteSpace: 'nowrap',
                        }}
                      >
                        {isSelected && <span style={{ fontSize: 11, fontWeight: 800 }}>✓</span>}
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: isSelected ? cat.color : '#cbd5e1', flexShrink: 0, display: 'inline-block' }} />
                        {cat.name}
                      </button>
                    );
                  })}
                </div>

                {/* Save button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleSaveNewsletter}
                    disabled={nlSaving || selectedCats.length === 0}
                    style={{
                      padding: '0.75rem 1.75rem',
                      background: selectedCats.length === 0 ? '#e2e8f0' : 'linear-gradient(135deg, #e91e63 0%, #f97316 100%)',
                      color: selectedCats.length === 0 ? '#94a3b8' : '#fff',
                      border: 'none', borderRadius: 8,
                      fontWeight: 600, fontSize: '0.9375rem',
                      cursor: selectedCats.length === 0 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      transition: 'opacity 0.2s',
                      width: isMobile ? '100%' : 'auto', justifyContent: 'center' as const,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    {nlSaving ? 'Saving…' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — sidebar panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Account snapshot */}
          <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: isMobile ? '1rem 1.25rem' : '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Account Snapshot</h3>
            </div>
            <div style={{ padding: isMobile ? '1rem 1.25rem' : '1.25rem 1.5rem' }}>
              {/* Avatar block */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9', marginBottom: '1rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18, flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '3px 10px', borderRadius: 20, flexShrink: 0, border: '1px solid #bbf7d0' }}>Active</span>
              </div>
              {/* Fields list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Name', val: user.name },
                  { label: 'Email', val: user.email },
                  { label: 'Phone', val: user.phone || '—' },
                  { label: 'Country', val: user.country || '—' },
                  { label: 'LinkedIn', val: user.linkedin_url ? 'Connected' : '—' },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', padding: '8px 10px', borderRadius: 8, background: '#f8fafc', border: '1px solid #f1f5f9', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{f.label}</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: f.val === '—' ? '#cbd5e1' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'normal' : 'nowrap', maxWidth: isMobile ? '100%' : '55%', textAlign: isMobile ? 'left' : 'right', wordBreak: 'break-word' }}>{f.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
