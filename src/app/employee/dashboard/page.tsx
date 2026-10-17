'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarCheck, CalendarDays, UserPlus } from 'lucide-react';
import type { ComponentType } from 'react';
import AttendanceWidget from '@/components/admin/AttendanceWidget';
import { getEmployeeAuthHeaders, getEmployeeUser } from '@/lib/employee-auth';
import type { EmployeeCycleLedger, LedgerTotals } from '@/modules/hr-tool/utils/day-ledger';
import { FINISHED_LEAD_STATUSES, type AssignedLead } from '@/modules/lead-assignments/domain/types';

type Ledger = Pick<EmployeeCycleLedger, 'periodFrom' | 'periodTo' | 'leave'> & { totals: LedgerTotals };
interface LeaveOverview { leaveRequests?: { status: string }[] }

/** Tile colours — the same per-status palette as the pay-cycle tiles on Attendance (AttendanceCycleSummary). */
const TONE = {
  neutral: 'border-slate-200 bg-white text-slate-900',
  present: 'border-green-200 bg-green-50 text-green-900',
  halfDay: 'border-orange-200 bg-orange-50 text-orange-900',
  shortLeave: 'border-amber-200 bg-amber-50 text-amber-900',
  absent: 'border-red-200 bg-red-50 text-red-900',
  leave: 'border-blue-200 bg-blue-50 text-blue-900',
  pending: 'border-yellow-200 bg-yellow-50 text-yellow-900',
  info: 'border-indigo-200 bg-indigo-50 text-indigo-900',
};

const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** GET an employee endpoint's `data`; null on any failure, so one broken source doesn't blank the page. */
async function getData<T>(url: string): Promise<T | null> {
  try {
    const json = await (await fetch(url, { headers: getEmployeeAuthHeaders() })).json();
    return json?.success ? (json.data as T) : null;
  } catch {
    return null;
  }
}

function Kpi({ label, value, sub, tone = TONE.neutral, href }: { label: string; value: string | number; sub?: string; tone?: string; href?: string }) {
  // The text colour sits on an inner div: legacy style.css's `a:visited { color: #E62E69 }` would
  // otherwise turn a visited tile pink (the colour is inherited from the <a>).
  const textTone = tone.split(' ').filter((c) => c.startsWith('text-')).join(' ');
  const body = (
    <div className={textTone}>
      <div className="text-[0.7rem] font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums leading-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs opacity-75">{sub}</div>}
    </div>
  );
  const cls = `block min-w-0 rounded-xl border border-solid p-3 no-underline sm:p-4 ${tone}`;
  return href ? <Link href={href} className={`${cls} transition hover:shadow-md`}>{body}</Link> : <div className={cls}>{body}</div>;
}

function Section({ title, subtitle, icon: Icon, href, linkLabel, children }: {
  title: string; subtitle?: string; icon: ComponentType<{ size?: number; color?: string }>; href: string; linkLabel: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-solid border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
            <Icon size={18} color="#4f46e5" />
          </div>
          <div className="min-w-0">
            <h3 className="m-0 text-base font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="m-0 truncate text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-indigo-600 no-underline visited:text-indigo-600 hover:text-indigo-700">
          {linkLabel} <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      {children}
    </section>
  );
}

function Skeleton() {
  return <div className="h-24 animate-pulse rounded-xl bg-slate-100" />;
}

/** Employee home: today's punch card (mark attendance right here) and KPI cards for this pay cycle's
 * attendance, leave balances / pending requests, and My Leads. Each source loads on its own. */
