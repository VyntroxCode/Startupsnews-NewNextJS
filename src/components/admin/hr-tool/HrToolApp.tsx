'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { clearAdminSession } from '@/lib/admin-auth';
import { useHrTool } from './HrToolContext';
import Dashboard from './views/Dashboard';
import Directory from './views/Directory';
import Offboarding from './views/Offboarding';
import Attendance from './views/Attendance';
import Leave from './views/Leave';
import Payroll from './views/Payroll';
import Expenses from './views/Expenses';
import Compliance from './views/Compliance';
import Posh from './views/Posh';
import Helpdesk from './views/Helpdesk';
import Company from './views/Company';
import Rules from './views/Rules';
import { isAdmin, rmOf, scopedApprovals } from './utils';
import { VIEW_ACCESS, type HrView } from './types';

const VIEWS: Record<HrView, () => React.JSX.Element> = {
  dashboard: Dashboard, directory: Directory, offboarding: Offboarding,
  attendance: Attendance, leave: Leave, payroll: Payroll, expenses: Expenses,
  compliance: Compliance, posh: Posh, helpdesk: Helpdesk, company: Company, rules: Rules,
};

interface NavItem { view: HrView; label: string; icon: string; }
interface NavGroup { label: string; items: NavItem[]; }

const NAV_GROUPS: NavGroup[] = [
  { label: 'Overview', items: [{ view: 'dashboard', label: 'Dashboard', icon: '◆' }] },
  { label: 'People', items: [
    { view: 'directory', label: 'Directory', icon: '☰' },
    { view: 'offboarding', label: 'Offboarding', icon: '←' },
  ] },
  { label: 'Time', items: [
    { view: 'attendance', label: 'Attendance', icon: '◷' },
    { view: 'leave', label: 'Leave', icon: '◇' },
  ] },
  { label: 'Money', items: [
    { view: 'payroll', label: 'Payroll', icon: '₹' },
    { view: 'expenses', label: 'Expenses', icon: '◎' },
  ] },
  { label: 'Compliance', items: [
    { view: 'compliance', label: 'Calendar & Reminders', icon: '▤' },
    { view: 'posh', label: 'POSH Committee', icon: '✨' },
  ] },
  { label: 'Org', items: [
    { view: 'helpdesk', label: 'Helpdesk', icon: '◈' },
    { view: 'company', label: 'Company Profile', icon: '◆' },
    { view: 'rules', label: 'Rules & Org Structure', icon: '⚙' },
  ] },
];

function pendingCountFor(view: HrView, state: ReturnType<typeof useHrTool>['state']): number {
  if (!state.currentUser) return 0;
  const role = state.role, me = state.currentUser;
  if (view === 'attendance') {
    return scopedApprovals(state.regularizations, role, me.name, state.employees).filter((r) => r.status === 'pending' &&
      ((role === 'Reporting Manager' && r.stage === 'rm' && rmOf(state.employees, r.emp) === me.name) || isAdmin(role))).length;
  }
  if (view === 'leave') {
    return scopedApprovals(state.leaveRequests, role, me.name, state.employees).filter((l) => l.status === 'pending' &&
      ((role === 'Reporting Manager' && l.stage === 'rm' && rmOf(state.employees, l.emp) === me.name) || isAdmin(role))).length;
  }
  if (view === 'expenses') {
    return scopedApprovals(state.expenses, role, me.name, state.employees).filter((x) => x.status === 'pending' &&
      ((role === 'Reporting Manager' && x.stage === 'rm' && rmOf(state.employees, x.emp) === me.name) || isAdmin(role))).length;
  }
  if (view === 'directory' && isAdmin(role)) {
    return state.employees.reduce((n, e) => n + e.documents.filter((d) => d.status === 'pending').length, 0);
  }
  return 0;
}

export default function HrToolApp() {
  const { loading, loadError } = useHrTool();

  if (loading) {
    // Rendered before HrToolStyles ever mounts, so the .hr-tool-app stylesheet's --muted/--red
    // variables aren't in scope here yet — use their actual values directly instead of a
    // var() that would silently fall back to unstyled black text.
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>Loading…</div>;
  }
  if (loadError) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>Could not load HR data. Please refresh the page.</div>;
  }
  return <HrToolShell />;
}

function subscribeToResize(callback: () => void) {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
}

/** True below `breakpoint`px, live-updating as the window resizes. useSyncExternalStore (rather
 * than an effect + setState) reads the browser-only viewport width without a hydration mismatch:
 * React reuses `getServerSnapshot`'s `false` for the first client render, then resyncs to the
 * real width right after. */
function useIsNarrowViewport(breakpoint: number): boolean {
  return useSyncExternalStore(subscribeToResize, () => window.innerWidth < breakpoint, () => false);
}

