'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useHasMounted } from '@/hooks/useHasMounted';
import CompleteProfileWizard from './CompleteProfileWizard';

interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  linkedin_url?: string;
}

interface ReportSection {
  id: number;
  title: string;
  sort_order: number;
}

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

const NAV_GROUPS = [
  {
    title: '',
    items: [
      { href: '/dashboard', label: 'Dashboard', badge: '', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg> },
    ]
  },
  {
    title: 'RESEARCH',
    items: [
      { href: '/dashboard/reports', label: 'Reports', badge: '', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> },
      { href: '/dashboard/brand-stories', label: 'Brand Stories', badge: '', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> },
      { href: '/dashboard/newsletter', label: 'Newsletter', badge: '', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
      { href: '/dashboard/settings', label: 'Profile', badge: '', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> },
    ]
  }
];

export default function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  // Starts collapsed (icon-only) on desktop — the sidebar opens on hover/focus and closes again
  // once the cursor/focus leaves it (see the <aside> below), rather than a manual pin toggle.
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mounted = useHasMounted();
  const [reportSections, setReportSections] = useState<ReportSection[]>([]);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [brandStorySections, setBrandStorySections] = useState<ReportSection[]>([]);
  const [brandStoriesExpanded, setBrandStoriesExpanded] = useState(false);

  // Which expandable nav row (by href) the cursor is currently over — lets Reports/Brand
  // Stories preview their submenu on hover without permanently pinning it open the way the
  // chevron-click toggle (reportsExpanded/brandStoriesExpanded) does.
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const [showWizard, setShowWizard] = useState(false);
  const [profilePercent, setProfilePercent] = useState<number | null>(null);

  const refreshProfilePercent = () => {
    const token = localStorage.getItem('pub_auth_token');
    if (!token) return;
    fetch('/api/public-auth/profile-status', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setProfilePercent(d.data.percent); })
      .catch(() => {});
  };

  // Auto-expand when on the reports page
  useEffect(() => {
    if (pathname?.startsWith('/dashboard/reports')) {
      setReportsExpanded(true);
    }
    if (pathname?.startsWith('/dashboard/brand-stories')) {
      setBrandStoriesExpanded(true);
    }
  }, [pathname]);

  useEffect(() => {
    fetch('/api/report-sections')
      .then((r) => r.json())
      .then((data) => { if (data.success) setReportSections(data.data); })
      .catch(() => {});
    fetch('/api/brand-story-sections')
      .then((r) => r.json())
      .then((data) => { if (data.success) setBrandStorySections(data.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 960);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    try {
      const raw = localStorage.getItem('pub_auth_user');
      const token = localStorage.getItem('pub_auth_token');
      if (!token || !raw) {
        router.replace('/');
        return () => window.removeEventListener('resize', checkMobile);
      }
      const parsed = JSON.parse(raw) as AuthUser;
      setUser(parsed);

      fetch('/api/public-auth/profile-status', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (!d.success) return;
          setProfilePercent(d.data.percent);
          if (!d.data.complete && !sessionStorage.getItem('pending_profile_dismissed')) {
            setShowWizard(true);
          }
        })
        .catch(() => {});
    } catch {
      router.replace('/');
    }

    return () => window.removeEventListener('resize', checkMobile);
  }, [router]);

  useEffect(() => {
    if (!isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  const handleLogout = () => {
    localStorage.removeItem('pub_auth_token');
    localStorage.removeItem('pub_auth_user');
    sessionStorage.removeItem('pending_profile_dismissed');
    window.dispatchEvent(new Event('pub-auth-changed'));
    window.location.href = '/';
  };

  if (!mounted) {
    return null;
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at top, #fdf2f8 0%, #f8fafc 45%, #eef2ff 100%)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '3px solid rgba(148,163,184,0.25)',
            borderTopColor: '#ee1761',
            animation: 'dashboard-spin 0.8s linear infinite',
          }}
        />
        <style>{'@keyframes dashboard-spin { to { transform: rotate(360deg); } }'}</style>
      </div>
    );
  }

  const initials = user.name.charAt(0).toUpperCase();
  const userColor = avatarColor(user.name);

  const sidebarWidth = collapsed ? 72 : 260;
  // Mobile's slide-out drawer always shows full labels (it opens via the hamburger tap, not
  // hover, and touch devices have no hover state) — only the desktop rail auto-collapses.
  const showCollapsed = !isMobile && collapsed;

  const sidebar = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        color: '#4b5563',
        background: '#f9fafb',
        borderRight: '1px solid #e5e7eb',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header / Logo */}
      <div style={{ position: 'relative', padding: showCollapsed ? '16px 10px 14px' : '20px 16px 16px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: showCollapsed ? 'center' : 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', minWidth: 0, gap: 10, flex: showCollapsed ? '0 0 auto' : 1, maxWidth: showCollapsed ? 40 : 'calc(100% - 44px)' }}>
            <div style={{ width: showCollapsed ? 32 : '100%', height: showCollapsed ? 32 : 72, display: 'flex', alignItems: 'center', justifyContent: showCollapsed ? 'center' : 'flex-start', flexShrink: 0 }}>
              <Image src="/logo.png" alt="StartupNews" width={showCollapsed ? 28 : 180} height={showCollapsed ? 28 : 64} style={{ objectFit: 'contain', width: showCollapsed ? 28 : '100%', height: showCollapsed ? 28 : '100%', maxWidth: showCollapsed ? 28 : 180, maxHeight: showCollapsed ? 28 : 64 }} />
            </div>
            {/* {!showCollapsed && <span style={{ fontWeight: 800, fontSize: 18, color: '#111827', letterSpacing: '-0.02em' }}>StartupNews</span>} */}
          </Link>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ position: 'relative', flex: 1, padding: showCollapsed ? '10px' : '0 12px', overflowY: 'auto' }}>
        {NAV_GROUPS.map((group, gIdx) => (
          <div key={gIdx} style={{ marginBottom: group.title ? 40 : 26 }}>
            {!showCollapsed && group.title && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#9ca3af', fontWeight: 700, letterSpacing: '0.04em' }}>{group.title}</p>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
              </div>
            )}
            {group.items.map((item) => {
              const isReports = item.href === '/dashboard/reports';
              const isBrandStories = item.href === '/dashboard/brand-stories';
              const isExpandable = isReports || isBrandStories;
              const itemSections = isReports ? reportSections : isBrandStories ? brandStorySections : [];
              const expanded = isReports ? reportsExpanded : brandStoriesExpanded;
              const toggleExpanded = isReports
                ? () => setReportsExpanded((v) => !v)
                : () => setBrandStoriesExpanded((v) => !v);
              const active = item.href === '/dashboard' ? pathname === '/dashboard' : (item.href !== '#' && pathname?.startsWith(item.href));
              const hasSections = isExpandable && itemSections.length > 0;
              // Pinned open (chevron click / being on that section's page) OR just being
              // previewed because the cursor is over this row right now.
              const showSubmenu = hasSections && (expanded || hoveredNav === item.href);

              return (
                <div key={item.label}>
                  {/* Nav row — expandable items get a toggle chevron instead of being a plain link */}
                  {isExpandable && !showCollapsed ? (
                    <div
                      style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}
                      onMouseEnter={() => setHoveredNav(item.href)}
                      onMouseLeave={() => setHoveredNav((h) => (h === item.href ? null : h))}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          flex: 1, padding: '15px 14px', borderRadius: 8,
                          textDecoration: 'none',
                          color: active ? '#ee1761' : '#4b5563',
                          background: active ? '#fde8f0' : 'transparent',
                          fontWeight: active ? 600 : 400,
                          transition: 'background 0.15s, color 0.15s',
                        }}
                        onMouseEnter={e => { if (active) return; e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#111827'; }}
                        onMouseLeave={e => { if (active) return; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4b5563'; }}
                      >
                        <span style={{ display: 'flex', flexShrink: 0, color: active ? '#ee1761' : '#374151' }}>{item.icon}</span>
                        <span style={{ fontSize: 18, fontWeight: 500, flex: 1 }}>{item.label}</span>
                      </Link>
                      {hasSections && (
                        <button
                          type="button"
                          onClick={toggleExpanded}
                          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', borderRadius: 6, flexShrink: 0, transition: 'color 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#374151'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showSubmenu ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      title={showCollapsed ? item.label : undefined}
                      onClick={() => setMobileOpen(false)}
                      style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: showCollapsed ? 'center' : 'flex-start',
                        gap: showCollapsed ? 0 : 14,
                        padding: showCollapsed ? '10px 0' : '15px 14px',
                        marginBottom: 6, borderRadius: 8, textDecoration: 'none',
                        color: active ? '#ee1761' : '#4b5563',
                        background: active ? '#fde8f0' : 'transparent',
                        fontWeight: active ? 600 : 400,
                        transition: 'background 0.15s, color 0.15s',
                      }}
                      onMouseEnter={e => { if (active) return; e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#111827'; }}
                      onMouseLeave={e => { if (active) return; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4b5563'; }}
                    >
                      <span style={{ display: 'flex', flexShrink: 0, color: active ? '#ee1761' : '#374151' }}>{item.icon}</span>
                      {!showCollapsed && (
                        <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                          <span style={{ display: 'block', fontSize: 18, fontWeight: 500 }}>{item.label}</span>
                          {item.badge && (
                            <span style={{ fontSize: 9, border: '1px solid #d1d5db', color: '#6b7280', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>{item.badge}</span>
                          )}
                        </span>
                      )}
                    </Link>
                  )}

                  {/* Sections submenu — always mounted (when the parent has sections) and
                      animated open/closed via a grid-rows 0fr/1fr collapse, rather than being
                      mounted/unmounted on toggle, so it slides in smoothly on hover instead of
                      just popping in. */}
                  {isExpandable && !showCollapsed && hasSections && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateRows: showSubmenu ? '1fr' : '0fr',
                        transition: 'grid-template-rows 0.25s ease',
                      }}
                    >
                      <div style={{ overflow: 'hidden', minHeight: 0 }}>
                      <div style={{ paddingLeft: 34, marginBottom: 6, paddingTop: 2 }}>
                      {/* One row per section */}
                      {itemSections.map((section) => {
                        const sectionHref = `${item.href}?section=${section.id}`;
                        return (
                          <Link
                            key={section.id}
                            href={sectionHref}
                            onClick={() => setMobileOpen(false)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '0.4rem 0.625rem', marginBottom: 2,
                              borderRadius: 6, textDecoration: 'none',
                              color: '#64748b',
                              background: 'transparent',
                              fontSize: '0.8125rem', fontWeight: 500,
                              transition: 'background 0.12s, color 0.12s',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#111827'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                          >
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#cbd5e1', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{section.title}</span>
                          </Link>
                        );
                      })}
                      </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Profile completeness */}
      {profilePercent !== null && profilePercent < 100 && (
        <div style={{ padding: showCollapsed ? '0 10px 12px' : '0 16px 14px' }}>
          {showCollapsed ? (
            <button
              type="button"
              onClick={() => setShowWizard(true)}
              title={`Profile ${profilePercent}% complete`}
              style={{
                width: '100%', height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                fontSize: 10, fontWeight: 800, color: profilePercent >= 100 ? '#16a34a' : '#ee1761',
              }}
            >
              {profilePercent}%
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowWizard(true)}
              style={{
                width: '100%', textAlign: 'left', background: '#fff', border: '1px solid #e5e7eb',
                borderRadius: 10, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#4b5563' }}>Profile</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: profilePercent >= 100 ? '#16a34a' : '#ee1761' }}>
                  {profilePercent}%
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%', width: `${profilePercent}%`, borderRadius: 3,
                    background: profilePercent >= 100 ? '#16a34a' : 'linear-gradient(90deg, #ee1761, #f97316)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </button>
          )}
        </div>
      )}

      {/* Logout bottom */}
      <div style={{ padding: showCollapsed ? '14px 10px' : '0 16px 16px' }}>
        <button
          type="button"
          onClick={handleLogout}
          title={showCollapsed ? 'Logout' : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: showCollapsed ? '12px 0' : '11px 0',
            borderRadius: showCollapsed ? 6 : 4,
            background: '#ee1761',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 14,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#c8114d'}
          onMouseLeave={e => e.currentTarget.style.background = '#ee1761'}
        >
          {showCollapsed ? (
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          ) : (
            'Logout'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: '"Garnett", Helvetica, Arial, sans-serif' }}>
      {isMobile && (
        <>
          <div style={{ position: 'fixed', inset: '0 0 auto 0', height: 72, zIndex: 1001, display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(148,163,184,0.18)' }}>
            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              style={{ width: 42, height: 42, borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 24px rgba(15,23,42,0.08)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Member Dashboard</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: `linear-gradient(135deg, ${userColor}, ${userColor}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 16, boxShadow: `0 12px 24px ${userColor}35` }}>
              {initials}
            </div>
          </div>

          {mobileOpen && (
            <div
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', zIndex: 1002 }}
            />
          )}

          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 272, maxWidth: '82vw', zIndex: 1003, transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s ease' }}>
            {sidebar}
          </div>

          <main style={{ paddingTop: 72 }}>{children}</main>
        </>
      )}

      {!isMobile && (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <aside
            onMouseEnter={() => setCollapsed(false)}
            onMouseLeave={() => setCollapsed(true)}
            onFocus={() => setCollapsed(false)}
            onBlur={(e) => {
              // Only re-collapse once focus has actually left the sidebar (e.g. Tab past the
              // last link) — not while it's just moving from one nav item to the next inside it.
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCollapsed(true);
            }}
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0, width: sidebarWidth,
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 100,
            }}
          >
            {sidebar}
          </aside>

          <div style={{ marginLeft: sidebarWidth, flex: 1, minWidth: 0, transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <main style={{ minHeight: '100vh' }}>{children}</main>
          </div>
        </div>
      )}

      {showWizard && (
        <CompleteProfileWizard
          onClose={() => { setShowWizard(false); refreshProfilePercent(); }}
          onComplete={() => { setShowWizard(false); refreshProfilePercent(); }}
        />
      )}
    </div>
  );
}
