'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { REGISTRATION_CATEGORIES } from '@/constants/registrationCategories';
import CompleteProfileWizard from '@/components/user/CompleteProfileWizard';
import ProfileHeader from '@/components/user/profile/ProfileHeader';
import ProfileOverview from '@/components/user/profile/ProfileOverview';
import CategoryDetailsCard from '@/components/user/profile/CategoryDetailsCard';
import { CheckIcon } from '@/components/user/profile/icons';

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

export default function SettingsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [founders, setFounders] = useState<Founder[]>([]);
  const [fundingRounds, setFundingRounds] = useState<FundingRound[]>([]);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nlCategories, setNlCategories] = useState<NLCategory[]>([]);
  const [percent, setPercent] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();

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

  // Reuses the same completion calculation the dashboard sidebar already relies on, rather than
  // re-deriving a percentage from the raw profile fields here.
  const loadCompletion = useCallback(async () => {
    const token = localStorage.getItem('pub_auth_token');
    if (!token) return;
    try {
      const res = await fetch('/api/public-auth/profile-status', { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.success) setPercent(d.data.percent);
    } catch {}
  }, []);

  useEffect(() => {
    loadUser();
    loadProfile();
    loadCompletion();
    window.addEventListener('pub-auth-changed', loadUser);
    return () => window.removeEventListener('pub-auth-changed', loadUser);
  }, [loadProfile, loadCompletion]);

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
    loadCompletion();
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
  const categoryDetails: [string, string | number][] = profile
    ? Object.entries(profile)
        .filter(([k, v]) => /^(s_|i_|a_|c_|l_|cs_|ib_|bk_|g_)/.test(k) && v)
        .map(([k, v]) => [humanizeKey(k), v as string | number])
    : [];

  return (
    <div style={{ padding: isMobile ? '1.25rem' : '2rem', minHeight: '100vh', background: '#f8fafc', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      {/* Very low-opacity brand glow behind the header — decorative depth only */}
      <div aria-hidden style={{
        position: 'absolute', top: -120, left: isMobile ? -100 : 120, width: 480, height: 480,
        background: 'radial-gradient(circle, rgba(238,23,97,0.05) 0%, rgba(238,23,97,0) 70%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ maxWidth: 1360, position: 'relative', zIndex: 1 }}>
        <ProfileHeader isMobile={isMobile} />

        <AnimatePresence>
          {saved && (
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '11px 14px', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#065f46', fontWeight: 600 }}
            >
              <CheckIcon />
              Profile updated successfully!
            </motion.div>
          )}
        </AnimatePresence>

        <ProfileOverview
          isMobile={isMobile}
          name={user.name}
          email={user.email}
          initials={initials}
          avatarBg={bg}
          categoryLabel={categoryLabel}
          phone={user.phone}
          city={user.city}
          country={user.country}
          linkedinUrl={user.linkedin_url}
          website={profile?.website as string | undefined}
          sectorLabel={sectorLabel}
          bio={profile?.bio as string | undefined}
          percent={percent}
          onEdit={() => setEditing(true)}
        />

        {category && (categoryDetails.length > 0 || founders.length > 0 || fundingRounds.length > 0) && (
          <CategoryDetailsCard
            isMobile={isMobile}
            title={categoryLabel || 'Category'}
            details={categoryDetails}
            founders={founders}
            fundingRounds={fundingRounds}
          />
        )}
      </div>

      {editing && (
        <CompleteProfileWizard
          onClose={() => setEditing(false)}
          onComplete={handleWizardComplete}
        />
      )}
    </div>
  );
}
