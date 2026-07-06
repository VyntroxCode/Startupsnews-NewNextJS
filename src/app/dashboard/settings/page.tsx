'use client';

import { useState, useEffect } from 'react';

interface AuthUser {
  id: number; name: string; email: string;
  phone?: string; country?: string; city?: string;
  linkedin_url?: string; timezone?: string;
}

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

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 8,
  border: '1.5px solid #e2e8f0', fontSize: '0.9375rem', color: '#0f172a',
  background: '#fff', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s', fontFamily: 'inherit',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600,
  color: '#64748b', marginBottom: 6, letterSpacing: '0.02em', textTransform: 'uppercase',
};

function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = '#ee1761';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(238,23,97,0.08)';
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = '#e2e8f0';
  e.currentTarget.style.boxShadow = 'none';
}


export default function SettingsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const sync = () => setIsMobile(window.innerWidth < 900);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  const loadUser = () => {
    try {
      const raw = localStorage.getItem('pub_auth_user');
      if (raw) {
        const u = JSON.parse(raw) as AuthUser;
        setUser(u);
        setName(u.name || '');
        setPhone(u.phone || '');
        setCountry(u.country || '');
        setCity(u.city || '');
        setLinkedin(u.linkedin_url || '');
      }
    } catch {}
  };

  useEffect(() => {
    loadUser();
    window.addEventListener('pub-auth-changed', loadUser);
    return () => window.removeEventListener('pub-auth-changed', loadUser);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true); setSaveError(''); setSaved(false);
    try {
      const token = localStorage.getItem('pub_auth_token');
      if (token) {
        const res = await fetch('/api/public-auth/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ phone: phone || null, country: country || null, city: city || null, linkedin_url: linkedin || null }),
        });
        const d = await res.json().catch(() => ({}));
        if (!d.success && d.error) { setSaveError(d.error); return; }
      }
      const updated = { ...user, name, phone, country, city, linkedin_url: linkedin };
      localStorage.setItem('pub_auth_user', JSON.stringify(updated));
      setUser(updated);
      window.dispatchEvent(new Event('pub-auth-changed'));
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const initials = user.name.charAt(0).toUpperCase();
  const bg = avatarColor(user.name);

  return (
    <div style={{ padding: isMobile ? '1rem' : '2rem', minHeight: '100vh', background: '#f8fafc', boxSizing: 'border-box' }}>

      {/* Page header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 20, fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <a href="/dashboard" style={{ color: '#94a3b8', textDecoration: 'none' }}>Dashboard</a>
          <span>›</span>
          <span style={{ color: '#64748b', fontWeight: 500 }}>Profile</span>
        </div>
        <h1 style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 20px', letterSpacing: '-0.03em' }}>
          My Profile
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 20px' }}>Update Profile &amp; Personal Details.</p>
      </div>

      {/* Two-col layout on desktop */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '1.5rem',
        alignItems: 'start',
        maxWidth: '100%',
      }}>

        {/* LEFT — Profile form */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

          {/* Card header */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 22, flexShrink: 0, boxShadow: `0 4px 12px ${bg}55` }}>
              {initials}
            </div>
            <div>
              <h2 style={{ margin: '0 0 3px', fontSize: '1.0625rem', fontWeight: 700, color: '#111827' }}>{user.name}</h2>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.8125rem' }}>{user.email}</p>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ padding: isMobile ? '1.25rem' : '1.5rem' }}>

            {saved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '11px 14px', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#065f46', fontWeight: 600 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Profile updated successfully!
              </div>
            )}
            {saveError && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '11px 14px', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#b42318', fontWeight: 500 }}>
                {saveError}
              </div>
            )}

            {/* Section title */}
            <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Personal Details</p>

            {/* Name + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Full Name <span style={{ color: '#ee1761' }}>*</span></label>
                <input value={name} onChange={e => setName(e.target.value)} required placeholder="Your full name" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input value={user.email} disabled style={{ ...inputStyle, background: '#f9fafb', color: '#9ca3af', cursor: 'not-allowed', border: '1.5px solid #e5e7eb' }} />
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#9ca3af' }}>Cannot be changed</p>
              </div>
            </div>

            {/* Phone + LinkedIn */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label style={labelStyle}>LinkedIn URL <span style={{ fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </div>
                  <input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/you" style={{ ...inputStyle, paddingLeft: 36 }} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>
            </div>

            {/* City + Country */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={labelStyle}>City</label>
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Mumbai" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label style={labelStyle}>Country</label>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                  onFocus={onFocus as unknown as React.FocusEventHandler<HTMLSelectElement>}
                  onBlur={onBlur as unknown as React.FocusEventHandler<HTMLSelectElement>}
                >
                  <option value="">Select country…</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#9ca3af' }}><span style={{ color: '#ee1761', fontWeight: 700 }}>*</span> required field</p>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '0.75rem 2rem',
                  background: saving ? '#f9a8c9' : 'linear-gradient(135deg, #ee1761 0%, #c8114d 100%)',
                  color: '#fff', borderRadius: 9, border: 'none', fontWeight: 700,
                  fontSize: '0.9375rem', cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  boxShadow: saving ? 'none' : '0 2px 10px rgba(238,23,97,0.3)',
                  width: isMobile ? '100%' : 'auto', justifyContent: 'center',
                  fontFamily: 'inherit',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
