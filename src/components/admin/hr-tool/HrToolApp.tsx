'use client';

import { useEffect } from 'react';
import { useHrTool } from './HrToolContext';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Directory from './views/Directory';
import Onboarding from './views/Onboarding';
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
import Documents from './views/Documents';
import { isAdmin, pendingEmployeeDocUpdates, rmOf, scopedApprovals } from './utils';
import { VIEW_ACCESS, type HrView } from './types';

const VIEWS: Record<HrView, () => React.JSX.Element> = {
  dashboard: Dashboard, directory: Directory, onboarding: Onboarding, offboarding: Offboarding,
  attendance: Attendance, leave: Leave, payroll: Payroll, expenses: Expenses,
  compliance: Compliance, posh: Posh, helpdesk: Helpdesk, company: Company, rules: Rules, documents: Documents,
};

interface NavItem { view: HrView; label: string; icon: string; }
interface NavGroup { label: string; items: NavItem[]; }

const NAV_GROUPS: NavGroup[] = [
  { label: 'Overview', items: [{ view: 'dashboard', label: 'Dashboard', icon: '◆' }] },
  { label: 'People', items: [
    { view: 'directory', label: 'Employee Directory', icon: '☰' },
    { view: 'onboarding', label: 'Onboarding', icon: '→' },
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
  { label: 'Me', items: [{ view: 'documents', label: 'My Documents', icon: '📄' }] },
  { label: 'Org', items: [
    { view: 'helpdesk', label: 'Helpdesk', icon: '◈' },
    { view: 'company', label: 'Company Profile', icon: '◆' },
    { view: 'rules', label: 'Rules & Org Structure', icon: '⚙' },
  ] },
];

function pendingCountFor(view: HrView, state: ReturnType<typeof useHrTool>['state']): number {
  if (!state.currentUser) return 0;
  const role = state.role, me = state.currentUser;
  if (view === 'onboarding' && isAdmin(role)) {
    const docReview = state.onboarding.some((o) => o.docs.some((d) => d.status === 'pending'));
    const agreementReview = state.onboarding.some((o) => o.agreementStage === 'pending_employer_signature');
    const docUpdates = pendingEmployeeDocUpdates(state.employees).length > 0;
    return docReview || agreementReview || docUpdates ? 1 : 0;
  }
  if (view === 'attendance') {
    return scopedApprovals(state.regularizations, role, me.name, state.employees).filter((r) => r.status === 'pending' &&
      ((role === 'Reporting Manager' && r.stage === 'rm' && rmOf(state.employees, r.emp) === me.name) || (isAdmin(role) && r.stage === 'hr'))).length;
  }
  if (view === 'leave') {
    return scopedApprovals(state.leaveRequests, role, me.name, state.employees).filter((l) => l.status === 'pending' &&
      ((role === 'Reporting Manager' && l.stage === 'rm' && rmOf(state.employees, l.emp) === me.name) || (isAdmin(role) && l.stage === 'hr'))).length;
  }
  if (view === 'expenses') {
    return scopedApprovals(state.expenses, role, me.name, state.employees).filter((x) => x.status === 'pending' &&
      ((role === 'Reporting Manager' && x.stage === 'rm' && rmOf(state.employees, x.emp) === me.name) || (isAdmin(role) && x.stage === 'hr'))).length;
  }
  if (view === 'documents' && role === 'Employee') {
    const rejected = (me.documents || []).some((d) => d.status === 'rejected');
    const ob = me.status === 'onboarding' ? state.onboarding.find((o) => o.employeeId === me.id) : null;
    const needsSign = !!ob && ob.agreementStage === 'pending_employee_signature';
    return rejected || needsSign ? 1 : 0;
  }
  return 0;
}

export default function HrToolApp() {
  const { state, loading, loadError } = useHrTool();

  if (loading) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontFamily: "'Space Grotesk'" }}>Loading…</div>;
  }
  if (loadError) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', fontFamily: "'Space Grotesk'" }}>Could not load HR data. Please refresh the page.</div>;
  }
  if (!state.currentUser || !state.role) {
    return <div className="hr-tool-app"><Login /><HrToolStyles /></div>;
  }

  return <HrToolShell />;
}

