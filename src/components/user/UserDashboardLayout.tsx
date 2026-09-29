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

const LOCK_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

const NAV_GROUPS = [
  {
    title: '',
    items: [
      { href: '/dashboard', label: 'Dashboard', badge: '', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg> },
    ]
  },
  {
    // No group label shown here — was "RESEARCH", removed on request; the items below still
    // render as their own visual group (see the `mb-6`/`mb-8` split in the nav map below).
    title: '',
    items: [
      { href: '/dashboard/reports', label: 'Reports', badge: '', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> },
      // Locked — no real brand-story content exists yet (`/api/brand-stories` and
      // `/api/brand-story-sections` both come back empty). Shows a lock icon and doesn't
      // navigate; the route itself renders the same locked state in place (no redirect) as a
      // second guard against a direct URL visit (see `src/app/dashboard/brand-stories/page.tsx`).
      // Remove `locked` here (and flip `BRAND_STORIES_LOCKED` there) once there's real content.
      { href: '/dashboard/brand-stories', label: 'Brand Stories', badge: '', locked: true, icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> },
      { href: '/dashboard/newsletter', label: 'Newsletter', badge: '', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
      { href: '/dashboard/settings', label: 'Profile', badge: '', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> },
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
      <div className="flex min-h-screen items-center justify-center bg-db-bg">
        <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-slate-300/40 border-t-db-pink" />
      </div>
    );
  }

  const initials = user.name.charAt(0).toUpperCase();
  const userColor = avatarColor(user.name);

  const sidebarWidth = collapsed ? 84 : 272;
  // Mobile's slide-out drawer always shows full labels (it opens via the hamburger tap, not
  // hover, and touch devices have no hover state) — only the desktop rail auto-collapses.
  const showCollapsed = !isMobile && collapsed;

  const sidebar = (
    <div className="relative flex h-full flex-col overflow-hidden border-r border-db-line bg-db-card font-db-nav">
      {/* Header / Logo — desktop shows the logo in its own full-width masthead above the rail
          instead (see the `!isMobile` branch below), so it never shrinks down to the 28px
          icon-only mark when the rail auto-collapses; the mobile drawer keeps it here since it
          has no collapsed state to shrink into. */}
      {isMobile && (
        <div className="relative border-b border-db-line/70 px-4 py-5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md no-underline outline-none focus-visible:ring-2 focus-visible:ring-db-pink/50" style={{ maxWidth: 'calc(100% - 4px)' }}>
              <div className="flex h-16 w-full shrink-0 items-center justify-start">
                <Image
                  src="/logo.png"
                  alt="StartupNews"
                  width={172}
                  height={60}
                  className="object-contain"
                  style={{ width: '100%', height: '100%', maxWidth: 172, maxHeight: 60 }}
                />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className={`relative flex-1 overflow-y-auto ${showCollapsed ? 'px-2.5 py-5' : 'px-3 pb-4 pt-6'}`}>
        {NAV_GROUPS.map((group, gIdx) => (
          <div key={gIdx} className={`flex flex-col gap-1 ${group.title ? 'mb-6' : 'mb-4'}`}>
            {!showCollapsed && group.title && (
              <div className="mb-3 flex items-center justify-between px-2.5">
                <p className="m-0 text-[11px] font-bold tracking-[0.08em] text-slate-400">{group.title}</p>
              </div>
            )}
            {group.items.map((item) => {
              const active = item.href === '/dashboard' ? pathname === '/dashboard' : (item.href !== '#' && pathname?.startsWith(item.href));

              // Same row styling for every state — active is pink icon/text + a thin left bar (no
              // tinted block behind it); everything else gets a light neutral hover.
              // focus-visible ring restored explicitly — the legacy site-wide CSS reset strips
              // the browser's default outline from every link, so without this a keyboard user
              // tabbing through the nav gets no visible indicator of where focus is at all.
              // `visited:` is explicit and non-negotiable here: these are plain `<a>` tags, this
              // sheet skips Preflight (which normally neutralises link colour), and the browser's
              // own default *visited*-link colour (a purple/magenta) otherwise paints straight
              // through on whichever nav items the visitor has actually already clicked into —
              // getComputedStyle() can't catch this in testing, since browsers deliberately
              // report the *unvisited* colour to JS to prevent history-sniffing, even while
              // painting the real visited colour on screen. Force it to match every other state.
              const rowClass = `group relative flex items-center rounded-md text-[17px] no-underline outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-db-pink/50 focus-visible:ring-offset-1 ${
                active ? 'font-semibold text-db-pink visited:text-db-pink' : 'font-medium text-db-ink visited:text-db-ink hover:bg-slate-50 hover:text-db-pink visited:hover:text-db-pink'
              }`;
              const iconSize = showCollapsed ? '[&>svg]:size-6' : '[&>svg]:size-5';
              const iconClass = `flex shrink-0 ${iconSize} ${active ? 'text-db-pink visited:text-db-pink' : 'text-db-ink visited:text-db-ink group-hover:text-db-pink visited:group-hover:text-db-pink'}`;

              // Locked items (Brand Stories — no real content yet) render as an inert row, not a
              // link: no `href`, no click handler, `aria-disabled` + a native `title` tooltip so
              // the reason is discoverable, and a lock icon where the badge slot would sit. Kept
              // focusable (not `tabIndex={-1}`) so a keyboard/screen-reader user still discovers
              // it exists and why it's unavailable, rather than it silently vanishing from the
              // tab order.
              if (item.locked) {
                return (
                  <span
                    key={item.label}
                    role="link"
                    aria-disabled="true"
                    tabIndex={0}
                    title={`${item.label} — locked, no content yet`}
                    className={`relative flex cursor-not-allowed items-center rounded-md text-[17px] font-medium text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 ${showCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}`}
                  >
                    <span className={`flex shrink-0 ${showCollapsed ? '[&>svg]:size-6' : '[&>svg]:size-5'}`}>{item.icon}</span>
                    {!showCollapsed && (
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="block whitespace-nowrap leading-[1.4]">{item.label}</span>
                        <span className="flex shrink-0 text-slate-400">{LOCK_ICON}</span>
                      </span>
                    )}
                    {showCollapsed && <span className="absolute -bottom-0.5 -right-0.5 text-slate-400">{LOCK_ICON}</span>}
                  </span>
                );
              }

              // Every other item is a plain, direct link — Reports and Brand Stories used to
              // expand a hover/click submenu of their own sections here; removed on request (the
              // sections it listed are still reachable, just from within the Reports page
              // itself, which already has its own section browser).
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={showCollapsed ? item.label : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={`${rowClass} ${showCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}`}
                >
                  {active && (
                    <span className={`absolute inset-y-2 w-[3px] rounded-full bg-db-pink ${showCollapsed ? '-left-1' : 'left-0'}`} aria-hidden="true" />
                  )}
                  <span className={iconClass}>{item.icon}</span>
                  {!showCollapsed && (
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="block whitespace-nowrap leading-[1.4]">{item.label}</span>
                      {item.badge && <span className="rounded border border-slate-300 px-1 text-[9px] font-bold text-slate-500">{item.badge}</span>}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom section — profile completeness + a quiet logout link */}
      <div className={`border-t border-db-line/70 pb-6 pt-3 ${showCollapsed ? 'px-2.5' : 'px-3'}`}>
        {profilePercent !== null && profilePercent < 100 && (
          <div className="mb-1">
            {showCollapsed ? (
              <button
                type="button"
                onClick={() => setShowWizard(true)}
                title={`Profile ${profilePercent}% complete`}
                className="flex h-8 w-full cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[11px] font-bold text-db-pink transition-colors duration-200 hover:bg-slate-50"
              >
                {profilePercent}%
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowWizard(true)}
                className="w-full cursor-pointer rounded-md border-0 bg-transparent px-3 py-3 text-left transition-colors duration-200 hover:bg-slate-50"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[14px] font-medium leading-[1.4] text-db-muted">Profile complete</span>
                  <span className="text-[14px] font-semibold leading-[1.4] text-db-ink">{profilePercent}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-sm bg-db-line">
                  <div className="h-full bg-db-pink transition-[width] duration-300 ease-out" style={{ width: `${profilePercent}%` }} />
                </div>
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          title={showCollapsed ? 'Logout' : undefined}
          aria-label={showCollapsed ? 'Logout' : undefined}
          className={`flex w-full cursor-pointer items-center gap-3 rounded-md border-0 bg-transparent text-[15px] font-medium leading-[1.4] text-db-muted transition-colors duration-200 hover:bg-slate-50 hover:text-db-pink ${showCollapsed ? 'justify-center py-2.5' : 'px-3 py-2.5'}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!showCollapsed && 'Logout'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-db-bg font-db">
      {isMobile && (
        <>
          {/* z-[1004] — above the backdrop (1002) AND the drawer (1003). CSS stacking contexts
              nest: a descendant's z-index is capped by its own positioned ancestor's stacking
              context, so raising just the hamburger button's z-index inside this bar couldn't
              lift it above a *sibling* (the drawer) — only raising the bar itself works. The
              drawer's own logo header sits in this same 72px band and is now visually tucked
              behind this bar while open; its nav items, well below that band, are unaffected. */}
          <div className="fixed inset-x-0 top-0 z-[1004] flex h-[72px] items-center gap-3 border-b border-db-line bg-db-card px-4">
            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-db-line bg-db-card text-db-ink outline-none focus-visible:ring-2 focus-visible:ring-db-pink/50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-[15px] font-extrabold tracking-tight text-db-ink">Member Dashboard</p>
              <p className="m-0 mt-0.5 truncate text-[12px] text-db-muted">{user.name}</p>
            </div>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white"
              style={{ background: userColor }}
            >
              {initials}
            </div>
          </div>

          {mobileOpen && <div onClick={() => setMobileOpen(false)} className="fixed inset-0 z-[1002] bg-slate-900/55 backdrop-blur-sm" />}

          <div
            className="fixed inset-y-0 left-0 z-[1003] w-[288px] max-w-[86vw] transition-transform duration-250 ease-out"
            style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
          >
            {sidebar}
          </div>

          <main className="pt-[72px]">{children}</main>
        </>
      )}

      {!isMobile && (
        <>
          {/* Full-width masthead — the logo lives here now, at a fixed full size, so it never
              shrinks to the 28px icon-only mark the rail itself falls back to when collapsed
              (see the `isMobile` guard on the sidebar's own header above). Sits above the rail,
              which starts at `top-[72px]` to sit flush beneath it. */}
          <div className="fixed inset-x-0 top-0 z-[110] flex h-[72px] items-center border-b border-db-line/70 bg-db-card px-6">
            <Link href="/" className="flex items-center gap-2.5 rounded-md no-underline outline-none focus-visible:ring-2 focus-visible:ring-db-pink/50">
              <Image src="/logo.png" alt="StartupNews" width={172} height={60} className="h-10 w-auto object-contain" />
            </Link>
          </div>

          <div className="flex min-h-screen pt-[72px]">
            <aside
              onMouseEnter={() => setCollapsed(false)}
              onMouseLeave={() => setCollapsed(true)}
              onFocus={() => setCollapsed(false)}
              onBlur={(e) => {
                // Only re-collapse once focus has actually left the sidebar (e.g. Tab past the
                // last link) — not while it's just moving from one nav item to the next inside it.
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCollapsed(true);
              }}
              className="fixed bottom-0 left-0 top-[72px] z-[100] transition-[width] duration-300"
              style={{ width: sidebarWidth, transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              {sidebar}
            </aside>

            <div className="min-w-0 flex-1 transition-[margin-left] duration-300" style={{ marginLeft: sidebarWidth, transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <main className="min-h-screen">{children}</main>
            </div>
          </div>
        </>
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
