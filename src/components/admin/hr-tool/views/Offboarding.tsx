'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { useHrTool } from '../HrToolContext';
import ModalShell, { type ModalAction } from '../ModalShell';
import { hrApi, type OffboardingListResult } from '../api';
import AttendanceCalendar from './AttendanceCalendar';
import { payrollMonthKeyForDate } from '@/modules/hr-tool/utils/time';
import { addDays, initials, todayStr } from '../utils';
import { getAuthHeaders } from '@/lib/admin-auth';
import type { HrEmployee } from '../types';
import {
  CLEARANCE_CATEGORIES, CLEARANCE_CATEGORY_LABEL, DEDUCTIBLE_CATEGORIES, RESIGNATION_REASONS, clearanceProgress,
  type ClearanceCategory, type ClearanceProgress, type ClearanceStatus, type LeadHandoverTarget, type OffboardingCase,
  type OffboardingCaseDetail, type OffboardingClearanceItem, type OffboardingFnf, type OffboardingSettings, type OffboardingStatus,
} from '@/modules/hr-offboarding/domain/types';

/*
 * Offboarding — HR's side of an exit. The employee resigns from their portal (My Exit), or HR
 * starts one here (termination, or a resignation handed in offline). One-level approval: HR/Founder
 * accepts and fixes the last working day (LWD). After the LWD the server flips the case to
 * `exited`, mirrors hr_employees.status and switches the login to read-only alumni (or blocked).
 * All state lives in hr_offboarding — see HrOffboardingService.
 */

type Tab = 'requests' | 'notice' | 'exited' | 'closed' | 'settings';

const TERMINATION_REASONS = ['Performance', 'Misconduct', 'Probation not confirmed', 'Redundancy / role closed', 'Absconding', 'Other'] as const;

const CASE_BADGE: Record<OffboardingStatus, { cls: string; label: string }> = {
  pending: { cls: 'pending', label: 'Awaiting approval' },
  accepted: { cls: 'onboarding', label: 'Serving notice' },
  exited: { cls: 'exited', label: 'Exited' },
  completed: { cls: 'approved', label: 'Completed' },
  rejected: { cls: 'rejected', label: 'Rejected' },
  withdrawn: { cls: 'exited', label: 'Withdrawn' },
  cancelled: { cls: 'exited', label: 'Cancelled' },
};

const CATEGORY_LABEL = CLEARANCE_CATEGORY_LABEL;

function CaseBadge({ status }: { status: OffboardingStatus }) {
  const b = CASE_BADGE[status];
  return <span className={`badge ${b.cls}`}>{b.label}</span>;
}

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86_400_000);
}
/** Mirrors isPastLwd in HrOffboardingService — an accepted case whose LWD is behind us has left,
 * even if the server's lazy sweep hasn't flipped it to `exited` yet. */
function hasLeft(c: OffboardingCase, today: string): boolean {
  return c.status === 'exited' || c.status === 'completed' || (c.status === 'accepted' && !!c.approvedLwd && c.approvedLwd < today);
}
function noticeDaysFor(e: HrEmployee | undefined, s: OffboardingSettings): number {
  return e?.status === 'probation' ? s.noticeDaysProbation : s.noticeDaysConfirmed;
}

function ErrorNote({ text }: { text: string | null }) {
  if (!text) return null;
  // Not `.notice`: its amber colours out-rank single Tailwind classes inside .hr-tool-app.
  return <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[12.5px] text-red-700">{text}</div>;
}

