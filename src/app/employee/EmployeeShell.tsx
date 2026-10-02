'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getEmployeeUser, clearEmployeeSession, getEmployeeAuthHeaders, setEmployeeSession, getEmployeeToken, type EmployeeUser } from '@/lib/employee-auth';
import ProfileProgressStrip from '@/components/admin/ProfileProgressStrip';
import { useEscapeKey } from '@/hooks/useEscapeKey';
// Scoped Tailwind utilities for the employee frame and its self-service widgets — see that file's header.
import '@/components/admin/staff-panel-tailwind.css';

function AttendanceIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"></circle>
      <polyline points="12 7 12 12 15.5 14"></polyline>
    </svg>
  );
}

function LeaveIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
      <line x1="12" y1="14" x2="12" y2="18"></line>
      <line x1="10" y1="16" x2="14" y2="16"></line>
    </svg>
  );
}

function DocumentsIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  );
}

function RulesPolicyIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2h6a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"></path>
      <path d="M9 4h6"></path>
      <line x1="8" y1="10" x2="16" y2="10"></line>
      <line x1="8" y1="14" x2="16" y2="14"></line>
      <line x1="8" y1="18" x2="12" y2="18"></line>
    </svg>
  );
}

function TicketIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4Z"></path>
      <line x1="9" y1="7" x2="9" y2="17" strokeDasharray="2 2"></line>
    </svg>
  );
}

function LeadsIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <line x1="19" y1="8" x2="19" y2="14"></line>
      <line x1="22" y1="11" x2="16" y2="11"></line>
    </svg>
  );
}

function ExitIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  );
}

const EXIT_HREF = '/employee/exit';

// Written as a list so future employee-facing sections slot in the same way without
// restructuring the sidebar.
const NAV_ITEMS: { href: string; label: string; icon: typeof AttendanceIcon }[] = [
  { href: '/employee/attendance', label: 'Attendance', icon: AttendanceIcon },
  { href: '/employee/leads', label: 'My Leads', icon: LeadsIcon },
  { href: '/employee/leave', label: 'Leave', icon: LeaveIcon },
  { href: '/employee/documents', label: 'Documents', icon: DocumentsIcon },
  { href: '/employee/rules-policy', label: 'Admin Rules', icon: RulesPolicyIcon },
  { href: '/employee/it-tickets', label: 'IT Support', icon: TicketIcon },
  { href: EXIT_HREF, label: 'My Exit', icon: ExitIcon },
];
/** Past the last working day (offboarding "alumni"), the login is read-only: My Exit is all that's left. */
const ALUMNI_NAV_ITEMS = NAV_ITEMS.filter((item) => item.href === EXIT_HREF);

/** Bottom tab bar on phones: the three pages employees open daily, plus "More" for the drawer. */
const BOTTOM_TABS = ['/employee/attendance', '/employee/leave', '/employee/leads'];

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  );
}

function MoreIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1.5"></circle>
      <circle cx="12" cy="12" r="1.5"></circle>
      <circle cx="19" cy="12" r="1.5"></circle>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

