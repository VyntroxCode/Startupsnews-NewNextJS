'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CLEARANCE_CATEGORIES, CLEARANCE_CATEGORY_LABEL, NOTICE_DAYS, clearanceProgress, leftEarlyDays, systemLwd,
  type LwdChoice, type MyExitView, type OffboardingCase, type OffboardingClearanceItem, type OffboardingStatus,
} from '@/modules/hr-offboarding/domain/types';
import type { EmployeeUser } from '@/lib/employee-auth';

interface ExitWidgetProps {
  /** The signed-in person, for the employee code on the settlement PDF (optional). */
  user?: EmployeeUser | null;
  /** GET = My Exit view, POST = resign; `${apiBase}/withdraw` withdraws, `${apiBase}/handover` saves handover notes. */
  apiBase: string;
  getHeaders: () => HeadersInit;
}

const STATUS_LABEL: Record<OffboardingStatus, { label: string; cls: string }> = {
  pending: { label: 'Awaiting HR approval', cls: 'bg-orange-100 text-orange-700' },
  accepted: { label: 'Serving notice', cls: 'bg-indigo-100 text-indigo-700' },
  exited: { label: 'Exited', cls: 'bg-slate-200 text-slate-700' },
  completed: { label: 'Exit completed', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
  withdrawn: { label: 'Withdrawn', cls: 'bg-slate-100 text-slate-600' },
  cancelled: { label: 'Cancelled by HR', cls: 'bg-slate-100 text-slate-600' },
};

const STEPS: { key: string; label: string }[] = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'notice', label: 'Notice period' },
  { key: 'exited', label: 'Exited' },
  { key: 'completed', label: 'Settled' },
];
/** Index of the last step already DONE for each status (Settled becomes done once the F&F is paid). */
const STEP_DONE: Partial<Record<OffboardingStatus, number>> = { pending: 0, accepted: 1, exited: 3, completed: 3 };