export default function Offboarding() {
  const { state, applyEmployeeStatusInState } = useHrTool();
  const [data, setData] = useState<OffboardingListResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('requests');
  const [openId, setOpenId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const today = todayStr();

  const load = useCallback(() => hrApi.offboardingList()
    .then((res) => {
      if (!res.success || !res.data) { setLoadError(res.error || 'Could not load offboarding.'); return; }
      setData(res.data);
      setLoadError(null);
    })
    .catch(() => setLoadError('Could not load offboarding.')), []);
  useEffect(() => { load(); }, [load]);

  /** Mirrors what the server wrote to hr_employees.status into the in-memory Directory (its next
   * whole-list save must not write the old value back), then refreshes the list. */
  const onCaseChanged = useCallback((c: OffboardingCase | null, employeeStatus?: string) => {
    if (c && employeeStatus) applyEmployeeStatusInState(c.employeeId, employeeStatus);
    else if (c && hasLeft(c, todayStr())) applyEmployeeStatusInState(c.employeeId, 'exited');
    load();
  }, [applyEmployeeStatusInState, load]);
  /** An action inside the open case window can move the case to another tab (accept → Serving
   * notice, reject/cancel → Closed, …). The list follows it, so closing the window leaves the admin
   * looking at the record they just worked on instead of a list it silently dropped out of. */
  const onOpenCaseChanged = useCallback((c: OffboardingCase | null, employeeStatus?: string) => {
    onCaseChanged(c, employeeStatus);
    if (c) setTab((t) => (t === 'settings' ? t : tabForCase(c, todayStr())));
  }, [onCaseChanged]);

  const cases = useMemo(() => data?.cases ?? [], [data]);
  const groups = useMemo(() => ({
    requests: cases.filter((c) => c.status === 'pending'),
    notice: cases.filter((c) => c.status === 'accepted' && !hasLeft(c, today)),
    exited: cases.filter((c) => hasLeft(c, today)),
    closed: cases.filter((c) => c.status === 'rejected' || c.status === 'withdrawn' || c.status === 'cancelled'),
  }), [cases, today]);

  const leavingThisWeek = groups.notice.filter((c) => c.approvedLwd && daysBetween(today, c.approvedLwd) <= 7).length;
  const exitedThisMonth = groups.exited.filter((c) => (c.approvedLwd || '').slice(0, 7) === today.slice(0, 7)).length;
  const openCase = openId != null ? cases.find((c) => c.id === openId) || null : null;
  const empById = useMemo(() => new Map(state.employees.map((e) => [e.id, e])), [state.employees]);
  const clearanceByCase = useMemo(() => {
    const byCase = new Map<number, OffboardingClearanceItem[]>();
    for (const i of data?.clearance ?? []) byCase.set(i.offboardingId, [...(byCase.get(i.offboardingId) ?? []), i]);
    return new Map([...byCase.entries()].map(([id, items]) => [id, clearanceProgress(items)]));
  }, [data]);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'requests', label: 'Requests', count: groups.requests.length },
    { key: 'notice', label: 'Serving notice', count: groups.notice.length },
    { key: 'exited', label: 'Exited', count: groups.exited.length },
    { key: 'closed', label: 'Closed', count: groups.closed.length },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">Offboarding</h1><div className="page-sub">Resignations, terminations, notice period and last working day.</div></div>
        <div className="toolbar">
          <button className="btn primary" onClick={() => setStarting(true)} disabled={!data}>+ Start exit</button>
        </div>
      </div>

      {loadError && <div className="notice">{loadError}</div>}

      <div className="grid grid-4 mb-4">
        <div className="card pad"><div className="stat-label">Awaiting approval</div><div className="stat-num">{groups.requests.length}</div><div className="stat-note">Resignations to accept or reject</div></div>
        <div className="card pad"><div className="stat-label">Serving notice</div><div className="stat-num">{groups.notice.length}</div><div className="stat-note">Still working their notice</div></div>
        <div className="card pad"><div className="stat-label">Leaving in 7 days</div><div className="stat-num">{leavingThisWeek}</div><div className="stat-note">Last working day this week</div></div>
        <div className="card pad"><div className="stat-label">Exited this month</div><div className="stat-num">{exitedThisMonth}</div><div className="stat-note">Last working day this month</div></div>
      </div>

      <div className="toolbar mb-3.5">
        {tabs.map((t) => (
          <button key={t.key} className={`btn sm${tab === t.key ? ' primary' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {!data && !loadError && <div className="card"><div className="empty">Loading…</div></div>}

      {data && tab !== 'settings' && (
        <CaseTable
          rows={groups[tab]}
          empById={empById}
          clearanceByCase={clearanceByCase}
          today={today}
          onOpen={setOpenId}
          empty={{
            requests: 'No resignations waiting for a decision.',
            notice: 'Nobody is serving notice right now.',
            exited: 'No exits on record yet.',
            closed: 'No rejected, withdrawn or cancelled exits.',
          }[tab]}
        />
      )}

      {data && tab === 'settings' && <SettingsPanel settings={data.settings} onSaved={(s) => setData({ ...data, settings: s })} />}

      <div className="footnote">
        Employees resign from their portal&apos;s My Exit page (Publisher/Event Admins from Resignation in the admin panel). After the
        last working day their login only opens My Exit, or nothing at all if access is set to Blocked.
      </div>

      {openCase && data && (
        <CaseModal caseId={openCase.id} employee={empById.get(openCase.employeeId)} settings={data.settings}
          history={cases.filter((x) => x.employeeId === openCase.employeeId && x.id !== openCase.id)}
          onClose={() => setOpenId(null)} onChanged={onOpenCaseChanged} />
      )}
      {starting && data && (
        <StartExitModal employees={state.employees} settings={data.settings} openCases={cases}
          onClose={() => setStarting(false)}
          onStarted={(c) => { setStarting(false); onCaseChanged(c); setTab(hasLeft(c, todayStr()) ? 'exited' : 'notice'); }} />
      )}
    </>
  );
}

function CaseTable({ rows, empById, clearanceByCase, today, onOpen, empty }: {
  rows: OffboardingCase[]; empById: Map<string, HrEmployee>; clearanceByCase: Map<number, ClearanceProgress>; today: string;
  onOpen: (id: number) => void; empty: string;
}) {
  return (
    <div className="card"><div className="table-scroll"><table>
      <thead><tr><th>Employee</th><th>Type</th><th>Submitted</th><th>Last working day</th><th>Notice</th><th>Clearance</th><th>Status</th><th className="text-right">Action</th></tr></thead>
      <tbody>
        {rows.map((c) => {
          const e = empById.get(c.employeeId);
          const lwd = c.approvedLwd || c.requestedLwd;
          const left = c.status === 'accepted' && c.approvedLwd ? daysBetween(today, c.approvedLwd) : null;
          const cl = clearanceByCase.get(c.id);
          return (
            <tr key={c.id} className="cursor-pointer hover:bg-slate-50" onClick={() => onOpen(c.id)} title="Open this exit">
              <td><div className="row-name"><div className="avatar">{initials(c.emp)}</div><div>{c.emp}<div className="meta">{e?.designation || c.employeeId}</div></div></div></td>
              <td>{c.exitType === 'termination' ? `Termination${c.terminationMode === 'immediate' ? ' (immediate)' : ''}` : 'Resignation'}</td>
              <td>{fmt(c.resignationDate)}</td>
              <td>{fmt(lwd)}{c.status === 'pending' && lwd ? <div className="meta">requested</div> : null}{left !== null && left >= 0 ? <div className="meta">{left === 0 ? 'today' : `in ${left} day${left === 1 ? '' : 's'}`}</div> : null}</td>
              <td>{c.noticeDays}d{c.noticeWaivedDays ? <div className="meta">{c.noticeWaivedDays}d waived</div> : null}</td>
              <td>{cl && cl.total ? <span className={`badge ${cl.pending === 0 ? 'approved' : 'pending'}`}>{cl.cleared}/{cl.total}</span> : <span className="meta">—</span>}</td>
              <td><CaseBadge status={c.status} /></td>
              <td className="text-right"><button className="btn sm" onClick={(e) => { e.stopPropagation(); onOpen(c.id); }}>{c.status === 'pending' ? 'Review' : 'Open'}</button></td>
            </tr>
          );
        })}
        {rows.length === 0 && <tr><td colSpan={8}><div className="empty">{empty}</div></td></tr>}
      </tbody>
    </table></div></div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="field"><label className="field-label">{label}</label><div>{value || '—'}</div></div>;
}

/** "28 Sept 2026, 4:05 pm" from a MySQL 'YYYY-MM-DD HH:MM:SS' (or a bare date). */
function dateTime(v: string | null | undefined): string {
  if (!v) return '—';
  const [d, t] = String(v).replace('T', ' ').split(' ');
  if (!t) return fmt(d);
  const [h, m] = t.split(':').map(Number);
  const time = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  return `${fmt(d)}, ${time}`;
}

/** A labelled block of free text the employee or HR wrote — kept verbatim (line breaks, long words). */
function TextBlock({ label, text, empty }: { label: string; text: string | null | undefined; empty?: string }) {
  if (!text && !empty) return null;
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {text
        ? <div className="whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] leading-relaxed">{text}</div>
        : <div className="meta">{empty}</div>}
    </div>
  );
}

/** Who this exit is for — the Directory facts HR needs next to the request. */
function EmployeeSummary({ c, employee }: { c: OffboardingCase; employee: HrEmployee | undefined }) {
  const { state } = useHrTool();
  const code = state.employeeCredentials.find((x) => x.id === (c.credentialId ?? employee?.credentialId))?.employeeCode;
  const tenureDays = employee?.doj ? daysBetween(employee.doj, c.approvedLwd || todayStr()) : null;
  const tenure = tenureDays === null || tenureDays < 0 ? null
    : tenureDays < 31 ? `${tenureDays} days` : `${Math.floor(tenureDays / 365) ? `${Math.floor(tenureDays / 365)}y ` : ''}${Math.floor((tenureDays % 365) / 30.4)}m`;
  return (
    <div className="mb-1 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3">
      <div className="avatar">{initials(c.emp)}</div>
      <div className="min-w-48 flex-1">
        <div className="text-[15px] font-semibold">{c.emp}</div>
        <div className="meta">{[code, employee?.designation, employee?.team].filter(Boolean).join(' · ') || c.employeeId}</div>
      </div>
      <div className="text-right text-[12.5px]">
        <div>Joined {fmt(employee?.doj)}{tenure ? ` · ${tenure}` : ''}</div>
        <div className="meta">{employee?.status === 'probation' ? 'On probation' : employee?.status === 'exited' ? 'Exited' : 'Confirmed'}</div>
      </div>
      <CaseBadge status={c.status} />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2 mt-5 border-t border-slate-200 pt-4 text-sm font-bold uppercase tracking-wide text-slate-500">{children}</h4>;
}

type ActionResult<T> = { ok: true; data: T } | { ok: false };

/**
 * The case window. Loads its own detail (case + checklist + leads) so it always acts on the latest
 * server state; after every action it reloads that detail and tells the list to refresh. One request
 * at a time (`busy`) — a double-click can't send an action twice, and the server's compare-and-set
 * turns a stale screen into a "refresh" message instead of an overwrite.
 */
function CaseModal({ caseId, employee, settings, history, onClose, onChanged }: {
  caseId: number; employee: HrEmployee | undefined; settings: OffboardingSettings; history: OffboardingCase[];
  onClose: () => void; onChanged: (c: OffboardingCase | null, employeeStatus?: string) => void;
}) {
  const [detail, setDetail] = useState<OffboardingCaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => hrApi.offboardingDetail(caseId)
    .then((res) => {
      if (!res.success || !res.data) { setError(res.error || 'Could not load this exit.'); return; }
      setDetail(res.data);
    })
    .catch(() => setError('Could not load this exit.')), [caseId]);
  useEffect(() => { reload(); }, [reload]);

  /** Runs one action; on success reloads the detail and the list. Returns the server data. */
  const run = useCallback(async <T,>(body: Record<string, unknown>, confirmText?: string): Promise<ActionResult<T>> => {
    if (busy || (confirmText && !confirm(confirmText))) return { ok: false };
    setBusy(true);
    setError(null);
    try {
      const res = await hrApi.offboardingAction<T>(caseId, body);
      if (!res.success || res.data === undefined) {
        setError(res.error || 'Could not save that change.');
        await reload();
        return { ok: false };
      }
      await reload();
      return { ok: true, data: res.data };
    } catch {
      setError('Could not save that change — check your connection and try again.');
      return { ok: false };
    } finally {
      setBusy(false);
    }
  }, [busy, caseId, reload]);

  if (!detail) {
    return (
      <ModalShell title="Exit" onClose={onClose} actions={[{ label: 'Close', cls: 'btn ghost', onClick: onClose }]} maxWidth={860}>
        {error ? <ErrorNote text={error} /> : <div className="empty">Loading…</div>}
      </ModalShell>
    );
  }
  // No `key` here on purpose: keying this on updatedAt remounted the whole window (ModalShell
  // included) after almost every action, which scrolled it back to the top, wiped every half-typed
  // field and threw away result messages such as "letter emailed to …". CaseModalBody re-seeds
  // its own case-level fields when the case changes instead.
  return <CaseModalBody detail={detail} employee={employee} settings={settings}
    history={history} error={error} busy={busy} run={run} onClose={onClose} onChanged={onChanged} />;
}

function CaseModalBody({ detail, employee, settings, history, error, busy, run, onClose, onChanged }: {
  detail: OffboardingCaseDetail; employee: HrEmployee | undefined; settings: OffboardingSettings; history: OffboardingCase[]; error: string | null; busy: boolean;
  run: <T>(body: Record<string, unknown>, confirmText?: string) => Promise<ActionResult<T>>;
  onClose: () => void; onChanged: (c: OffboardingCase | null, employeeStatus?: string) => void;
}) {
  const c = detail.case;
  const today = todayStr();
  const [lwd, setLwd] = useState(c.approvedLwd || c.requestedLwd || addDays(c.resignationDate, c.noticeDays));
  const [noticeDays, setNoticeDays] = useState(String(c.noticeDays));
  const [waived, setWaived] = useState(String(c.noticeWaivedDays || 0));
  const [accessMode, setAccessMode] = useState(c.accessMode);
  const [note, setNote] = useState('');
  // After an action the server returns the case with a new updatedAt: take its saved values back
  // into these fields (render-time adjustment, like Rules' useSyncedDraft) and clear the note.
  const [seededAt, setSeededAt] = useState(c.updatedAt);
  if (seededAt !== c.updatedAt) {
    setSeededAt(c.updatedAt);
    setLwd(c.approvedLwd || c.requestedLwd || addDays(c.resignationDate, c.noticeDays));
    setNoticeDays(String(c.noticeDays));
    setWaived(String(c.noticeWaivedDays || 0));
    setAccessMode(c.accessMode);
    setNote('');
  }
  const left = hasLeft(c, today);
  const workable = c.status === 'accepted' || c.status === 'exited';
  const pendingItems = detail.clearance.filter((i) => i.status === 'pending').length;

  async function act(body: Record<string, unknown>, confirmText?: string, close = false) {
    const res = await run<OffboardingCase & { restoredStatus?: string }>(body, confirmText);
    if (!res.ok) return;
    onChanged(res.data, res.data.restoredStatus);
    if (close) onClose();
  }

  const actions: ModalAction[] = [];
  if (c.status === 'pending') {
    actions.push({ label: 'Reject', cls: 'btn reject', onClick: () => act({ action: 'decide', decision: 'reject', note }, `Reject ${c.emp}'s resignation?`) });
    actions.push({
      label: busy ? 'Saving…' : 'Accept resignation', cls: 'btn approve',
      onClick: () => act({ action: 'decide', decision: 'accept', approvedLwd: lwd, noticeDays: Number(noticeDays) || 0, noticeWaivedDays: Number(waived) || 0, accessMode, note },
        `Accept ${c.emp}'s resignation with last working day ${fmt(lwd)}?`),
    });
  } else if (c.status === 'accepted' && !left) {
    actions.push({ label: 'Cancel exit', cls: 'btn', onClick: () => act({ action: 'cancel', note }, `Cancel ${c.emp}'s exit? They stay on as an employee.`) });
    actions.push({ label: 'End notice today', cls: 'btn reject', onClick: () => act({ action: 'exit-now' }, `End ${c.emp}'s notice today? Their portal access switches to ${c.accessMode === 'blocked' ? 'blocked' : 'read-only'} right away.`) });
  } else if (c.status === 'exited' && (!c.fnf || c.fnf.status === 'draft')) {
    // Not once the F&F is approved/paid — the server refuses it then (see HrOffboardingService.reinstate).
    actions.push({
      label: 'Reinstate', cls: 'btn', onClick: () => {
        const why = prompt(`Reinstate ${c.emp}? Their exit is cancelled, their Directory status and logins are restored.\n\nWhy? (required)`);
        if (why && why.trim()) act({ action: 'reinstate', note: why.trim() });
      },
    });
  }
  if (isDecided(c.status) && accessMode !== c.accessMode) {
    actions.push({ label: 'Save access', cls: 'btn primary', onClick: () => act({ action: 'access', accessMode }) });
  }
  actions.push({ label: 'Close', cls: 'btn ghost', onClick: onClose });

  return (
    <ModalShell title={`${c.emp} — ${c.exitType === 'termination' ? 'Termination' : 'Resignation'}`} onClose={onClose} actions={actions} maxWidth={860}>
      <ErrorNote text={error} />
      <EmployeeSummary c={c} employee={employee} />

      <SectionTitle>{c.initiatedBy === 'employee' ? "Employee's submission" : 'Exit details'}</SectionTitle>
      <div className="field-grid-2">
        <Info label={c.initiatedBy === 'employee' ? 'Submitted by the employee' : 'Recorded by HR'} value={dateTime(c.createdAt)} />
        <Info label="Exit type" value={c.exitType === 'termination' ? `Termination${c.terminationMode === 'immediate' ? ' — immediate' : c.terminationMode === 'with_notice' ? ' — after notice' : ''}` : 'Resignation'} />
        <Info label="Reason" value={c.reasonCategory} />
        <Info label="Preferred last working day" value={c.requestedLwd ? fmt(c.requestedLwd) : c.initiatedBy === 'employee' ? 'Not specified' : '—'} />
        <PersonalEmailField c={c} busy={busy} run={run} />
        <Info label="Notice by policy" value={`${noticeDaysFor(employee, settings)} days (${employee?.status === 'probation' ? 'on probation' : 'confirmed'})`} />
      </div>
      <TextBlock label={c.initiatedBy === 'employee' ? 'Message from the employee' : 'Details'} text={c.reasonText} empty="No message added." />
      {/* Once decided, handover notes live (editable) in the Handover section below. */}
      {!isDecided(c.status) && <TextBlock label="Handover notes" text={c.handoverNotes} empty="No handover notes yet." />}
      {c.decisionNote && c.status !== 'pending' && <TextBlock label="HR note" text={c.decisionNote} />}
      {history.length > 0 && (
        <div className="field">
          <label className="field-label">Earlier requests by this employee</label>
          <ul className="m-0 list-none p-0">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-2 border-b border-slate-100 py-1.5 text-[13px]">
                <CaseBadge status={h.status} />
                <span>{h.exitType === 'termination' ? 'Termination' : 'Resignation'} · submitted {dateTime(h.createdAt)}{h.reasonCategory ? ` · ${h.reasonCategory}` : ''}</span>
                {h.decisionNote && <span className="meta">— {h.decisionNote}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {c.status === 'pending' && (
        <>
          <SectionTitle>Your decision</SectionTitle>
          <div className="notice info">
            {c.requestedLwd
              ? `They asked for ${fmt(c.requestedLwd)} as their last day — pre-filled below. Change it if needed, then accept or reject.`
              : `No preferred date given — the last day below follows the ${noticeDaysFor(employee, settings)}-day notice. Change it if needed, then accept or reject.`}
          </div>
          <div className="field-grid-2">
            <div className="field"><label className="field-label">Last working day *</label><input type="date" min={today} value={lwd} onChange={(e) => setLwd(e.target.value)} /></div>
            <div className="field"><label className="field-label">Notice period (days)</label><input type="number" min={0} max={180} value={noticeDays} onChange={(e) => setNoticeDays(e.target.value)} /></div>
            <div className="field"><label className="field-label">Notice days waived</label><input type="number" min={0} max={Number(noticeDays) || 0} value={waived} onChange={(e) => setWaived(e.target.value)} /></div>
            <AccessSelect value={accessMode} onChange={setAccessMode} />
          </div>
          <div className="field"><label className="field-label">Note to employee (required to reject)</label><textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </>
      )}

      {isDecided(c.status) && (
        <>
          <div className="field-grid-2">
            <Info label="Last working day" value={fmt(c.approvedLwd)} />
            <Info label="Notice" value={`${c.noticeDays} days${c.noticeWaivedDays ? ` · ${c.noticeWaivedDays} waived` : ''}`} />
            <Info label="Decided by" value={c.decidedBy ? `${c.decidedBy}${c.decidedAt ? ' · ' + fmt(c.decidedAt) : ''}` : null} />
            <AccessSelect value={accessMode} onChange={setAccessMode} />
            {(c.status === 'exited' || c.status === 'completed') && (
              <div className="field">
                <label className="field-label">Eligible for rehire</label>
                <select value={c.rehireEligible === null ? '' : c.rehireEligible ? 'yes' : 'no'} disabled={busy}
                  onChange={(e) => act({ action: 'rehire', rehireEligible: e.target.value === '' ? null : e.target.value === 'yes' })}>
                  <option value="">Not decided</option><option value="yes">Yes</option><option value="no">No</option>
                </select>
              </div>
            )}
          </div>
          {c.status === 'accepted' && !left && (
            <div className="field"><label className="field-label">Note (optional, for cancelling)</label><textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          )}
        </>
      )}

      {isDecided(c.status) && (
        <>
          <SectionTitle>Attendance</SectionTitle>
          <ExitAttendance c={c} />
          <SectionTitle>Clearance checklist</SectionTitle>
          <ClearanceSection items={detail.clearance} editable={workable} busy={busy} run={run} />
          <SectionTitle>Handover</SectionTitle>
          <HandoverSection c={c} leads={detail.leads} targets={detail.leadTargets} editable={workable} busy={busy} run={run} />
          <SectionTitle>Full &amp; Final settlement</SectionTitle>
          <FnfSection key={c.fnf ? c.fnf.version : 0} c={c} employee={employee} clearance={detail.clearance} busy={busy} run={run} />
          <SectionTitle>Letters</SectionTitle>
          <LettersSection c={c} pendingItems={pendingItems} busy={busy} run={run} />
          {c.status === 'exited' && (
            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              {completionGaps(c, pendingItems).length > 0 && <span className="meta">To complete: {completionGaps(c, pendingItems).join('; ')}.</span>}
              <button className="btn approve" disabled={busy || completionGaps(c, pendingItems).length > 0}
                onClick={() => act({ action: 'complete' }, `Complete ${c.emp}'s exit? The case is closed and locked for good.`)}>Complete exit</button>
            </div>
          )}
          {c.status === 'completed' && <div className="notice good mt-4">Exit completed — this case is closed and locked.</div>}
        </>
      )}
    </ModalShell>
  );
}

/** Which list tab a case shows under — the same split as Offboarding's `groups`. */
/** The leaver's attendance calendar, shown inside the exit window — a leaver drops out of the
 * Attendance page's lists once they've gone, so this is where HR looks them up. Opens on the salary
 * month of the last working day (today's if that day hasn't come yet); days after it show as "Not
 * employed". Same day ledger as payroll, so it matches their last payslip / Full & Final. */
function ExitAttendance({ c }: { c: OffboardingCase }) {
  const { state } = useHrTool();
  const [open, setOpen] = useState(false);
  const today = todayStr();
  const anchor = c.approvedLwd && c.approvedLwd < today ? c.approvedLwd : today;
  // A run that actually paid the last working day wins (e.g. 31 Aug 2026 was paid in August's
  // 1–31 Aug run, before the 26th→25th change); otherwise the cycle the date falls in today.
  const paidIn = state.payrollRuns.find((r) => r.status === 'run' && r.periodFrom && r.periodTo && r.periodFrom <= anchor && anchor <= r.periodTo);
  const month = paidIn?.month || payrollMonthKeyForDate(anchor, state.rules);
  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn sm" onClick={() => setOpen(true)}><CalendarDays className="size-3.5 shrink-0" aria-hidden />View attendance calendar</button>
        <span className="meta">Opens on the salary month of the last working day ({fmt(c.approvedLwd)}). Use the arrows for earlier months.</span>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-2 flex justify-end"><button className="btn sm ghost" onClick={() => setOpen(false)}>Hide calendar</button></div>
      <AttendanceCalendar employeeId={c.employeeId} initialMonth={month} />
    </div>
  );
}

function tabForCase(c: OffboardingCase, today: string): Tab {
  if (c.status === 'pending') return 'requests';
  if (hasLeft(c, today)) return 'exited';
  if (c.status === 'accepted') return 'notice';
  return 'closed';
}

function isDecided(s: OffboardingStatus): boolean { return s === 'accepted' || s === 'exited' || s === 'completed'; }

function ClearanceSection({ items, editable, busy, run }: {
  items: OffboardingClearanceItem[]; editable: boolean; busy: boolean;
  run: <T>(body: Record<string, unknown>, confirmText?: string) => Promise<ActionResult<T>>;
}) {
  const [newCategory, setNewCategory] = useState<ClearanceCategory>('asset');
  const [newItem, setNewItem] = useState('');
  const progress = clearanceProgress(items);

  async function add() {
    if (!newItem.trim()) return;
    const res = await run<OffboardingClearanceItem[]>({ action: 'clearance-add', category: newCategory, item: newItem.trim() });
    if (res.ok) setNewItem('');
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {/* The only inline style: a data-driven width Tailwind can't express as a static class. */}
        <div className="progress-track min-w-40 flex-1"><div className="progress-fill" style={{ width: `${progress.total ? Math.round((progress.cleared / progress.total) * 100) : 0}%` }} /></div>
        <span className="meta">{progress.cleared} of {progress.total} cleared{progress.deductions ? ` · ₹${progress.deductions.toLocaleString('en-IN')} to recover in F&F` : ''}</span>
      </div>
      {!editable && <div className="meta mb-2">Read-only — this exit is {items.length ? 'locked' : 'closed'}.</div>}
      {CLEARANCE_CATEGORIES.map((cat) => {
        const rows = items.filter((i) => i.category === cat);
        if (!rows.length) return null;
        return (
          <div key={cat} className="mb-3">
            <div className="field-label mb-1">{CLEARANCE_CATEGORY_LABEL[cat]}</div>
            {rows.map((i) => <ClearanceRow key={i.id + i.status + i.deductionAmount + (i.note || '')} item={i} editable={editable} busy={busy} run={run} />)}
          </div>
        );
      })}
      {editable && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* .hr-tool-app gives inputs width:100% at higher specificity — size the wrappers instead. */}
          <div className="w-48">
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as ClearanceCategory)}>
              {CLEARANCE_CATEGORIES.map((cat) => <option key={cat} value={cat}>{CLEARANCE_CATEGORY_LABEL[cat]}</option>)}
            </select>
          </div>
          <div className="min-w-48 flex-1">
            <input type="text" maxLength={255} placeholder="Add an item, e.g. Company phone" value={newItem}
              onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
          </div>
          <button className="btn sm" disabled={busy || !newItem.trim()} onClick={add}>+ Add item</button>
        </div>
      )}
    </div>
  );
}

const CLEARANCE_STATUS_LABEL: Record<ClearanceStatus, string> = { pending: 'Pending', done: 'Done', na: 'N/A' };

function ClearanceRow({ item, editable, busy, run }: {
  item: OffboardingClearanceItem; editable: boolean; busy: boolean;
  run: <T>(body: Record<string, unknown>, confirmText?: string) => Promise<ActionResult<T>>;
}) {
  const [note, setNote] = useState(item.note || '');
  const [amount, setAmount] = useState(item.deductionAmount ? String(item.deductionAmount) : '');
  const deductible = DEDUCTIBLE_CATEGORIES.includes(item.category);
  const dirty = note !== (item.note || '') || (Number(amount) || 0) !== item.deductionAmount;

  function save(status: ClearanceStatus) {
    let n = note.trim();
    // N/A and deductions need a reason — ask inline rather than bounce off a server error.
    if ((status === 'na' || (Number(amount) || 0) > 0) && status !== 'pending' && !n) {
      const typed = prompt(status === 'na' ? `Why does "${item.item}" not apply?` : `What is the deduction for "${item.item}"?`);
      if (!typed || !typed.trim()) return;
      n = typed.trim();
      setNote(n);
    }
    run({ action: 'clearance-update', itemId: item.id, status, note: n, deductionAmount: status === 'pending' ? 0 : Number(amount) || 0 });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 py-1.5">
      <div className="min-w-44 flex-1">
        <div className={item.status === 'pending' ? '' : 'text-slate-500'}>{item.item}</div>
        {item.doneBy && <div className="meta">{CLEARANCE_STATUS_LABEL[item.status]} by {item.doneBy}{item.doneAt ? ` · ${fmt(item.doneAt)}` : ''}</div>}
      </div>
      {editable ? (
        <>
          <div className="flex gap-1">
            {(['pending', 'done', 'na'] as ClearanceStatus[]).map((st) => (
              <button key={st} className={`btn sm${item.status === st ? ' primary' : ''}`} disabled={busy}
                onClick={() => { if (item.status !== st || dirty) save(st); }}>
                {CLEARANCE_STATUS_LABEL[st]}
              </button>
            ))}
          </div>
          {deductible ? (
            <div className="w-28">
              <input type="number" min={0} step={1} placeholder="₹ deduction" value={amount} disabled={busy}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} title="Amount recovered in Full & Final (e.g. unreturned laptop)" />
            </div>
          ) : <div className="w-28" />}
          <div className="min-w-36 flex-1"><input type="text" maxLength={1000} placeholder="Note" value={note} disabled={busy} onChange={(e) => setNote(e.target.value)} /></div>
          {dirty && item.status !== 'pending' && <button className="btn sm approve" disabled={busy} onClick={() => save(item.status)}>Save</button>}
          {/* Fixed-width slot so rows line up whether or not the remove button shows. */}
          <div className="w-8 text-right">
            {item.status !== 'done' && !item.deductionAmount && (
              <button className="btn sm ghost" disabled={busy} title="Remove from this exit's checklist" aria-label="Remove from this exit's checklist"
                onClick={() => run({ action: 'clearance-remove', itemId: item.id }, `Remove "${item.item}" from this checklist?`)}><X className="size-3.5 shrink-0" aria-hidden /></button>
            )}
          </div>
        </>
      ) : (
        <>
          <span className={`badge ${item.status === 'done' ? 'approved' : item.status === 'na' ? 'exited' : 'pending'}`}>{CLEARANCE_STATUS_LABEL[item.status]}</span>
          {item.deductionAmount > 0 && <span className="meta">₹{item.deductionAmount.toLocaleString('en-IN')}</span>}
          {item.note && <span className="meta">{item.note}</span>}
        </>
      )}
    </div>
  );
}

