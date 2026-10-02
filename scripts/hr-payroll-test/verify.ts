/**
 * Dev-only: prints the 2026-10 payroll exactly as the Payroll page computes it
 * (HrToolService.computePayrollForMonth) next to the expected result of each test scenario.
 * Re-run after every approve/reject to see the effect. Read-only.
 */
import { loadEnvConfig } from '@next/env';
import { closeDbConnection } from '@/shared/database/connection';
import { hrToolService, getPayrollRoster } from '@/app/api/admin/hr-tool/_lib';
import { HrToolRepository } from '@/modules/hr-tool/repository/hr-tool.repository';
import { todayStr } from '@/modules/hr-tool/utils/time';
import { CYCLE, CYCLE_TO, SCENARIOS, assertDevDb } from './_shared';

loadEnvConfig(process.cwd());

async function main() {
  assertDevDb();
  const today = todayStr();
  if (today <= CYCLE_TO) {
    console.warn(`⚠ todayStr() = ${today}: days after it count as "future" (paid, not judged). Set NEXT_PUBLIC_HR_TEST_TODAY=2026-10-26.\n`);
  }
  const [preview, employees, regs, leaves] = await Promise.all([
    hrToolService.computePayrollForMonth(CYCLE, await getPayrollRoster()),
    new HrToolRepository().findEmployees(),
    new HrToolRepository().findRegularizations(),
    new HrToolRepository().findLeaveRequests(),
  ]);
  const ctcById = new Map(employees.map((e) => [e.id, e.ctc || 0]));
  console.log(`Payroll ${CYCLE} (${preview.periodFrom} → ${preview.periodTo}), today = ${today}\n`);
  console.log('Employee              Tot  Off  Present  Leave  Half  Short  LOP   Gross    Net     | Expected LOP  Check');

  let failures = 0;
  for (const e of preview.entries) {
    const s = SCENARIOS.find((x) => x.employeeId === e.employeeId);
    const ctc = ctcById.get(e.employeeId) || 0;
    const paid = e.totalDays - e.lopDays;
    const grossOk = e.monthlyGross === Math.round((paid / e.totalDays) * (ctc / 12));
    const daysOk = e.totalDays === 30 && e.weekOffDays === 7;
    // A pending request no longer pending (you decided it) changes the expected LOP — only
    // compare while every one of this scenario's requests is still pending.
    const ids = [...(s?.leaves || []).filter((l) => l.status === 'pending').map((l) => l.id), ...(s?.regularizations || []).map((r) => r.id)];
    const stillPending = ids.every((id) => (regs.find((r) => r.id === id) || leaves.find((l) => l.id === id))?.status === 'pending');
    const lopOk = s?.expectedLop == null || !stillPending || Math.abs(e.lopDays - s.expectedLop) < 0.001;
    const ok = grossOk && daysOk && lopOk;
    if (!ok) failures++;
    const expected = s?.expectedLop == null ? '(balance)' : stillPending ? String(s.expectedLop) : '(decided)';
    console.log(
      `${e.emp.padEnd(20)} ${String(e.totalDays).padStart(4)} ${String(e.weekOffDays).padStart(4)} ${String(e.presentDays).padStart(8)} ${String(e.leaveDays).padStart(6)} ${String(e.halfDayDays).padStart(5)} ${String(e.shortLeaveDays).padStart(6)} ${String(e.lopDays).padStart(5)} ${String(e.monthlyGross).padStart(8)} ${String(e.netPay).padStart(8)}  | ${expected.padStart(12)}  ${ok ? '✓' : '✗'}${!grossOk ? ' gross≠formula' : ''}${!daysOk ? ' days≠30/7' : ''}${!lopOk ? ' LOP mismatch' : ''}`
    );
    if (s) console.log(`  ↳ ${s.label}. ${s.note}`);
  }
  if (preview.missingCtcEmployees.length) console.log(`\nMissing CTC (blocks Run Payroll): ${preview.missingCtcEmployees.join(', ')}`);
  console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} employee(s) failed a check.`}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => closeDbConnection());
