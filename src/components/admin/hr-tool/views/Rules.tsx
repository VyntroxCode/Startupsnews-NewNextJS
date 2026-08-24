'use client';

import { useState } from 'react';
import { useHrTool } from '../HrToolContext';
import { computeCtcBreakdown } from '../utils';
import type { HrRules } from '../types';

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

  // Live preview against the (unsaved) draft values in the fields above, not the saved rules —
  // so admin sees the effect of an edit before clicking Save.
  const sampleBreakdown = computeCtcBreakdown(600000, {
    basicPct: Number(ctcBasicPct) || 0, hraPctOfBasic: Number(ctcHraPct) || 0,
    convenienceType: ctcConvType, convenienceValue: Number(ctcConvValue) || 0,
  });

  async function updateRule<K extends keyof HrRules>(key: K, value: HrRules[K]) {
    await persistRules({ ...r, [key]: value });
    logRuleChange(`Set ${String(key)} to "${value}"`);
  }
  async function updateRuleBool(key: keyof HrRules, value: boolean) {
    await persistRules({ ...r, [key]: value });
    logRuleChange(`${value ? 'Enabled' : 'Disabled'} ${String(key)}`);
  }
  async function updateApprovalRule(mod: 'leave' | 'attendance' | 'expense', value: boolean) {
    await persistRules({ ...r, twoLevelApproval: { ...r.twoLevelApproval, [mod]: value } });
    logRuleChange(`${value ? 'Enabled' : 'Disabled'} two-level approval for ${mod}`);
  }
  async function updateLeaveType(type: string, value: boolean) {
    await persistRules({ ...r, leaveTypes: { ...r.leaveTypes, [type]: value } });
    logRuleChange(`${value ? 'Enabled' : 'Disabled'} leave type: ${type}`);
  }

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
    if (r.leaveTypes[name] !== undefined) { alert('That leave type already exists.'); return; }
    await persistRules({ ...r, leaveTypes: { ...r.leaveTypes, [name]: true } });
    logRuleChange(`Added leave type: ${name}`);
    setNewLeaveType('');
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
              In <input type="time" value={r.shiftStartTime} onChange={(e) => updateRule('shiftStartTime', e.target.value)} style={{ width: 120 }} />
              Out <input type="time" value={r.shiftEndTime} onChange={(e) => updateRule('shiftEndTime', e.target.value)} style={{ width: 120 }} />
            </div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Grace period</div><div className="rule-desc">Minutes after shift start before a punch-in counts as late.</div></div>
            <div className="rule-inputs"><input className="mini-input" type="number" value={r.shiftGraceMinutes} onChange={(e) => updateRule('shiftGraceMinutes', Number(e.target.value))} /> min</div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Half day — punch-in cutoff</div><div className="rule-desc">Hours after shift start up to which a punch-in still counts as a Half Day (each costs half a day&apos;s pay). Later than this counts as Absent.</div></div>
            <div className="rule-inputs"><input className="mini-input" type="number" step="0.5" value={r.halfDayThresholdHours} onChange={(e) => updateRule('halfDayThresholdHours', Number(e.target.value))} /> hrs after shift start</div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Regularization window</div><div className="rule-desc">How many days after an attendance date an employee may still request regularization.</div></div>
            <div className="rule-inputs"><input className="mini-input" type="number" value={r.regularizationWindowDays} onChange={(e) => updateRule('regularizationWindowDays', Number(e.target.value))} /> days</div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Admin override past window</div><div className="rule-desc">Allow HR to manually accept a regularization request submitted after the window has closed.</div></div>
            <Toggle checked={r.regularizationOverride} onChange={(v) => updateRuleBool('regularizationOverride', v)} />
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Regularization monthly limit</div><div className="rule-desc">How many regularization requests an employee may submit per calendar month. Shown to employees on Rules &amp; Policy; the Apply button only appears on a late or grace-period punch-in.</div></div>
            <div className="rule-inputs"><input className="mini-input" type="number" value={r.regularizationMonthlyQuota} onChange={(e) => updateRule('regularizationMonthlyQuota', Number(e.target.value))} /> / month</div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Short leave — punch-in cutoff</div><div className="rule-desc">Hours after shift start (past the grace period) up to which a punch-in counts as a Short Leave. Every 3rd Short Leave converts into one Half Day for pay — leftovers that don&apos;t reach 3 carry forward into the next payroll cycle instead of resetting.</div></div>
            <div className="rule-inputs"><input className="mini-input" type="number" step="0.5" value={r.shortLeaveMaxHours} onChange={(e) => updateRule('shortLeaveMaxHours', Number(e.target.value))} /> hrs after shift start</div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Short leave — monthly quota</div><div className="rule-desc">How many Short Leaves an employee may take per calendar month (shown on Rules &amp; Policy — not yet enforced as a hard cap on punch-in itself).</div></div>
            <div className="rule-inputs"><input className="mini-input" type="number" value={r.shortLeaveMonthlyQuota} onChange={(e) => updateRule('shortLeaveMonthlyQuota', Number(e.target.value))} /> / month</div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Hours worked — secondary rule</div><div className="rule-desc">A day&apos;s status is the WORSE of arrival time (above) and total hours worked (punch-out minus punch-in) — an on-time arrival doesn&apos;t save a day where they left early, and working long hours doesn&apos;t undo a late arrival. Below the first number is Absent, up to the second is Half Day, up to the third is Short Leave, above it is a full day.</div></div>
            <div className="rule-inputs">
              <input className="mini-input" type="number" step="0.25" value={r.halfDayMinWorkedHours} onChange={(e) => updateRule('halfDayMinWorkedHours', Number(e.target.value))} style={{ width: 70 }} />
              {' / '}
              <input className="mini-input" type="number" step="0.25" value={r.shortLeaveMinWorkedHours} onChange={(e) => updateRule('shortLeaveMinWorkedHours', Number(e.target.value))} style={{ width: 70 }} />
              {' / '}
              <input className="mini-input" type="number" step="0.25" value={r.fullDayMinWorkedHours} onChange={(e) => updateRule('fullDayMinWorkedHours', Number(e.target.value))} style={{ width: 70 }} />
              {' hrs worked'}
            </div>
          </div>
          <div className="rule-row">
            <div><div className="rule-name">Salary calculation period</div><div className="rule-desc">Defines the payroll cycle used across payroll, attendance-linked pay, and reports.</div></div>
            <div className="rule-inputs">
              From day <select value={r.salaryPeriodFrom} onChange={(e) => updateRule('salaryPeriodFrom', Number(e.target.value))} style={{ width: 80 }}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              To <select value={String(r.salaryPeriodTo)} onChange={(e) => updateRule('salaryPeriodTo', e.target.value === 'last' ? 'last' : String(Number(e.target.value)))} style={{ width: 140 }}>
                <option value="last">Last day of month</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Approval chain — per module</h2></div>
        <div className="card pad">
          {(['leave', 'attendance', 'expense'] as const).map((m) => (
            <div className="rule-row" key={m}>
              <div><div className="rule-name">Two-level approval — {m === 'attendance' ? 'Attendance regularization' : m.charAt(0).toUpperCase() + m.slice(1)}</div><div className="rule-desc">On: Reporting Manager approves first, then HR Head. Off: HR Head approves directly.</div></div>
              <Toggle checked={r.twoLevelApproval[m]} onChange={(v) => updateApprovalRule(m, v)} />
            </div>
          ))}
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Leave types</h2></div>
        <div className="card pad">
          <div className="rule-desc" style={{ marginBottom: 8 }}>Untick a type and it disappears everywhere. Add a custom type if you need one beyond the defaults.</div>
          {Object.entries(r.leaveTypes).map(([type, on]) => (
            <div className="rule-row" key={type}><div className="rule-name">{type}</div><Toggle checked={on} onChange={(v) => updateLeaveType(type, v)} /></div>
          ))}
          <div className="add-inline" style={{ marginTop: 12 }}>
            <input type="text" placeholder="e.g. Sabbatical" value={newLeaveType} onChange={(e) => setNewLeaveType(e.target.value)} />
            <button className="btn sm" onClick={addLeaveType}>+ Add leave type</button>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Other configurable rules</h2></div>
        <div className="card pad">
          <div className="rule-row"><div><div className="rule-name">Late-mark penalty</div><div className="rule-desc">Deduct leave for repeated late marks.</div></div><Toggle checked={r.lateMarkPenalty} onChange={(v) => updateRuleBool('lateMarkPenalty', v)} /></div>
          <div className="rule-row"><div><div className="rule-name">Geo-fencing</div><div className="rule-desc">Restrict punch-in to within a radius of office location(s).</div></div><Toggle checked={r.geoFencing} onChange={(v) => updateRuleBool('geoFencing', v)} /></div>
          <div className="rule-row"><div><div className="rule-name">Selfie check-in</div><div className="rule-desc">Require a photo capture at punch in/out.</div></div><Toggle checked={r.selfieCheckin} onChange={(v) => updateRuleBool('selfieCheckin', v)} /></div>
          <div className="rule-row"><div><div className="rule-name">PF / ESI statutory modules</div><div className="rule-desc">Keep off until headcount/wage crosses the statutory threshold.</div></div><Toggle checked={r.pfEsi} onChange={(v) => updateRuleBool('pfEsi', v)} /></div>
          <div className="rule-row"><div><div className="rule-name">Optional holiday self-selection</div><div className="rule-desc">Let employees pick their own festival holidays from a pool.</div></div><Toggle checked={r.optionalHolidayChoice} onChange={(v) => updateRuleBool('optionalHolidayChoice', v)} /></div>
          <div className="rule-row"><div><div className="rule-name">Asset issuance/return checklist</div><div className="rule-desc">Track laptop/ID/access card handover in onboarding and offboarding.</div></div><Toggle checked={r.assetChecklist} onChange={(v) => updateRuleBool('assetChecklist', v)} /></div>
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Sample data</h2></div>
        <div className="card pad" style={{ borderColor: '#FECACA' }}>
          <div className="rule-desc" style={{ marginBottom: 10 }}>Wipes every sample employee, onboarding record, attendance/leave/expense entry, and ticket — so you can start entering real data. Your Teams, Designations, Rules, and Templates are kept. Your own login is kept so you don&apos;t get locked out. This can&apos;t be undone.</div>
          <button className="btn reject" onClick={handleResetSampleData}>⚠ Delete all sample data</button>
        </div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Recent changes (audit log)</h2></div>
        <div className="card"><table><thead><tr><th>When</th><th>Who</th><th>Change</th></tr></thead>
          <tbody>{state.auditLog.slice(0, 10).map((a, i) => <tr key={i}><td>{a.ts}</td><td>{a.who}</td><td>{a.change}</td></tr>)}</tbody>
        </table></div>
      </section>
    </>
  );
}