function HandoverSection({ c, leads, targets, editable, busy, run }: {
  c: OffboardingCase; leads: OffboardingCaseDetail['leads']; targets: LeadHandoverTarget[]; editable: boolean; busy: boolean;
  run: <T>(body: Record<string, unknown>, confirmText?: string) => Promise<ActionResult<T>>;
}) {
  const [notes, setNotes] = useState(c.handoverNotes || '');
  const [target, setTarget] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const targetName = targets.find((t) => String(t.credentialId) === target)?.name;

  async function handOver(to: number | null) {
    setResult(null);
    const text = to === null
      ? `Remove ${c.emp} from all ${leads.total} of their leads without giving them to anyone?`
      : `Hand all ${leads.total} of ${c.emp}'s leads to ${targetName}? They start as Pending for ${targetName}.`;
    const res = await run<{ moved: number; merged: number; removed: number; remaining: number }>({ action: 'leads', toCredentialId: to }, text);
    if (!res.ok) return;
    const d = res.data;
    setResult(to === null
      ? `Removed from ${d.removed} lead(s).`
      : `${d.moved} lead(s) handed to ${targetName}${d.merged ? `, ${d.merged} they already had` : ''}.${d.remaining ? ` ${d.remaining} still left — try again.` : ''}`);
    setTarget('');
  }

  return (
    <div>
      <div className="field">
        <label className="field-label">Handover notes</label>
        {editable || c.status === 'pending'
          ? <textarea rows={3} maxLength={5000} value={notes} disabled={busy} onChange={(e) => setNotes(e.target.value)} placeholder="Ongoing work, where files live, who takes over…" />
          : <div className="whitespace-pre-wrap">{c.handoverNotes || '—'}</div>}
        {editable && notes !== (c.handoverNotes || '') && (
          <div className="mt-1.5 flex justify-end"><button className="btn sm primary" disabled={busy} onClick={() => run({ action: 'handover', handoverNotes: notes })}>Save notes</button></div>
        )}
      </div>

      <div className="field">
        <label className="field-label">Sales leads</label>
        {c.credentialId == null ? (
          <div className="meta">No login on record, so no leads are assigned to them.</div>
        ) : leads.total === 0 ? (
          <div className="meta">No leads assigned — nothing to hand over.</div>
        ) : (
          <>
            <div className="mb-2">
              <strong>{leads.total}</strong> lead{leads.total === 1 ? '' : 's'} still assigned
              {leads.lead && leads.ens ? ` (${leads.lead} Sales Tracker, ${leads.ens} Expand North Star)` : ''}.
            </div>
            {editable && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-56 flex-1">
                  <select value={target} disabled={busy} onChange={(e) => setTarget(e.target.value)}>
                    <option value="">Hand over to…</option>
                    {targets.map((t) => <option key={t.credentialId} value={t.credentialId}>{t.name} — {t.department}</option>)}
                  </select>
                </div>
                <button className="btn sm primary" disabled={busy || !target} onClick={() => handOver(Number(target))}>Hand over</button>
                <button className="btn sm" disabled={busy} onClick={() => handOver(null)}>Just remove them</button>
              </div>
            )}
            {editable && targets.length === 0 && <div className="meta mt-1">Nobody can take leads right now — each person needs an active login and a department, and can&apos;t be leaving too.</div>}
          </>
        )}
        {result && <div className="notice good mt-2">{result}</div>}
      </div>
    </div>
  );
}

