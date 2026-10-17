'use client';

import { AdminUser } from '@/lib/admin-auth';
import { LogOut, Menu, X } from 'lucide-react';

interface AdminHeaderProps {
  user: AdminUser | null;
  sidebarOpen: boolean;
  /** Desktop (md+): pins / unpins the sidebar rail. */
  onToggleSidebar: () => void;
  /** Phones: opens the menu drawer (AdminMobileNav). */
  onOpenDrawer: () => void;
  onLogout: () => void;
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  editor: 'Editor',
  author: 'Author',
  event_admin: 'Event Admin',
  publisher_admin: 'Publisher Admin',
  it_support: 'IT Support',
  financial_analyst: 'Financial Analyst',
};

/** Fixed 60px top bar (height must match AdminSidebar / the layout's headerHeight). Styled through
 * staff-panel-tailwind.css. */
export default function AdminHeader({ user, sidebarOpen, onToggleSidebar, onOpenDrawer, onLogout }: AdminHeaderProps) {
  const menuButton = 'size-10 cursor-pointer items-center justify-center rounded-lg border border-solid border-black/10 bg-transparent transition hover:border-indigo-400/30 hover:bg-slate-100';

  return (
    <header className="fixed top-0 right-0 left-0 z-[1000] box-border flex h-[60px] items-center justify-between gap-3 border-0 border-b border-solid border-black/5 bg-linear-to-br from-white to-[#f8f9fa] px-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-[10px] md:px-8">
      <div className="flex min-w-0 items-center gap-3 md:gap-5">
        <button type="button" onClick={onOpenDrawer} aria-label="Open menu" className={`flex md:hidden ${menuButton}`}>
          <Menu size={20} strokeWidth={2.5} color="#475569" aria-hidden />
        </button>
        <button type="button" onClick={onToggleSidebar} aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'} className={`hidden md:flex ${menuButton}`}>
          {sidebarOpen ? <X size={20} strokeWidth={2.5} color="#475569" aria-hidden /> : <Menu size={20} strokeWidth={2.5} color="#475569" aria-hidden />}
        </button>
        <div className="min-w-0">
          <h1 className="m-0 truncate text-base font-semibold tracking-tight text-slate-900 md:text-lg">
            Welcome back, {user?.name || user?.email?.split('@')[0] || 'Admin'}
          </h1>
          <p className="m-0 mt-0.5 truncate text-xs text-slate-500">
            {(user?.role && ROLE_LABELS[user.role]) || user?.role || 'Administrator'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        aria-label="Logout"
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-linear-to-br from-red-500 to-red-600 text-sm font-medium text-white shadow-[0_2px_4px_rgba(239,68,68,0.2)] transition hover:-translate-y-px hover:from-red-600 hover:to-red-700 md:h-auto md:w-auto md:px-5 md:py-2.5"
      >
        <LogOut size={16} aria-hidden className="md:hidden" />
        <span className="hidden md:inline">Logout</span>
      </button>
    </header>
  );
}
