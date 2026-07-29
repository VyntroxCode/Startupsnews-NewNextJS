'use client';

import { useState, useEffect, useCallback } from 'react';
import { REGISTRATION_CATEGORIES } from '@/constants/registrationCategories';
import CompleteProfileWizard from '@/components/user/CompleteProfileWizard';

interface AuthUser {
  id: number; name: string; email: string;
  phone?: string; country?: string; city?: string;
  linkedin_url?: string; timezone?: string;
}

interface Founder { name?: string; role?: string; linkedin_url?: string; }
interface FundingRound { round_type?: string; amount?: string; lead_investor?: string; round_date?: string; }
interface NLCategory { id: number; name: string; slug: string; color: string; }

const AVATAR_COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#06b6d4'];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

function humanizeKey(key: string) {
  const stripped = key.replace(/^(s_|i_|a_|c_|l_|cs_|ib_|bk_|g_)/, '');
  return stripped.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ViewField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: value ? '#0f172a' : '#cbd5e1' }}>{value || 'Not set'}</p>
    </div>
  );
}

export default function SettingsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [founders, setFounders] = useState<Founder[]>([]);
  const [fundingRounds, setFundingRounds] = useState<FundingRound[]>([]);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nlCategories, setNlCategories] = useState<NLCategory[]>([]);

  useEffect(() => {
    const sync = () => setIsMobile(window.innerWidth < 900);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  const loadUser = () => {
    try {
      const raw = localStorage.getItem('pub_auth_user');
      if (raw) setUser(JSON.parse(raw) as AuthUser);
    } catch {}
  };

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem('pub_auth_token');
    if (!token) return;
    try {
      const res = await fetch('/api/public-auth/update-profile', { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.success) {
        setProfile(d.data.user);
        setFounders(d.data.founders || []);
        setFundingRounds(d.data.fundingRounds || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadUser();
    loadProfile();
    window.addEventListener('pub-auth-changed', loadUser);
    return () => window.removeEventListener('pub-auth-changed', loadUser);
  }, [loadProfile]);

  useEffect(() => {
    fetch('/api/newsletter/categories', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d.success && d.data?.length) setNlCategories(d.data); })
      .catch(() => {});
  }, []);

  const handleWizardComplete = () => {
    setEditing(false);
    loadUser();
    loadProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  };

  if (!user) return null;

  const initials = user.name.charAt(0).toUpperCase();
  const bg = avatarColor(user.name);
  const category = profile?.category as string | null | undefined;
  const categoryLabel = category ? REGISTRATION_CATEGORIES.find((c) => c.value === category)?.label || category : null;
  const sectorSlugs = (profile?.newsletter_category_slugs as string | null | undefined)?.split(',').filter(Boolean) || [];
  const sectorLabel = sectorSlugs.length
    ? sectorSlugs.map((slug) => nlCategories.find((c) => c.slug === slug)?.name || slug).join(', ')
    : null;
  const categoryDetails = profile
    ? Object.entries(profile).filter(([k, v]) => /^(s_|i_|a_|c_|l_|cs_|ib_|bk_|g_)/.test(k) && v)
    : [];

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
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 20px' }}>View &amp; update your profile details.</p>
      </div>

      {saved && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '11px 14px', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#065f46', fontWeight: 600 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Profile updated successfully!
        </div>
      )}

      {/* Read-only profile card */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>

        {/* Card header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 22, flexShrink: 0, boxShadow: `0 4px 12px ${bg}55` }}>
              {initials}
            </div>
            <div>
              <h2 style={{ margin: '0 0 3px', fontSize: '1.0625rem', fontWeight: 700, color: '#111827' }}>{user.name}</h2>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.8125rem' }}>{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            style={{
              padding: '0.65rem 1.25rem', background: 'linear-gradient(135deg, #ee1761 0%, #c8114d 100%)',
              color: '#fff', borderRadius: 9, border: 'none', fontWeight: 700, fontSize: '0.875rem',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 2px 10px rgba(238,23,97,0.3)', fontFamily: 'inherit',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            Edit Profile
          </button>
        </div>

        <div style={{ padding: isMobile ? '1.25rem' : '1.5rem', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem' }}>
          <ViewField label="Phone Number" value={user.phone} />
          <ViewField label="LinkedIn URL" value={user.linkedin_url} />
          <ViewField label="City" value={user.city} />
          <ViewField label="Country" value={user.country} />
          <ViewField label="Website" value={profile?.website as string | undefined} />
          <ViewField label="Category" value={categoryLabel} />
          <ViewField label="Sector" value={sectorLabel} />
          <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
            <ViewField label="Bio" value={profile?.bio as string | undefined} />
          </div>
        </div>
      </div>

      {/* Category-specific details */}
      {category && (categoryDetails.length > 0 || founders.length > 0 || fundingRounds.length > 0) && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: '#111827' }}>{categoryLabel} details</h2>
          </div>
          <div style={{ padding: isMobile ? '1.25rem' : '1.5rem', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem' }}>
            {categoryDetails.map(([k, v]) => (
              <ViewField key={k} label={humanizeKey(k)} value={v as string | number} />
            ))}
          </div>

          {founders.length > 0 && (
            <div style={{ padding: isMobile ? '0 1.25rem 1.25rem' : '0 1.5rem 1.5rem' }}>
              <p style={{ margin: '0 0 10px', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Founders</p>
              {founders.map((f, i) => (
                <p key={i} style={{ margin: '0 0 6px', fontSize: '0.875rem', color: '#0f172a' }}>
                  <strong>{f.name}</strong>{f.role ? ` · ${f.role}` : ''}
                </p>
              ))}
            </div>
          )}

          {fundingRounds.length > 0 && (
            <div style={{ padding: isMobile ? '0 1.25rem 1.25rem' : '0 1.5rem 1.5rem' }}>
              <p style={{ margin: '0 0 10px', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Funding history</p>
              {fundingRounds.map((r, i) => (
                <p key={i} style={{ margin: '0 0 6px', fontSize: '0.875rem', color: '#0f172a' }}>
                  <strong>{r.round_type || 'Round'}</strong>{r.amount ? ` · ${r.amount}` : ''}{r.lead_investor ? ` · ${r.lead_investor}` : ''}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {editing && (
        <CompleteProfileWizard
          onClose={() => setEditing(false)}
          onComplete={handleWizardComplete}
        />
      )}
    </div>
  );
}