const inputCls = 'w-full box-border rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none';
const labelCls = 'mb-1.5 block text-xs font-semibold text-slate-600';
const cardCls = 'rounded-xl border border-black/5 bg-white p-6 shadow-sm';
const sectionTitleCls = 'm-0 text-base font-bold text-slate-900';

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function daysFromToday(d: string): number {
  const today = new Date().toISOString().slice(0, 10);
  return Math.round((Date.parse(d + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86_400_000);
}

function StatusPill({ status }: { status: OffboardingStatus }) {
  const s = STATUS_LABEL[status];
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

function dateTimeLabel(v: string | null | undefined): string {
  if (!v) return '';
  const [d, t] = String(v).replace('T', ' ').split(' ');
  if (!t) return formatDate(d);
  const [h, m] = t.split(':').map(Number);
  return `${formatDate(d)}, ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/** Five-step tracker with the date each step happened (or is due) under it. */
function Stepper({ c }: { c: OffboardingCase }) {
  const settled = c.fnf?.status === 'paid';
  const doneUpTo = settled ? 4 : STEP_DONE[c.status] ?? 0;
  const past = c.status === 'exited' || c.status === 'completed';
  const captions = [
    formatDate(c.resignationDate),
    c.status !== 'pending' && c.decidedAt ? formatDate(c.decidedAt) : '',
    c.status === 'accepted' && c.approvedLwd ? `until ${formatDate(c.approvedLwd)}` : '',
    c.approvedLwd && c.status !== 'pending' ? (past ? formatDate(c.approvedLwd) : `on ${formatDate(c.approvedLwd)}`) : '',
    settled ? formatDate(c.fnf?.paidOn) : '',
  ];
  return (
    <ol className="m-0 mt-6 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-5 sm:gap-0">
      {STEPS.map((step, i) => {
        const done = i <= doneUpTo;
        const current = i === doneUpTo + 1;
        return (
          <li key={step.key} className="relative flex items-start gap-3 text-left sm:flex-col sm:items-center sm:gap-0 sm:text-center">
            {/* Connector to the previous step: vertical on phones (steps stack), horizontal from sm up. */}
            {i > 0 && <span className={`absolute -top-4 left-3.5 h-4 w-0.5 -translate-x-1/2 sm:right-1/2 sm:left-auto sm:top-3.5 sm:h-0.5 sm:w-full sm:translate-x-0 ${i <= doneUpTo ? 'bg-indigo-600' : 'bg-slate-200'}`} aria-hidden="true" />}
            <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-4 ring-white ${
              done ? 'bg-indigo-600 text-white' : current ? 'border-2 border-indigo-600 bg-white text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
              {done ? <CheckIcon /> : i + 1}
            </span>
            <span className="flex min-w-0 flex-col pt-1 sm:items-center sm:pt-0">
              <span className={`text-sm sm:mt-2 ${done || current ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{step.label}</span>
              <span className="mt-0.5 text-xs text-slate-500 sm:min-h-4 sm:text-[11px]">{captions[i]}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function headlineFor(c: OffboardingCase, alumni: boolean): { title: string; sub: string } {
  const lwd = formatDate(c.approvedLwd);
  const left = c.approvedLwd ? daysFromToday(c.approvedLwd) : null;
  switch (c.status) {
    case 'pending':
      return { title: 'HR is reviewing your resignation', sub: 'You\'ll get an email as soon as HR responds. Until then you can still withdraw it.' };
    case 'accepted':
      return {
        title: c.exitType === 'termination' ? 'Your separation has been confirmed' : 'Your resignation has been accepted',
        sub: left !== null && left > 0 ? `You are serving your notice period — ${left} day${left === 1 ? '' : 's'} left. Your last working day is ${lwd}.`
          : `Today is your last working day (${lwd}).`,
      };
    case 'exited':
      return { title: 'You have left the company', sub: `Your last working day was ${lwd}.${alumni ? ' This page stays available to you (read-only) for your settlement and letters.' : ''}` };
    case 'completed':
      return { title: 'Your exit is complete', sub: `Your last working day was ${lwd}. Your settlement and letters are below — thank you for your time with us.` };
    default:
      return { title: 'Your resignation', sub: '' };
  }
}

function StatusHeader({ c, alumni }: { c: OffboardingCase; alumni: boolean }) {
  const { title, sub } = headlineFor(c, alumni);
  return (
    <div className={cardCls}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c.exitType === 'termination' ? 'Separation' : 'Resignation'}</div>
          <h3 className="m-0 mt-1 text-xl font-bold text-slate-900">{title}</h3>
          {sub && <p className="mb-0 mt-1.5 text-sm text-slate-600">{sub}</p>}
        </div>
        <StatusPill status={c.status} />
      </div>
      <Stepper c={c} />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="m-0 mt-1 break-words text-sm text-slate-900">{value || '—'}</dd>
    </div>
  );
}

function Quote({ label, text, tone = 'slate' }: { label: string; text: string; tone?: 'slate' | 'indigo' }) {
  return (
    <div className="mt-5">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`whitespace-pre-wrap break-words rounded-lg border px-4 py-3 text-sm leading-relaxed ${
        tone === 'indigo' ? 'border-indigo-100 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>{text}</div>
    </div>
  );
}

const CHOICE_LABEL: Record<LwdChoice, string> = {
  requested: 'HR approved your requested date',
  system: 'HR kept the system date',
  custom: 'HR set a different date',
};

/** Everything the employee submitted, plus HR's decision. */
function DetailsCard({ c }: { c: OffboardingCase }) {
  const pending = c.status === 'pending';
  const resignation = c.exitType === 'resignation';
  const decided = !pending && !!c.approvedLwd;
  const earlyDays = leftEarlyDays(c);
  return (
    <div className={cardCls}>
      <h3 className={sectionTitleCls}>{c.exitType === 'termination' ? 'Separation details' : 'Resignation details'}</h3>
      <dl className="m-0 mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Fact label="Submitted on" value={dateTimeLabel(c.createdAt) || formatDate(c.resignationDate)} />
        <Fact label="Reason" value={c.reasonCategory} />
        {resignation ? (
          <>
            <Fact label="Resignation date (system)" value={<>{formatDate(systemLwd(c))} <span className="text-xs text-slate-500">· {NOTICE_DAYS} days&apos; notice</span></>} />
            <Fact label="Your requested date" value={c.requestedLwd ? formatDate(c.requestedLwd) : 'Not requested'} />
            <Fact label="Final last working day" value={pending ? 'Awaiting HR' : (
              <>
                {formatDate(earlyDays ? c.agreedLwd : c.approvedLwd)}
                {c.lwdChoice && <span className="block text-xs text-slate-500">{CHOICE_LABEL[c.lwdChoice]}</span>}
              </>
            )} />
          </>
        ) : (
          <Fact label="Last working day" value={formatDate(c.approvedLwd)} />
        )}
        {earlyDays > 0 && (
          <Fact label="Left early" value={<span className="text-red-700">Left on {formatDate(c.approvedLwd)}, {earlyDays} day{earlyDays === 1 ? '' : 's'} early · no salary or dues in your F&amp;F, 1 month&apos;s salary recovered</span>} />
        )}
        {!resignation && decided && <Fact label="Notice period" value={`${c.noticeDays} day${c.noticeDays === 1 ? '' : 's'}`} />}
        <Fact label="Personal email" value={c.personalEmail} />
        {!pending && <Fact label="Decided on" value={c.decidedAt ? formatDate(c.decidedAt) : '—'} />}
      </dl>
      {c.reasonText && <Quote label={c.initiatedBy === 'employee' ? 'Your message to HR' : 'Details'} text={c.reasonText} />}
      {c.decisionNote && <Quote label="Note from HR" text={c.decisionNote} tone="indigo" />}
    </div>
  );
}

const NEXT_STEPS: Partial<Record<OffboardingStatus, string[]>> = {
  pending: [
    'HR reviews your resignation and confirms your final last working day — the system date, your requested date, or another date.',
    'You get an email when it is accepted — the notice period starts then.',
    'Keep working as usual in the meantime.',
  ],
  accepted: [
    'Keep your handover notes up to date.',
    'Work until your final last working day — if you leave before it without HR\'s approval, your F&F pays no salary or dues and 1 month\'s salary is recovered from you.',
    'Return company items (laptop, ID card…) — HR ticks them off on your clearance checklist.',
    'After your last day, this page stays open (read-only) for your settlement and letters.',
  ],
  exited: [
    'HR finishes your clearance and prepares your Full & Final settlement.',
    'Your relieving and experience letters are emailed to your personal email.',
    'Everything also appears here to download.',
  ],
};

function NextStepsCard({ c }: { c: OffboardingCase }) {
  const steps = NEXT_STEPS[c.status];
  if (!steps) return null;
  return (
    <div className={cardCls}>
      <h3 className={sectionTitleCls}>What happens next</h3>
      <ol className="m-0 mt-4 list-none flex flex-col gap-3 p-0">
        {steps.map((text, i) => (
          <li key={i} className="flex gap-3 text-sm text-slate-700">
            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-700">{i + 1}</span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ActionsCard({ c, alumni, onWithdraw, busy }: { c: OffboardingCase; alumni: boolean; onWithdraw: () => void; busy: boolean }) {
  if (c.status !== 'pending' || alumni) return null;
  return (
    <div className={cardCls}>
      <h3 className={sectionTitleCls}>Changed your mind?</h3>
      <p className="mb-4 mt-2 text-sm text-slate-600">You can withdraw your resignation until HR accepts it.</p>
      <button type="button" disabled={busy} onClick={onWithdraw}
        className="w-full cursor-pointer rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
        {busy ? 'Withdrawing…' : 'Withdraw resignation'}
      </button>
    </div>
  );
}

function HelpCard() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
      <div className="font-semibold text-slate-800">Questions?</div>
      <p className="mb-0 mt-1">Speak to HR about your last day, notice period or settlement. Updates are also sent to your personal email.</p>
    </div>
  );
}

const ITEM_STATUS: Record<OffboardingClearanceItem['status'], { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-orange-100 text-orange-700' },
  done: { label: 'Done', cls: 'bg-green-100 text-green-700' },
  na: { label: 'Not needed', cls: 'bg-slate-100 text-slate-600' },
};

/** Read-only: HR ticks these off. Shown so the employee knows what to return / settle before leaving. */
function ClearanceList({ items }: { items: OffboardingClearanceItem[] }) {
  if (!items.length) return null;
  const p = clearanceProgress(items);
  const pct = p.total ? Math.round((p.cleared / p.total) * 100) : 0;
  return (
    <div className={cardCls}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={sectionTitleCls}>Clearance checklist</h3>
        <span className="text-sm text-slate-600">{p.cleared} of {p.total} cleared</span>
      </div>
      <p className="mb-4 mt-1 text-sm text-slate-500">HR ticks these off as you return company items and wrap up. Please hand everything back before your last day.</p>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
        {/* Data-driven width: the one value Tailwind can't express as a static class. */}
        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
      </div>
      {CLEARANCE_CATEGORIES.map((cat) => {
        const rows = items.filter((i) => i.category === cat);
        if (!rows.length) return null;
        return (
          <div key={cat} className="mb-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{CLEARANCE_CATEGORY_LABEL[cat]}</div>
            <ul className="m-0 list-none divide-y divide-slate-100 p-0">
              {rows.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-slate-800">{i.item}{i.deductionAmount > 0 && <span className="ml-2 text-xs text-red-700">₹{i.deductionAmount.toLocaleString('en-IN')} to be recovered</span>}</span>
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${ITEM_STATUS[i.status].cls}`}>{ITEM_STATUS[i.status].label}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function HandoverNotes({ c, apiBase, getHeaders, onSaved }: { c: OffboardingCase; apiBase: string; getHeaders: () => HeadersInit; onSaved: () => void }) {
  const [notes, setNotes] = useState(c.handoverNotes || '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = notes !== (c.handoverNotes || '');

  async function save() {
    if (saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(apiBase + '/handover', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ handoverNotes: notes }) });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) { setMsg({ ok: false, text: body?.error || 'Could not save your notes.' }); return; }
      setMsg({ ok: true, text: 'Saved.' });
      onSaved();
    } catch {
      setMsg({ ok: false, text: 'Could not save your notes. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cardCls}>
      <h3 className={sectionTitleCls}>Handover notes</h3>
      <p className="mb-3 mt-1 text-sm text-slate-500">Keep these up to date until your last day — ongoing work, where things live, who should take over.</p>
      <textarea rows={5} maxLength={5000} className={inputCls} value={notes} onChange={(e) => { setNotes(e.target.value); setMsg(null); }} />
      <div className="mt-3 flex items-center justify-end gap-3">
        {msg && <span className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-700'}`}>{msg.text}</span>}
        <button type="button" disabled={!dirty || saving} onClick={save}
          className="cursor-pointer rounded-lg border-0 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-default disabled:opacity-50">
          {saving ? 'Saving…' : 'Save notes'}
        </button>
      </div>
    </div>
  );
}

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Shown once HR has approved the settlement (drafts and internal notes never reach the employee). */
function SettlementCard({ c, employee }: { c: OffboardingCase; employee: EmployeeUser | null }) {
  const [busy, setBusy] = useState(false);
  const fnf = c.fnf;
  if (!fnf) return null;
  const owes = fnf.net < 0;

  async function download() {
    if (busy || !fnf) return;
    setBusy(true);
    try {
      const { generateFnfPdf } = await import('@/components/admin/hr-tool/fnfPdf');
      const { triggerPdfDownload } = await import('@/components/admin/hr-tool/payslipPdf');
      const bytes = await generateFnfPdf({
        employeeName: c.emp, employeeCode: employee?.employeeCode || '', designation: '', dojLabel: '-',
        lwdLabel: formatDate(c.approvedLwd), exitTypeLabel: c.exitType === 'termination' ? 'Termination' : 'Resignation', fnf,
      });
      triggerPdfDownload(bytes, 'Full-and-Final-Settlement.pdf');
    } catch {
      alert('Could not create the PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cardCls}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={sectionTitleCls}>Full &amp; Final settlement</h3>
        <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${fnf.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
          {fnf.status === 'paid' ? `Settled on ${formatDate(fnf.paidOn)}` : 'Approved — payment in process'}
        </span>
      </div>
      <ul className="m-0 mt-4 list-none divide-y divide-slate-100 p-0">
        {fnf.lines.map((l, i) => (
          <li key={i} className="flex items-start justify-between gap-4 py-2 text-sm">
            <span className="text-slate-800">{l.label}</span>
            <span className={`whitespace-nowrap font-medium ${l.kind === 'deduction' ? 'text-red-700' : 'text-slate-900'}`}>{l.kind === 'deduction' ? '−' : ''}{rupees(l.amount)}</span>
          </li>
        ))}
      </ul>
      <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-3 ${owes ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
        <span className="text-sm font-semibold">{owes ? 'Amount you owe the company' : 'Amount payable to you'}</span>
        <span className="text-lg font-bold">{rupees(Math.abs(fnf.net))}</span>
      </div>
      {fnf.status === 'paid' && fnf.reference && <p className="mb-0 mt-2 text-xs text-slate-500">Payment reference: {fnf.reference}</p>}
      <div className="mt-4 flex justify-end">
        <button type="button" disabled={busy} onClick={download}
          className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {busy ? 'Preparing…' : 'Download statement (PDF)'}
        </button>
      </div>
    </div>
  );
}

const LETTER_TITLES: { type: 'relieving' | 'experience'; title: string }[] = [
  { type: 'relieving', title: 'Relieving letter' },
  { type: 'experience', title: 'Experience letter' },
];

/** Issued letters — downloaded through the authenticated API (the PDF is rebuilt from the issued text). */
function LettersCard({ c, apiBase, getHeaders }: { c: OffboardingCase; apiBase: string; getHeaders: () => HeadersInit }) {
  const [busy, setBusy] = useState<string | null>(null);
  const issued = LETTER_TITLES.filter(({ type }) => c.letters?.[type]);
  if (!issued.length) return null;

  async function download(type: string, title: string) {
    if (busy) return;
    setBusy(type);
    try {
      const res = await fetch(`${apiBase}/letters/${type}`, { headers: getHeaders() });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.error || 'Could not download the letter.');
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      alert('Could not download the letter. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={cardCls}>
      <h3 className={sectionTitleCls}>Your letters</h3>
      <ul className="m-0 mt-3 list-none divide-y divide-slate-100 p-0">
        {issued.map(({ type, title }) => {
          const l = c.letters![type]!;
          return (
            <li key={type} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div>
                <div className="text-sm font-medium text-slate-900">{title}</div>
                <div className="text-xs text-slate-500">Issued {formatDate(l.issuedAt)}{l.sentAt ? ` · emailed to ${l.sentTo}` : ''}</div>
              </div>
              <button type="button" disabled={busy === type} onClick={() => download(type, title)}
                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                {busy === type ? 'Preparing…' : 'Download PDF'}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ResignForm({ view, apiBase, getHeaders, onDone }: { view: MyExitView; apiBase: string; getHeaders: () => HeadersInit; onDone: () => void }) {
  const [reasonCategory, setReasonCategory] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [requestedLwd, setRequestedLwd] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reasonCategory) return setError('Please pick a reason.');
    if (!personalEmail.trim()) return setError('Please enter your personal email.');
    if (!confirm('Submit your resignation to HR? You can withdraw it until HR accepts it.')) return;
    setSaving(true);
    try {
      const res = await fetch(apiBase, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ reasonCategory, reasonText, requestedLwd: requestedLwd || null, personalEmail, handoverNotes }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) { setError(body?.error || 'Could not submit your resignation.'); return; }
      onDone();
    } catch {
      setError('Could not submit your resignation. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const groupCls = 'border-t border-slate-100 pt-5 mt-5';
  const groupTitle = 'm-0 mb-3 text-sm font-semibold text-slate-900';
  return (
    <form onSubmit={submit} className={cardCls}>
      <h3 className="m-0 text-lg font-bold text-slate-900">Submit your resignation</h3>
      <p className="mb-0 mt-1.5 text-sm text-slate-600">HR reviews it and confirms your last working day. You can withdraw it until then.</p>

      <div className={groupCls}>
        <h4 className={groupTitle}>Why you are leaving</h4>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelCls} htmlFor="exit-reason">Reason *</label>
            <select id="exit-reason" className={inputCls} value={reasonCategory} onChange={(e) => setReasonCategory(e.target.value)}>
              <option value="">Select a reason</option>
              {view.reasons.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="exit-details">Message to HR <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea id="exit-details" rows={3} maxLength={2000} className={inputCls} placeholder="Anything you'd like HR to know" value={reasonText} onChange={(e) => setReasonText(e.target.value)} />
          </div>
        </div>
      </div>

      <div className={groupCls}>
        <h4 className={groupTitle}>Last working day</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className={labelCls}>Resignation date (system)</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">{formatDate(view.systemLwd)}</div>
            <p className="mb-0 mt-1.5 text-xs text-slate-500">{view.noticeDays} days&apos; notice from today — set by the system.</p>
          </div>
          <div>
            <label className={labelCls} htmlFor="exit-lwd">Requested date <span className="font-normal text-slate-400">(optional)</span></label>
            <input id="exit-lwd" type="date" min={today} className={inputCls} value={requestedLwd} onChange={(e) => setRequestedLwd(e.target.value)} />
            <p className="mb-0 mt-1.5 text-xs text-slate-500">
              If you&apos;d like a different last day, pick it here.
              {requestedLwd && <> <button type="button" onClick={() => setRequestedLwd('')} className="cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-indigo-600 hover:underline">Clear</button></>}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          HR decides your final last working day: the system date, your requested date, or another date. If you stop working before it without HR&apos;s approval, your Full &amp; Final settlement pays no salary or other dues, and one month&apos;s salary is recovered from you.
        </div>
      </div>

      <div className={groupCls}>
        <h4 className={groupTitle}>Staying in touch</h4>
        <label className={labelCls} htmlFor="exit-email">Personal email *</label>
        <input id="exit-email" type="email" className={inputCls} placeholder="you@gmail.com" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} />
        <p className="mb-0 mt-1.5 text-xs text-slate-500">Your company email is switched off after you leave — updates, your settlement and your relieving and experience letters are sent here.</p>
      </div>

      <div className={groupCls}>
        <h4 className={groupTitle}>Handover <span className="font-normal text-slate-400">(optional — you can add this later)</span></h4>
        <textarea id="exit-handover" rows={4} maxLength={5000} className={inputCls} placeholder="Ongoing work, where files live, who should take over…" value={handoverNotes} onChange={(e) => setHandoverNotes(e.target.value)} />
      </div>

      {error && <div className="mt-5 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
      <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
        <button type="submit" disabled={saving}
          className="cursor-pointer rounded-lg border-0 bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Submitting…' : 'Submit resignation'}
        </button>
      </div>
    </form>
  );
}

function BeforeYouResignCard({ view }: { view: MyExitView }) {
  const items = [
    `Your notice period is ${view.noticeDays} days from the day you resign — that day is your resignation date (system).`,
    'You can request a different last day; HR decides the final date.',
    'Leaving before the final date without HR\'s approval: no salary or dues in your F&F, and 1 month\'s salary is recovered from you.',
    'HR reviews your resignation and confirms your last working day by email.',
    'You can withdraw it any time before HR accepts it.',
    'During notice: hand over your work and return company items.',
    'After you leave: your Full & Final settlement and letters are sent to your personal email and shown here.',
  ];
  return (
    <div className={cardCls}>
      <h3 className={sectionTitleCls}>Before you resign</h3>
      <ul className="m-0 mt-4 list-none flex flex-col gap-3 p-0">
        {items.map((t, i) => (
          <li key={i} className="flex gap-3 text-sm text-slate-700">
            <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-indigo-50 text-indigo-700"><CheckIcon /></span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ExitWidget({ apiBase, getHeaders, user = null }: ExitWidgetProps) {
  const [view, setView] = useState<MyExitView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiBase, { headers: getHeaders() });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) { setError(body?.error || 'Could not load your exit details.'); return; }
      setView(body.data as MyExitView);
      setError(null);
    } catch {
      setError('Could not load your exit details.');
    }
  }, [apiBase, getHeaders]);

  useEffect(() => { load(); }, [load]);

  async function withdraw() {
    if (busy || !confirm('Withdraw your resignation?')) return;
    setBusy(true);
    try {
      const res = await fetch(apiBase + '/withdraw', { method: 'POST', headers: getHeaders() });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) alert(body?.error || 'Could not withdraw your resignation.');
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className={`${cardCls} mt-6 text-sm text-red-700`}>{error}</div>;
  if (!view) return <div className={`${cardCls} mt-6 text-sm text-slate-500`}>Loading…</div>;
  if (!view.linked) {
    return <div className={`${cardCls} mt-6 text-sm text-slate-600`}>Your login isn&apos;t linked to an employee record yet. Please contact HR.</div>;
  }

  const past = view.history.filter((c) => c.id !== view.current?.id);
  const earlier = past.length > 0 && (
    <div className={cardCls}>
      <h3 className={sectionTitleCls}>Earlier requests</h3>
      <ul className="m-0 mt-3 list-none divide-y divide-slate-100 p-0">
        {past.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
            <span className="text-slate-700">{formatDate(c.resignationDate)} · {c.reasonCategory || c.exitType}</span>
            <StatusPill status={c.status} />
          </li>
        ))}
      </ul>
    </div>
  );

  if (!view.current) {
    if (view.alumni) return <div className={`${cardCls} mt-6 text-sm text-slate-600`}>There is nothing to show here yet. Please contact HR.</div>;
    return (
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ResignForm view={view} apiBase={apiBase} getHeaders={getHeaders} onDone={load} />
          {earlier}
        </div>
        <div className="flex flex-col gap-6"><BeforeYouResignCard view={view} /><HelpCard /></div>
      </div>
    );
  }

  // Layout uses flex + gap, not space-y: Tailwind v4 puts space-y in :where() (zero specificity), so
  // globals.css's bare-element margin reset would flatten it.
  const c = view.current;
  return (
    <div className="mt-6 flex flex-col gap-6">
      <StatusHeader c={c} alumni={view.alumni} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DetailsCard c={c} />
          {!view.alumni && (c.status === 'pending' || c.status === 'accepted') && (
            <HandoverNotes key={c.id} c={c} apiBase={apiBase} getHeaders={getHeaders} onSaved={load} />
          )}
          {c.fnf && <SettlementCard c={c} employee={user} />}
          {c.letters && <LettersCard c={c} apiBase={apiBase} getHeaders={getHeaders} />}
          <ClearanceList items={view.clearance} />
          {earlier}
        </div>
        <div className="flex flex-col gap-6">
          <ActionsCard c={c} alumni={view.alumni} onWithdraw={withdraw} busy={busy} />
          <NextStepsCard c={c} />
          <HelpCard />
        </div>
      </div>
    </div>
  );
}
