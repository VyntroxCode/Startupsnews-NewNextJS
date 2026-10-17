'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Ellipsis, LogOut, X } from 'lucide-react';
import type { AdminUser } from '@/lib/admin-auth';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { getVisibleMenu, isGroup, isItemActive, type MenuEntry, type MenuItem } from './AdminSidebar';
import { ROLE_LABELS } from './AdminHeader';

/** Bottom tab bar on phones, per role: the pages each role opens daily (in this order), plus "More"
 * for the drawer. Hrefs the role can't open are skipped; with fewer than two left there is no bar. */
const BOTTOM_TABS: Record<string, string[]> = {
  event_admin: ['/admin', '/admin/partnership-tracker', '/admin/attendance'],
  publisher_admin: ['/admin', '/admin/posts', '/admin/attendance'],
  it_support: ['/admin', '/admin/it-tickets'],
  financial_analyst: ['/admin', '/admin/funding-data', '/admin/it-tickets'],
};
const DEFAULT_BOTTOM_TABS = ['/admin', '/admin/posts', '/admin/partnership-tracker'];

const flatten = (entries: MenuEntry[]): MenuItem[] => entries.flatMap((e) => (isGroup(e) ? e.children : [e]));
/** Dashboard ('/admin') is lit only on itself — every admin route starts with /admin. */
const isActive = (pathname: string, item: MenuItem) => (item.href === '/admin' ? pathname === '/admin' : isItemActive(pathname, item));

/** The admin panel's phone frame (below md): a slide-in drawer with the whole menu (HRMS group
 * included) and a fixed bottom tab bar. The desktop rail (AdminSidebar) is hidden at this width.
 * Same pattern as the employee portal's EmployeeShell. */
export default function AdminMobileNav({ user, open, onOpen, onClose, onLogout }: {
  user: AdminUser | null;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const role = user?.role || '';
  const menu = getVisibleMenu(role);
  const links = flatten(menu);
  const tabs = (BOTTOM_TABS[role] ?? DEFAULT_BOTTOM_TABS).flatMap((href) => links.filter((l) => l.href === href));
  const moreActive = !tabs.some((t) => isActive(pathname, t));
  // A group the user hasn't toggled stays open while one of its pages is the current one.
  const [groupToggles, setGroupToggles] = useState<Record<string, boolean>>({});

  useEscapeKey(onClose, open);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // visited: variants — style.css's `a:visited { color: #E62E69 }` outranks a plain text-* class.
  const renderLink = (item: MenuItem, nested = false) => {
    const active = isActive(pathname, item);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={`mb-1 box-border flex min-h-11 items-center gap-3 rounded-lg border-0 border-l-[3px] border-solid px-3.5 py-2.5 no-underline ${nested ? 'text-[0.875rem]' : 'text-[0.9rem]'} ${
          active
            ? 'border-indigo-500 bg-indigo-500/10 font-semibold text-indigo-600 visited:text-indigo-600'
            : 'border-transparent font-medium text-slate-700 visited:text-slate-700 hover:bg-slate-100'
        }`}
      >
        <Icon size={nested ? 18 : 20} color={active ? '#4f46e5' : '#64748b'} aria-hidden />
        {item.label}
      </Link>
    );
  };

  return (
    <>
      {open && (
        <>
          <div className="fixed top-0 right-0 bottom-0 left-0 z-[1002] bg-slate-900/50 md:hidden" onClick={onClose} aria-hidden="true" />
          <aside
            className="fixed top-0 bottom-0 left-0 z-[1003] box-border flex h-full w-[288px] max-w-[86vw] flex-col overflow-hidden bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="mb-4 flex items-center gap-3 border-0 border-b border-solid border-slate-200/70 px-2 pb-4">
              <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] bg-linear-to-br from-indigo-500 to-indigo-600 text-base font-bold text-white">
                {(user?.name || user?.email || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.95rem] font-bold text-slate-900">{user?.name || user?.email?.split('@')[0] || 'Admin'}</div>
                <div className="text-xs text-slate-500">{(role && ROLE_LABELS[role]) || role || 'Administrator'}</div>
              </div>
              <button type="button" onClick={onClose} aria-label="Close menu" className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-slate-500 active:bg-slate-100">
                <X size={20} aria-hidden />
              </button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto">
              {menu.map((entry) => {
                if (!isGroup(entry)) return renderLink(entry);
                const groupActive = entry.children.some((c) => isActive(pathname, c));
                const expanded = groupToggles[entry.group] ?? groupActive;
                const headerLit = groupActive && !expanded;
                const GroupIcon = entry.icon;
                return (
                  <div key={entry.group}>
                    <button
                      type="button"
                      onClick={() => setGroupToggles((prev) => ({ ...prev, [entry.group]: !expanded }))}
                      aria-expanded={expanded}
                      className={`mb-1 box-border flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg border-0 border-l-[3px] border-solid px-3.5 py-2.5 text-left text-[0.9rem] ${
                        headerLit ? 'border-indigo-500 bg-indigo-500/10 font-semibold text-indigo-600' : 'border-transparent bg-transparent font-medium text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <GroupIcon size={20} color={headerLit ? '#4f46e5' : '#64748b'} aria-hidden />
                      <span className="flex-1">{entry.group}</span>
                      <ChevronDown size={16} color="#94a3b8" aria-hidden className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    {expanded && (
                      <div className="mb-2 ml-4 border-0 border-l border-solid border-slate-200 pl-2">
                        {entry.children.map((c) => renderLink(c, true))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={onLogout}
              className="mt-4 flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-solid border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              <LogOut size={16} aria-hidden /> Logout
            </button>
          </aside>
        </>
      )}

      {tabs.length >= 2 && (
        <nav
          className={`fixed right-0 bottom-0 left-0 z-[998] grid border-0 border-t border-solid border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden ${tabs.length === 2 ? 'grid-cols-3' : 'grid-cols-4'}`}
          aria-label="Quick navigation"
        >
          {tabs.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] no-underline ${active ? 'font-semibold text-indigo-600 visited:text-indigo-600' : 'font-medium text-slate-500 visited:text-slate-500'}`}
              >
                <Icon size={22} color={active ? '#4f46e5' : '#94a3b8'} aria-hidden />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={onOpen}
            className={`flex h-16 cursor-pointer flex-col items-center justify-center gap-1 border-0 bg-transparent text-[0.7rem] ${moreActive ? 'font-semibold text-indigo-600' : 'font-medium text-slate-500'}`}
          >
            <Ellipsis size={22} color={moreActive ? '#4f46e5' : '#94a3b8'} aria-hidden />
            More
          </button>
        </nav>
      )}
    </>
  );
}

/** Whether the role gets the phone bottom tab bar — the layout reserves space for it under the page. */
export function hasBottomTabs(role: string): boolean {
  const links = flatten(getVisibleMenu(role));
  return (BOTTOM_TABS[role] ?? DEFAULT_BOTTOM_TABS).filter((href) => links.some((l) => l.href === href)).length >= 2;
}