export default function EmployeeDashboardPage() {
  const user = getEmployeeUser();
  const [ledger, setLedger] = useState<Ledger | null | undefined>(undefined);
  const [leave, setLeave] = useState<LeaveOverview | null | undefined>(undefined);
  const [leads, setLeads] = useState<AssignedLead[] | null | undefined>(undefined);

  useEffect(() => {
    getData<Ledger>('/api/employee/attendance/ledger').then(setLedger);
    getData<LeaveOverview>('/api/employee/leave-requests').then(setLeave);
    getData<AssignedLead[]>('/api/employee/leads').then(setLeads);
  }, []);

  const t = ledger?.totals;
  const pendingLeave = (leave?.leaveRequests ?? []).filter((r) => r.status === 'pending').length;

  const today = localToday();
  const leadList = leads ?? [];
  const openLeads = leadList.filter((l) => !FINISHED_LEAD_STATUSES.includes(l.status));
  const notContacted = openLeads.filter((l) => l.followUpCount === 0).length;
  const dueToday = openLeads.filter((l) => l.nextFollowUpDate === today).length;
  const overdue = openLeads.filter((l) => l.nextFollowUpDate && l.nextFollowUpDate < today).length;
  const confirmed = leadList.filter((l) => l.status === 'confirmed').length;
  const newReplies = leadList.reduce((n, l) => n + (l.unreadReplies || 0), 0);

  return (
    <div>
      <div className="mb-4 md:mb-6">
        <h2 className="m-0 text-xl font-bold tracking-tight text-slate-900 md:text-[2rem]">
          {greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h2>
        <p className="m-0 mt-1 text-sm text-slate-500 md:mt-2 md:text-base">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Phones: the punch card comes first — it's what staff open the panel for every morning. */}
        <div className="lg:order-2 lg:col-span-1">
          <AttendanceWidget apiBase="/api/employee/attendance" getHeaders={getEmployeeAuthHeaders} todayOnly />
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:order-1 lg:col-span-2 lg:gap-6">
          <Section
            title="Attendance"
            subtitle={ledger ? `This pay cycle · ${fmtDate(ledger.periodFrom)} – ${fmtDate(ledger.periodTo)}` : 'This pay cycle'}
            icon={CalendarCheck}
            href="/employee/attendance"
            linkLabel="Details"
          >
            {ledger === undefined ? <Skeleton /> : !t ? (
              <p className="m-0 text-sm text-slate-500">Attendance isn&apos;t available yet — ask HR to link your Employee ID.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
                <Kpi label="Present" value={fmtNum(t.presentDays)} sub={`of ${t.workingDays - t.futureDays} working days so far`} tone={TONE.present} />
                <Kpi label="Absent" value={t.absentDays} tone={TONE.absent} />
                <Kpi label="Half days" value={t.halfDayDays} tone={TONE.halfDay} />
                <Kpi label="Short leaves" value={t.shortLeaveDays} tone={TONE.shortLeave} />
                <Kpi label="On leave" value={fmtNum(t.leaveDays)} sub={t.unpaidLeaveDays ? `${fmtNum(t.unpaidLeaveDays)} unpaid` : undefined} tone={TONE.leave} />
              </div>
            )}
          </Section>

          <Section title="Leave" subtitle="Balance left today" icon={CalendarDays} href="/employee/leave" linkLabel="Apply leave">
            {ledger === undefined || leave === undefined ? <Skeleton /> : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                {(ledger?.leave ?? []).map((l) => (
                  <Kpi key={l.type} label={`${l.type} leave`} value={fmtNum(l.available)} sub="days available" tone={TONE.leave} />
                ))}
                <Kpi label="Pending requests" value={pendingLeave} sub={pendingLeave ? 'waiting for approval' : 'nothing waiting'} tone={pendingLeave ? TONE.pending : TONE.neutral} href="/employee/leave" />
              </div>
            )}
          </Section>

          <Section title="My Leads" subtitle={leads ? `${leadList.length} leads · ${openLeads.length} open` : undefined} icon={UserPlus} href="/employee/leads" linkLabel="Open My Leads">
            {leads === undefined ? <Skeleton /> : leads === null ? (
              <p className="m-0 text-sm text-slate-500">Couldn&apos;t load your leads. Open My Leads to try again.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <Kpi label="Not contacted" value={notContacted} sub="open, no follow-up yet" tone={notContacted ? TONE.pending : TONE.neutral} href="/employee/leads" />
                <Kpi label="Follow-up today" value={dueToday} tone={dueToday ? TONE.info : TONE.neutral} href="/employee/leads" />
                <Kpi label="Overdue" value={overdue} sub="follow-up date passed" tone={overdue ? TONE.absent : TONE.neutral} href="/employee/leads" />
                <Kpi label="Open leads" value={openLeads.length} href="/employee/leads" />
                <Kpi label="Confirmed" value={confirmed} tone={confirmed ? TONE.present : TONE.neutral} href="/employee/leads" />
                <Kpi label="New replies" value={newReplies} sub="from admin" tone={newReplies ? TONE.info : TONE.neutral} href="/employee/leads" />
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