interface FnfDraftLine { key: string | null; label: string; kind: 'earning' | 'deduction'; amount: string; source: 'auto' | 'manual'; note: string; computed: number | null; }

function toDraft(fnf: OffboardingFnf): FnfDraftLine[] {
  return fnf.lines.map((l) => ({
    key: l.key, label: l.label, kind: l.kind, amount: String(l.amount), source: l.source, note: l.note || '',
    computed: l.source === 'auto' ? (l.overridden ? (l.computedAmount ?? l.amount) : l.amount) : null,
  }));
}
const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Full & Final: prepared after the LWD. Draft → Approve (checklist fully cleared) → Paid. */
function FnfSection({ c, employee, clearance, busy, run }: {
  c: OffboardingCase; employee: HrEmployee | undefined; clearance: OffboardingClearanceItem[]; busy: boolean;
  run: <T>(body: Record<string, unknown>, confirmText?: string) => Promise<ActionResult<T>>;
}) {
  const { state } = useHrTool();
  const fnf = c.fnf;
  const [lines, setLines] = useState<FnfDraftLine[]>(() => (fnf ? toDraft(fnf) : []));
  const [paying, setPaying] = useState(false);
  const [paidOn, setPaidOn] = useState(todayStr());
  const [reference, setReference] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const pendingItems = clearance.filter((i) => i.status === 'pending').length;

  if (!fnf) {
    if (c.status !== 'exited') return <div className="meta">Prepared after the last working day ({fmt(c.approvedLwd)}).</div>;
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="meta">Works out final salary, leave encashment, expense claims, notice shortfall and checklist recoveries.</span>
        <button className="btn primary" disabled={busy} onClick={() => run({ action: 'fnf-calculate' })}>Calculate Full &amp; Final</button>
      </div>
    );
  }

  const draft = fnf.status === 'draft' && c.status === 'exited';
  const amountOf = (l: FnfDraftLine) => Number(l.amount) || 0;
  const earnings = lines.filter((l) => l.kind === 'earning').reduce((n, l) => n + amountOf(l), 0);
  const deductions = lines.filter((l) => l.kind === 'deduction').reduce((n, l) => n + amountOf(l), 0);
  const net = earnings - deductions;
  const dirty = JSON.stringify(lines) !== JSON.stringify(toDraft(fnf));
  const patch = (i: number, p: Partial<FnfDraftLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const payload = () => lines.map((l) => ({ key: l.key, label: l.label, kind: l.kind, amount: amountOf(l), note: l.note }));
  const credential = state.employeeCredentials.find((x) => x.id === (c.credentialId ?? employee?.credentialId));

  async function downloadPdf() {
    if (pdfBusy || !fnf) return;
    setPdfBusy(true);
    try {
      const { generateFnfPdf } = await import('../fnfPdf');
      const { triggerPdfDownload } = await import('../payslipPdf');
      const bytes = await generateFnfPdf({
        employeeName: c.emp, employeeCode: credential?.employeeCode || '', designation: employee?.designation || '',
        dojLabel: fmt(employee?.doj), lwdLabel: fmt(c.approvedLwd), fnf,
        exitTypeLabel: c.exitType === 'termination' ? 'Termination' : 'Resignation',
      });
      triggerPdfDownload(bytes, `Full-and-Final-${c.emp.replace(/[^\w]+/g, '-')}.pdf`);
    } catch {
      alert('Could not create the PDF. Please try again.');
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`badge ${fnf.status === 'paid' ? 'approved' : fnf.status === 'approved' ? 'onboarding' : 'pending'}`}>
          {fnf.status === 'paid' ? 'Paid' : fnf.status === 'approved' ? 'Approved — payment pending' : 'Draft'}
        </span>
        <span className="meta">
          Priced at {rupees(fnf.monthlySalary)}/month ({rupees(fnf.perDay)}/day) · calculated {fmt(fnf.calculatedAt)} by {fnf.calculatedBy}
          {fnf.approvedBy ? ` · approved by ${fnf.approvedBy}` : ''}{fnf.status === 'paid' ? ` · paid ${fmt(fnf.paidOn)}, ref ${fnf.reference}` : ''}
        </span>
      </div>

      <div className="table-scroll"><table>
        <thead><tr><th>Description</th><th>Type</th><th className="text-right">Amount (₹)</th><th>Note</th>{draft && <th />}</tr></thead>
        <tbody>
          {lines.map((l, i) => {
            const edited = l.source === 'auto' && l.computed !== null && amountOf(l) !== l.computed;
            return (
              <tr key={(l.key || 'm') + i}>
                <td>
                  {draft && l.source === 'manual'
                    ? <input type="text" maxLength={150} placeholder="e.g. Bonus, TDS, Advance" value={l.label} onChange={(e) => patch(i, { label: e.target.value })} />
                    : l.label}
                  <div className="meta">{l.source === 'manual' ? 'Added by HR' : edited ? `Edited — calculated ${rupees(l.computed || 0)}` : 'Calculated'}</div>
                </td>
                <td>
                  {draft && l.source === 'manual'
                    ? <select value={l.kind} onChange={(e) => patch(i, { kind: e.target.value === 'deduction' ? 'deduction' : 'earning' })}>
                        <option value="earning">Earning</option><option value="deduction">Deduction</option>
                      </select>
                    : l.kind === 'earning' ? 'Earning' : 'Deduction'}
                </td>
                <td className="text-right">
                  {draft
                    ? <div className="ml-auto w-28"><input type="text" inputMode="numeric" value={l.amount} onChange={(e) => patch(i, { amount: e.target.value.replace(/\D/g, '').slice(0, 9) })} /></div>
                    : rupees(amountOf(l))}
                </td>
                <td>
                  {draft && (l.source === 'manual' || edited)
                    ? <input type="text" maxLength={1000} placeholder={edited ? 'Why changed? (required)' : 'Note'} value={l.note} onChange={(e) => patch(i, { note: e.target.value })} />
                    : <span className="meta">{l.note || ''}</span>}
                </td>
                {draft && (
                  <td className="text-right">
                    {l.source === 'manual' && <button className="btn sm ghost" title="Remove line" aria-label="Remove line" onClick={() => setLines(lines.filter((_, j) => j !== i))}><X className="size-3.5 shrink-0" aria-hidden /></button>}
                  </td>
                )}
              </tr>
            );
          })}
          <tr>
            <td colSpan={2}><strong>Total</strong></td>
            <td className="text-right"><div>Earnings {rupees(earnings)}</div><div>Deductions {rupees(deductions)}</div></td>
            <td colSpan={draft ? 2 : 1}>
              <strong className={net < 0 ? 'text-red-700' : 'text-green-700'}>{net < 0 ? `Recover ${rupees(-net)} from employee` : `Pay ${rupees(net)} to employee`}</strong>
            </td>
          </tr>
        </tbody>
      </table></div>

      {draft && (
        <>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <button className="btn sm" disabled={busy || lines.length >= 50}
              onClick={() => setLines([...lines, { key: null, label: '', kind: 'earning', amount: '', source: 'manual', note: '', computed: null }])}>+ Add line</button>
            <div className="toolbar">
              <button className="btn sm" disabled={busy}
                onClick={() => run({ action: 'fnf-calculate' }, dirty ? 'Recalculate? Your unsaved edits are discarded (saved overrides and added lines are kept).' : undefined)}>Recalculate</button>
              <button className="btn sm primary" disabled={busy || !dirty} onClick={() => run({ action: 'fnf-save', version: fnf.version, lines: payload() })}>Save changes</button>
              <button className="btn sm approve" disabled={busy || dirty || pendingItems > 0}
                title={dirty ? 'Save your changes first' : pendingItems ? 'Finish the clearance checklist first' : ''}
                onClick={() => run({ action: 'fnf-approve', version: fnf.version }, `Approve the Full & Final for ${c.emp}? ${net < 0 ? `Recover ${rupees(-net)}` : `Pay ${rupees(net)}`}. The checklist and these lines lock until it's reopened.`)}>
                Approve
              </button>
            </div>
          </div>
          {pendingItems > 0 && <div className="meta mt-1.5">Approve unlocks once the clearance checklist has no pending items ({pendingItems} left).</div>}
        </>
      )}

      {fnf.status === 'approved' && (
        <div className="mt-3">
          {paying ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-44"><label className="field-label">{net < 0 ? 'Recovered on' : 'Paid on'}</label><input type="date" max={todayStr()} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></div>
              <div className="min-w-56 flex-1"><label className="field-label">Reference (UTR / cheque no.)</label><input type="text" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} /></div>
              <button className="btn sm approve" disabled={busy || !reference.trim() || !paidOn}
                onClick={() => run({ action: 'fnf-paid', version: fnf.version, paidOn, reference: reference.trim() }, `Mark the Full & Final for ${c.emp} as settled on ${fmt(paidOn)}? This can't be undone.`)}>Confirm</button>
              <button className="btn sm ghost" disabled={busy} onClick={() => setPaying(false)}>Cancel</button>
            </div>
          ) : (
            <div className="toolbar">
              <button className="btn sm" disabled={busy} onClick={() => run({ action: 'fnf-reopen', version: fnf.version }, 'Reopen this Full & Final as a draft? It needs approving again.')}>Reopen</button>
              <button className="btn sm approve" disabled={busy} onClick={() => setPaying(true)}>Mark as paid</button>
            </div>
          )}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <button className="btn sm" disabled={pdfBusy} onClick={downloadPdf}>{pdfBusy ? 'Preparing…' : fnf.status === 'draft' ? 'Download draft PDF' : 'Download PDF'}</button>
      </div>
    </div>
  );
}