function HrToolShell() {
  const ctx2 = useHrTool();
  const { state, setView, logout } = ctx2;
  const role = state.role;
  const currentUser = state.currentUser;

  useEffect(() => {
    if (role && !VIEW_ACCESS[state.view].includes(role)) setView('dashboard');
  }, [state.view, role, setView]);

  if (!role || !currentUser) return null;

  const activeView = VIEW_ACCESS[state.view].includes(role) ? state.view : 'dashboard';
  const ActiveView = VIEWS[activeView];

  return (
    <div className="hr-tool-app">
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">H</div>
            <div><div className="brand-name">Huey</div><div className="brand-sub">HR Console</div></div>
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
                      <button key={item.view} className={`nav-item${state.view === item.view ? ' active' : ''}`} onClick={() => setView(item.view)}>
                        <span className="nav-icon">{item.icon}</span> {item.label}
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
            <button className="logout-btn" onClick={logout}>⇄ Switch user / Log out</button>
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
        font-family: 'Inter', sans-serif; color: var(--ink); background: var(--paper);
        border-radius: 12px; overflow: hidden; border: 1px solid var(--line); box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      }
      .hr-tool-app * { box-sizing: border-box; }
      .hr-tool-app h1, .hr-tool-app h2, .hr-tool-app h3 { font-family: 'Space Grotesk', sans-serif; }
      .hr-tool-app button { font-family: inherit; cursor: pointer; }
      .hr-tool-app a { color: inherit; }
      .hr-tool-app .app { display: grid; grid-template-columns: 236px 1fr; min-height: 70vh; }
      .hr-tool-app .sidebar { background: linear-gradient(180deg, #6366F1 0%, #4F46E5 100%); color: #EEF2FF; padding: 22px 14px; display: flex; flex-direction: column; gap: 4px; }
      .hr-tool-app .brand { display: flex; align-items: center; gap: 9px; padding: 4px 10px 20px; }
      .hr-tool-app .brand-mark { width: 28px; height: 28px; border-radius: 7px; background: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Space Grotesk'; font-weight: 700; color: var(--forest); font-size: 14px; flex-shrink: 0; }
      .hr-tool-app .brand-name { font-family: 'Space Grotesk'; font-weight: 700; font-size: 16.5px; color: #fff; }
      .hr-tool-app .brand-sub { font-size: 10px; color: #C7D2FE; letter-spacing: 0.6px; text-transform: uppercase; margin-top: 1px; }
      .hr-tool-app .nav-group-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #A5B4FC; padding: 14px 12px 6px; }
      .hr-tool-app .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13.5px; font-weight: 500; color: #E0E7FF; background: transparent; border: none; text-align: left; width: 100%; transition: background .12s; }
      .hr-tool-app .nav-item:hover { background: rgba(255,255,255,0.12); }
      .hr-tool-app .nav-item.active { background: #fff; color: var(--forest); font-weight: 600; }
      .hr-tool-app .nav-icon { width: 17px; text-align: center; font-size: 13px; opacity: 0.9; }
      .hr-tool-app .nav-dot { width: 7px; height: 7px; border-radius: 50%; background: #FF4D4D; margin-left: auto; flex-shrink: 0; }
      .hr-tool-app .role-switch { margin-top: auto; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.18); }
      .hr-tool-app .role-switch label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #A5B4FC; display: block; margin-bottom: 6px; }
      .hr-tool-app .role-switch .who { font-size: 12.5px; font-weight: 600; color: #fff; margin-bottom: 8px; }
      .hr-tool-app .logout-btn { width: 100%; margin-top: 9px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.22); color: #fff; padding: 7px 9px; border-radius: 7px; font-size: 12px; font-weight: 600; }
      .hr-tool-app .logout-btn:hover { background: rgba(255,255,255,0.2); }
      .hr-tool-app .main { padding: 28px 34px 60px; max-width: 1180px; overflow-y: auto; }
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
      .hr-tool-app .stat-num { font-family: 'Space Grotesk'; font-size: 28px; font-weight: 700; margin-top: 6px; }
      .hr-tool-app .stat-note { font-size: 11.5px; color: var(--muted); margin-top: 4px; }
      .hr-tool-app section.block { margin-bottom: 26px; }
      .hr-tool-app .block-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 11px; gap: 10px; flex-wrap: wrap; }
      .hr-tool-app .block-head h2 { font-size: 15px; margin: 0; font-weight: 700; }
      .hr-tool-app table { width: 100%; border-collapse: collapse; font-size: 13px; }
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
      .hr-tool-app select, .hr-tool-app input[type=text], .hr-tool-app input[type=number], .hr-tool-app input[type=date],
      .hr-tool-app input[type=time], .hr-tool-app textarea { font-family: inherit; font-size: 13px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 7px; background: #fff; color: var(--ink); width: 100%; }
      .hr-tool-app textarea { resize: vertical; min-height: 56px; }
      .hr-tool-app label.field-label { font-size: 11.5px; font-weight: 600; color: var(--muted); display: block; margin-bottom: 5px; }
      .hr-tool-app .field { margin-bottom: 12px; }
      .hr-tool-app .empty { padding: 30px 10px; text-align: center; color: var(--muted); font-size: 13px; }
      .hr-tool-app .toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .hr-tool-app .search { max-width: 220px; }
      .hr-tool-app .modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
      .hr-tool-app .modal { background: #fff; border-radius: 12px; max-width: 520px; width: 100%; max-height: 88vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(15,23,42,0.25); }
      .hr-tool-app .modal-head { padding: 18px 22px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; }
      .hr-tool-app .modal-head h3 { margin: 0; font-size: 16px; }
      .hr-tool-app .modal-body { padding: 18px 22px; }
      .hr-tool-app .modal-foot { padding: 14px 22px; border-top: 1px solid var(--line); display: flex; justify-content: flex-end; gap: 8px; }
      .hr-tool-app .x-close { background: none; border: none; font-size: 18px; color: var(--muted); }
      .hr-tool-app .avatar { width: 30px; height: 30px; border-radius: 50%; background: var(--forest); color: #EEF2FF; display: flex; align-items: center; justify-content: center; font-size: 11.5px; font-weight: 700; font-family: 'Space Grotesk'; flex-shrink: 0; }
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
      .hr-tool-app .rule-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--line); gap: 16px; flex-wrap: wrap; }
      .hr-tool-app .rule-row:last-child { border-bottom: none; }
      .hr-tool-app .rule-name { font-weight: 600; font-size: 13px; }
      .hr-tool-app .rule-desc { font-size: 11.5px; color: var(--muted); margin-top: 2px; max-width: 480px; }
      .hr-tool-app .toggle-switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
      .hr-tool-app .toggle-switch input { opacity: 0; width: 0; height: 0; }
      .hr-tool-app .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: #CBD5E1; border-radius: 22px; transition: .15s; }
      .hr-tool-app .toggle-slider:before { content: ""; position: absolute; height: 16px; width: 16px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: .15s; }
      .hr-tool-app .toggle-switch input:checked + .toggle-slider { background: var(--forest); }
      .hr-tool-app .toggle-switch input:checked + .toggle-slider:before { transform: translateX(18px); }
      .hr-tool-app .rule-inputs { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .hr-tool-app .mini-input { width: 70px; padding: 6px 8px; }
      .hr-tool-app .chip-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
      .hr-tool-app .chip { display: inline-flex; align-items: center; gap: 6px; background: #F1F5F9; border: 1px solid var(--line); padding: 5px 6px 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
      .hr-tool-app .chip button { background: none; border: none; color: var(--muted); font-size: 13px; line-height: 1; padding: 2px 4px; border-radius: 50%; }
      .hr-tool-app .chip button:hover { background: var(--red-soft); color: var(--red); }
      .hr-tool-app .add-inline { display: flex; gap: 8px; }
      .hr-tool-app .add-inline input { flex: 1; }
    `}</style>
  );
}
