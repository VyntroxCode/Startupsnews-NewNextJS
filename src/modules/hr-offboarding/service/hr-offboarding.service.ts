import { HrToolRepository } from '@/modules/hr-tool/repository/hr-tool.repository';
import type { HrEmployee } from '@/modules/hr-tool/domain/types';
import { addDaysUTC, nowMysqlDatetime, payrollMonthKeyForDate, payrollPeriodRange, shiftMonthKey, todayStr } from '@/modules/hr-tool/utils/time';
import { HrToolService } from '@/modules/hr-tool/service/hr-tool.service';
import { LeadAssignmentsRepository } from '@/modules/lead-assignments/repository/lead-assignments.repository';
import { LeadAssignmentsService, LeadAssignmentValidationError } from '@/modules/lead-assignments/service/lead-assignments.service';
import { generatePlainLetterPdf } from '@/components/admin/hr-tool/joiningLetterPdf';
import { hrOpsInbox, mailBody, sendHrMail } from '@/lib/hr-mailer';
import { letterheadLogo } from '@/lib/letterhead-logo';
import { HrOffboardingRepository, OpenCaseExistsError } from '../repository/hr-offboarding.repository';
import { LETTER_TEMPLATE_NAME, LETTER_TITLE, buildLetterText, isLetterType, type LetterType } from '../utils/letters';
import {
  CLEARANCE_CATEGORIES, CLEARANCE_CATEGORY_LABEL, CLEARANCE_STATUSES, DEDUCTIBLE_CATEGORIES, FNF_LIMITS, OFFBOARDING_LIMITS, fnfForEmployee,
  lettersForEmployee, type OffboardingLetterRecord,
  OPEN_OFFBOARDING_STATUSES, RESIGNATION_REASONS, WORKABLE_OFFBOARDING_STATUSES,
  type ClearanceCategory, type ClearanceStatus, type MyExitView, type OffboardingAccessMode, type OffboardingCase,
  type OffboardingCaseDetail, type OffboardingClearanceItem, type OffboardingFnf, type OffboardingFnfLine, type OffboardingSettings,
  type OffboardingStatus, type TerminationMode,
} from '../domain/types';

export type OffboardingResult<T = OffboardingCase> = { ok: true; data: T } | { ok: false; error: string; status?: number };

/** What a login may still do: everything (still employed / serving notice), only "My Exit"
 * (the LWD has passed), or nothing at all. */
export type PortalAccess = 'full' | 'alumni' | 'blocked';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** A last working day further out than this is almost certainly a typo (e.g. 2062 for 2026). */
const MAX_LWD_AHEAD_DAYS = 365;
/** Salary cycles one F&F prices (notice start → LWD); a year's notice spans at most 14. */
const FNF_MAX_SALARY_CYCLES = 14;
const MAX_NOTICE_DAYS = 180;
const CONFLICT = 'This exit was just changed by someone else. Refresh and try again.';

const fail = (error: string, status = 400): { ok: false; error: string; status: number } => ({ ok: false, error, status });
const clean = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const nonNegativeInt = (v: unknown): number => Math.max(0, Math.round(Number(v) || 0));

/** A YYYY-MM-DD that is an actual calendar date (rejects 2026-02-30, which Date would roll over). */
function isRealDate(d: string | null): d is string {
  if (!d || !DATE_RE.test(d)) return false;
  const t = new Date(d + 'T00:00:00Z');
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
}

/** Returns an error message when `value` is longer than `max`, else null. */
function tooLong(label: string, value: string | null, max: number): string | null {
  return value && value.length > max ? `${label} is too long (max ${max} characters).` : null;
}

/** Whether a case's employee is already past their last working day. An `exited`/`completed`
 * case always is; an `accepted` one is once today is after the approved LWD — so access is right
 * even before applyDueExits has flipped the row. */
export function isPastLwd(c: OffboardingCase, today = todayStr()): boolean {
  if (c.status === 'exited' || c.status === 'completed') return true;
  return c.status === 'accepted' && !!c.approvedLwd && c.approvedLwd < today;
}