const LETTERS: { type: 'relieving' | 'experience'; title: string }[] = [
  { type: 'relieving', title: 'Relieving letter' },
  { type: 'experience', title: 'Experience letter' },
];

/** Fetches an authenticated PDF from the HR API. Preview opens a tab reserved synchronously (so the
 * popup blocker allows it) and fills it once the PDF arrives. */
async function openLetterPdf(caseId: number, type: string, mode: 'preview' | 'download', filename: string) {
  const tab = mode === 'preview' ? window.open('', '_blank') : null;
  try {
    const res = await fetch(`/api/admin/hr-tool/offboarding/${caseId}/letters/${type}${mode === 'preview' ? '?preview=1' : ''}`, { headers: getAuthHeaders() });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      tab?.close();
      alert(body?.error || 'Could not build the letter.');
      return;
    }
    const url = URL.createObjectURL(await res.blob());
    if (tab) { tab.location.href = url; return; }
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } catch {
    tab?.close();
    alert('Could not build the letter — check your connection.');
  }
}

function LettersSection({ c, pendingItems, busy, run }: {
  c: OffboardingCase; pendingItems: number; busy: boolean;
  run: <T>(body: Record<string, unknown>, confirmText?: string) => Promise<ActionResult<T>>;
}) {
  const [emailIt, setEmailIt] = useState(true);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const locked = c.status === 'completed';

  function blocker(type: 'relieving' | 'experience'): string | null {
    if (c.status !== 'exited' && c.status !== 'completed') return 'Issued after the last working day.';
    if (pendingItems) return `Finish the clearance checklist first (${pendingItems} pending).`;
    if (type === 'relieving' && c.fnf?.status !== 'paid') return 'Issued once the Full & Final is paid.';
    return null;
  }

  async function issue(type: 'relieving' | 'experience', title: string, reissue: boolean) {
    setNotice(null);
    const send = emailIt && !!c.personalEmail;
    const res = await run<OffboardingCase & { mail?: string }>({ action: 'letter-issue', letterType: type, send },
      `${reissue ? 'Re-issue' : 'Issue'} the ${title.toLowerCase()} for ${c.emp}${send ? ` and email it to ${c.personalEmail}` : ''}?${reissue ? ' The new version replaces the one they have.' : ''}`);
    if (res.ok && res.data.mail) setNotice(res.data.mail === 'sent' ? { ok: true, text: `${title} emailed to ${c.personalEmail}.` } : { ok: false, text: `${title} issued, but the email failed: ${res.data.mail}` });
  }
  async function send(type: 'relieving' | 'experience', title: string) {
    setNotice(null);
    const res = await run<OffboardingCase & { mail?: string }>({ action: 'letter-send', letterType: type }, `Email the ${title.toLowerCase()} to ${c.personalEmail}?`);
    if (res.ok) setNotice(res.data.mail === 'sent' ? { ok: true, text: `${title} emailed to ${c.personalEmail}.` } : { ok: false, text: `Email failed: ${res.data.mail}` });
  }

  return (
    <div>
      {LETTERS.map(({ type, title }) => {
        const letter = c.letters?.[type] ?? null;
        const why = blocker(type);
        return (
          <div key={type} className="flex flex-wrap items-center gap-2 border-b border-slate-100 py-2">
            <div className="min-w-56 flex-1">
              <div>{title}</div>
              <div className="meta">
                {!letter ? (why || 'Not issued yet')
                  : `Issued ${fmt(letter.issuedAt)} by ${letter.issuedBy}${letter.revision > 1 ? ` (version ${letter.revision})` : ''} · `
                    + (letter.sentAt ? `emailed to ${letter.sentTo} on ${fmt(letter.sentAt)}` : letter.sendError ? '' : 'not emailed yet')}
                {letter?.sendError && <span className="text-red-700">email failed: {letter.sendError}</span>}
              </div>
            </div>
            <button className="btn sm ghost" disabled={busy || c.status !== 'exited' && c.status !== 'completed'} title="See what the letter will say"
              onClick={() => openLetterPdf(c.id, type, 'preview', '')}>Preview</button>
            {letter && <button className="btn sm" disabled={busy} onClick={() => openLetterPdf(c.id, type, 'download', `${title.replace(/\s+/g, '-')}-${c.emp.replace(/[^\w]+/g, '-')}.pdf`)}>Download</button>}
            {!locked && letter && <button className="btn sm" disabled={busy || !c.personalEmail} title={c.personalEmail ? '' : 'Add their personal email first'} onClick={() => send(type, title)}>{letter.sentAt ? 'Resend' : 'Email'}</button>}
            {!locked && <button className={`btn sm${letter ? '' : ' primary'}`} disabled={busy || !!why} title={why || ''} onClick={() => issue(type, title, !!letter)}>{letter ? 'Re-issue' : 'Issue'}</button>}
          </div>
        );
      })}
      {!locked && (
        <label className="mt-2 flex items-center gap-2 text-[12.5px]">
          <input type="checkbox" className="w-auto" checked={emailIt} onChange={(e) => setEmailIt(e.target.checked)} disabled={!c.personalEmail} />
          {c.personalEmail ? `Email letters to ${c.personalEmail} when issuing` : 'No personal email on file — add one above to email letters'}
        </label>
      )}
      {notice && <div className={notice.ok ? 'notice good mt-2' : 'mt-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[12.5px] text-red-700'}>{notice.text}</div>}
    </div>
  );
}