function HrToolShell() {
  const ctx2 = useHrTool();
  const { state, setView } = ctx2;
  const role = state.role;
  const currentUser = state.currentUser;
  const router = useRouter();

  // The HR Tool's own `logout()` only resets its internal "acting as" role back to Founder —
  // it never touched the real admin session, so clicking this button left the admin fully
  // logged in with no login screen shown, just silently bounced to the Dashboard as Founder.
  // This matches AdminHeader's real logout instead: clear the actual session, then navigate to
  // the real login page (src/components/admin/hr-tool/views/Login.tsx is a separate, unused
  // internal-only screen — this button was never meant to reach it).
  function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      clearAdminSession();
      router.push('/admin/login');
    }
  }

  // The sidebar rests as a 64px icon rail and opens on hover, closing again when the pointer
  // leaves. The toggle button is a PIN rather than a minimize: pinned, the sidebar stays open and
  // hover stops mattering; unpinned, hover is back in charge. A plain minimize button would have
  // been a dead end here — once hover drives the width, "collapse" has nothing to hold against
  // the next mouse-over, so the only meaningful manual state is "keep it open".
  // Narrow viewports keep their existing behaviour: always the rail, since there is no pointer to
  // hover with and expanding would eat most of the screen.
  const isNarrow = useIsNarrowViewport(860);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [pointerInside, setPointerInside] = useState(false);
  const collapsed = isNarrow || !(pinnedOpen || pointerInside);

  useEffect(() => {
    if (role && !VIEW_ACCESS[state.view].includes(role)) setView('dashboard');
  }, [state.view, role, setView]);

  if (!role || !currentUser) return null;

  const activeView = VIEW_ACCESS[state.view].includes(role) ? state.view : 'dashboard';
  const ActiveView = VIEWS[activeView];

  return (
    <div className="hr-tool-app">
      <div className={`app${collapsed ? ' collapsed' : ''}`}>
        <aside
          className="sidebar"
          onMouseEnter={() => setPointerInside(true)}
          onMouseLeave={() => setPointerInside(false)}
          // Keyboard users get the same expansion: React's onFocus/onBlur map to focusin/focusout,
          // so they fire for descendants too. The relatedTarget check is what stops the sidebar
          // collapsing as focus moves between two nav items inside it.
          onFocus={() => setPointerInside(true)}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPointerInside(false); }}
        >
          <div className="brand">
            <div className="brand-mark">H</div>
            <div className="brand-text"><div className="brand-name">Huey</div><div className="brand-sub">HR Console</div></div>
            <button
              type="button"
              className={`sidebar-toggle${pinnedOpen ? ' pinned' : ''}`}
              onClick={() => setPinnedOpen((p) => !p)}
              aria-pressed={pinnedOpen}
              title={pinnedOpen ? 'Unpin — close the sidebar when the pointer leaves' : 'Keep the sidebar open'}
              aria-label={pinnedOpen ? 'Unpin sidebar' : 'Keep sidebar open'}
            >
              {pinnedOpen ? '«' : '»'}
            </button>
          </div>
          <nav>
            {NAV_GROUPS.map((group) => {
              const visibleItems = group.items.filter((item) => VIEW_ACCESS[item.view].includes(role));
              if (visibleItems.length === 0) return null;
              return (
                <div key={group.label}>
                  <div className="nav-group-label">{group.label}</div>
                  {visibleItems.map((item) => {
                    const count = pendingCountFor(item.view, state);
                    return (
                      <button
                        key={item.view}
                        className={`nav-item${state.view === item.view ? ' active' : ''}`}
                        onClick={() => setView(item.view)}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                        {count > 0 && <span className="nav-dot" />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
          <div className="role-switch">
            <label>Logged in as</label>
            <div className="who">{currentUser.name} · {role}</div>
            <button className="logout-btn" onClick={handleLogout} title="Switch user / Log out">
              <span className="logout-icon">⇄</span>
              <span className="nav-label">Switch user / Log out</span>
            </button>
          </div>
        </aside>
        <main className="main">
          <ActiveView />
        </main>
      </div>
      <HrToolStyles />
    </div>
  );
}

function HrToolStyles() {
  return (
    <style jsx global>{`
      .hr-tool-app {
        --ink: #0F172A; --paper: #F8FAFC; --panel: #FFFFFF; --line: #E2E8F0;
        --forest: #6366F1; --forest-dim: #4F46E5; --amber: #F59E0B; --amber-soft: #FEF3C7;
        --red: #DC2626; --red-soft: #FEE2E2; --green-soft: #DCFCE7; --green: #16A34A;
        --blue-soft: #DBEAFE; --blue: #2563EB; --orange: #EA580C; --orange-soft: #FFEDD5;
        --muted: #94A3B8; --radius: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--ink); background: var(--paper);
        border-radius: 12px; overflow: hidden; border: 1px solid var(--line); box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      }
      .hr-tool-app * { box-sizing: border-box; }
      .hr-tool-app button { font-family: inherit; cursor: pointer; }
      .hr-tool-app a { color: inherit; }
      .hr-tool-app .app { display: grid; grid-template-columns: 236px 1fr; min-height: 70vh; transition: grid-template-columns .15s ease; }
      .hr-tool-app .sidebar { background: linear-gradient(180deg, #6366F1 0%, #4F46E5 100%); color: #EEF2FF; padding: 22px 14px; display: flex; flex-direction: column; gap: 4px; overflow-x: hidden; }
      .hr-tool-app .brand { display: flex; align-items: center; gap: 8px; padding: 4px 6px 20px 10px; }
      .hr-tool-app .brand-mark { width: 28px; height: 28px; border-radius: 7px; background: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--forest); font-size: 14px; flex-shrink: 0; }
      .hr-tool-app .brand-text { flex: 1; min-width: 0; overflow: hidden; }
      .hr-tool-app .brand-name { font-weight: 700; font-size: 16.5px; color: #fff; white-space: nowrap; }
      .hr-tool-app .brand-sub { font-size: 10px; color: #C7D2FE; letter-spacing: 0.6px; text-transform: uppercase; margin-top: 1px; white-space: nowrap; }
      .hr-tool-app .sidebar-toggle { flex-shrink: 0; width: 24px; height: 24px; border-radius: 6px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.22); color: #fff; font-size: 12px; display: flex; align-items: center; justify-content: center; }
      .hr-tool-app .sidebar-toggle:hover { background: rgba(255,255,255,0.2); }
      .hr-tool-app .sidebar-toggle.pinned { background: rgba(255,255,255,0.32); border-color: rgba(255,255,255,0.55); }
      /* The rail is what the eye tracks while the width animates, so the panel gets a
         shadow to sit above the page rather than appearing to shove it. */
      .hr-tool-app .app:not(.collapsed) .sidebar { box-shadow: 4px 0 16px rgba(79,70,229,0.18); }
      @media (prefers-reduced-motion: reduce) {
        .hr-tool-app .app { transition: none; }
      }
      .hr-tool-app .nav-group-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #A5B4FC; padding: 14px 12px 6px; white-space: nowrap; overflow: hidden; }
      .hr-tool-app .nav-item { position: relative; display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13.5px; font-weight: 500; color: #E0E7FF; background: transparent; border: none; text-align: left; width: 100%; transition: background .12s; }
      .hr-tool-app .nav-item:hover { background: rgba(255,255,255,0.12); }
      .hr-tool-app .nav-item.active { background: #fff; color: var(--forest); font-weight: 600; }
      .hr-tool-app .nav-icon { width: 17px; text-align: center; font-size: 13px; opacity: 0.9; flex-shrink: 0; }
      .hr-tool-app .nav-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .hr-tool-app .nav-dot { width: 7px; height: 7px; border-radius: 50%; background: #FF4D4D; margin-left: auto; flex-shrink: 0; }
      .hr-tool-app .role-switch { margin-top: auto; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.18); }
      .hr-tool-app .role-switch label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #A5B4FC; display: block; margin-bottom: 6px; white-space: nowrap; }
      .hr-tool-app .role-switch .who { font-size: 12.5px; font-weight: 600; color: #fff; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .hr-tool-app .logout-btn { width: 100%; margin-top: 9px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.22); color: #fff; padding: 7px 9px; border-radius: 7px; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 7px; }
      .hr-tool-app .logout-btn:hover { background: rgba(255,255,255,0.2); }
      .hr-tool-app .logout-icon { flex-shrink: 0; }
      /* Minimize button (desktop) and narrow viewports (mobile) both collapse to this same
         64px icon rail — one set of rules instead of maintaining two parallel layouts. */
      .hr-tool-app .app.collapsed { grid-template-columns: 64px 1fr; }
      .hr-tool-app .app.collapsed .sidebar { padding: 22px 8px; align-items: center; }
      .hr-tool-app .app.collapsed .brand { flex-direction: column; gap: 10px; padding: 4px 0 20px; }
      .hr-tool-app .app.collapsed .brand-text { display: none; }
      .hr-tool-app .app.collapsed .nav-group-label { display: none; }
      .hr-tool-app .app.collapsed .nav-item { justify-content: center; padding: 10px; gap: 0; }
      .hr-tool-app .app.collapsed .nav-label { display: none; }
      .hr-tool-app .app.collapsed .nav-dot { position: absolute; top: 6px; right: 6px; margin-left: 0; }
      .hr-tool-app .app.collapsed .role-switch { display: flex; justify-content: center; }
      .hr-tool-app .app.collapsed .role-switch label, .hr-tool-app .app.collapsed .role-switch .who { display: none; }
      .hr-tool-app .app.collapsed .logout-btn { width: 40px; padding: 8px; }
      .hr-tool-app .main { padding: 28px 34px 60px; max-width: 1180px; overflow-y: auto; min-width: 0; }
      @media (max-width: 640px) {
        .hr-tool-app .main { padding: 18px 16px 40px; }
        .hr-tool-app .pad { padding: 14px 16px; }
      }
      .hr-tool-app .topbar { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 22px; flex-wrap: wrap; gap: 10px; }
      .hr-tool-app .page-title { font-size: 23px; font-weight: 700; margin: 0; }
      .hr-tool-app .page-sub { color: var(--muted); font-size: 13px; margin-top: 3px; }
      .hr-tool-app .as-role { font-size: 11.5px; color: var(--muted); background: var(--panel); border: 1px solid var(--line); padding: 5px 11px; border-radius: 20px; }
      .hr-tool-app .card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: 0 1px 2px rgba(15,23,42,0.05), 0 8px 24px rgba(15,23,42,0.08); }
      .hr-tool-app .card.clickable { cursor: pointer; transition: transform .1s, box-shadow .1s; }
      .hr-tool-app .card.clickable:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(15,23,42,0.08), 0 14px 28px rgba(15,23,42,0.1); }
      .hr-tool-app .pad { padding: 20px 22px; }
      .hr-tool-app .grid { display: grid; gap: 16px; }
      .hr-tool-app .grid-4 { grid-template-columns: repeat(4, 1fr); }
      .hr-tool-app .grid-3 { grid-template-columns: repeat(3, 1fr); }
      .hr-tool-app .grid-2 { grid-template-columns: 1fr 1fr; }
      @media(max-width:900px) { .hr-tool-app .grid-4, .hr-tool-app .grid-3, .hr-tool-app .grid-2 { grid-template-columns: 1fr; } }
      .hr-tool-app .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); font-weight: 600; }
      .hr-tool-app .stat-num { font-size: 28px; font-weight: 700; line-height: 1.2; margin-top: 6px; }
      .hr-tool-app .stat-num.stat-num-text { font-size: 19px; line-height: 1.25; }
      .hr-tool-app .stat-note { font-size: 11.5px; color: var(--muted); margin-top: 4px; }
      .hr-tool-app .card.tone-good { background: var(--green-soft); border-color: var(--green); }
      .hr-tool-app .card.tone-good .stat-note { color: var(--green); font-weight: 600; }
      .hr-tool-app .card.tone-bad { background: var(--red-soft); border-color: var(--red); }
      .hr-tool-app .card.tone-bad .stat-note { color: var(--red); font-weight: 600; }
      .hr-tool-app section.block { margin-bottom: 26px; }
      .hr-tool-app .block-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 11px; gap: 10px; flex-wrap: wrap; }
      .hr-tool-app .block-head h2 { font-size: 15px; margin: 0; font-weight: 700; }
      .hr-tool-app .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .hr-tool-app table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .hr-tool-app .table-scroll table { min-width: max-content; }
      .hr-tool-app .table-scroll.wrap-table table { min-width: 100%; table-layout: fixed; }
      .hr-tool-app .table-scroll.wrap-table td, .hr-tool-app .table-scroll.wrap-table th { white-space: normal; word-break: break-word; }
      .hr-tool-app .table-scroll.wrap-table .action-row, .hr-tool-app .table-scroll.wrap-table .btn { white-space: nowrap; word-break: normal; }
      .hr-tool-app th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); font-weight: 600; padding: 9px 14px; border-bottom: 1px solid var(--line); }
      .hr-tool-app td { padding: 11px 14px; border-bottom: 1px solid var(--line); vertical-align: middle; }
      .hr-tool-app tr:last-child td { border-bottom: none; }
      .hr-tool-app tr:hover td { background: #F1F5F9; }
      .hr-tool-app .badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; white-space: nowrap; }
      .hr-tool-app .badge.active { background: var(--green-soft); color: var(--green); }
      .hr-tool-app .badge.probation { background: var(--amber-soft); color: #92400E; }
      .hr-tool-app .badge.onboarding { background: var(--blue-soft); color: var(--blue); }
      .hr-tool-app .badge.notuploaded { background: #F1F5F9; color: var(--muted); }
      .hr-tool-app .badge.exited { background: #F1F5F9; color: var(--muted); }
      .hr-tool-app .badge.pending { background: var(--amber-soft); color: #92400E; }
      .hr-tool-app .badge.approved { background: var(--green-soft); color: var(--green); }
      .hr-tool-app .badge.rejected { background: var(--red-soft); color: var(--red); }
      .hr-tool-app .badge.open { background: var(--amber-soft); color: #92400E; }
      .hr-tool-app .badge.progress { background: var(--blue-soft); color: var(--blue); }
      .hr-tool-app .badge.resolved { background: var(--green-soft); color: var(--green); }
      .hr-tool-app .badge.rmpending { background: var(--orange-soft); color: #9A3412; }
      .hr-tool-app .badge.hrpending { background: var(--blue-soft); color: var(--blue); }
      .hr-tool-app .badge.off { background: #F1F5F9; color: var(--muted); }
      .hr-tool-app .btn { border-radius: 7px; padding: 7px 13px; font-size: 12.5px; font-weight: 600; border: 1px solid var(--line); background: var(--panel); color: var(--ink); }
      .hr-tool-app .btn:hover { background: #F1F5F9; }
      .hr-tool-app .btn.primary { background: var(--forest); color: #fff; border-color: var(--forest); }
      .hr-tool-app .btn.primary:hover { background: var(--forest-dim); }
      .hr-tool-app .btn.ghost { background: transparent; border-color: transparent; color: var(--forest-dim); }
      .hr-tool-app .btn.approve { background: var(--green); color: #fff; border-color: var(--green); }
      .hr-tool-app .btn.reject { background: transparent; color: var(--red); border-color: var(--red-soft); }
      .hr-tool-app .btn.sm { padding: 5px 10px; font-size: 11.5px; }
      .hr-tool-app .btn:disabled { opacity: 0.45; cursor: not-allowed; }
      /* Keeps grouped action buttons (View / Approve / Reject etc.) on one line instead of
         wrapping individually when a table cell gets tight — a raw text-node space between
         buttons wraps like any other inline content and staggers the row. */
      .hr-tool-app .action-row { display: inline-flex; align-items: center; justify-content: flex-end; gap: 6px; flex-wrap: nowrap; }
      .hr-tool-app select, .hr-tool-app input[type=text], .hr-tool-app input[type=number], .hr-tool-app input[type=date],
      .hr-tool-app input[type=time], .hr-tool-app input[type=password], .hr-tool-app input[type=email], .hr-tool-app input[type=url],
      .hr-tool-app input[type=tel],
      .hr-tool-app textarea { font-family: inherit; font-size: 13px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 7px; background: #fff; color: var(--ink); width: 100%; }
      .hr-tool-app textarea { resize: vertical; min-height: 56px; }
      .hr-tool-app label.field-label { font-size: 11.5px; font-weight: 600; color: var(--muted); display: block; margin-bottom: 5px; }
      .hr-tool-app .field { margin-bottom: 12px; }
      .hr-tool-app .field-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; }
      @media (max-width: 480px) { .hr-tool-app .field-grid-2 { grid-template-columns: 1fr; } }
      .hr-tool-app .field-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 14px; }
      @media (max-width: 640px) { .hr-tool-app .field-grid-3 { grid-template-columns: 1fr; } }
      .hr-tool-app .empty { padding: 30px 10px; text-align: center; color: var(--muted); font-size: 13px; }
      .hr-tool-app .toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .hr-tool-app .search { max-width: 220px; }
      .hr-tool-app .modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
      /* The white-space and min-width resets are load-bearing, not tidiness. A ModalShell
         renders inline wherever its trigger lives, and some of those hosts set
         white-space: nowrap (.rule-inputs does) - which INHERITS into the modal and stops
         its notice text from wrapping. The unwrappable line then pushes the modal past
         max-width, because a flex item's default min-width:auto lets the content-based
         minimum beat max-width, and overflow-y:auto makes overflow-x compute to auto, so it
         grew a sideways scrollbar. Resetting both here fixes every modal, not one caller. */
      .hr-tool-app .modal { background: #fff; border-radius: 12px; max-width: 520px; width: 100%; min-width: 0; max-height: 88vh; overflow-y: auto; white-space: normal; box-shadow: 0 20px 60px rgba(15,23,42,0.25); }
      .hr-tool-app .modal-head { padding: 18px 22px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; }
      .hr-tool-app .modal-head h3 { margin: 0; font-size: 16px; }
      .hr-tool-app .modal-body { padding: 18px 22px; }
      .hr-tool-app .modal-foot { padding: 14px 22px; border-top: 1px solid var(--line); display: flex; justify-content: flex-end; gap: 8px; }
      .hr-tool-app .x-close { background: none; border: none; font-size: 18px; color: var(--muted); }
      .hr-tool-app .avatar { width: 30px; height: 30px; border-radius: 50%; background: var(--forest); color: #EEF2FF; display: flex; align-items: center; justify-content: center; font-size: 11.5px; font-weight: 700; flex-shrink: 0; }
      .hr-tool-app .row-name { display: flex; align-items: center; gap: 9px; }
      .hr-tool-app .row-name .meta { font-size: 11.5px; color: var(--muted); }
      .hr-tool-app .meta { font-size: 11.5px; color: var(--muted); }
      .hr-tool-app .notice { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; background: var(--amber-soft); border: 1px solid #FDE68A; border-radius: 8px; font-size: 12.5px; color: #92400E; margin-bottom: 16px; }
      .hr-tool-app .notice.info { background: var(--blue-soft); border-color: #BFDBFE; color: var(--blue); }
      .hr-tool-app .notice.good { background: var(--green-soft); border-color: #BBF7D0; color: var(--green); }
      .hr-tool-app .progress-track { height: 6px; background: #E2E8F0; border-radius: 6px; overflow: hidden; }
      .hr-tool-app .progress-fill { height: 100%; background: var(--amber); }
      .hr-tool-app .footnote { font-size: 11.5px; color: var(--muted); margin-top: 20px; }
      .hr-tool-app .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
      .hr-tool-app .cal-dow { font-size: 10px; text-transform: uppercase; color: var(--muted); text-align: center; font-weight: 700; padding-bottom: 2px; }
      .hr-tool-app .cal-cell { position: relative; border: 1px solid var(--line); border-radius: 8px; padding: 6px 7px; min-height: 50px; font-size: 11px; background: #fff; }
      .hr-tool-app .cal-cell.present { background: var(--green-soft); color: #14532D; }
      .hr-tool-app .cal-cell.half-day { background: #FED7AA; color: #9A3412; }
      .hr-tool-app .cal-cell.absent { background: #FECACA; color: #7F1D1D; }
      .hr-tool-app .cal-cell.leave { background: #DBEAFE; color: #1E3A8A; }
      .hr-tool-app .cal-cell.regpending { background: #FDE68A; color: #78350F; }
      .hr-tool-app .cal-cell.regapproved { background: #EDE9FE; color: #5B21B6; }
      .hr-tool-app .cal-cell.off { background: #F1F5F9; color: var(--muted); }
      .hr-tool-app .cal-cell.unrecorded { background: #fff; color: var(--muted); border-style: dashed; }
      .hr-tool-app .cal-cell.blank { border: none; background: transparent; }
      .hr-tool-app .cal-day { font-weight: 700; font-size: 11px; }
      .hr-tool-app .cal-legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 11.5px; color: var(--muted); margin-top: 10px; }
      .hr-tool-app .cal-legend span { display: inline-flex; align-items: center; gap: 5px; }
      .hr-tool-app .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
      /* Collapsible sections in the employee profile modal (Directory's <Section>). */
      .hr-tool-app .acc { border: 1px solid var(--line); border-radius: 10px; background: var(--panel); margin-bottom: 10px; overflow: hidden; }
      .hr-tool-app .acc-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 12px 14px; background: #F8FAFC; border: none; text-align: left; transition: background .12s; }
      .hr-tool-app .acc-head:hover { background: #F1F5F9; }
      .hr-tool-app .acc.open .acc-head { background: var(--panel); border-bottom: 1px solid var(--line); }
      .hr-tool-app .acc-text { min-width: 0; }
      .hr-tool-app .acc-title { display: block; font-size: 13px; font-weight: 700; color: var(--ink); }
      .hr-tool-app .acc-sum { display: block; font-size: 11.5px; font-weight: 500; color: var(--muted); margin-top: 3px; line-height: 1.4; }
      .hr-tool-app .acc-chev { flex-shrink: 0; font-size: 11px; color: var(--muted); transition: transform .15s; }
      .hr-tool-app .acc.open .acc-chev { transform: rotate(180deg); }
      .hr-tool-app .acc-body { padding: 16px 14px; }
      .hr-tool-app .acc-body > .field:last-child { margin-bottom: 0; }

      /* Attendance calendar summary strip (AttendanceCalendar's <CalStat>). */
      .hr-tool-app .cal-summary { border: 1px solid var(--line); border-radius: 10px; background: #F8FAFC; padding: 13px 14px; margin-bottom: 14px; }
      .hr-tool-app .cal-summary-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; }
      .hr-tool-app .cal-summary-month { font-size: 13px; font-weight: 700; }
      .hr-tool-app .cal-summary-note { font-size: 11.5px; color: var(--muted); }
      .hr-tool-app .cal-summary-note strong { color: var(--ink); font-weight: 700; }
      .hr-tool-app .cal-summary-bar { display: flex; height: 6px; border-radius: 6px; overflow: hidden; background: #E2E8F0; margin-top: 11px; }
      .hr-tool-app .cal-summary-bar .seg.present { background: var(--green); }
      .hr-tool-app .cal-summary-bar .seg.half-day { background: #F97316; }
      .hr-tool-app .cal-summary-bar .seg.absent { background: var(--red); }
      .hr-tool-app .cal-summary-bar .seg.leave { background: var(--blue); }
      .hr-tool-app .cal-summary-bar .seg.unrecorded { background: #CBD5E1; }
      .hr-tool-app .cal-summary-rule { font-size: 11px; color: var(--muted); margin-top: 11px; line-height: 1.45; }
      .hr-tool-app .cal-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(104px, 1fr)); gap: 8px; margin-top: 12px; }
      .hr-tool-app .cal-stat { border: 1px solid var(--line); border-radius: 9px; background: var(--panel); padding: 9px 11px; }
      .hr-tool-app .cal-stat-label { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; line-height: 1.25; opacity: 0.75; }
      .hr-tool-app .cal-stat-num { font-size: 21px; font-weight: 700; line-height: 1; margin-top: 7px; }
      .hr-tool-app .cal-stat-sub { font-size: 10.5px; line-height: 1.2; margin-top: 5px; opacity: 0.72; }
      .hr-tool-app .cal-stat.neutral { color: var(--ink); }
      .hr-tool-app .cal-stat.present { background: var(--green-soft); border-color: #BBF7D0; color: #14532D; }
      .hr-tool-app .cal-stat.half-day { background: #FFEDD5; border-color: #FED7AA; color: #9A3412; }
      .hr-tool-app .cal-stat.absent { background: var(--red-soft); border-color: #FECACA; color: #7F1D1D; }
      .hr-tool-app .cal-stat.leave { background: var(--blue-soft); border-color: #BFDBFE; color: #1E3A8A; }
      .hr-tool-app .cal-stat.off { background: #F1F5F9; border-color: #E2E8F0; color: #475569; }
      .hr-tool-app .cal-stat.regpending { background: var(--amber-soft); border-color: #FDE68A; color: #78350F; }
      .hr-tool-app .cal-stat.regapproved { background: #EDE9FE; border-color: #DDD6FE; color: #5B21B6; }
      @media (max-width: 560px) { .hr-tool-app .cal-stats { grid-template-columns: repeat(auto-fit, minmax(88px, 1fr)); } }

      .hr-tool-app .rule-row { display: grid; grid-template-columns: minmax(0, 1fr) 300px; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--line); gap: 6px 24px; }
      .hr-tool-app .rule-row:last-child { border-bottom: none; }
      .hr-tool-app .rule-name { font-weight: 600; font-size: 13px; }
      .hr-tool-app .rule-desc { font-size: 11.5px; color: var(--muted); margin-top: 3px; max-width: 560px; line-height: 1.45; }
      /* Second grid cell, whatever it is (input group or bare toggle), sits right-aligned in a
         column of its own so controls form a single vertical line. */
      .hr-tool-app .rule-row > *:nth-child(2) { justify-self: end; }
      .hr-tool-app .rule-inputs { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: nowrap; white-space: nowrap; font-size: 12.5px; color: var(--muted); width: 100%; }
      .hr-tool-app .rule-inputs input, .hr-tool-app .rule-inputs select { width: auto; }
      /* Must be listed AFTER (and outrank) the width:auto rule above, which is why the
         .mini-input declaration further down was losing: .rule-inputs input is (0,2,1) and
         beat .mini-input at (0,2,0), so number fields fell back to the browser's default
         ~20-character box. Only the hours dropdowns looked right, and only because they
         carry an inline width. Three classes puts this above both. */
      .hr-tool-app .rule-inputs .mini-input { width: 70px; }
      /* CTC structure rows. Three fixed slots — type / field / unit — so all four rows put
         their control in the same column no matter how long the trailing unit text is.
         Written as .rule-inputs.ctc-inputs (0,3,0) so it beats the plain .rule-inputs flex
         rule above rather than relying on source order. */
      .hr-tool-app .rule-inputs.ctc-inputs { display: grid; grid-template-columns: 96px 96px 84px; align-items: center; gap: 8px; justify-content: end; width: auto; }
      .hr-tool-app .ctc-inputs .ctc-type { display: flex; justify-content: flex-end; }
      .hr-tool-app .ctc-inputs .ctc-type select { width: 100%; }
      .hr-tool-app .ctc-inputs .ctc-field { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
      .hr-tool-app .ctc-inputs .ctc-field .mini-input { width: 78px; text-align: right; }
      .hr-tool-app .ctc-inputs .ctc-prefix { color: var(--muted); }
      .hr-tool-app .ctc-inputs .ctc-unit { text-align: left; color: var(--muted); }
      .hr-tool-app .ctc-inputs .ctc-auto { color: var(--muted); font-style: italic; }
      @media (max-width: 760px) {
        .hr-tool-app .rule-row { grid-template-columns: minmax(0, 1fr); }
        .hr-tool-app .rule-row > *:nth-child(2) { justify-self: start; }
        .hr-tool-app .rule-inputs { justify-content: flex-start; }
        .hr-tool-app .rule-inputs.ctc-inputs { grid-template-columns: auto auto auto; justify-content: start; }
      }
      /* Document preview — sits ABOVE the profile modal (z-index 1000), hence 1100. */
      .hr-tool-app .doc-viewer-backdrop { position: fixed; inset: 0; z-index: 1100; background: rgba(15,23,42,0.62); display: flex; align-items: center; justify-content: center; padding: 2vh 2vw; }
      .hr-tool-app .doc-viewer { width: 80vw; height: 80vh; background: var(--panel); border-radius: 12px; box-shadow: 0 24px 64px rgba(15,23,42,0.35); display: flex; flex-direction: column; overflow: hidden; }
      .hr-tool-app .doc-viewer-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 16px; border-bottom: 1px solid var(--line); flex-shrink: 0; }
      .hr-tool-app .doc-viewer-title { font-size: 14px; font-weight: 700; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .hr-tool-app .doc-viewer-actions { display: flex; gap: 8px; flex-shrink: 0; }
      .hr-tool-app .doc-viewer-actions .btn { text-decoration: none; display: inline-flex; align-items: center; }
      /* Chequerboard so a transparent PNG or a white scan still reads as a document on a page. */
      .hr-tool-app .doc-viewer-body { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 14px; background:
        repeating-conic-gradient(#F1F5F9 0% 25%, #E2E8F0 0% 50%) 50% / 22px 22px; }
      .hr-tool-app .doc-viewer-img { max-width: 100%; max-height: 100%; object-fit: contain; background: #fff; box-shadow: 0 2px 12px rgba(15,23,42,0.18); }
      .hr-tool-app .doc-viewer-frame { width: 100%; height: 100%; border: none; background: #fff; }
      .hr-tool-app .doc-viewer-fallback { text-align: center; background: var(--panel); padding: 28px 32px; border-radius: 10px; border: 1px solid var(--line); }
      @media (max-width: 700px) { .hr-tool-app .doc-viewer { width: 96vw; height: 88vh; } }

      .hr-tool-app .rules-savebar { position: sticky; bottom: 12px; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin: 22px 0; padding: 14px 18px; border: 1px solid var(--amber); border-radius: var(--radius); background: var(--amber-soft); box-shadow: 0 6px 20px rgba(15,23,42,0.12); }
      .hr-tool-app .rules-savebar .rule-desc { color: #92400E; }
      .hr-tool-app .toggle-switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
      .hr-tool-app .toggle-switch input { opacity: 0; width: 0; height: 0; }
      .hr-tool-app .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: #CBD5E1; border-radius: 22px; transition: .15s; }
      .hr-tool-app .toggle-slider:before { content: ""; position: absolute; height: 16px; width: 16px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: .15s; }
      .hr-tool-app .toggle-switch input:checked + .toggle-slider { background: var(--forest); }
      .hr-tool-app .toggle-switch input:checked + .toggle-slider:before { transform: translateX(18px); }
      .hr-tool-app .mini-input { width: 70px; padding: 6px 8px; }
      .hr-tool-app .chip-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
      .hr-tool-app .chip { display: inline-flex; align-items: center; gap: 6px; background: #F1F5F9; border: 1px solid var(--line); padding: 5px 6px 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
      .hr-tool-app .chip button { background: none; border: none; color: var(--muted); font-size: 13px; line-height: 1; padding: 2px 4px; border-radius: 50%; }
      .hr-tool-app .chip button:hover { background: var(--red-soft); color: var(--red); }
      .hr-tool-app .add-inline { display: flex; gap: 8px; }
      .hr-tool-app .add-inline input { flex: 1; }
      .hr-tool-app .avatar-upload-circle { display: flex; flex-direction: column; align-items: center; }
      .hr-tool-app .avatar-upload-circle img {
        width: 84px !important; height: 84px !important; max-width: 84px !important; max-height: 84px !important;
        border-radius: 50% !important; object-fit: cover !important; border: 2px solid var(--line) !important;
      }
    `}</style>
  );
}