function fnfTotals(lines: OffboardingFnfLine[]): { lines: OffboardingFnfLine[]; earnings: number; deductions: number; net: number } {
  const earnings = lines.filter((l) => l.kind === 'earning').reduce((n, l) => n + l.amount, 0);
  const deductions = lines.filter((l) => l.kind === 'deduction').reduce((n, l) => n + l.amount, 0);
  return { lines, earnings, deductions, net: earnings - deductions };
}
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from.slice(0, 10) + 'T00:00:00Z')) / 86_400_000);
}
function shortDate(d: string): string {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function isMissingTableError(e: unknown): boolean {
  const err = e as { code?: string; errno?: number } | null;
  return err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146;
}
function isMissingColumnError(e: unknown): boolean {
  const err = e as { code?: string; errno?: number } | null;
  return err?.code === 'ER_BAD_FIELD_ERROR' || err?.errno === 1054;
}

export interface ResignInput { reasonCategory?: string; reasonText?: string; requestedLwd?: string; personalEmail?: string; handoverNotes?: string; }
export interface StartExitInput extends ResignInput {
  employeeId?: string;
  exitType?: string;
  terminationMode?: string;
  approvedLwd?: string;
  accessMode?: string;
  noticeWaivedDays?: number;
  note?: string;
}
export interface DecideInput { decision?: string; approvedLwd?: string; noticeDays?: number; noticeWaivedDays?: number; note?: string; accessMode?: string; }
export interface FnfInput { version?: number; lines?: unknown; paidOn?: string; reference?: string; }
export interface ClearanceInput { itemId?: number; status?: string; note?: string; deductionAmount?: number; category?: string; item?: string; }

export class HrOffboardingService {
  private static lastDueExitRun = 0;
  private static dueExitInFlight: Promise<void> | null = null;

  constructor(
    private readonly repository: HrOffboardingRepository = new HrOffboardingRepository(),
    private readonly hrRepository: HrToolRepository = new HrToolRepository(),
    private readonly leads: LeadAssignmentsService = new LeadAssignmentsService(new LeadAssignmentsRepository()),
    private readonly hrTool: HrToolService = new HrToolService(hrRepository),
  ) {}

  // --- Settings ---
  getSettings(): Promise<OffboardingSettings> { return this.repository.findSettings(); }

  async saveSettings(input: Partial<OffboardingSettings>, actor: string): Promise<OffboardingResult<OffboardingSettings>> {
    const current = await this.repository.findSettings();
    const checklist = { ...current.checklist };
    if (input.checklist && typeof input.checklist === 'object') {
      for (const cat of CLEARANCE_CATEGORIES) {
        const list = (input.checklist as Record<string, unknown>)[cat];
        if (!Array.isArray(list)) continue;
        const items = [...new Set(list.map((x) => String(x).trim()).filter(Boolean))];
        if (items.some((i) => i.length > OFFBOARDING_LIMITS.itemLength)) return fail(`A checklist item is too long (max ${OFFBOARDING_LIMITS.itemLength} characters).`);
        if (items.length > 30) return fail(`${CLEARANCE_CATEGORY_LABEL[cat]} can have at most 30 items.`);
        checklist[cat] = items;
      }
    }
    if (CLEARANCE_CATEGORIES.every((cat) => checklist[cat].length === 0)) return fail('The checklist needs at least one item.');
    const next: OffboardingSettings = {
      noticeDaysProbation: input.noticeDaysProbation === undefined ? current.noticeDaysProbation : nonNegativeInt(input.noticeDaysProbation),
      noticeDaysConfirmed: input.noticeDaysConfirmed === undefined ? current.noticeDaysConfirmed : nonNegativeInt(input.noticeDaysConfirmed),
      checklist,
      encashableLeaveTypes: Array.isArray(input.encashableLeaveTypes)
        ? [...new Set(input.encashableLeaveTypes.map((x) => String(x).trim()).filter(Boolean))]
        : current.encashableLeaveTypes,
    };
    if (next.noticeDaysProbation > MAX_NOTICE_DAYS || next.noticeDaysConfirmed > MAX_NOTICE_DAYS) return fail(`Notice period cannot be more than ${MAX_NOTICE_DAYS} days.`);
    await this.repository.saveSettings(next, actor);
    await this.audit(actor, `Updated offboarding settings (notice: ${next.noticeDaysProbation}d probation / ${next.noticeDaysConfirmed}d confirmed)`);
    return { ok: true, data: next };
  }

  /** Probation employees serve the shorter notice; everyone else the confirmed one. */
  noticeDaysFor(employee: Pick<HrEmployee, 'status'>, settings: OffboardingSettings): number {
    return employee.status === 'probation' ? settings.noticeDaysProbation : settings.noticeDaysConfirmed;
  }

  // --- Reads ---
  async listCases(): Promise<{ cases: OffboardingCase[]; clearance: OffboardingClearanceItem[]; settings: OffboardingSettings }> {
    await this.applyDueExits();
    const [cases, clearance, settings] = await Promise.all([
      this.repository.findAll(), this.repository.findAllClearance(), this.repository.findSettings(),
    ]);
    // Self-heal: a case accepted while the checklist seed failed (DB hiccup) gets it now. A checklist
    // can't be emptied by hand (removeClearanceItem keeps the last item), so zero items means "never seeded".
    const seeded = new Set(clearance.map((i) => i.offboardingId));
    const unseeded = cases.filter((c) => WORKABLE_OFFBOARDING_STATUSES.includes(c.status) && !seeded.has(c.id));
    if (unseeded.length) {
      for (const c of unseeded) await this.seedClearance(c.id, settings);
      return { cases, clearance: await this.repository.findAllClearance(), settings };
    }
    return { cases, clearance, settings };
  }

  async getCaseDetail(id: number): Promise<OffboardingResult<OffboardingCaseDetail>> {
    await this.applyDueExits();
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    const [clearance, leads, leadTargets] = await Promise.all([
      this.repository.findClearance(id),
      c.credentialId != null ? this.leads.countForEmployee(c.credentialId) : Promise.resolve({ total: 0, lead: 0, ens: 0 }),
      this.leadTargets(c),
    ]);
    return { ok: true, data: { case: c, clearance, leads, leadTargets } };
  }

  /** The Directory record behind an Employee ID login (same resolution every self-service route uses). */
  async employeeForCredential(credentialId: number, name: string): Promise<HrEmployee | null> {
    await this.hrRepository.backfillMissingEmployeeIds();
    return this.hrRepository.findEmployeeByCredential(credentialId, name);
  }

  async getMyExit(employee: HrEmployee | null, credentialId: number): Promise<MyExitView> {
    await this.applyDueExits();
    const settings = await this.repository.findSettings();
    const today = todayStr();
    if (!employee) {
      return { linked: false, alumni: false, current: null, clearance: [], history: [], noticeDays: 0, suggestedLwd: today, reasons: RESIGNATION_REASONS };
    }
    // A termination HR started and then cancelled never took effect — it (and its internal reason)
    // isn't the employee's to see.
    const history = (await this.repository.findForEmployee(employee.id))
      .filter((c) => !(c.exitType === 'termination' && c.status === 'cancelled'));
    const current = history.find((c) => OPEN_OFFBOARDING_STATUSES.includes(c.status) || c.status === 'completed') || null;
    const noticeDays = this.noticeDaysFor(employee, settings);
    const forEmployee = (x: OffboardingCase): OffboardingCase => ({ ...x, fnf: fnfForEmployee(x.fnf), letters: lettersForEmployee(x.letters) });
    return {
      linked: true,
      alumni: (await this.accessForCredential(credentialId)) === 'alumni',
      current: current ? forEmployee(current) : null,
      clearance: current && current.status !== 'pending' ? await this.repository.findClearance(current.id) : [],
      history: history.map(forEmployee),
      noticeDays,
      suggestedLwd: addDaysUTC(today, noticeDays),
      reasons: RESIGNATION_REASONS,
    };
  }

  /** Portal access for an Employee ID login, decided only by hr_offboarding. Falls back to 'full'
   * only when the table itself is missing (add-hr-offboarding.sql not run yet) — the behaviour
   * before offboarding existed — so an unmigrated database doesn't lock every employee out. */
  async accessForCredential(credentialId: number): Promise<PortalAccess> {
    let c: OffboardingCase | null;
    try {
      c = await this.repository.findDecidedForCredential(credentialId);
    } catch (e) {
      if (isMissingTableError(e)) return 'full';
      throw e;
    }
    if (!c || !isPastLwd(c)) return 'full';
    return c.accessMode === 'blocked' ? 'blocked' : 'alumni';
  }

  // --- Employee actions ---
  async resign(employee: HrEmployee, credentialId: number | null, input: ResignInput): Promise<OffboardingResult> {
    if (employee.status === 'exited') return fail('You have already exited.');
    if (await this.findOpenCase(employee.id)) return fail('You already have a resignation in progress.', 409);
    const reasonCategory = clean(input.reasonCategory);
    if (!reasonCategory || !(RESIGNATION_REASONS as readonly string[]).includes(reasonCategory)) return fail('Please pick a reason from the list.');
    const personalEmail = clean(input.personalEmail);
    if (!personalEmail || !EMAIL_RE.test(personalEmail) || personalEmail.length > 255) {
      return fail('Please enter a valid personal email — your letters are sent there after you leave.');
    }
    const reasonText = clean(input.reasonText);
    const handoverNotes = clean(input.handoverNotes);
    const lengthError = tooLong('Details', reasonText, OFFBOARDING_LIMITS.reasonLength) || tooLong('Handover notes', handoverNotes, OFFBOARDING_LIMITS.handoverLength);
    if (lengthError) return fail(lengthError);
    const today = todayStr();
    const requestedLwd = clean(input.requestedLwd);
    if (requestedLwd && (!isRealDate(requestedLwd) || requestedLwd < today)) return fail('Preferred last working day must be a valid date, today or later.');
    if (requestedLwd && requestedLwd > addDaysUTC(today, MAX_LWD_AHEAD_DAYS)) return fail('Preferred last working day is too far ahead — please check the year.');

    const settings = await this.repository.findSettings();
    try {
      const created = await this.repository.insert({
        employeeId: employee.id, credentialId: credentialId ?? employee.credentialId ?? null, emp: employee.name,
        exitType: 'resignation', initiatedBy: 'employee', status: 'pending', resignationDate: today,
        reasonCategory, reasonText, requestedLwd,
        noticeDays: this.noticeDaysFor(employee, settings), noticeWaivedDays: 0, approvedLwd: null,
        terminationMode: null, accessMode: 'alumni', personalEmail, handoverNotes,
        decidedBy: null, decidedAt: null, decisionNote: null,
      });
      await this.audit(employee.name, `Submitted resignation (reason: ${reasonCategory})`);
      this.notify(hrOpsInbox(), `Resignation received — ${employee.name}`, [
        `${employee.name} (${employee.designation || 'no designation'}) has submitted their resignation.`,
        `Reason: ${reasonCategory}${requestedLwd ? `\nPreferred last working day: ${shortDate(requestedLwd)}` : ''}`,
        'Review it in HR Management → Offboarding.',
      ]);
      this.notify(personalEmail, 'We have received your resignation', [
        `Dear ${employee.name},`,
        'HR has received your resignation and will confirm your last working day shortly. You can follow its progress on the My Exit page of the employee portal.',
        'Regards,\nHR',
      ]);
      return { ok: true, data: created };
    } catch (e) {
      if (e instanceof OpenCaseExistsError) return fail('You already have a resignation in progress.', 409);
      throw e;
    }
  }

  async withdraw(employee: HrEmployee): Promise<OffboardingResult> {
    const open = await this.findOpenCase(employee.id);
    if (!open || open.status !== 'pending') return fail('Only a resignation that has not been accepted yet can be withdrawn.', 409);
    if (!(await this.repository.transition(open.id, ['pending'], { status: 'withdrawn' }))) {
      return fail('HR has just acted on your resignation. Refresh to see the latest.', 409);
    }
    await this.audit(employee.name, 'Withdrew resignation');
    return { ok: true, data: { ...open, status: 'withdrawn' } };
  }

  /** The employee keeps their handover notes up to date while pending or serving notice. */
  async updateMyHandover(employee: HrEmployee, notes: unknown): Promise<OffboardingResult> {
    const open = await this.findOpenCase(employee.id);
    if (!open || (open.status !== 'pending' && open.status !== 'accepted') || isPastLwd(open)) {
      return fail('Handover notes can only be changed before your last working day.', 409);
    }
    const handoverNotes = clean(notes);
    const lengthError = tooLong('Handover notes', handoverNotes, OFFBOARDING_LIMITS.handoverLength);
    if (lengthError) return fail(lengthError);
    await this.repository.updateCase(open.id, { handoverNotes });
    return { ok: true, data: { ...open, handoverNotes } };
  }

  // --- HR actions ---
  /** HR starts an exit: a termination, or a resignation handed in offline (recorded as already accepted). */
  async startByAdmin(input: StartExitInput, actor: string): Promise<OffboardingResult> {
    const employeeId = clean(input.employeeId);
    const employee = employeeId ? await this.hrRepository.findEmployeeById(employeeId) : null;
    if (!employee) return fail('Employee not found.', 404);
    if (employee.status === 'exited') return fail(`${employee.name} has already exited.`);
    if (employee.sysRole === 'Founder') return fail('The Founder record cannot be offboarded.');
    if (await this.findOpenCase(employee.id)) return fail(`${employee.name} already has an exit in progress — open it from the list instead.`, 409);

    const exitType = input.exitType === 'termination' ? 'termination' : input.exitType === 'resignation' ? 'resignation' : null;
    if (!exitType) return fail('Pick an exit type.');
    const reasonCategory = clean(input.reasonCategory);
    if (!reasonCategory || reasonCategory.length > 100) return fail('Please give a reason.');
    const personalEmail = clean(input.personalEmail);
    if (personalEmail && (!EMAIL_RE.test(personalEmail) || personalEmail.length > 255)) return fail('Personal email is not valid.');
    const reasonText = clean(input.reasonText);
    const note = clean(input.note);
    const handoverNotes = clean(input.handoverNotes);
    const lengthError = tooLong('Details', reasonText, OFFBOARDING_LIMITS.reasonLength) || tooLong('Note', note, OFFBOARDING_LIMITS.noteLength)
      || tooLong('Handover notes', handoverNotes, OFFBOARDING_LIMITS.handoverLength);
    if (lengthError) return fail(lengthError);
    const accessMode: OffboardingAccessMode = input.accessMode === 'blocked' ? 'blocked' : 'alumni';

    const settings = await this.repository.findSettings();
    const today = todayStr();
    const noticeDays = this.noticeDaysFor(employee, settings);
    const terminationMode: TerminationMode | null = exitType === 'termination'
      ? (input.terminationMode === 'with_notice' ? 'with_notice' : 'immediate')
      : null;
    const immediate = terminationMode === 'immediate';

    const approvedLwd = immediate ? today : clean(input.approvedLwd) || addDaysUTC(today, noticeDays);
    if (!isRealDate(approvedLwd)) return fail('Last working day is not a valid date.');
    if (approvedLwd < today) return fail('Last working day cannot be in the past. For an exit that already happened, use today.');
    if (approvedLwd > addDaysUTC(today, MAX_LWD_AHEAD_DAYS)) return fail('Last working day is too far ahead — please check the year.');
    const waived = immediate ? 0 : nonNegativeInt(input.noticeWaivedDays);
    if (waived > noticeDays) return fail('Waived days cannot be more than the notice period.');

    let created: OffboardingCase;
    try {
      created = await this.repository.insert({
        employeeId: employee.id, credentialId: employee.credentialId ?? null, emp: employee.name,
        exitType, initiatedBy: 'admin', status: immediate ? 'exited' : 'accepted', resignationDate: today,
        reasonCategory, reasonText, requestedLwd: null,
        noticeDays: immediate ? 0 : noticeDays, noticeWaivedDays: waived, approvedLwd,
        terminationMode, accessMode, personalEmail, handoverNotes,
        decidedBy: actor, decidedAt: nowMysqlDatetime(), decisionNote: note,
      });
    } catch (e) {
      if (e instanceof OpenCaseExistsError) return fail(`${employee.name} already has an exit in progress — open it from the list instead.`, 409);
      throw e;
    }
    await this.seedClearanceSafely(created.id, settings);
    if (immediate) await this.applyExitSideEffects(created, actor);
    await this.audit(actor, `Started ${exitType}${terminationMode ? ` (${terminationMode.replace('_', ' ')})` : ''} for ${employee.name} — LWD ${approvedLwd}`);
    return { ok: true, data: (await this.repository.findById(created.id)) || created };
  }

  async decide(id: number, input: DecideInput, actor: string): Promise<OffboardingResult> {
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    if (c.status !== 'pending') return fail('Only a pending resignation can be accepted or rejected.', 409);
    const note = clean(input.note);
    const lengthError = tooLong('Note', note, OFFBOARDING_LIMITS.noteLength);
    if (lengthError) return fail(lengthError);

    if (input.decision === 'reject') {
      if (!note) return fail('Please add a note explaining the rejection.');
      if (!(await this.repository.transition(id, ['pending'], { status: 'rejected', decidedBy: actor, decidedAt: nowMysqlDatetime(), decisionNote: note }))) {
        return fail(CONFLICT, 409);
      }
      await this.audit(actor, `Rejected resignation of ${c.emp}`);
      this.notify(c.personalEmail, 'Update on your resignation', [
        `Dear ${c.emp},`, `HR has not accepted your resignation at this time. Note from HR: ${note}`, 'Please speak to HR if you have questions.\n\nRegards,\nHR',
      ]);
      return { ok: true, data: (await this.repository.findById(id))! };
    }
    if (input.decision !== 'accept') return fail('Decision must be accept or reject.');

    const today = todayStr();
    const noticeDays = input.noticeDays === undefined ? c.noticeDays : nonNegativeInt(input.noticeDays);
    if (noticeDays > MAX_NOTICE_DAYS) return fail(`Notice period cannot be more than ${MAX_NOTICE_DAYS} days.`);
    const waived = nonNegativeInt(input.noticeWaivedDays);
    if (waived > noticeDays) return fail('Waived days cannot be more than the notice period.');
    const approvedLwd = clean(input.approvedLwd) || c.requestedLwd || addDaysUTC(c.resignationDate, noticeDays);
    if (!isRealDate(approvedLwd) || approvedLwd < today) return fail('Last working day must be a valid date, today or later.');
    if (approvedLwd > addDaysUTC(today, MAX_LWD_AHEAD_DAYS)) return fail('Last working day is too far ahead — please check the year.');
    const accessMode: OffboardingAccessMode = input.accessMode === 'blocked' ? 'blocked' : 'alumni';

    const ok = await this.repository.transition(id, ['pending'], {
      status: 'accepted', noticeDays, noticeWaivedDays: waived, approvedLwd, accessMode,
      decidedBy: actor, decidedAt: nowMysqlDatetime(), decisionNote: note,
    });
    if (!ok) return fail('The employee withdrew or someone else already decided this resignation. Refresh to see the latest.', 409);
    await this.seedClearanceSafely(id, await this.repository.findSettings());
    await this.audit(actor, `Accepted resignation of ${c.emp} — LWD ${approvedLwd}`);
    this.notify(c.personalEmail, 'Your resignation has been accepted', [
      `Dear ${c.emp},`,
      `Your resignation has been accepted. Your last working day is ${shortDate(approvedLwd)}.${waived ? ` ${waived} day(s) of your notice period have been waived.` : ''}`,
      'Please return all company items and complete your handover before then. You can see your clearance checklist on the My Exit page of the employee portal.',
      'Regards,\nHR',
    ]);
    return { ok: true, data: (await this.repository.findById(id))! };
  }

  /** Reverts an accepted exit before the employee has left (e.g. they were retained). */
  async cancel(id: number, note: unknown, actor: string): Promise<OffboardingResult> {
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    if (c.status !== 'accepted' || isPastLwd(c)) return fail('Only an exit whose last working day has not passed yet can be cancelled. For someone who already left, use Reinstate.', 409);
    const cleanNote = clean(note);
    const lengthError = tooLong('Note', cleanNote, OFFBOARDING_LIMITS.noteLength);
    if (lengthError) return fail(lengthError);
    if (!(await this.repository.transition(id, ['accepted'], { status: 'cancelled', decisionNote: cleanNote || c.decisionNote }, todayStr()))) {
      return fail(CONFLICT, 409);
    }
    await this.audit(actor, `Cancelled the exit of ${c.emp}`);
    return { ok: true, data: (await this.repository.findById(id))! };
  }

  /**
   * Undo an exit that already took effect (wrong person terminated, employee retained after all).
   * Only before the case is completed. Restores the employee's status from before the exit (probation
   * or active), switches a linked Publisher/Event Admin account back on, and reopens the login.
   */
  async reinstate(id: number, note: unknown, actor: string): Promise<OffboardingResult<OffboardingCase & { restoredStatus: string }>> {
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    if (c.status !== 'exited') return fail('Only an exit that has taken effect (and isn\'t completed) can be reinstated.', 409);
    // An approved F&F pays their final salary and tells payroll to skip them for that cycle —
    // reinstating on top of it would leave them unpaid (or, once paid, settled twice).
    if (c.fnf?.status === 'paid') return fail('Their Full & Final has already been paid, so this exit can\'t be undone here.', 409);
    if (c.fnf?.status === 'approved') return fail('Reopen their Full & Final (back to draft) before reinstating.', 409);
    const cleanNote = clean(note);
    if (!cleanNote) return fail('Please add a note explaining why the employee is being reinstated.');
    const lengthError = tooLong('Note', cleanNote, OFFBOARDING_LIMITS.noteLength);
    if (lengthError) return fail(lengthError);
    if (!(await this.repository.transition(id, ['exited'], { status: 'cancelled', decisionNote: cleanNote }))) return fail(CONFLICT, 409);

    let prior: string | null = null;
    try { prior = await this.repository.findPriorEmployeeStatus(id); } catch (e) { if (!isMissingColumnError(e)) throw e; }
    const restoredStatus = prior && prior !== 'exited' ? prior : 'active';
    await this.repository.setEmployeeStatus(c.employeeId, restoredStatus);
    if (c.credentialId != null) {
      const panelAdminId = await this.repository.findLinkedPanelAdminId(c.credentialId);
      if (panelAdminId != null) await this.repository.reactivatePanelAdmin(panelAdminId);
    }
    await this.audit(actor, `Reinstated ${c.emp} (exit cancelled after it took effect): ${cleanNote}`);
    // restoredStatus lets the HR tool mirror it into its in-memory Directory — otherwise its next
    // whole-list save would write 'exited' back (and payroll would skip them).
    return { ok: true, data: { ...(await this.repository.findById(id))!, restoredStatus } };
  }

  /** Alumni (read-only "My Exit") or fully blocked, once the LWD has passed. */
  async setAccess(id: number, accessMode: unknown, actor: string): Promise<OffboardingResult> {
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    if (accessMode !== 'alumni' && accessMode !== 'blocked') return fail('Access must be alumni or blocked.');
    if (!['accepted', 'exited', 'completed'].includes(c.status)) return fail('Access can only be set on an accepted exit.', 409);
    await this.repository.updateCase(id, { accessMode });
    await this.audit(actor, `Set post-exit portal access for ${c.emp} to ${accessMode}`);
    return { ok: true, data: { ...c, accessMode } };
  }

  /** HR can also end the notice early — the LWD becomes today and the exit takes effect now. */
  async exitNow(id: number, actor: string): Promise<OffboardingResult> {
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    if (c.status !== 'accepted') return fail('Only an exit that is serving notice can be ended early.', 409);
    const today = todayStr();
    if (!(await this.repository.transition(id, ['accepted'], { status: 'exited', approvedLwd: today }))) return fail(CONFLICT, 409);
    const updated: OffboardingCase = { ...c, status: 'exited', approvedLwd: today };
    await this.applyExitSideEffects(updated, actor);
    await this.audit(actor, `Ended notice early for ${c.emp} — exited today`);
    return { ok: true, data: (await this.repository.findById(id)) || updated };
  }

  async setHandoverNotes(id: number, notes: unknown, actor: string): Promise<OffboardingResult> {
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    if (!['pending', 'accepted', 'exited'].includes(c.status)) return fail('This exit is closed.', 409);
    const handoverNotes = clean(notes);
    const lengthError = tooLong('Handover notes', handoverNotes, OFFBOARDING_LIMITS.handoverLength);
    if (lengthError) return fail(lengthError);
    await this.repository.updateCase(id, { handoverNotes });
    await this.audit(actor, `Updated handover notes for ${c.emp}`);
    return { ok: true, data: { ...c, handoverNotes } };
  }

  async setRehireEligible(id: number, value: unknown, actor: string): Promise<OffboardingResult> {
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    if (c.status !== 'exited' && c.status !== 'completed') return fail('Rehire eligibility is set once the employee has left.', 409);
    const rehireEligible = value === true ? true : value === false ? false : null;
    await this.repository.updateCase(id, { rehireEligible });
    await this.audit(actor, `Marked ${c.emp} as ${rehireEligible === null ? 'rehire: not decided' : rehireEligible ? 'eligible for rehire' : 'not eligible for rehire'}`);
    return { ok: true, data: { ...c, rehireEligible } };
  }

  // --- Clearance checklist ---
  async updateClearanceItem(id: number, input: ClearanceInput, actor: string): Promise<OffboardingResult<OffboardingClearanceItem[]>> {
    const guard = await this.clearanceEditableCase(id);
    if (!guard.ok) return guard;
    const itemId = Number(input.itemId);
    const item = Number.isInteger(itemId) && itemId > 0 ? await this.repository.findClearanceItem(id, itemId) : null;
    if (!item) return fail('That checklist item no longer exists. Refresh and try again.', 404);

    const status = input.status as ClearanceStatus;
    if (!CLEARANCE_STATUSES.includes(status)) return fail('Status must be pending, done or N/A.');
    const note = clean(input.note);
    const lengthError = tooLong('Note', note, OFFBOARDING_LIMITS.noteLength);
    if (lengthError) return fail(lengthError);
    const rawAmount = input.deductionAmount === undefined || input.deductionAmount === null ? 0 : Number(input.deductionAmount);
    if (!Number.isFinite(rawAmount) || rawAmount < 0 || rawAmount > OFFBOARDING_LIMITS.maxDeduction || !Number.isInteger(rawAmount)) {
      return fail(`Deduction must be a whole rupee amount between 0 and ${OFFBOARDING_LIMITS.maxDeduction.toLocaleString('en-IN')}.`);
    }
    if (rawAmount > 0 && !DEDUCTIBLE_CATEGORIES.includes(item.category)) return fail('Only asset and finance items can carry a deduction.');
    if (rawAmount > 0 && status === 'pending') return fail('Mark the item Done (recovered through a deduction) before adding an amount.');
    if (rawAmount > 0 && !note) return fail('Add a note saying what the deduction is for.');
    if (status === 'na' && !note) return fail('Add a short note saying why this item does not apply.');

    const cleared = status !== 'pending';
    await this.repository.updateClearanceItem(id, itemId, {
      status, note, deductionAmount: rawAmount,
      doneBy: cleared ? actor : null, doneAt: cleared ? nowMysqlDatetime() : null,
    });
    await this.audit(actor, `Clearance for ${guard.data.emp}: "${item.item}" → ${status}${rawAmount ? ` (deduction ₹${rawAmount})` : ''}`);
    return { ok: true, data: await this.repository.findClearance(id) };
  }

  async addClearanceItem(id: number, input: ClearanceInput, actor: string): Promise<OffboardingResult<OffboardingClearanceItem[]>> {
    const guard = await this.clearanceEditableCase(id);
    if (!guard.ok) return guard;
    const category = input.category as ClearanceCategory;
    if (!CLEARANCE_CATEGORIES.includes(category)) return fail('Pick a checklist section.');
    const item = clean(input.item);
    if (!item) return fail('Type the item to add.');
    if (item.length > OFFBOARDING_LIMITS.itemLength) return fail(`Item is too long (max ${OFFBOARDING_LIMITS.itemLength} characters).`);
    if ((await this.repository.findClearance(id)).length >= OFFBOARDING_LIMITS.maxItemsPerCase) return fail('This checklist is full.');
    if (!(await this.repository.addClearanceItem(id, category, item))) return fail('That item is already on the checklist.', 409);
    await this.audit(actor, `Clearance for ${guard.data.emp}: added "${item}"`);
    return { ok: true, data: await this.repository.findClearance(id) };
  }

  async removeClearanceItem(id: number, input: ClearanceInput, actor: string): Promise<OffboardingResult<OffboardingClearanceItem[]>> {
    const guard = await this.clearanceEditableCase(id);
    if (!guard.ok) return guard;
    const itemId = Number(input.itemId);
    const items = await this.repository.findClearance(id);
    const item = items.find((i) => i.id === itemId);
    if (!item) return fail('That checklist item no longer exists. Refresh and try again.', 404);
    if (item.status === 'done' || item.deductionAmount > 0) return fail('A completed item (or one with a deduction) can\'t be removed — set it back to Pending first.', 409);
    if (items.length <= 1) return fail('The checklist needs at least one item — mark it N/A instead.', 409);
    await this.repository.deleteClearanceItem(id, itemId);
    await this.audit(actor, `Clearance for ${guard.data.emp}: removed "${item.item}"`);
    return { ok: true, data: await this.repository.findClearance(id) };
  }

  // --- Sales leads handover ---
  /** Moves every sales lead off the leaver to one colleague (`toCredentialId`), or just removes them
   * from their leads (`null`). Ticks the "leads" handover item once nothing is left on them. */
  async handOverLeads(id: number, toCredentialId: unknown, actor: string): Promise<OffboardingResult<{ moved: number; merged: number; removed: number; remaining: number }>> {
    const guard = await this.workableCase(id);
    if (!guard.ok) return guard;
    const c = guard.data;
    if (c.credentialId == null) return fail('This employee has no login, so no leads are assigned to them.', 409);

    let target: number | null = null;
    if (toCredentialId !== null && toCredentialId !== undefined && toCredentialId !== '') {
      target = Number(toCredentialId);
      if (!Number.isInteger(target) || target <= 0) return fail('Pick one of the listed employees.');
      if (!(await this.leadTargets(c)).some((t) => t.credentialId === target)) {
        return fail('That person can\'t take these leads (not active, no department, or leaving too). Refresh and pick again.', 409);
      }
    }
    let result: { moved: number; merged: number; removed: number };
    try {
      result = await this.leads.handOverAll(c.credentialId, target, actor);
    } catch (e) {
      if (e instanceof LeadAssignmentValidationError) return fail(e.message, 409);
      throw e;
    }
    const remaining = (await this.leads.countForEmployee(c.credentialId)).total;
    if (remaining === 0) {
      const summary = target === null ? `Removed from ${result.removed} lead(s)` : `${result.moved + result.merged} lead(s) handed over`;
      await this.repository.autoTickClearance(id, 'handover', 'lead', 'done', summary, actor, nowMysqlDatetime());
    }
    await this.audit(actor, `Leads of ${c.emp}: ${result.moved} moved, ${result.merged} merged, ${result.removed} removed${target === null ? '' : ` → credential ${target}`}`);
    return { ok: true, data: { ...result, remaining } };
  }

  // --- Letters, personal email, completion ---
  private static sending = new Set<string>();

  /** Where letters and updates go after the company email is switched off. */
  async setPersonalEmail(id: number, email: unknown, actor: string): Promise<OffboardingResult> {
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    if (!OPEN_OFFBOARDING_STATUSES.includes(c.status)) return fail('This exit is closed.', 409);
    const personalEmail = clean(email);
    if (!personalEmail || !EMAIL_RE.test(personalEmail) || personalEmail.length > 255) return fail('Enter a valid personal email.');
    await this.repository.updateCase(id, { personalEmail });
    await this.audit(actor, `Updated personal email for ${c.emp}`);
    return { ok: true, data: { ...c, personalEmail } };
  }

  /**
   * Issues (or re-issues) a letter: merges the template into a text snapshot stored on the case, and
   * optionally emails it. Only after the exit, with the checklist cleared; the relieving letter also
   * needs the F&F paid. Unknown merge tags are refused rather than printed as raw {{…}}.
   */
  async issueLetter(id: number, type: unknown, send: unknown, actor: string): Promise<OffboardingResult<OffboardingCase & { mail?: string }>> {
    if (!isLetterType(type)) return fail('Unknown letter type.');
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    const blocked = await this.letterBlocker(c, type);
    if (blocked) return fail(blocked, 409);
    const built = await this.buildLetter(c, type);
    if (!built.ok) return built;

    const previous = c.letters?.[type] ?? null;
    const record: OffboardingLetterRecord = {
      text: built.data, issuedAt: nowMysqlDatetime(), issuedBy: actor, revision: (previous?.revision || 0) + 1,
      sentAt: null, sentTo: null, sendError: null,
    };
    await this.repository.updateCase(id, { letters: { ...(c.letters || {}), [type]: record } });
    await this.audit(actor, `${previous ? 'Re-issued' : 'Issued'} ${LETTER_TITLE[type]} for ${c.emp}`);
    if (send === true) {
      const sent = await this.sendLetter(id, type, actor);
      const fresh = (await this.repository.findById(id))!;
      return { ok: true, data: { ...fresh, mail: sent.ok ? 'sent' : sent.error } };
    }
    return { ok: true, data: (await this.repository.findById(id))! };
  }

  /** Emails an issued letter (PDF attached) to the personal email. Failure is recorded on the letter
   * — it stays issued and HR can resend. One send per case+letter at a time (double clicks). */
  async sendLetter(id: number, type: unknown, actor: string): Promise<OffboardingResult<OffboardingCase & { mail?: string }>> {
    if (!isLetterType(type)) return fail('Unknown letter type.');
    const lockKey = `${id}:${type}`;
    if (HrOffboardingService.sending.has(lockKey)) return fail('This letter is already being sent.', 409);
    HrOffboardingService.sending.add(lockKey);
    try {
      const c = await this.repository.findById(id);
      if (!c) return fail('Offboarding case not found.', 404);
      const letter = c.letters?.[type];
      if (!letter) return fail('Issue the letter before sending it.', 409);
      if (!c.personalEmail || !EMAIL_RE.test(c.personalEmail)) return fail('Add their personal email first — the company email is switched off after they leave.', 409);

      const pdf = await this.renderLetterPdf(letter.text);
      const title = LETTER_TITLE[type];
      const body = mailBody([`Dear ${c.emp},`, `Please find your ${title.toLowerCase()} attached.`, 'We wish you the very best.\n\nRegards,\nHR']);
      const result = await sendHrMail({
        to: c.personalEmail, subject: `Your ${title}`, ...body,
        attachments: [{ filename: `${title.replace(/\s+/g, '-')}-${c.emp.replace(/[^\w]+/g, '-')}.pdf`, content: Buffer.from(pdf), contentType: 'application/pdf' }],
      });
      // Re-read before writing so a concurrent issue of the OTHER letter isn't overwritten.
      const latest = (await this.repository.findById(id))!;
      const current = latest.letters?.[type];
      if (current && current.revision === letter.revision) {
        const updated: OffboardingLetterRecord = result.ok
          ? { ...current, sentAt: nowMysqlDatetime(), sentTo: c.personalEmail, sendError: null }
          : { ...current, sendError: result.error };
        await this.repository.updateCase(id, { letters: { ...(latest.letters || {}), [type]: updated } });
      }
      await this.audit(actor, result.ok ? `Emailed ${title} to ${c.emp} (${c.personalEmail})` : `Could not email ${title} to ${c.emp}: ${result.error}`);
      const fresh = (await this.repository.findById(id))!;
      return { ok: true, data: { ...fresh, mail: result.ok ? 'sent' : result.error } };
    } finally {
      HrOffboardingService.sending.delete(lockKey);
    }
  }

  /** PDF of an issued letter, or — with `preview` — of what issuing now would produce. */
  async letterPdf(id: number, type: unknown, preview: boolean): Promise<OffboardingResult<Uint8Array>> {
    if (!isLetterType(type)) return fail('Unknown letter type.');
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    if (preview) {
      if (!c.approvedLwd) return fail('This exit has no last working day yet.', 409);
      const built = await this.buildLetter(c, type);
      if (!built.ok) return built;
      return { ok: true, data: await this.renderLetterPdf(built.data) };
    }
    const letter = c.letters?.[type];
    if (!letter) return fail('This letter has not been issued.', 404);
    return { ok: true, data: await this.renderLetterPdf(letter.text) };
  }

  /** The employee's own issued letter (My Exit download). */
  async myLetterPdf(employee: HrEmployee, type: unknown): Promise<OffboardingResult<Uint8Array>> {
    const current = (await this.repository.findForEmployee(employee.id)).find((c) => c.status === 'exited' || c.status === 'completed');
    if (!current) return fail('No letters have been issued to you.', 404);
    return this.letterPdf(current.id, type, false);
  }

  /** Closes the exit for good: checklist cleared, F&F paid and the relieving letter issued. */
  async completeCase(id: number, actor: string): Promise<OffboardingResult> {
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    if (c.status !== 'exited') return fail(c.status === 'completed' ? 'Already completed.' : 'Only an exit that has taken effect can be completed.', 409);
    const missing: string[] = [];
    const pending = (await this.repository.findClearance(id)).filter((i) => i.status === 'pending').length;
    if (pending) missing.push(`${pending} checklist item${pending === 1 ? '' : 's'} pending`);
    if (c.fnf?.status !== 'paid') missing.push('Full & Final not marked paid');
    if (!c.letters?.relieving) missing.push('relieving letter not issued');
    if (missing.length) return fail(`Can't complete yet: ${missing.join('; ')}.`, 409);
    if (!(await this.repository.transition(id, ['exited'], { status: 'completed' }))) return fail(CONFLICT, 409);
    await this.audit(actor, `Completed the exit of ${c.emp}`);
    return { ok: true, data: (await this.repository.findById(id))! };
  }

  private async letterBlocker(c: OffboardingCase, type: LetterType): Promise<string | null> {
    if (c.status === 'completed') return 'This exit is completed and locked.';
    if (c.status !== 'exited') return 'Letters are issued after the last working day.';
    const pending = (await this.repository.findClearance(c.id)).filter((i) => i.status === 'pending').length;
    if (pending) return `Finish the clearance checklist first (${pending} item${pending === 1 ? '' : 's'} pending).`;
    if (type === 'relieving' && c.fnf?.status !== 'paid') return 'The relieving letter is issued once the Full & Final is paid.';
    return null;
  }

  private async buildLetter(c: OffboardingCase, type: LetterType): Promise<OffboardingResult<string>> {
    const employee = await this.hrRepository.findEmployeeById(c.employeeId);
    if (!employee) return fail('Their Directory record no longer exists.', 409);
    const templates = await this.hrRepository.findTemplates();
    const template = templates.find((t) => t.name === LETTER_TEMPLATE_NAME[type])?.content;
    const code = c.credentialId != null ? await this.repository.findEmployeeCode(c.credentialId) : null;
    const { text, unknownTags } = buildLetterText(type, template, {
      employeeName: employee.name, employeeCode: code || '', designation: employee.designation, team: employee.team,
      doj: employee.doj, lwd: c.approvedLwd || todayStr(), today: todayStr(),
    });
    if (unknownTags.length) {
      return fail(`The "${LETTER_TEMPLATE_NAME[type]}" template uses tags this letter can't fill: ${unknownTags.map((t) => `{{${t}}}`).join(', ')}. Fix the template in Company Profile.`, 409);
    }
    return { ok: true, data: text };
  }

  private async renderLetterPdf(text: string): Promise<Uint8Array> {
    return generatePlainLetterPdf(text, { logoBytes: await letterheadLogo(), letterhead: true });
  }

  /** Fire-and-forget notification — never delays or fails the action; a failure lands in the audit log. */
  private notify(to: string | null | undefined, subject: string, paragraphs: string[]): void {
    if (!to || !EMAIL_RE.test(to)) return;
    void sendHrMail({ to, subject, ...mailBody(paragraphs) }).then((r) => {
      if (!r.ok) void this.audit('System', `Email "${subject}" to ${to} failed: ${r.error}`);
    });
  }

  // --- Full & Final settlement ---
  /** (Re)calculates the auto lines, keeping manual lines and HR overrides. Draft only. */
  async calculateFnf(id: number, actor: string): Promise<OffboardingResult<OffboardingFnf>> {
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    if (c.status !== 'exited') return fail(c.status === 'accepted' ? 'The Full & Final is prepared after the last working day.' : 'This exit is closed.', 409);
    const current = c.fnf;
    if (current?.status === 'paid') return fail('This Full & Final has been paid and is locked.', 409);
    if (current && current.status !== 'draft') return fail('This Full & Final is already approved — reopen it to recalculate.', 409);

    const built = await this.buildFnfAutoLines(c);
    if (!built.ok) return built;
    const { lines: fresh, salaryMonth, monthlySalary, perDay } = built.data;

    const previous = new Map((current?.lines || []).filter((l) => l.source === 'auto' && l.key).map((l) => [l.key as string, l]));
    const autoLines = fresh.map((line) => {
      const prev = previous.get(line.key as string);
      return prev?.overridden ? { ...prev, computedAmount: line.amount } : line;
    });
    const manualLines = (current?.lines || []).filter((l) => l.source === 'manual');
    const next: OffboardingFnf = {
      ...fnfTotals([...autoLines, ...manualLines]),
      version: (current?.version || 0) + 1, status: 'draft', salaryMonth, monthlySalary, perDay,
      calculatedAt: nowMysqlDatetime(), calculatedBy: actor,
    };
    if (!(await this.repository.updateFnf(id, current?.version || 0, next))) return fail(CONFLICT, 409);
    await this.audit(actor, `Calculated Full & Final for ${c.emp}: net ₹${next.net}`);
    return { ok: true, data: next };
  }

  /** HR's edits to a draft: override auto amounts (note required), add/edit/remove manual lines. */
  async saveFnf(id: number, input: FnfInput, actor: string): Promise<OffboardingResult<OffboardingFnf>> {
    const loaded = await this.draftFnf(id, input.version);
    if (!loaded.ok) return loaded;
    const { c, fnf } = loaded.data;
    if (!Array.isArray(input.lines)) return fail('Lines are missing.');
    if (input.lines.length > FNF_LIMITS.maxLines) return fail(`At most ${FNF_LIMITS.maxLines} lines.`);

    const autoByKey = new Map(fnf.lines.filter((l) => l.source === 'auto' && l.key).map((l) => [l.key as string, l]));
    const seen = new Set<string>();
    const lines: OffboardingFnfLine[] = [];
    for (const raw of input.lines as Record<string, unknown>[]) {
      if (!raw || typeof raw !== 'object') return fail('A line is malformed.');
      const amount = Number(raw.amount);
      if (!Number.isInteger(amount) || amount < 0 || amount > FNF_LIMITS.maxAmount) {
        return fail(`Amounts must be whole rupees between 0 and ${FNF_LIMITS.maxAmount.toLocaleString('en-IN')}.`);
      }
      const note = clean(raw.note);
      const noteError = tooLong('A note', note, OFFBOARDING_LIMITS.noteLength);
      if (noteError) return fail(noteError);
      const key = typeof raw.key === 'string' && raw.key ? raw.key : null;
      if (key) {
        const original = autoByKey.get(key);
        if (!original) return fail('The calculated lines changed — recalculate and try again.', 409);
        if (seen.has(key)) return fail('A calculated line appears twice.');
        seen.add(key);
        const computed = original.overridden ? (original.computedAmount ?? original.amount) : original.amount;
        const overridden = amount !== computed;
        if (overridden && !note) return fail(`Add a note explaining the change to "${original.label}".`);
        lines.push({
          key, label: original.label, kind: original.kind, amount, source: 'auto',
          ...(overridden ? { overridden: true, computedAmount: computed } : {}), note: overridden ? note : null,
        });
      } else {
        const label = clean(raw.label);
        if (!label) return fail('Every added line needs a description.');
        if (label.length > FNF_LIMITS.labelLength) return fail(`A description is too long (max ${FNF_LIMITS.labelLength} characters).`);
        if (raw.kind !== 'earning' && raw.kind !== 'deduction') return fail('Each added line must be an earning or a deduction.');
        if (amount === 0) return fail(`"${label}" has no amount — remove it or enter one.`);
        lines.push({ key: null, label, kind: raw.kind, amount, source: 'manual', note });
      }
    }
    const missing = [...autoByKey.keys()].filter((k) => !seen.has(k));
    if (missing.length) return fail('Calculated lines can\'t be removed — set the amount to 0 with a note instead.');

    const next: OffboardingFnf = { ...fnf, ...fnfTotals(lines), version: fnf.version + 1 };
    if (!(await this.repository.updateFnf(id, fnf.version, next))) return fail(CONFLICT, 409);
    await this.audit(actor, `Edited Full & Final for ${c.emp}: net ₹${next.net}`);
    return { ok: true, data: next };
  }

  /** Locks the settlement. Refused while the checklist has pending items, or when the numbers it was
   * built from have changed since (clearance deductions, a payroll run for the same cycle). */
  async approveFnf(id: number, input: FnfInput, actor: string): Promise<OffboardingResult<OffboardingFnf>> {
    const loaded = await this.draftFnf(id, input.version);
    if (!loaded.ok) return loaded;
    const { c, fnf } = loaded.data;

    const clearance = await this.repository.findClearance(id);
    const pending = clearance.filter((i) => i.status === 'pending').length;
    if (pending) return fail(`Finish the clearance checklist first — ${pending} item${pending === 1 ? '' : 's'} still pending.`, 409);
    const recoveries = clearance.filter((i) => i.deductionAmount > 0);
    const lineFor = (key: string) => fnf.lines.find((l) => l.key === key);
    const staleRecovery = recoveries.some((i) => {
      const l = lineFor(`clearance:${i.id}`);
      return !l || (!l.overridden && l.amount !== i.deductionAmount);
    }) || fnf.lines.some((l) => l.key?.startsWith('clearance:') && !l.overridden && !recoveries.some((i) => `clearance:${i.id}` === l.key));
    if (staleRecovery) return fail('Checklist recoveries changed after this was calculated — click Recalculate, check, then approve.', 409);

    for (const line of fnf.lines) {
      const month = line.key === 'salary' ? fnf.salaryMonth : line.key?.startsWith('salary:') ? line.key.slice('salary:'.length) : null;
      if (!month || line.overridden || line.amount <= 0) continue;
      if (await this.hrRepository.findPayrollEntryForEmployee(month, c.employeeId)) {
        return fail('Payroll for one of these cycles was run after the F&F was calculated, so that salary is already paid — click Recalculate.', 409);
      }
    }
    if (!fnf.lines.length) return fail('The settlement has no lines.');

    const next: OffboardingFnf = { ...fnf, version: fnf.version + 1, status: 'approved', approvedAt: nowMysqlDatetime(), approvedBy: actor };
    if (!(await this.repository.updateFnf(id, fnf.version, next))) return fail(CONFLICT, 409);
    await this.audit(actor, `Approved Full & Final for ${c.emp}: net ₹${next.net}`);
    this.notify(c.personalEmail, 'Your Full & Final settlement is ready', [
      `Dear ${c.emp},`,
      next.net < 0
        ? `Your Full & Final settlement has been approved. It shows an amount of Rs. ${(-next.net).toLocaleString('en-IN')} recoverable from you — HR will contact you about it.`
        : `Your Full & Final settlement of Rs. ${next.net.toLocaleString('en-IN')} has been approved and will be paid shortly.`,
      'You can see the details and download the statement from the My Exit page of the employee portal.',
      'Regards,\nHR',
    ]);
    return { ok: true, data: next };
  }

  /** Approved → back to draft (a mistake spotted before paying). A paid settlement can't be reopened. */
  async reopenFnf(id: number, input: FnfInput, actor: string): Promise<OffboardingResult<OffboardingFnf>> {
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    const fnf = c.fnf;
    if (!fnf || fnf.status !== 'approved') return fail(fnf?.status === 'paid' ? 'A paid Full & Final can\'t be reopened.' : 'Only an approved Full & Final can be reopened.', 409);
    if (Number(input.version) !== fnf.version) return fail(CONFLICT, 409);
    const next: OffboardingFnf = { ...fnf, version: fnf.version + 1, status: 'draft', approvedAt: null, approvedBy: null };
    if (!(await this.repository.updateFnf(id, fnf.version, next))) return fail(CONFLICT, 409);
    await this.audit(actor, `Reopened Full & Final for ${c.emp}`);
    return { ok: true, data: next };
  }

  async markFnfPaid(id: number, input: FnfInput, actor: string): Promise<OffboardingResult<OffboardingFnf>> {
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    const fnf = c.fnf;
    if (!fnf || fnf.status !== 'approved') return fail(fnf?.status === 'paid' ? 'Already marked paid.' : 'Approve the Full & Final before marking it paid.', 409);
    if (Number(input.version) !== fnf.version) return fail(CONFLICT, 409);
    const paidOn = clean(input.paidOn);
    const today = todayStr();
    if (!isRealDate(paidOn) || paidOn > today) return fail('Payment date must be a valid date, not in the future.');
    const approvedOn = (fnf.approvedAt || '').slice(0, 10);
    if (approvedOn && paidOn < approvedOn) return fail('Payment date can\'t be before the approval date.');
    const reference = clean(input.reference);
    if (!reference) return fail(fnf.net < 0 ? 'Enter the reference of the amount recovered from the employee.' : 'Enter the payment reference (UTR / cheque no.).');
    if (reference.length > FNF_LIMITS.referenceLength) return fail(`Reference is too long (max ${FNF_LIMITS.referenceLength} characters).`);
    const next: OffboardingFnf = { ...fnf, version: fnf.version + 1, status: 'paid', paidOn, reference, paidBy: actor };
    if (!(await this.repository.updateFnf(id, fnf.version, next))) return fail(CONFLICT, 409);
    await this.audit(actor, `Marked Full & Final for ${c.emp} as paid on ${paidOn} (ref ${reference})`);
    return { ok: true, data: next };
  }

  private async draftFnf(id: number, version: unknown): Promise<OffboardingResult<{ c: OffboardingCase; fnf: OffboardingFnf }>> {
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    if (c.status !== 'exited') return fail('This exit is not open for settlement.', 409);
    const fnf = c.fnf;
    if (!fnf) return fail('Calculate the Full & Final first.', 409);
    if (fnf.status === 'paid') return fail('This Full & Final has been paid and is locked.', 409);
    if (fnf.status !== 'draft') return fail('This Full & Final is already approved — reopen it to change it.', 409);
    if (Number(version) !== fnf.version) return fail(CONFLICT, 409);
    return { ok: true, data: { c, fnf } };
  }

  /**
   * The system's lines, each with a stable key:
   *  salary      final cycle, priced by the payroll engine up to the LWD (0 if that cycle's payroll ran)
   *  leave:<t>   encashable leave balance × per-day (negative balance → a deduction)
   *  expenses    approved expense claims (nothing in the HR tool reimburses them otherwise)
   *  notice      resignation notice not served (after waived days) × per-day
   *  clearance:<id>  each checklist recovery
   * Per-day = monthly salary (CTC ÷ 12) ÷ 30, the same convention as payroll's LOP.
   */
  private async buildFnfAutoLines(c: OffboardingCase): Promise<OffboardingResult<{ lines: OffboardingFnfLine[]; salaryMonth: string; monthlySalary: number; perDay: number }>> {
    const employee = await this.hrRepository.findEmployeeById(c.employeeId);
    if (!employee) return fail('Their Directory record no longer exists.', 409);
    if (!(employee.ctc > 0)) return fail(`Set ${employee.name}'s Annual CTC in Directory first.`, 409);
    if (!c.approvedLwd) return fail('This exit has no last working day.', 409);
    const rules = await this.hrRepository.findRules();
    if (!rules) return fail('Payroll rules are not set up yet.', 409);

    const lwd = c.approvedLwd;
    const monthlySalary = employee.ctc / 12;
    const perDay = monthlySalary / 30;
    const salaryMonth = payrollMonthKeyForDate(lwd, rules);
    const lines: OffboardingFnfLine[] = [];
    const auto = (key: string, label: string, kind: 'earning' | 'deduction', amount: number): OffboardingFnfLine =>
      ({ key, label: label.slice(0, FNF_LIMITS.labelLength), kind, amount: Math.max(0, Math.round(amount)), source: 'auto' });

    // Payroll holds salary from the cycle the notice started in (see computePayrollForMonth), so the
    // F&F pays every cycle from there to the LWD's — one line each. A cycle whose payroll already
    // paid them (run before HR accepted the exit) shows ₹0.
    const noticeMonth = payrollMonthKeyForDate(c.resignationDate.slice(0, 10), rules);
    const months: string[] = [];
    for (let m = noticeMonth < salaryMonth ? noticeMonth : salaryMonth; m <= salaryMonth && months.length < FNF_MAX_SALARY_CYCLES; m = shiftMonthKey(m, 1)) months.push(m);
    if (months[months.length - 1] !== salaryMonth) return fail('The notice period is too long to settle automatically — add the salary lines by hand.', 409);
    for (const month of months) {
      const { from, to } = payrollPeriodRange(month, rules);
      const final = month === salaryMonth;
      const key = final ? 'salary' : `salary:${month}`;
      const range = `${shortDate(from)} – ${shortDate(final ? lwd : to)}`;
      if (await this.hrRepository.findPayrollEntryForEmployee(month, employee.id)) {
        lines.push(auto(key, `Salary ${range}: already paid in that month's payroll`, 'earning', 0));
        continue;
      }
      const preview = await this.hrTool.computePayrollForMonth(
        month,
        [{ credentialId: c.credentialId ?? employee.credentialId ?? -1, name: employee.name, doj: employee.doj }],
        undefined,
        { onlyEmployeeId: employee.id, includeFnfSettled: true },
      );
      const entry = preview.entries.find((e) => e.employeeId === employee.id);
      const paidDays = entry ? Math.round((entry.totalDays - entry.lopDays) * 100) / 100 : 0;
      lines.push(auto(key, `Salary ${range} (${paidDays} paid days${final ? '' : ', held during notice'})`, 'earning', entry?.monthlyGross ?? 0));
    }

    const settings = await this.repository.findSettings();
    const balances = await this.hrTool.getLeaveBalancesForEmployee(employee.id);
    for (const type of settings.encashableLeaveTypes) {
      const days = Math.round((Number(balances[type]) || 0) * 100) / 100;
      if (days > 0) lines.push(auto(`leave:${type}`, `Leave encashment — ${type} (${days} days)`, 'earning', days * perDay));
      else if (days < 0) lines.push(auto(`leave:${type}`, `Excess ${type} leave taken (${-days} days)`, 'deduction', -days * perDay));
    }

    const expenses = (await this.hrRepository.findExpenses()).filter((x) => x.employeeId === employee.id && x.status === 'approved');
    if (expenses.length) {
      const total = expenses.reduce((n, x) => n + (Number(x.amount) || 0), 0);
      if (total > 0) lines.push(auto('expenses', `Approved expense claims (${expenses.length})`, 'earning', total));
    }

    if (c.exitType === 'resignation') {
      const required = Math.max(0, c.noticeDays - c.noticeWaivedDays);
      const served = Math.max(0, daysBetween(c.resignationDate, lwd));
      const shortfall = Math.max(0, required - served);
      const waivedNote = c.noticeWaivedDays ? `, ${c.noticeWaivedDays} waived` : '';
      if (shortfall > 0) lines.push(auto('notice', `Notice not served (${shortfall} of ${c.noticeDays} days${waivedNote})`, 'deduction', shortfall * perDay));
    }

    for (const item of await this.repository.findClearance(c.id)) {
      if (item.deductionAmount > 0) {
        lines.push(auto(`clearance:${item.id}`, `Recovery — ${item.item}${item.note ? `: ${item.note}` : ''}`, 'deduction', item.deductionAmount));
      }
    }
    return { ok: true, data: { lines, salaryMonth, monthlySalary: Math.round(monthlySalary), perDay: Math.round(perDay * 100) / 100 } };
  }

  /**
   * Moves every accepted case whose LWD has passed to `exited` and applies the side effects, then
   * re-syncs the hr_employees.status mirror (see resyncExitedEmployeeStatuses).
   * There is no cron on this box — this runs lazily from the HR tool bootstrap, the Offboarding
   * list, login and the employee auth guard. Throttled to once a minute per process; never
   * throws (a failure here must not take login down — access is decided from the dates anyway,
   * see isPastLwd).
   */
  async applyDueExits(): Promise<void> {
    if (HrOffboardingService.dueExitInFlight) return HrOffboardingService.dueExitInFlight;
    if (Date.now() - HrOffboardingService.lastDueExitRun < 60_000) return;
    HrOffboardingService.lastDueExitRun = Date.now();
    HrOffboardingService.dueExitInFlight = (async () => {
      try {
        const today = todayStr();
        const due = await this.repository.findDueExits(today);
        for (const c of due) {
          // Compare-and-set: two processes sweeping at once (web + another worker) apply it once.
          if (!(await this.repository.transition(c.id, ['accepted'], { status: 'exited' }))) continue;
          await this.applyExitSideEffects({ ...c, status: 'exited' }, 'System');
          await this.audit('System', `${c.emp} exited (last working day ${c.approvedLwd} passed)`);
        }
        await this.repository.resyncExitedEmployeeStatuses();
      } catch (e) {
        console.warn('Offboarding due-exit sweep skipped:', e instanceof Error ? e.message : e);
      } finally {
        HrOffboardingService.dueExitInFlight = null;
      }
    })();
    return HrOffboardingService.dueExitInFlight;
  }

  // --- Internals ---
  private async findOpenCase(employeeId: string): Promise<OffboardingCase | null> {
    const cases = await this.repository.findForEmployee(employeeId);
    return cases.find((c) => OPEN_OFFBOARDING_STATUSES.includes(c.status)) || null;
  }

  /** Clearance, handover and leads can be worked only while accepted or exited — not before HR
   * accepts, not after the case is closed or completed. */
  private async workableCase(id: number): Promise<OffboardingResult> {
    const c = await this.repository.findById(id);
    if (!c) return fail('Offboarding case not found.', 404);
    if (!WORKABLE_OFFBOARDING_STATUSES.includes(c.status)) {
      const why: Partial<Record<OffboardingStatus, string>> = {
        pending: 'Accept the resignation first.', completed: 'This exit is completed and locked.',
      };
      return fail(why[c.status] || 'This exit is closed.', 409);
    }
    return { ok: true, data: c };
  }

  /** Checklist edits are also locked once the F&F is approved/paid — its recoveries feed the settlement. */
  private async clearanceEditableCase(id: number): Promise<OffboardingResult> {
    const guard = await this.workableCase(id);
    if (!guard.ok) return guard;
    if (guard.data.fnf && guard.data.fnf.status !== 'draft') {
      return fail('The Full & Final is approved — reopen it before changing the checklist.', 409);
    }
    return guard;
  }

  /** Active, assignable employees with a department, excluding the leaver and anyone with an exit
   * of their own in progress (handing leads to someone else who is leaving just moves the problem). */
  private async leadTargets(c: OffboardingCase): Promise<{ credentialId: number; name: string; department: string }[]> {
    const [assignable, all] = await Promise.all([this.leads.getAssignableEmployees(), this.repository.findAll()]);
    const leaving = new Set(all.filter((x) => OPEN_OFFBOARDING_STATUSES.includes(x.status) && x.credentialId != null).map((x) => x.credentialId as number));
    return assignable
      .filter((e) => e.department && e.credentialId !== c.credentialId && !leaving.has(e.credentialId))
      .map((e) => ({ credentialId: e.credentialId, name: e.name, department: e.department }));
  }

  /** Directory mirror (remembering the status before, for Reinstate) + switching off the linked
   * admin-panel account, and ticking the checklist's panel-access item accordingly. The Employee ID
   * login itself stays active — alumni sign in with it; `blocked` is enforced by accessForCredential. */
  private async applyExitSideEffects(c: OffboardingCase, actor: string): Promise<void> {
    const before = await this.repository.findEmployeeStatus(c.employeeId);
    if (before && before !== 'exited') {
      try { await this.repository.setPriorEmployeeStatus(c.id, before); } catch (e) { if (!isMissingColumnError(e)) throw e; }
    }
    await this.repository.setEmployeeStatus(c.employeeId, 'exited');
    const at = nowMysqlDatetime();
    const panelAdminId = c.credentialId != null ? await this.repository.findLinkedPanelAdminId(c.credentialId) : null;
    if (panelAdminId != null) {
      await this.repository.deactivatePanelAdmin(panelAdminId);
      await this.repository.autoTickClearance(c.id, 'access', 'panel', 'done', 'Admin-panel account switched off automatically on exit', actor, at);
    } else {
      await this.repository.autoTickClearance(c.id, 'access', 'panel', 'na', 'No admin-panel account linked', actor, at);
    }
  }

  private async seedClearance(offboardingId: number, settings: OffboardingSettings): Promise<void> {
    const items = CLEARANCE_CATEGORIES.flatMap((category) => (settings.checklist[category] || []).map((item) => ({ category, item })));
    await this.repository.insertClearanceItems(offboardingId, items);
  }

  /** The decision itself has already been saved — a failed seed must not report the whole action as
   * failed. listCases re-seeds any accepted case that ended up with no checklist. */
  private async seedClearanceSafely(offboardingId: number, settings: OffboardingSettings): Promise<void> {
    try { await this.seedClearance(offboardingId, settings); } catch (e) {
      console.warn('Offboarding checklist seed failed (will self-heal on next list):', e instanceof Error ? e.message : e);
    }
  }

  private async audit(who: string, change: string): Promise<void> {
    try {
      await this.hrRepository.appendAuditLog({ ts: todayStr(), who, change: `[Offboarding] ${change}` });
    } catch { /* audit is best-effort */ }
  }
}