function PersonalEmailField({ c, busy, run }: { c: OffboardingCase; busy: boolean; run: <T>(body: Record<string, unknown>, confirmText?: string) => Promise<ActionResult<T>> }) {
  const [email, setEmail] = useState(c.personalEmail || '');
  const editable = c.status === 'pending' || c.status === 'accepted' || c.status === 'exited';
  if (!editable) return <Info label="Personal email" value={c.personalEmail} />;
  const dirty = email.trim() !== (c.personalEmail || '');
  return (
    <div className="field">
      <label className="field-label">Personal email</label>
      <div className="flex items-center gap-2">
        <div className="flex-1"><input type="email" maxLength={255} placeholder="For letters after exit" value={email} disabled={busy} onChange={(e) => setEmail(e.target.value)} /></div>
        {dirty && <button className="btn sm primary" disabled={busy || !email.trim()} onClick={() => run({ action: 'personal-email', personalEmail: email.trim() })}>Save</button>}
      </div>
    </div>
  );
}

/** What still stands between an exited case and "completed" — mirrors HrOffboardingService.completeCase. */
function completionGaps(c: OffboardingCase, pendingItems: number): string[] {
  const gaps: string[] = [];
  if (pendingItems) gaps.push(`${pendingItems} checklist item${pendingItems === 1 ? '' : 's'} pending`);
  if (c.fnf?.status !== 'paid') gaps.push('Full & Final not paid');
  if (!c.letters?.relieving) gaps.push('relieving letter not issued');
  return gaps;
}