const isActivePath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** The sidebar body — rendered once as the fixed desktop column and once inside the phone drawer. */
function SidebarContent({ user, items, pathname, onLogout, onClose }: {
  user: EmployeeUser;
  items: typeof NAV_ITEMS;
  pathname: string;
  onLogout: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="mb-5 flex items-center gap-3 border-b border-slate-200/70 px-2 pb-5 pt-1">
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-indigo-600 text-base font-bold text-white">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.95rem] font-bold text-slate-900">{user.name}</div>
          <div className="font-mono text-xs text-slate-500">{user.employeeCode}</div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-slate-500 active:bg-slate-100"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      <nav className="flex-1">
        <div className="mb-2 px-3 text-[0.68rem] font-bold uppercase tracking-[0.06em] text-slate-400">Menu</div>
        {items.map((item) => {
          const isActive = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 flex min-h-11 items-center gap-3 rounded-lg border-l-[3px] px-3.5 py-3 text-[0.9rem] no-underline ${
                isActive
                  ? 'border-indigo-500 bg-indigo-500/10 font-semibold text-indigo-500'
                  : 'border-transparent font-medium text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon color={isActive ? '#6366f1' : '#94a3b8'} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        className="mt-4 min-h-11 cursor-pointer rounded-lg border border-solid border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        Logout
      </button>
    </>
  );
}

export default function EmployeeShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<EmployeeUser | null>(null);
  const [checked, setChecked] = useState(false);
  // The phone drawer remembers the path it was opened on, so navigating anywhere closes it on its own.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = drawerPath === pathname;
  const setDrawerOpen = (open: boolean) => setDrawerPath(open ? pathname : null);

  useEffect(() => {
    const checkSession = () => {
      const stored = getEmployeeUser();
      if (!stored) {
        router.replace('/admin/login');
        return;
      }
      setUser(stored);
      setChecked(true);
    };
    checkSession();
  }, [router]);

  // The alumni flag is set at login, but a last working day can pass mid-session — re-check it
  // once from the server (My Exit is the one endpoint alumni can still call).
  useEffect(() => {
    if (!checked) return;
    let cancelled = false;
    fetch('/api/employee/offboarding', { headers: getEmployeeAuthHeaders() })
      .then((res) => res.json())
      .then((body) => {
        const alumni = !!body?.data?.alumni;
        const token = getEmployeeToken();
        if (cancelled || !token) return;
        setUser((u) => {
          if (!u || !!u.alumni === alumni) return u;
          const next = { ...u, alumni };
          setEmployeeSession(token, next);
          return next;
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [checked]);

  const alumni = !!user?.alumni;
  useEffect(() => {
    if (alumni && pathname !== EXIT_HREF) router.replace(EXIT_HREF);
  }, [alumni, pathname, router]);

  // Phone drawer: close on Esc, and lock the page behind it while open.
  useEscapeKey(() => setDrawerOpen(false), drawerOpen);
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [drawerOpen]);

  function handleLogout() {
    clearEmployeeSession();
    router.replace('/admin/login');
  }

  if (!checked || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading…
      </div>
    );
  }

  // IT Support's board (five columns) and ticket table, and My Leads' KPI row and eight-column lead
  // table, need more than the 1100px reading width the other employee pages use, so those routes
  // get the full content width.
  const wideContent = pathname.startsWith('/employee/it-tickets') || pathname.startsWith('/employee/leads');
  const items = alumni ? ALUMNI_NAV_ITEMS : NAV_ITEMS;
  const currentLabel = items.find((item) => isActivePath(pathname, item.href))?.label || 'Employee';
  const bottomTabs = alumni ? [] : NAV_ITEMS.filter((item) => BOTTOM_TABS.includes(item.href));
  const moreActive = !alumni && !bottomTabs.some((item) => isActivePath(pathname, item.href));

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Desktop: fixed-width sidebar column, sticky so the menu stays put while the page scrolls. */}
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col overflow-y-auto border-r border-solid border-slate-200/70 bg-gradient-to-b from-white to-slate-50 px-4 py-6 shadow-[2px_0_8px_rgba(0,0,0,0.02)] box-border md:flex">
        <SidebarContent user={user} items={items} pathname={pathname} onLogout={handleLogout} />
      </aside>

      {/* Phone: sticky top bar with the menu button and the current page's name. */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-solid border-slate-200 bg-white/95 px-2 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-slate-700 active:bg-slate-100"
        >
          <MenuIcon />
        </button>
        <div className="min-w-0 flex-1 truncate text-base font-bold text-slate-900">{currentLabel}</div>
        <div className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-sm font-bold text-white">
          {user.name.charAt(0).toUpperCase()}
        </div>
      </header>

      {/* Phone: slide-in drawer with the full menu (backdrop tap / Esc / navigation closes it). */}
      <div
        className={`fixed inset-0 z-[1002] bg-slate-900/50 transition-opacity duration-200 md:hidden ${drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-[1003] flex w-[288px] max-w-[86vw] flex-col overflow-y-auto bg-white px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl box-border transition-transform duration-200 ease-out md:hidden ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!drawerOpen}
        aria-label="Menu"
      >
        <SidebarContent user={user} items={items} pathname={pathname} onLogout={handleLogout} onClose={() => setDrawerOpen(false)} />
      </aside>

      {/* min-w-0 lets a wide table scroll inside <main> instead of stretching the whole page. */}
      <main className={`min-w-0 flex-1 px-4 pt-4 box-border md:px-10 md:pb-8 md:pt-8 ${bottomTabs.length ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]' : 'pb-8'} ${wideContent ? '' : 'md:max-w-[1100px]'}`}>
        {!alumni && <ProfileProgressStrip apiBase="/api/employee/documents" getHeaders={getEmployeeAuthHeaders} documentsHref="/employee/documents" />}
        {children}
      </main>

      {/* Phone: bottom tab bar — daily pages one tap away, "More" opens the drawer. */}
      {bottomTabs.length > 0 && (
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-solid border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Quick navigation">
          {bottomTabs.map((item) => {
            const isActive = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] no-underline ${isActive ? 'font-semibold text-indigo-600' : 'font-medium text-slate-500'}`}
              >
                <Icon size={22} color={isActive ? '#4f46e5' : '#94a3b8'} />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={`flex h-16 cursor-pointer flex-col items-center justify-center gap-1 border-0 bg-transparent text-[0.7rem] ${moreActive ? 'font-semibold text-indigo-600' : 'font-medium text-slate-500'}`}
          >
            <MoreIcon size={22} color={moreActive ? '#4f46e5' : '#94a3b8'} />
            More
          </button>
        </nav>
      )}
    </div>
  );
}
