'use client';

import { useEffect, useState } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import { computeCtcBreakdown } from '../utils';
import type { HrLeaveTypeConfig, HrRules } from '../types';

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

function clampWorkedHours(raw: string): number {
  const n = Number(raw);
  if (!isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_WORKED_HOURS);
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
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

  // Every toggle and number field below edits THIS local copy, not the saved rules. Before, each
  // one called persistRules() directly, so a single keystroke in a number field was a server
  // write plus an audit-log entry plus a full-tree re-render — the "it saves/reloads as I type"
  // problem. Nothing leaves this component now until Save changes is confirmed.
  const [ruleDraft, setRuleDraft] = useState<HrRules>(r);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  // Re-sync when the saved rules genuinely change (initial load, or a save completing). Local
  // edits don't touch `r`, so this can't clobber work in progress.
  useEffect(() => { setRuleDraft(r); }, [r]);

  const rulesDirty = JSON.stringify(ruleDraft) !== JSON.stringify(r);

  // Spelled out in the confirmation rather than a bare "are you sure?", so the admin can see
  // exactly what they're about to apply — these settings reach payroll.
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
  function discardRuleEdits() { setRuleDraft(r); }
  async function commitRuleEdits() {
    setSavingRules(true);
    await persistRules(ruleDraft);
    logRuleChange('Updated attendance, approval, leave-type and other rules');
    setSavingRules(false);
    setConfirmSaveOpen(false);
  }

  // Live preview against the (unsaved) draft values in the fields above, not the saved rules —
  // so admin sees the effect of an edit before clicking Save.
  const sampleBreakdown = computeCtcBreakdown(600000, {
    basicPct: Number(ctcBasicPct) || 0, hraPctOfBasic: Number(ctcHraPct) || 0,
    convenienceType: ctcConvType, convenienceValue: Number(ctcConvValue) || 0,
  });


  async function addTeam() {
    const name = newTeam.trim();
    if (!name) return;
    if (state.teams.some((t) => t.name === name)) { alert('That team already exists.'); return; }
    await persistTeams([...state.teams, { name, manager: null }]);
    logRuleChange(`Added team: ${name}`);
    setNewTeam('');
  }
  async function removeTeam(name: string) {
    if (state.employees.some((e) => e.team === name && e.status !== 'exited')) {
      alert("Can't remove a team that still has employees assigned. Move them to another team first.");
      return;
    }
    await persistTeams(state.teams.filter((t) => t.name !== name));
    logRuleChange(`Removed team: ${name}`);
  }
  async function setTeamManager(name: string, manager: string) {
    await persistTeams(state.teams.map((t) => (t.name === name ? { ...t, manager: manager || null } : t)));
    logRuleChange(`Set Reporting Manager for ${name} to ${manager || 'none'}`);
  }

  async function addDesignation() {
    const name = newDesig.trim();
    if (!name || state.orgStructure.designations.includes(name)) return;
    await persistDesignations([...state.orgStructure.designations, name]);
    logRuleChange(`Added designation: ${name}`);
    setNewDesig('');
  }
  async function removeDesignation(name: string) {
    const count = state.employees.filter((e) => e.designation === name).length;
    const msg = count > 0 ? `${count} employee(s) currently hold "${name}". Remove it from the list anyway? Their existing records won't change.` : `Remove "${name}" from Organisation Structure?`;
    if (!confirm(msg)) return;
    await persistDesignations(state.orgStructure.designations.filter((d) => d !== name));
    logRuleChange(`Removed designation: ${name}`);
  }

  async function addExpenseCategory() {
    const name = newExpCat.trim();
    if (!name || state.orgStructure.expenseCategories.includes(name)) return;
    await persistExpenseCategories([...state.orgStructure.expenseCategories, name]);
    logRuleChange(`Added expense category: ${name}`);
    setNewExpCat('');
  }
  async function removeExpenseCategory(name: string) {
    const count = state.expenses.filter((x) => x.category === name).length;
    const msg = count > 0 ? `${count} expense record(s) use "${name}". Remove it from the list anyway? Their existing records won't change.` : `Remove "${name}" from Organisation Structure?`;
    if (!confirm(msg)) return;
    await persistExpenseCategories(state.orgStructure.expenseCategories.filter((c) => c !== name));
    logRuleChange(`Removed expense category: ${name}`);
  }

  async function addRequiredDoc() {
    const name = newReqDoc.trim();
    if (!name || state.orgStructure.requiredDocuments.includes(name)) return;
    await persistRequiredDocuments([...state.orgStructure.requiredDocuments, name]);
    logRuleChange(`Added required onboarding document: ${name}`);
    setNewReqDoc('');
  }
  async function removeRequiredDoc(name: string) {
    await persistRequiredDocuments(state.orgStructure.requiredDocuments.filter((d) => d !== name));
    logRuleChange(`Removed required onboarding document: ${name}`);
  }

  async function addHoliday() {
    if (!newHolidayDate || !newHolidayName.trim()) { alert('Both a date and a name are needed.'); return; }
    const holidays = [...state.orgStructure.holidays, { date: newHolidayDate, name: newHolidayName.trim() }].sort((a, b) => a.date.localeCompare(b.date));
    await persistHolidays(holidays);
    logRuleChange(`Added holiday: ${newHolidayName.trim()} (${newHolidayDate})`);
    setNewHolidayDate(''); setNewHolidayName('');
  }
  async function removeHoliday(date: string, name: string) {
    await persistHolidays(state.orgStructure.holidays.filter((h) => !(h.date === date && h.name === name)));
    logRuleChange(`Removed holiday: ${name} (${date})`);
  }

  async function saveCtcSplit() {
    const basicPct = Number(ctcBasicPct) || 0, hraPct = Number(ctcHraPct) || 0, convValue = Number(ctcConvValue) || 0;
    if (basicPct <= 0 || basicPct > 100) { alert('Basic must be between 0 and 100% of monthly salary.'); return; }
    if (hraPct < 0 || hraPct > 100) { alert('HRA must be between 0 and 100% of Basic.'); return; }
    if (ctcConvType === 'percent' && (convValue < 0 || convValue > 100)) { alert('Convenience Allowance % must be between 0 and 100.'); return; }
    if (convValue < 0) { alert('Convenience Allowance cannot be negative.'); return; }
    if (sampleBreakdown.specialAllowance < 0) {
      alert('Basic + HRA + Convenience already exceeds the ₹50,000/month sample salary shown below — Special Allowance can\'t go negative. Lower one of them first. (A lower-CTC employee would hit this even sooner — check their individual CTC structure override too.)');
      return;
    }
    await persistRules({ ...r, ctcSplit: { basicPct, hraPctOfBasic: hraPct, convenienceType: ctcConvType, convenienceValue: convValue } });
    logRuleChange(`Updated CTC structure: Basic ${basicPct}% of salary / HRA ${hraPct}% of Basic / Convenience ${ctcConvType === 'amount' ? '₹' + convValue : convValue + '%'} — Special Allowance auto-computed as the remainder`);
  }

  async function addLeaveType() {
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
        <div><h1 className="page-title">Rules &amp; Organisation Structure</h1><div className="page-sub">Build out your org here — designations, teams, categories — and every rule below is a toggle you can flip anytime.</div></div>
        <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
      </div>

      <section className="block">
        <div className="block-head"><h2>Teams &amp; Reporting Managers</h2></div>
        <div className="card pad">
          <div className="rule-desc" style={{ marginBottom: 10 }}>Add as many teams as you need. Each team has one Reporting Manager, who then sees only that team plus their own chain upward.</div>
          <table><thead><tr><th>Team</th><th>Reporting Manager</th><th></th></tr></thead>
            <tbody>
              {state.teams.map((t) => (
                <tr key={t.name}><td>{t.name}</td>
                  <td><select value={t.manager || ''} onChange={(e) => setTeamManager(t.name, e.target.value)} style={{ width: 220 }}>
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
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Designations</h2></div>
        <div className="card pad">
          <div className="rule-desc" style={{ marginBottom: 10 }}>This list feeds the Designation dropdown everywhere — offer letters, onboarding, directory, and Assigning IDs.</div>
          <div className="chip-list">{state.orgStructure.designations.map((d) => <span className="chip" key={d}>{d} <button onClick={() => removeDesignation(d)} title="Remove">×</button></span>)}</div>
          <div className="add-inline">
            <input type="text" placeholder="e.g. Growth Marketer" value={newDesig} onChange={(e) => setNewDesig(e.target.value)} />
            <button className="btn sm" onClick={addDesignation}>+ Add designation</button>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Expense categories</h2></div>
        <div className="card pad">
          <div className="chip-list">{state.orgStructure.expenseCategories.map((c) => <span className="chip" key={c}>{c} <button onClick={() => removeExpenseCategory(c)} title="Remove">×</button></span>)}</div>
          <div className="add-inline">
            <input type="text" placeholder="e.g. Events" value={newExpCat} onChange={(e) => setNewExpCat(e.target.value)} />
            <button className="btn sm" onClick={addExpenseCategory}>+ Add category</button>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Required onboarding documents</h2></div>
        <div className="card pad">
          <div className="rule-desc" style={{ marginBottom: 10 }}>This checklist is what every new hire is asked to upload, and what shows up in every employee&apos;s My Documents.</div>
          <div className="chip-list">{state.orgStructure.requiredDocuments.map((d) => <span className="chip" key={d}>{d} <button onClick={() => removeRequiredDoc(d)} title="Remove">×</button></span>)}</div>
          <div className="add-inline">
            <input type="text" placeholder="e.g. PF Nomination Form" value={newReqDoc} onChange={(e) => setNewReqDoc(e.target.value)} />
            <button className="btn sm" onClick={addRequiredDoc}>+ Add document type</button>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Holiday calendar</h2></div>
        <div className="card pad">
          <div className="rule-desc" style={{ marginBottom: 10 }}>Feeds the attendance calendar&apos;s week-off/holiday colouring and the optional-holiday pool.</div>
          <table><thead><tr><th>Date</th><th>Holiday</th><th></th></tr></thead>
            <tbody>{state.orgStructure.holidays.map((h) => (
              <tr key={h.date + h.name}><td>{h.date}</td><td>{h.name}</td><td style={{ textAlign: 'right' }}><button className="btn ghost sm" onClick={() => removeHoliday(h.date, h.name)}>Remove</button></td></tr>
            ))}</tbody>
          </table>
          <div className="add-inline" style={{ marginTop: 12 }}>
            <input type="date" style={{ maxWidth: 170 }} value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} />
            <input type="text" placeholder="e.g. Holi" value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} />
            <button className="btn sm" onClick={addHoliday}>+ Add holiday</button>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>CTC structure</h2></div>
        <div className="card pad">
          <div className="rule-desc" style={{ marginBottom: 10 }}>
            Used to split monthly salary into Basic / HRA / Convenience Allowance / Special Allowance wherever it&apos;s shown (offer letters, employment agreements). Special Allowance is never set directly — it&apos;s always whatever&apos;s left after the other three.
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Basic</div><div className="rule-desc">% of monthly salary (ctc ÷ 12).</div></div>
            <div className="rule-inputs"><input className="mini-input" type="number" value={ctcBasicPct} onChange={(e) => setCtcBasicPct(e.target.value)} />%</div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">HRA</div><div className="rule-desc">% of Basic — auto-calculated from Basic above, not of salary directly.</div></div>
            <div className="rule-inputs"><input className="mini-input" type="number" value={ctcHraPct} onChange={(e) => setCtcHraPct(e.target.value)} />% of Basic</div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Convenience Allowance</div><div className="rule-desc">A flat Rupees/month amount, or a % of monthly salary — your choice.</div></div>
            <div className="rule-inputs">
              <select value={ctcConvType} onChange={(e) => setCtcConvType(e.target.value as 'amount' | 'percent')} style={{ marginRight: 8 }}>
                <option value="amount">Amount</option>
                <option value="percent">%</option>
              </select>
              {ctcConvType === 'amount' && '₹'}
              <input className="mini-input" type="number" value={ctcConvValue} onChange={(e) => setCtcConvValue(e.target.value)} />
              {ctcConvType === 'percent' && '%'}
            </div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Special Allowance</div><div className="rule-desc">Auto-calculated — whatever&apos;s left of monthly salary after Basic, HRA, and Convenience Allowance.</div></div>
          </div>
          <div className="rule-inputs" style={{ marginTop: 4 }}>
            <button className="btn sm" onClick={saveCtcSplit}>Save CTC structure</button>
          </div>
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
            <div><div className="rule-name">Shift timings (punch in / punch out)</div><div className="rule-desc">Official shift start and end time.</div></div>
            <div className="rule-inputs">
              In <input type="time" value={ruleDraft.shiftStartTime} onChange={(e) => setDraftRule('shiftStartTime', e.target.value)} style={{ width: 120 }} />
              Out <input type="time" value={ruleDraft.shiftEndTime} onChange={(e) => setDraftRule('shiftEndTime', e.target.value)} style={{ width: 120 }} />
            </div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Grace period</div><div className="rule-desc">Minutes after shift start before a punch-in counts as late.</div></div>
            <div className="rule-inputs"><input className="mini-input" type="number" value={ruleDraft.shiftGraceMinutes} onChange={(e) => setDraftRule('shiftGraceMinutes', Number(e.target.value))} /> min</div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Regularization limit per payroll cycle</div><div className="rule-desc">How many regularization requests an employee may submit per payroll cycle (26th → 25th). Dates are limited to that same cycle — earlier cycles are already paid out and can no longer be corrected.</div></div>
            <div className="rule-inputs"><input className="mini-input" type="number" value={ruleDraft.regularizationMonthlyQuota} onChange={(e) => setDraftRule('regularizationMonthlyQuota', Number(e.target.value))} /> / cycle</div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Hours worked — day status</div><div className="rule-desc">Total hours worked decides the day — counted only inside the shift window above, so time before the shift starts or after it ends is not credited. Maximum {MAX_WORKED_HOURS} hrs. Below the first number is Absent, below the second is Half Day, below the third is Short Leave, at or above it is a full day. Punch-in time no longer changes the outcome — it only marks the arrival on time or late against the grace period above.</div></div>
            <div className="rule-inputs">
              <input className="mini-input" type="number" step="0.25" min={0} max={MAX_WORKED_HOURS} value={ruleDraft.halfDayMinWorkedHours} onChange={(e) => setDraftRule('halfDayMinWorkedHours', clampWorkedHours(e.target.value))} style={{ width: 70 }} />
              {' / '}
              <input className="mini-input" type="number" step="0.25" min={0} max={MAX_WORKED_HOURS} value={ruleDraft.shortLeaveMinWorkedHours} onChange={(e) => setDraftRule('shortLeaveMinWorkedHours', clampWorkedHours(e.target.value))} style={{ width: 70 }} />
              {' / '}
              <input className="mini-input" type="number" step="0.25" min={0} max={MAX_WORKED_HOURS} value={ruleDraft.fullDayMinWorkedHours} onChange={(e) => setDraftRule('fullDayMinWorkedHours', clampWorkedHours(e.target.value))} style={{ width: 70 }} />
              {' hrs worked'}
            </div>
          </div>
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
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Sample data</h2></div>
        <div className="card pad" style={{ borderColor: '#FECACA' }}>
          <div className="rule-desc" style={{ marginBottom: 10 }}>Wipes every sample employee, onboarding record, attendance/leave/expense entry, and ticket — so you can start entering real data. Your Teams, Designations, Rules, and Templates are kept. Your own login is kept so you don&apos;t get locked out. This can&apos;t be undone.</div>
          <button className="btn reject" onClick={handleResetSampleData}>⚠ Delete all sample data</button>
        </div>
      </section>

      {/* Sticky because the drafted rules span four sections — the admin shouldn't have to
          scroll hunting for the button after changing something near the top. */}
      {rulesDirty && (
        <div className="rules-savebar">
          <div>
            <div className="rule-name">You have unsaved rule changes</div>
            <div className="rule-desc">Nothing is applied until you save. These rules affect attendance status, approvals and payroll.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn" onClick={discardRuleEdits} disabled={savingRules}>Discard</button>
            <button className="btn primary" onClick={() => setConfirmSaveOpen(true)} disabled={savingRules}>Save changes</button>
          </div>
        </div>
      )}
      {confirmSaveOpen && (
        <ModalShell
          title="Apply rule changes?"
          onClose={() => setConfirmSaveOpen(false)}
          actions={[
            { label: 'Cancel', cls: 'btn', onClick: () => setConfirmSaveOpen(false) },
            { label: savingRules ? 'Saving…' : 'Yes, apply changes', cls: 'btn primary', onClick: commitRuleEdits },
          ]}
        >
          <div className="notice">These rules drive attendance status, approval routing and payroll deductions for every employee. Applying them takes effect immediately.</div>
          <div className="field">
            <label className="field-label">About to change</label>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {changedRuleLabels.length === 0
                ? <li className="meta">No differences detected.</li>
                : changedRuleLabels.map((label) => <li key={label} style={{ fontSize: 13, marginBottom: 2 }}>{label}</li>)}
            </ul>
          </div>
        </ModalShell>
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