function AccessSelect({ value, onChange }: { value: 'alumni' | 'blocked'; onChange: (v: 'alumni' | 'blocked') => void }) {
  return (
    <div className="field">
      <label className="field-label">Portal access after last day</label>
      <select value={value} onChange={(e) => onChange(e.target.value === 'blocked' ? 'blocked' : 'alumni')}>
        <option value="alumni">Read-only (My Exit only)</option>
        <option value="blocked">Blocked</option>
      </select>
    </div>
  );
}

/** HR starts an exit. Also opened from the Directory's employee profile ("Start exit"). */
export function StartExitModal({ employees, settings, openCases, preselectId, onClose, onStarted }: {
  employees: HrEmployee[]; settings: OffboardingSettings | null; openCases?: OffboardingCase[]; preselectId?: string;
  onClose: () => void; onStarted: (c: OffboardingCase) => void;
}) {
  const [s, setS] = useState<OffboardingSettings | null>(settings);
  const [employeeId, setEmployeeId] = useState(preselectId || '');
  const [exitType, setExitType] = useState<'resignation' | 'termination'>('resignation');
  const [terminationMode, setTerminationMode] = useState<'immediate' | 'with_notice'>('with_notice');
  const [lwd, setLwd] = useState('');
  const [reasonCategory, setReasonCategory] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [accessMode, setAccessMode] = useState<'alumni' | 'blocked'>('alumni');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const today = todayStr();

  // Opened from the Directory there's no list loaded yet — fetch settings for the notice default.
  useEffect(() => {
    if (s) return;
    hrApi.offboardingList().then((res) => { if (res.success && res.data) setS(res.data.settings); }).catch(() => {});
  }, [s]);

  const openIds = new Set((openCases || []).filter((c) => c.status === 'pending' || c.status === 'accepted').map((c) => c.employeeId));
  const eligible = employees.filter((e) => e.status !== 'exited' && e.sysRole !== 'Founder' && (!openIds.has(e.id) || e.id === preselectId));
  const employee = employees.find((e) => e.id === employeeId);
  const noticeDays = s ? noticeDaysFor(employee, s) : 0;
  const immediate = exitType === 'termination' && terminationMode === 'immediate';
  const effectiveLwd = immediate ? today : (lwd || addDays(today, noticeDays));
  const reasons: readonly string[] = exitType === 'termination' ? TERMINATION_REASONS : RESIGNATION_REASONS;

  async function submit() {
    if (busy) return;
    setError(null);
    if (!employeeId) return setError('Pick an employee.');
    if (!reasonCategory) return setError('Pick a reason.');
    const warn = immediate
      ? `Terminate ${employee?.name} with immediate effect? Their login switches to ${accessMode === 'blocked' ? 'blocked' : 'read-only'} right away.`
      : `Start ${exitType} for ${employee?.name} with last working day ${fmt(effectiveLwd)}?`;
    if (!confirm(warn)) return;
    setBusy(true);
    try {
      const res = await hrApi.offboardingStart({
        employeeId, exitType, terminationMode, approvedLwd: effectiveLwd, reasonCategory, reasonText, personalEmail, accessMode, note,
      });
      if (!res.success || !res.data) { setError(res.error || 'Could not start the exit.'); return; }
      onStarted(res.data);
    } catch {
      setError('Could not start the exit.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Start exit" onClose={onClose} maxWidth={640} actions={[
      { label: 'Cancel', cls: 'btn ghost', onClick: onClose },
      { label: busy ? 'Saving…' : immediate ? 'Terminate now' : 'Start exit', cls: immediate ? 'btn reject' : 'btn primary', onClick: submit },
    ]}>
      <ErrorNote text={error} />
      <div className="field">
        <label className="field-label">Employee *</label>
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} disabled={!!preselectId}>
          <option value="">Select employee</option>
          {eligible.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.designation || e.id}</option>)}
        </select>
      </div>
      <div className="field-grid-2">
        <div className="field">
          <label className="field-label">Exit type *</label>
          <select value={exitType} onChange={(e) => { setExitType(e.target.value === 'termination' ? 'termination' : 'resignation'); setReasonCategory(''); }}>
            <option value="resignation">Resignation (handed in to HR)</option>
            <option value="termination">Termination</option>
          </select>
        </div>
        {exitType === 'termination' ? (
          <div className="field">
            <label className="field-label">Effective</label>
            <select value={terminationMode} onChange={(e) => setTerminationMode(e.target.value === 'immediate' ? 'immediate' : 'with_notice')}>
              <option value="with_notice">After notice period</option>
              <option value="immediate">Immediately (today)</option>
            </select>
          </div>
        ) : <div />}
        <div className="field">
          <label className="field-label">Last working day</label>
          {immediate
            ? <div>Today ({fmt(today)})</div>
            : <input type="date" min={today} value={effectiveLwd} onChange={(e) => setLwd(e.target.value)} />}
          {!immediate && employee && <div className="meta mt-1">Policy notice: {noticeDays} days ({employee.status === 'probation' ? 'probation' : 'confirmed'})</div>}
        </div>
        <div className="field">
          <label className="field-label">Reason *</label>
          <select value={reasonCategory} onChange={(e) => setReasonCategory(e.target.value)}>
            <option value="">Select a reason</option>
            {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="field"><label className="field-label">Personal email</label><input type="email" placeholder="For letters after exit" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} /></div>
        <AccessSelect value={accessMode} onChange={setAccessMode} />
      </div>
      <div className="field"><label className="field-label">Details</label><textarea rows={2} value={reasonText} onChange={(e) => setReasonText(e.target.value)} /></div>
      <div className="field"><label className="field-label">Internal note</label><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
    </ModalShell>
  );
}

