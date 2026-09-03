'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import { computeCtcBreakdown } from '../utils';
import type { HrHoliday, HrLeaveTypeConfig, HrRules, HrTeam } from '../types';

/** Plain-English names for the confirmation dialog's change list — the raw camelCase keys mean
 * nothing to whoever is approving the change. */
const RULE_LABELS: Partial<Record<keyof HrRules, string>> = {
  shiftStartTime: 'Shift start time', shiftEndTime: 'Shift end time', shiftGraceMinutes: 'Grace period (min)',
  halfDayThresholdHours: 'Half day — punch-in cutoff', regularizationWindowDays: 'Regularization window (days)',
  regularizationOverride: 'Admin override past window', regularizationMonthlyQuota: 'Regularization limit per payroll cycle',
  shortLeaveMaxHours: 'Short leave — punch-in cutoff', shortLeaveMonthlyQuota: 'Short leave — monthly quota',
  halfDayMinWorkedHours: 'Hours worked — absent below', shortLeaveMinWorkedHours: 'Hours worked — half day below',
  fullDayMinWorkedHours: 'Hours worked — full day at', salaryPeriodFrom: 'Salary period from',
  salaryPeriodTo: 'Salary period to', twoLevelApproval: 'Approval chain', leaveTypes: 'Leave types',
  lateMarkPenalty: 'Late-mark penalty', geoFencing: 'Geo-fencing', selfieCheckin: 'Selfie check-in',
  pfEsi: 'PF / ESI statutory modules', optionalHolidayChoice: 'Optional holiday self-selection',
  assetChecklist: 'Asset issuance/return checklist',
};

/** Ceiling for the three hours-worked thresholds. A value above the shift's own length would be
 * unreachable — nobody could ever work enough to earn a full day — so the field refuses it
 * rather than letting an admin silently make full days impossible. */
const MAX_WORKED_HOURS = 8.5;

/** Company-wide grace period — no longer admin-editable (see the "Grace period" row below), so
 * this is the one and only place the number can come from. commitRuleEdits forces every save to
 * carry this value regardless of what's in the draft, so a historical value other than 15 (from
 * back when this WAS editable) self-heals the next time any Attendance & leave rule is saved. */
const FIXED_GRACE_MINUTES = 15;
/** Upper bounds for the two per-cycle counters. Both are whole numbers — half a
 * regularization request or half a short leave is not a thing an employee can take. */
const REGULARIZATION_MAX = 8;
const SHORT_LEAVE_MAX = 5;

/** Every 15-minute punch-in/punch-out slot from 09:00 to 18:30 inclusive — the admin can only
 * pick from these, never type an arbitrary/invalid time like 12:63. */
const TIME_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 9; h <= 18; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 18 && m > 30) break;
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
})();

/** TIME_SLOTS, plus the currently-saved value if it isn't already one of those 15-minute slots
 * (e.g. a value saved before this dropdown existed) — so an out-of-grid legacy value still shows
 * correctly instead of silently not matching any `<option>`, and is left alone until the admin
 * deliberately picks a real slot. */
function timeSelectOptions(current: string): string[] {
  return TIME_SLOTS.includes(current) ? TIME_SLOTS : [...TIME_SLOTS, current].sort();
}

/** Every quarter-hour (15-minute) value from 0 up to MAX_WORKED_HOURS inclusive, for the
 * hours-worked thresholds — same "pick from a grid, can't type an arbitrary number" rule as the
 * shift-time dropdowns above. */
const HOURS_SLOTS: number[] = (() => {
  const out: number[] = [];
  for (let q = 0; q <= MAX_WORKED_HOURS * 4; q++) out.push(Math.round(q * 25) / 100);
  return out;
})();

/** Snaps a saved hours value onto the 15-minute grid the dropdown offers.
 *
 * The saved rules held 8.15 for "full day at" — someone entered 8:15 as if it were a decimal —
 * and 0.15h is 9 minutes, so the field read the nonsense "8:09". This rounds it to the nearest
 * real slot (8.25 = 8:15). Applied when the draft is built rather than when it is saved, so the
 * section shows as having unsaved changes and the admin fixes it with a deliberate Save, seeing
 * "8:09 -> 8:15" in the confirmation, instead of the value being rewritten behind their back. */
function snapToSlot(hours: number): number {
  const h = Number(hours);
  if (!Number.isFinite(h)) return HOURS_SLOTS[0];
  return HOURS_SLOTS.reduce((best, slot) => (Math.abs(slot - h) < Math.abs(best - h) ? slot : best), HOURS_SLOTS[0]);
}

/** The grid, and only the grid. Drafts are snapped by toRuleDraft, so there is no longer an
 * off-grid value to accommodate — and no way to reintroduce one through this dropdown. */
function hoursSelectOptions(): number[] {
  return HOURS_SLOTS;
}

/** Whole numbers only, clamped to 0..max.
 *
 * `type="number"` with min/max/step does NOT prevent any of this: the browser only enforces those
 * on the spinner arrows and on form validation, while typing "4.5" or "90" straight into the box
 * is allowed and would be saved as-is. Normalising in the change handler is what actually holds,
 * because the normalised number is the one that goes into the draft. */
function clampWholeNumber(raw: string, max: number): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(0, n));
}

/** Keys that would put a decimal point or an exponent into a number field. Blocked so the value
 * doesn't visibly jump while the admin types, on top of the clamp above which is the real guard. */
function blockNonInteger(e: React.KeyboardEvent<HTMLInputElement>) {
  if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
}

/** "H:MM" — e.g. 4.5 -> "4:30" — short and consistent-width, matching the shift-time dropdowns
 * above rather than a verbose "4h 30m" that made every option a different length. */
function formatHoursLabel(h: number): string {
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60), mm = totalMin % 60;
  return `${hh}:${String(mm).padStart(2, '0')}`;
}

/** Builds the editable draft from the saved rules. Two normalisations live here so the form can
 * never display a value its own controls cannot represent: the grace period is fixed
 * company-wide, and the three hours-worked thresholds are snapped onto the 15-minute grid. */
function toRuleDraft(saved: HrRules): HrRules {
  return {
    ...saved,
    shiftGraceMinutes: FIXED_GRACE_MINUTES,
    halfDayMinWorkedHours: snapToSlot(saved.halfDayMinWorkedHours),
    shortLeaveMinWorkedHours: snapToSlot(saved.shortLeaveMinWorkedHours),
    fullDayMinWorkedHours: snapToSlot(saved.fullDayMinWorkedHours),
  };
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

/** One section's Save control — always visible but disabled until that section has unsaved
 * edits, so the admin never has to hunt for a button and can never apply a change without an
 * explicit click plus this confirmation. `validate` (optional) runs before the confirmation
 * opens; returning a string blocks the save and alerts that message instead. */
function SectionSaveBar({ dirty, saving, onDiscard, onSave, title, notice, changeLines, validate }: {
  dirty: boolean; saving: boolean; onDiscard: () => void; onSave: () => void | Promise<void>;
  title: string; notice: string; changeLines: string[]; validate?: () => string | null;
}) {
  const [open, setOpen] = useState(false);
  function handleSaveClick() {
    if (validate) {
      const err = validate();
      if (err) { alert(err); return; }
    }
    setOpen(true);
  }
  return (
    <div className="rule-inputs" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <button className="btn sm" onClick={onDiscard} disabled={!dirty || saving}>Discard</button>
      <button className="btn sm primary" onClick={handleSaveClick} disabled={!dirty || saving}>Save changes</button>
      {dirty && <span className="meta">Unsaved changes in this section</span>}
      {open && (
        <ModalShell
          title={title}
          onClose={() => setOpen(false)}
          actions={[
            { label: 'Cancel', cls: 'btn', onClick: () => setOpen(false) },
            { label: saving ? 'Saving…' : 'Yes, apply changes', cls: 'btn primary', onClick: async () => { await onSave(); setOpen(false); } },
          ]}
        >
          <div className="notice">{notice}</div>
          <div className="field">
            <label className="field-label">About to change</label>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {changeLines.length === 0
                ? <li className="meta">No differences detected.</li>
                : changeLines.map((l, i) => <li key={i} style={{ fontSize: 13, marginBottom: 2 }}>{l}</li>)}
            </ul>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function stringListDiff(before: string[], after: string[]): string[] {
  const added = after.filter((x) => !before.includes(x));
  const removed = before.filter((x) => !after.includes(x));
  const lines: string[] = [];
  if (added.length) lines.push(`Added: ${added.join(', ')}`);
  if (removed.length) lines.push(`Removed: ${removed.join(', ')}`);
  return lines;
}

function teamsDiff(before: HrTeam[], after: HrTeam[]): string[] {
  const beforeNames = before.map((t) => t.name), afterNames = after.map((t) => t.name);
  const added = after.filter((t) => !beforeNames.includes(t.name)).map((t) => t.name);
  const removed = before.filter((t) => !afterNames.includes(t.name)).map((t) => t.name);
  const lines: string[] = [];
  if (added.length) lines.push(`Added team(s): ${added.join(', ')}`);
  if (removed.length) lines.push(`Removed team(s): ${removed.join(', ')}`);
  for (const t of after) {
    const prev = before.find((b) => b.name === t.name);
    if (prev && prev.manager !== t.manager) lines.push(`${t.name}: Reporting Manager ${prev.manager || 'none'} → ${t.manager || 'none'}`);
  }
  return lines;
}

function holidaysDiff(before: HrHoliday[], after: HrHoliday[]): string[] {
  const key = (h: HrHoliday) => `${h.date}|${h.name}`;
  const beforeKeys = before.map(key), afterKeys = after.map(key);
  const added = after.filter((h) => !beforeKeys.includes(key(h)));
  const removed = before.filter((h) => !afterKeys.includes(key(h)));
  const lines: string[] = [];
  if (added.length) lines.push(`Added: ${added.map((h) => `${h.name} (${h.date})`).join(', ')}`);
  if (removed.length) lines.push(`Removed: ${removed.map((h) => `${h.name} (${h.date})`).join(', ')}`);
  return lines;
}

/** A local draft that mirrors `source` until edited, and snaps back to it when `source` itself
 * changes (initial load, or this section's own save completing) — without clobbering an edit in
 * progress in a DIFFERENT section, since those don't touch `source`. Adjusts state directly
 * during render rather than in a useEffect (React's documented pattern for "resetting state when
 * a prop changes" — https://react.dev/learn/you-might-not-need-an-effect) so it doesn't cost an
 * extra post-commit render pass. */
function useSyncedDraft<T>(source: T): [T, Dispatch<SetStateAction<T>>] {
  const [draft, setDraft] = useState(source);
  const [prevSource, setPrevSource] = useState(source);
  if (prevSource !== source) {
    setPrevSource(source);
    setDraft(source);
  }
  return [draft, setDraft];
}

export default function Rules() {
  const {
    state, persistTeams, persistDesignations, persistExpenseCategories, persistRequiredDocuments,
    persistHolidays, persistRules, logRuleChange, resetSampleData,
  } = useHrTool();
  const r = state.rules;

  const [newTeam, setNewTeam] = useState('');
  const [newDesig, setNewDesig] = useState('');
  const [newExpCat, setNewExpCat] = useState('');
  const [newReqDoc, setNewReqDoc] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [ctcBasicPct, setCtcBasicPct] = useState(String(r.ctcSplit.basicPct));
  const [ctcHraPct, setCtcHraPct] = useState(String(r.ctcSplit.hraPctOfBasic));
  const [ctcConvType, setCtcConvType] = useState<'amount' | 'percent'>(r.ctcSplit.convenienceType);
  const [ctcConvValue, setCtcConvValue] = useState(String(r.ctcSplit.convenienceValue));
  const [newLeaveType, setNewLeaveType] = useState('');
  const [newLeavePerMonth, setNewLeavePerMonth] = useState('1');

  // Every section below edits its OWN local draft, not the saved data directly — nothing
  // leaves this component (and nothing is lost on refresh, or kept, until Save is clicked) for
  // ANY section: Teams, Designations, Expense categories, Required documents, Holiday calendar,
  // CTC structure, and every HrRules-backed rule. Before, most of these persisted to the server
  // on every single click/keystroke (add a team, change a manager, remove a category) with no
  // button and no confirmation at all. Each draft re-syncs (via useSyncedDraft) when the saved
  // data genuinely changes — local edits don't touch the saved copies, so a save in one section
  // can't clobber work in progress in a different section.
  const [teamsDraft, setTeamsDraft] = useSyncedDraft(state.teams);
  const [teamsSaving, setTeamsSaving] = useState(false);
  const [designationsDraft, setDesignationsDraft] = useSyncedDraft(state.orgStructure.designations);
  const [designationsSaving, setDesignationsSaving] = useState(false);
  const [expenseCategoriesDraft, setExpenseCategoriesDraft] = useSyncedDraft(state.orgStructure.expenseCategories);
  const [expenseCategoriesSaving, setExpenseCategoriesSaving] = useState(false);
  const [requiredDocumentsDraft, setRequiredDocumentsDraft] = useSyncedDraft(state.orgStructure.requiredDocuments);
  const [requiredDocumentsSaving, setRequiredDocumentsSaving] = useState(false);
  const [holidaysDraft, setHolidaysDraft] = useSyncedDraft(state.orgStructure.holidays);
  const [holidaysSaving, setHolidaysSaving] = useState(false);
  const [ctcSaving, setCtcSaving] = useState(false);

  // shiftGraceMinutes needs a transform on top of the plain "mirror the source" behaviour
  // useSyncedDraft gives every other section (see FIXED_GRACE_MINUTES) — same render-time
  // adjustment pattern, just inlined instead of going through the generic hook.
  const [ruleDraft, setRuleDraft] = useState<HrRules>(() => toRuleDraft(r));
  const [prevSavedRules, setPrevSavedRules] = useState(r);
  if (prevSavedRules !== r) {
    setPrevSavedRules(r);
    setRuleDraft(toRuleDraft(r));
  }
  const [savingRules, setSavingRules] = useState(false);

  // Spelled out in the confirmation rather than a bare "are you sure?", so the admin can see
  // exactly what they're about to apply — these settings reach payroll. Shared by all four
  // HrRules-backed sections below (Attendance & leave, Approval chain, Leave types, Other rules)
  // since they're one settings row saved with one call — see the note by ATTENDANCE_KEYS etc.
  const changedRuleLabels = (Object.keys(ruleDraft) as (keyof HrRules)[])
    .filter((k) => JSON.stringify(ruleDraft[k]) !== JSON.stringify(r[k]))
    .map((k) => {
      const before = r[k], after = ruleDraft[k];
      if (typeof before === 'boolean') return `${RULE_LABELS[k] || k}: ${before ? 'on' : 'off'} → ${after ? 'on' : 'off'}`;
      if (before !== null && typeof before === 'object') return `${RULE_LABELS[k] || k}: updated`;
      return `${RULE_LABELS[k] || k}: ${String(before)} → ${String(after)}`;
    });

  function setDraftRule<K extends keyof HrRules>(key: K, value: HrRules[K]) {
    setRuleDraft((d) => ({ ...d, [key]: value }));
  }
  function setDraftApproval(mod: 'leave' | 'attendance' | 'expense', value: boolean) {
    setRuleDraft((d) => ({ ...d, twoLevelApproval: { ...d.twoLevelApproval, [mod]: value } }));
  }
  function setDraftLeaveType(type: string, cfg: HrLeaveTypeConfig) {
    setRuleDraft((d) => ({ ...d, leaveTypes: { ...d.leaveTypes, [type]: cfg } }));
  }

  // The four HrRules-backed sections below are all part of ONE database row, saved with ONE
  // call — so "Save" on any one of them applies the WHOLE draft (any other section's pending
  // edits included), not just that section's fields. That's shown honestly: the confirmation
  // list (changedRuleLabels, above) always reflects everything actually being saved, not just
  // the section the button was clicked from. Each section's OWN button only controls whether
  // it's enabled (via its own scoped dirty check) and what "Discard" resets.
  const ATTENDANCE_KEYS: (keyof HrRules)[] = ['shiftStartTime', 'shiftEndTime', 'regularizationMonthlyQuota', 'shortLeaveMonthlyQuota', 'halfDayMinWorkedHours', 'shortLeaveMinWorkedHours', 'fullDayMinWorkedHours'];
  const APPROVAL_KEYS: (keyof HrRules)[] = ['twoLevelApproval'];
  const LEAVE_TYPES_KEYS: (keyof HrRules)[] = ['leaveTypes'];
  const OTHER_RULES_KEYS: (keyof HrRules)[] = ['lateMarkPenalty', 'geoFencing', 'selfieCheckin', 'pfEsi', 'optionalHolidayChoice', 'assetChecklist'];
  function sectionDirty(keys: (keyof HrRules)[]): boolean {
    return keys.some((k) => JSON.stringify(ruleDraft[k]) !== JSON.stringify(r[k]));
  }
  function discardSection(keys: (keyof HrRules)[]) {
    // Restores from toRuleDraft, not from `r` directly — resetting to the raw saved value would
    // put an off-grid 8.15 back into a dropdown that has no such option.
    const base = toRuleDraft(r);
    setRuleDraft((d) => {
      const next = { ...d };
      for (const k of keys) (next as Record<string, unknown>)[k] = base[k];
      return next;
    });
  }
  async function commitRuleEdits() {
    setSavingRules(true);
    await persistRules({ ...ruleDraft, shiftGraceMinutes: FIXED_GRACE_MINUTES });
    logRuleChange('Updated attendance, approval, leave-type and other rules');
    setSavingRules(false);
  }

  // Live preview against the (unsaved) draft values in the fields above, not the saved rules —
  // so admin sees the effect of an edit before clicking Save.
  const sampleBreakdown = computeCtcBreakdown(600000, {
    basicPct: Number(ctcBasicPct) || 0, hraPctOfBasic: Number(ctcHraPct) || 0,
    convenienceType: ctcConvType, convenienceValue: Number(ctcConvValue) || 0,
  });
  const ctcDirty = Number(ctcBasicPct) !== r.ctcSplit.basicPct || Number(ctcHraPct) !== r.ctcSplit.hraPctOfBasic
    || ctcConvType !== r.ctcSplit.convenienceType || Number(ctcConvValue) !== r.ctcSplit.convenienceValue;
  const ctcChangeLines: string[] = [];
  if (Number(ctcBasicPct) !== r.ctcSplit.basicPct) ctcChangeLines.push(`Basic: ${r.ctcSplit.basicPct}% → ${Number(ctcBasicPct) || 0}%`);
  if (Number(ctcHraPct) !== r.ctcSplit.hraPctOfBasic) ctcChangeLines.push(`HRA: ${r.ctcSplit.hraPctOfBasic}% of Basic → ${Number(ctcHraPct) || 0}% of Basic`);
  if (ctcConvType !== r.ctcSplit.convenienceType || Number(ctcConvValue) !== r.ctcSplit.convenienceValue) {
    const fmt = (t: 'amount' | 'percent', v: number) => (t === 'amount' ? `₹${v}` : `${v}%`);
    ctcChangeLines.push(`Convenience Allowance: ${fmt(r.ctcSplit.convenienceType, r.ctcSplit.convenienceValue)} → ${fmt(ctcConvType, Number(ctcConvValue) || 0)}`);
  }
  function validateCtc(): string | null {
    const basicPct = Number(ctcBasicPct) || 0, hraPct = Number(ctcHraPct) || 0, convValue = Number(ctcConvValue) || 0;
    if (basicPct <= 0 || basicPct > 100) return 'Basic must be between 0 and 100% of monthly salary.';
    if (hraPct < 0 || hraPct > 100) return 'HRA must be between 0 and 100% of Basic.';
    if (ctcConvType === 'percent' && (convValue < 0 || convValue > 100)) return 'Convenience Allowance % must be between 0 and 100.';
    if (convValue < 0) return 'Convenience Allowance cannot be negative.';
    if (sampleBreakdown.specialAllowance < 0) return 'Basic + HRA + Convenience already exceeds the ₹50,000/month sample salary shown below — Special Allowance can\'t go negative. Lower one of them first.';
    return null;
  }
  async function saveCtcSplit() {
    setCtcSaving(true);
    const basicPct = Number(ctcBasicPct) || 0, hraPct = Number(ctcHraPct) || 0, convValue = Number(ctcConvValue) || 0;
    await persistRules({ ...r, ctcSplit: { basicPct, hraPctOfBasic: hraPct, convenienceType: ctcConvType, convenienceValue: convValue } });
    logRuleChange(`Updated CTC structure: Basic ${basicPct}% of salary / HRA ${hraPct}% of Basic / Convenience ${ctcConvType === 'amount' ? '₹' + convValue : convValue + '%'} — Special Allowance auto-computed as the remainder`);
    setCtcSaving(false);
  }
  function discardCtc() {
    setCtcBasicPct(String(r.ctcSplit.basicPct));
    setCtcHraPct(String(r.ctcSplit.hraPctOfBasic));
    setCtcConvType(r.ctcSplit.convenienceType);
    setCtcConvValue(String(r.ctcSplit.convenienceValue));
  }

  function addTeam() {
    const name = newTeam.trim();
    if (!name) return;
    if (teamsDraft.some((t) => t.name === name)) { alert('That team already exists.'); return; }
    setTeamsDraft((d) => [...d, { name, manager: null }]);
    setNewTeam('');
  }
  function removeTeam(name: string) {
    if (state.employees.some((e) => e.team === name && e.status !== 'exited')) {
      alert("Can't remove a team that still has employees assigned. Move them to another team first.");
      return;
    }
    setTeamsDraft((d) => d.filter((t) => t.name !== name));
  }
  function setTeamManagerDraft(name: string, manager: string) {
    setTeamsDraft((d) => d.map((t) => (t.name === name ? { ...t, manager: manager || null } : t)));
  }
  async function saveTeams() {
    setTeamsSaving(true);
    await persistTeams(teamsDraft);
    logRuleChange(`Updated Teams & Reporting Managers: ${teamsDiff(state.teams, teamsDraft).join('; ') || 'no changes'}`);
    setTeamsSaving(false);
  }

  function addDesignation() {
    const name = newDesig.trim();
    if (!name || designationsDraft.includes(name)) return;
    setDesignationsDraft((d) => [...d, name]);
    setNewDesig('');
  }
  function removeDesignation(name: string) {
    const count = state.employees.filter((e) => e.designation === name).length;
    const msg = count > 0 ? `${count} employee(s) currently hold "${name}". Remove it from the list anyway? Their existing records won't change.` : `Remove "${name}" from Organisation Structure?`;
    if (!confirm(msg)) return;
    setDesignationsDraft((d) => d.filter((x) => x !== name));
  }
  async function saveDesignations() {
    setDesignationsSaving(true);
    await persistDesignations(designationsDraft);
    logRuleChange(`Updated Designations: ${stringListDiff(state.orgStructure.designations, designationsDraft).join('; ') || 'no changes'}`);
    setDesignationsSaving(false);
  }

  function addExpenseCategory() {
    const name = newExpCat.trim();
    if (!name || expenseCategoriesDraft.includes(name)) return;
    setExpenseCategoriesDraft((d) => [...d, name]);
    setNewExpCat('');
  }
  function removeExpenseCategory(name: string) {
    const count = state.expenses.filter((x) => x.category === name).length;
    const msg = count > 0 ? `${count} expense record(s) use "${name}". Remove it from the list anyway? Their existing records won't change.` : `Remove "${name}" from Organisation Structure?`;
    if (!confirm(msg)) return;
    setExpenseCategoriesDraft((d) => d.filter((c) => c !== name));
  }
  async function saveExpenseCategories() {
    setExpenseCategoriesSaving(true);
    await persistExpenseCategories(expenseCategoriesDraft);
    logRuleChange(`Updated Expense categories: ${stringListDiff(state.orgStructure.expenseCategories, expenseCategoriesDraft).join('; ') || 'no changes'}`);
    setExpenseCategoriesSaving(false);
  }

  function addRequiredDoc() {
    const name = newReqDoc.trim();
    if (!name || requiredDocumentsDraft.includes(name)) return;
    setRequiredDocumentsDraft((d) => [...d, name]);
    setNewReqDoc('');
  }
  function removeRequiredDoc(name: string) {
    setRequiredDocumentsDraft((d) => d.filter((x) => x !== name));
  }
  async function saveRequiredDocuments() {
    setRequiredDocumentsSaving(true);
    await persistRequiredDocuments(requiredDocumentsDraft);
    logRuleChange(`Updated required onboarding documents: ${stringListDiff(state.orgStructure.requiredDocuments, requiredDocumentsDraft).join('; ') || 'no changes'}`);
    setRequiredDocumentsSaving(false);
  }

  function addHoliday() {
    if (!newHolidayDate || !newHolidayName.trim()) { alert('Both a date and a name are needed.'); return; }
    setHolidaysDraft((d) => [...d, { date: newHolidayDate, name: newHolidayName.trim() }].sort((a, b) => a.date.localeCompare(b.date)));
    setNewHolidayDate(''); setNewHolidayName('');
  }
  function removeHolidayDraft(date: string, name: string) {
    setHolidaysDraft((d) => d.filter((h) => !(h.date === date && h.name === name)));
  }
  async function saveHolidaysSection() {
    setHolidaysSaving(true);
    await persistHolidays(holidaysDraft);
    logRuleChange(`Updated Holiday calendar: ${holidaysDiff(state.orgStructure.holidays, holidaysDraft).join('; ') || 'no changes'}`);
    setHolidaysSaving(false);
  }

  function addLeaveType() {
    const name = newLeaveType.trim();
    if (!name) return;
    if (ruleDraft.leaveTypes[name] !== undefined) { alert('That leave type already exists.'); return; }
    setRuleDraft((d) => ({ ...d, leaveTypes: { ...d.leaveTypes, [name]: { enabled: true, perMonth: Math.max(0, Number(newLeavePerMonth) || 0) } } }));
    setNewLeaveType('');
    setNewLeavePerMonth('1');
  }

  async function handleResetSampleData() {
    const typed = prompt('This deletes all sample employees and records except your own login. Type "RESET" to confirm.');
    if (typed !== 'RESET') { if (typed !== null) alert('Not confirmed — type RESET exactly to proceed.'); return; }
    const ok = await resetSampleData();
    if (ok) alert('Sample data cleared. Your Directory now has just your own account — add real employees from here.');
  }

  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">Rules &amp; Organisation Structure</h1><div className="page-sub">Build out your org here — designations, teams, categories — and every rule below is a toggle you can flip anytime. Nothing takes effect until you save that section.</div></div>
        <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
      </div>

      <section className="block">
        <div className="block-head"><h2>Teams &amp; Reporting Managers</h2></div>
        <div className="card pad">
          <div className="rule-desc" style={{ marginBottom: 10 }}>Add as many teams as you need. Each team has one Reporting Manager, who then sees only that team plus their own chain upward.</div>
          <table><thead><tr><th>Team</th><th>Reporting Manager</th><th></th></tr></thead>
            <tbody>
              {teamsDraft.map((t) => (
                <tr key={t.name}><td>{t.name}</td>
                  <td><select value={t.manager || ''} onChange={(e) => setTeamManagerDraft(t.name, e.target.value)} style={{ width: 220 }}>
                    <option value="">— None —</option>
                    {state.employees.filter((e) => e.status !== 'exited').map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
                  </select></td>
                  <td style={{ textAlign: 'right' }}>{t.name !== 'Leadership' && <button className="btn ghost sm" onClick={() => removeTeam(t.name)}>Remove</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="add-inline" style={{ marginTop: 14 }}>
            <input type="text" placeholder="e.g. Tech" value={newTeam} onChange={(e) => setNewTeam(e.target.value)} />
            <button className="btn sm" onClick={addTeam}>+ Add team</button>
          </div>
          <SectionSaveBar
            dirty={JSON.stringify(teamsDraft) !== JSON.stringify(state.teams)}
            saving={teamsSaving}
            onDiscard={() => setTeamsDraft(state.teams)}
            onSave={saveTeams}
            title="Apply Teams & Reporting Managers changes?"
            notice="This changes who reports to whom, and which teams show up across the HR Tool."
            changeLines={teamsDiff(state.teams, teamsDraft)}
          />
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Designations</h2></div>
        <div className="card pad">
          <div className="rule-desc" style={{ marginBottom: 10 }}>This list feeds the Designation dropdown everywhere — offer letters, onboarding, directory, and Assigning IDs.</div>
          <div className="chip-list">{designationsDraft.map((d) => <span className="chip" key={d}>{d} <button onClick={() => removeDesignation(d)} title="Remove">×</button></span>)}</div>
          <div className="add-inline">
            <input type="text" placeholder="e.g. Growth Marketer" value={newDesig} onChange={(e) => setNewDesig(e.target.value)} />
            <button className="btn sm" onClick={addDesignation}>+ Add designation</button>
          </div>
          <SectionSaveBar
            dirty={JSON.stringify(designationsDraft) !== JSON.stringify(state.orgStructure.designations)}
            saving={designationsSaving}
            onDiscard={() => setDesignationsDraft(state.orgStructure.designations)}
            onSave={saveDesignations}
            title="Apply Designations changes?"
            notice="This changes the Designation dropdown everywhere it's used — offer letters, onboarding, directory, Assigning IDs."
            changeLines={stringListDiff(state.orgStructure.designations, designationsDraft)}
          />
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Expense categories</h2></div>
        <div className="card pad">
          <div className="chip-list">{expenseCategoriesDraft.map((c) => <span className="chip" key={c}>{c} <button onClick={() => removeExpenseCategory(c)} title="Remove">×</button></span>)}</div>
          <div className="add-inline">
            <input type="text" placeholder="e.g. Events" value={newExpCat} onChange={(e) => setNewExpCat(e.target.value)} />
            <button className="btn sm" onClick={addExpenseCategory}>+ Add category</button>
          </div>
          <SectionSaveBar
            dirty={JSON.stringify(expenseCategoriesDraft) !== JSON.stringify(state.orgStructure.expenseCategories)}
            saving={expenseCategoriesSaving}
            onDiscard={() => setExpenseCategoriesDraft(state.orgStructure.expenseCategories)}
            onSave={saveExpenseCategories}
            title="Apply Expense categories changes?"
            notice="This changes the category dropdown employees pick from when filing an expense."
            changeLines={stringListDiff(state.orgStructure.expenseCategories, expenseCategoriesDraft)}
          />
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Required onboarding documents</h2></div>
        <div className="card pad">
          <div className="rule-desc" style={{ marginBottom: 10 }}>This checklist is what every new hire is asked to upload, and what shows up in every employee&apos;s My Documents.</div>
          <div className="chip-list">{requiredDocumentsDraft.map((d) => <span className="chip" key={d}>{d} <button onClick={() => removeRequiredDoc(d)} title="Remove">×</button></span>)}</div>
          <div className="add-inline">
            <input type="text" placeholder="e.g. PF Nomination Form" value={newReqDoc} onChange={(e) => setNewReqDoc(e.target.value)} />
            <button className="btn sm" onClick={addRequiredDoc}>+ Add document type</button>
          </div>
          <SectionSaveBar
            dirty={JSON.stringify(requiredDocumentsDraft) !== JSON.stringify(state.orgStructure.requiredDocuments)}
            saving={requiredDocumentsSaving}
            onDiscard={() => setRequiredDocumentsDraft(state.orgStructure.requiredDocuments)}
            onSave={saveRequiredDocuments}
            title="Apply Required onboarding documents changes?"
            notice="This changes the checklist every new hire is asked to upload, and what shows in every employee's My Documents."
            changeLines={stringListDiff(state.orgStructure.requiredDocuments, requiredDocumentsDraft)}
          />
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Holiday calendar</h2></div>
        <div className="card pad">
          <div className="rule-desc" style={{ marginBottom: 10 }}>Feeds the attendance calendar&apos;s week-off/holiday colouring and the optional-holiday pool.</div>
          <table><thead><tr><th>Date</th><th>Holiday</th><th></th></tr></thead>
            <tbody>{holidaysDraft.map((h) => (
              <tr key={h.date + h.name}><td>{h.date}</td><td>{h.name}</td><td style={{ textAlign: 'right' }}><button className="btn ghost sm" onClick={() => removeHolidayDraft(h.date, h.name)}>Remove</button></td></tr>
            ))}</tbody>
          </table>
          <div className="add-inline" style={{ marginTop: 12 }}>
            <input type="date" style={{ maxWidth: 170 }} value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} />
            <input type="text" placeholder="e.g. Holi" value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} />
            <button className="btn sm" onClick={addHoliday}>+ Add holiday</button>
          </div>
          <SectionSaveBar
            dirty={JSON.stringify(holidaysDraft) !== JSON.stringify(state.orgStructure.holidays)}
            saving={holidaysSaving}
            onDiscard={() => setHolidaysDraft(state.orgStructure.holidays)}
            onSave={saveHolidaysSection}
            title="Apply Holiday calendar changes?"
            notice="This changes the attendance calendar's week-off/holiday colouring and the optional-holiday pool for everyone."
            changeLines={holidaysDiff(state.orgStructure.holidays, holidaysDraft)}
          />
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>CTC structure</h2></div>
        <div className="card pad">
          <div className="rule-desc" style={{ marginBottom: 10 }}>
            Used to split monthly salary into Basic / HRA / Convenience Allowance / Special Allowance wherever it&apos;s shown (offer letters, employment agreements). Special Allowance is never set directly — it&apos;s always whatever&apos;s left after the other three.
          </div>
          {/* Every row uses the same three-slot grid — type / field / unit — so the four inputs
              line up in one column. Previously each row was a right-aligned flex whose input
              position depended on how long its trailing unit text happened to be, which is why
              "%", "% of Basic" and "₹" each pushed their field to a different place. */}
          <div className="rule-row">
            <div><div className="rule-name">Basic</div><div className="rule-desc">% of monthly salary (ctc ÷ 12).</div></div>
            <div className="rule-inputs ctc-inputs">
              <span className="ctc-type" />
              <span className="ctc-field">
                <input className="mini-input" type="number" min={0} max={100} value={ctcBasicPct} onChange={(e) => setCtcBasicPct(e.target.value)} />
              </span>
              <span className="ctc-unit">%</span>
            </div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">HRA</div><div className="rule-desc">% of Basic — auto-calculated from Basic above, not of salary directly.</div></div>
            <div className="rule-inputs ctc-inputs">
              <span className="ctc-type" />
              <span className="ctc-field">
                <input className="mini-input" type="number" min={0} max={100} value={ctcHraPct} onChange={(e) => setCtcHraPct(e.target.value)} />
              </span>
              <span className="ctc-unit">% of Basic</span>
            </div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Convenience Allowance</div><div className="rule-desc">A flat Rupees/month amount, or a % of monthly salary — your choice.</div></div>
            <div className="rule-inputs ctc-inputs">
              <span className="ctc-type">
                <select value={ctcConvType} onChange={(e) => setCtcConvType(e.target.value as 'amount' | 'percent')}>
                  <option value="amount">Amount</option>
                  <option value="percent">%</option>
                </select>
              </span>
              <span className="ctc-field">
                {/* The rupee sign is a prefix inside the field slot, not a separate column, so
                    switching Amount <-> % never shifts the input itself. */}
                {ctcConvType === 'amount' && <span className="ctc-prefix">₹</span>}
                <input className="mini-input" type="number" min={0} value={ctcConvValue} onChange={(e) => setCtcConvValue(e.target.value)} />
              </span>
              <span className="ctc-unit">{ctcConvType === 'percent' ? '% of salary' : '/ month'}</span>
            </div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Special Allowance</div><div className="rule-desc">Auto-calculated — whatever&apos;s left of monthly salary after Basic, HRA, and Convenience Allowance.</div></div>
            {/* Not editable, but it still occupies the grid so the row reads as part of the same
                table instead of a stray line with nothing on its right. */}
            <div className="rule-inputs ctc-inputs">
              <span className="ctc-type" />
              <span className="ctc-field"><span className="ctc-auto">the remainder</span></span>
              <span className="ctc-unit" />
            </div>
          </div>
          <SectionSaveBar
            dirty={ctcDirty}
            saving={ctcSaving}
            onDiscard={discardCtc}
            onSave={saveCtcSplit}
            validate={validateCtc}
            title="Apply CTC structure changes?"
            notice="This changes how salary is split into Basic/HRA/Convenience/Special Allowance in offer letters and employment agreements going forward."
            changeLines={ctcChangeLines}
          />
          <div className="meta" style={{ marginTop: 10 }}>
            Example on a ₹6,00,000 annual CTC (₹50,000/month): Basic {sampleBreakdown.basic.toLocaleString('en-IN')}
            {' · '}HRA {sampleBreakdown.hra.toLocaleString('en-IN')}
            {' · '}Convenience {sampleBreakdown.convenience.toLocaleString('en-IN')}
            {' · '}Special Allowance {sampleBreakdown.specialAllowance.toLocaleString('en-IN')} (all ₹/month, using your unsaved edits above)
          </div>
          {sampleBreakdown.specialAllowance < 0 && (
            <div className="notice" style={{ marginTop: 10, background: 'var(--red-soft)', borderColor: '#FECACA', color: 'var(--red)' }}>
              Special Allowance can&apos;t go negative — Basic + HRA + Convenience already adds up to more than the ₹50,000/month sample salary above. Lower Basic, HRA, or Convenience before saving.
            </div>
          )}
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Attendance &amp; leave window rules</h2></div>
        <div className="card pad">
          <div className="rule-row">
            <div><div className="rule-name">Shift timings (punch in / punch out)</div><div className="rule-desc">Official shift start and end time — 15-minute slots, 9:00 am to 6:30 pm.</div></div>
            <div className="rule-inputs">
              In <select value={ruleDraft.shiftStartTime} onChange={(e) => setDraftRule('shiftStartTime', e.target.value)} style={{ width: 120 }}>
                {timeSelectOptions(ruleDraft.shiftStartTime).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              Out <select value={ruleDraft.shiftEndTime} onChange={(e) => setDraftRule('shiftEndTime', e.target.value)} style={{ width: 120 }}>
                {timeSelectOptions(ruleDraft.shiftEndTime).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Grace period</div><div className="rule-desc">Minutes after shift start before a punch-in counts as late. Fixed company-wide — not admin-editable.</div></div>
            <div className="rule-inputs"><strong>{FIXED_GRACE_MINUTES} min</strong></div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Regularization limit per payroll cycle</div><div className="rule-desc">How many regularization requests an employee may submit per payroll cycle (26th → 25th). Dates are limited to that same cycle — earlier cycles are already paid out and can no longer be corrected. Whole numbers up to 8.</div></div>
            <div className="rule-inputs">
              <input
                className="mini-input" type="number" min={0} max={REGULARIZATION_MAX} step={1}
                value={ruleDraft.regularizationMonthlyQuota}
                onKeyDown={blockNonInteger}
                onChange={(e) => setDraftRule('regularizationMonthlyQuota', clampWholeNumber(e.target.value, REGULARIZATION_MAX))}
              />
              <span>/ cycle</span>
            </div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Short leave — monthly quota</div><div className="rule-desc">How many Short Leaves an employee may take per calendar month. Shown to employees, publisher admins, and event admins on their Rules &amp; Policy page. Whole numbers up to 5.</div></div>
            <div className="rule-inputs">
              <input
                className="mini-input" type="number" min={0} max={SHORT_LEAVE_MAX} step={1}
                value={ruleDraft.shortLeaveMonthlyQuota}
                onKeyDown={blockNonInteger}
                onChange={(e) => setDraftRule('shortLeaveMonthlyQuota', clampWholeNumber(e.target.value, SHORT_LEAVE_MAX))}
              />
              <span>/ month</span>
            </div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Hours worked — day status</div><div className="rule-desc">Below 1st = Absent, below 2nd = Half Day, below 3rd = Short Leave, at/above 3rd = Full day. Max {formatHoursLabel(MAX_WORKED_HOURS)}.</div></div>
            <div className="rule-inputs">
              <select className="mini-input" value={ruleDraft.halfDayMinWorkedHours} onChange={(e) => setDraftRule('halfDayMinWorkedHours', Number(e.target.value))} style={{ width: 68 }}>
                {hoursSelectOptions().map((h) => <option key={h} value={h}>{formatHoursLabel(h)}</option>)}
              </select>
              {' / '}
              <select className="mini-input" value={ruleDraft.shortLeaveMinWorkedHours} onChange={(e) => setDraftRule('shortLeaveMinWorkedHours', Number(e.target.value))} style={{ width: 68 }}>
                {hoursSelectOptions().map((h) => <option key={h} value={h}>{formatHoursLabel(h)}</option>)}
              </select>
              {' / '}
              <select className="mini-input" value={ruleDraft.fullDayMinWorkedHours} onChange={(e) => setDraftRule('fullDayMinWorkedHours', Number(e.target.value))} style={{ width: 68 }}>
                {hoursSelectOptions().map((h) => <option key={h} value={h}>{formatHoursLabel(h)}</option>)}
              </select>
              {' hrs worked'}
            </div>
          </div>
          <SectionSaveBar
            dirty={sectionDirty(ATTENDANCE_KEYS)}
            saving={savingRules}
            onDiscard={() => discardSection(ATTENDANCE_KEYS)}
            onSave={commitRuleEdits}
            title="Apply rule changes?"
            notice="Takes effect immediately for every employee."
            changeLines={changedRuleLabels}
          />
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Approval chain — per module</h2></div>
        <div className="card pad">
          {(['leave', 'attendance', 'expense'] as const).map((m) => (
            <div className="rule-row" key={m}>
              <div><div className="rule-name">Two-level approval — {m === 'attendance' ? 'Attendance regularization' : m.charAt(0).toUpperCase() + m.slice(1)}</div><div className="rule-desc">On: the request goes to the HR Head to approve. Off: the Founder/admin approves it directly. Either way it is a single approval step.</div></div>
              <Toggle checked={ruleDraft.twoLevelApproval[m]} onChange={(v) => setDraftApproval(m, v)} />
            </div>
          ))}
          <SectionSaveBar
            dirty={sectionDirty(APPROVAL_KEYS)}
            saving={savingRules}
            onDiscard={() => discardSection(APPROVAL_KEYS)}
            onSave={commitRuleEdits}
            title="Apply rule changes?"
            notice="Takes effect immediately for every employee."
            changeLines={changedRuleLabels}
          />
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Leave types</h2></div>
        <div className="card pad">
          <div className="rule-desc" style={{ marginBottom: 8 }}>Switch a type off and it disappears everywhere. The number is how many days an employee accrues each month while that type is on. Add your own type below if you need one beyond these.</div>
          {Object.entries(ruleDraft.leaveTypes).map(([type, cfg]) => (
            <div className="rule-row" key={type}>
              <div><div className="rule-name">{type}</div><div className="rule-desc">{cfg.enabled ? `${cfg.perMonth} day${cfg.perMonth === 1 ? '' : 's'} accrued per month.` : 'Switched off — hidden from leave applications and balances.'}</div></div>
              <div className="rule-inputs">
                <input
                  className="mini-input" type="number" min={0} step={0.5}
                  value={cfg.perMonth}
                  disabled={!cfg.enabled}
                  onChange={(e) => setDraftLeaveType(type, { ...cfg, perMonth: Math.max(0, Number(e.target.value) || 0) })}
                />
                <span>/ month</span>
                <Toggle checked={cfg.enabled} onChange={(v) => setDraftLeaveType(type, { ...cfg, enabled: v })} />
              </div>
            </div>
          ))}
          <div className="add-inline" style={{ marginTop: 12 }}>
            <input type="text" placeholder="e.g. Sabbatical" value={newLeaveType} onChange={(e) => setNewLeaveType(e.target.value)} />
            <input className="mini-input" type="number" min={0} step={0.5} value={newLeavePerMonth} onChange={(e) => setNewLeavePerMonth(e.target.value)} style={{ flex: '0 0 80px' }} />
            <button className="btn sm" onClick={addLeaveType}>+ Add leave type</button>
          </div>
          <div className="rule-desc" style={{ marginTop: 6 }}>New types are added switched on, with the monthly allowance you enter beside the name.</div>
          <SectionSaveBar
            dirty={sectionDirty(LEAVE_TYPES_KEYS)}
            saving={savingRules}
            onDiscard={() => discardSection(LEAVE_TYPES_KEYS)}
            onSave={commitRuleEdits}
            title="Apply rule changes?"
            notice="Takes effect immediately for every employee."
            changeLines={changedRuleLabels}
          />
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Other configurable rules</h2></div>
        <div className="card pad">
          <div className="rule-row"><div><div className="rule-name">Late-mark penalty</div><div className="rule-desc">Deduct leave for repeated late marks.</div></div><Toggle checked={ruleDraft.lateMarkPenalty} onChange={(v) => setDraftRule('lateMarkPenalty', v)} /></div>
          <div className="rule-row"><div><div className="rule-name">Geo-fencing</div><div className="rule-desc">Restrict punch-in to within a radius of office location(s).</div></div><Toggle checked={ruleDraft.geoFencing} onChange={(v) => setDraftRule('geoFencing', v)} /></div>
          <div className="rule-row"><div><div className="rule-name">Selfie check-in</div><div className="rule-desc">Require a photo capture at punch in/out.</div></div><Toggle checked={ruleDraft.selfieCheckin} onChange={(v) => setDraftRule('selfieCheckin', v)} /></div>
          <div className="rule-row"><div><div className="rule-name">PF / ESI statutory modules</div><div className="rule-desc">Keep off until headcount/wage crosses the statutory threshold.</div></div><Toggle checked={ruleDraft.pfEsi} onChange={(v) => setDraftRule('pfEsi', v)} /></div>
          <div className="rule-row"><div><div className="rule-name">Optional holiday self-selection</div><div className="rule-desc">Let employees pick their own festival holidays from a pool.</div></div><Toggle checked={ruleDraft.optionalHolidayChoice} onChange={(v) => setDraftRule('optionalHolidayChoice', v)} /></div>
          <div className="rule-row"><div><div className="rule-name">Asset issuance/return checklist</div><div className="rule-desc">Track laptop/ID/access card handover in onboarding and offboarding.</div></div><Toggle checked={ruleDraft.assetChecklist} onChange={(v) => setDraftRule('assetChecklist', v)} /></div>
          <SectionSaveBar
            dirty={sectionDirty(OTHER_RULES_KEYS)}
            saving={savingRules}
            onDiscard={() => discardSection(OTHER_RULES_KEYS)}
            onSave={commitRuleEdits}
            title="Apply rule changes?"
            notice="Takes effect immediately for every employee."
            changeLines={changedRuleLabels}
          />
        </div>
      </section>

      {/* Destructive — hard-deletes real rows (see resetSampleData). Only rendered when this
          deployment's build explicitly opted in via NEXT_PUBLIC_ALLOW_SAMPLE_DATA_RESET; a
          production build that never sets it won't compile this section into the bundle at all.
          The actual enforcement is server-side (see /api/admin/hr-tool/reset-sample-data) —
          this is just so production admins never see a button that would 403 anyway. */}
      {process.env.NEXT_PUBLIC_ALLOW_SAMPLE_DATA_RESET === 'true' && (
        <section className="block">
          <div className="block-head"><h2>Sample data</h2></div>
          <div className="card pad" style={{ borderColor: '#FECACA' }}>
            <div className="rule-desc" style={{ marginBottom: 10 }}>Wipes every sample employee, onboarding record, attendance/leave/expense entry, and ticket — so you can start entering real data. Your Teams, Designations, Rules, and Templates are kept. Your own login is kept so you don&apos;t get locked out. This can&apos;t be undone.</div>
            <button className="btn reject" onClick={handleResetSampleData}>⚠ Delete all sample data</button>
          </div>
        </section>
      )}

      <section className="block">
        <div className="block-head"><h2>Recent changes (audit log)</h2></div>
        <div className="card"><table><thead><tr><th>When</th><th>Who</th><th>Change</th></tr></thead>
          <tbody>{state.auditLog.slice(0, 10).map((a, i) => <tr key={i}><td>{a.ts}</td><td>{a.who}</td><td>{a.change}</td></tr>)}</tbody>
        </table></div>
      </section>
    </>
  );
}