function SettingsPanel({ settings, onSaved }: { settings: OffboardingSettings; onSaved: (s: OffboardingSettings) => void }) {
  const { logRuleChange } = useHrTool();
  const [probation, setProbation] = useState(String(settings.noticeDaysProbation));
  const [confirmed, setConfirmed] = useState(String(settings.noticeDaysConfirmed));
  const [checklist, setChecklist] = useState<Record<ClearanceCategory, string>>(() => ({
    asset: settings.checklist.asset.join('\n'), handover: settings.checklist.handover.join('\n'),
    finance: settings.checklist.finance.join('\n'), access: settings.checklist.access.join('\n'),
  }));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    const lines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean);
    try {
      const res = await hrApi.offboardingSaveSettings({
        noticeDaysProbation: Number(probation) || 0, noticeDaysConfirmed: Number(confirmed) || 0,
        checklist: { asset: lines(checklist.asset), handover: lines(checklist.handover), finance: lines(checklist.finance), access: lines(checklist.access) },
      });
      if (!res.success || !res.data) { setMsg({ ok: false, text: res.error || 'Could not save settings.' }); return; }
      onSaved(res.data);
      logRuleChange(`Offboarding settings: notice ${res.data.noticeDaysProbation}d probation / ${res.data.noticeDaysConfirmed}d confirmed`);
      setMsg({ ok: true, text: 'Saved.' });
    } catch {
      setMsg({ ok: false, text: 'Could not save settings.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card pad">
      <h3 className="mb-3 mt-0">Notice period</h3>
      <div className="field-grid-2">
        <div className="field"><label className="field-label">On probation (days)</label><input type="number" min={0} max={180} value={probation} onChange={(e) => setProbation(e.target.value)} /></div>
        <div className="field"><label className="field-label">Confirmed employees (days)</label><input type="number" min={0} max={180} value={confirmed} onChange={(e) => setConfirmed(e.target.value)} /></div>
      </div>
      <h3 className="mb-1 mt-6">Default clearance checklist</h3>
      <div className="meta mb-3">One item per line. Copied onto each exit when it is accepted; changes here don&apos;t touch exits already in progress.</div>
      <div className="field-grid-2">
        {(Object.keys(CATEGORY_LABEL) as ClearanceCategory[]).map((cat) => (
          <div className="field" key={cat}>
            <label className="field-label">{CATEGORY_LABEL[cat]}</label>
            <textarea rows={4} value={checklist[cat]} onChange={(e) => setChecklist({ ...checklist, [cat]: e.target.value })} />
          </div>
        ))}
      </div>
      {msg && <div className={`notice ${msg.ok ? 'good' : ''}`}>{msg.text}</div>}
      <div className="toolbar justify-end"><button className="btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</button></div>
    </div>
  );
}
