/**
 * Dev-only: replaces the 2026-10 cycle's attendance / leave / regularizations of the scenario
 * employees with the test scenarios in _shared.ts. Requires backup.ts to have run first.
 * Leave requests that start before the cycle (e.g. a 25–26 Sep leave) are kept — deleting them
 * would change the already-run September payroll — and their in-cycle dates get no punches.
 */
import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '@/shared/database/connection';
import { HrToolRepository } from '@/modules/hr-tool/repository/hr-tool.repository';
import { eachDateInRange, isSunday } from '@/modules/hr-tool/utils/time';
import { formatTime12h } from '@/modules/hr-tool/utils/lateness';
import { CYCLE_FROM, CYCLE_TO, BACKUP_PREFIX, SCENARIOS, NORMAL_DAY, assertDevDb } from './_shared';

loadEnvConfig(process.cwd());

async function main() {
  assertDevDb();
  const backups = await query(`SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE '${BACKUP_PREFIX}%'`);
  if (backups.length === 0) throw new Error('No backup found — run backup.ts first.');

  const repo = new HrToolRepository();
  const [employees, holidays] = await Promise.all([repo.findEmployees(), repo.findHolidays()]);
  const holidaySet = new Set(holidays.map((h) => h.date));
  const workingDays = eachDateInRange(CYCLE_FROM, CYCLE_TO).filter((d) => !isSunday(d) && !holidaySet.has(d));
  console.log(`Cycle ${CYCLE_FROM} → ${CYCLE_TO}: ${workingDays.length} working days\n`);

  for (const s of SCENARIOS) {
    const emp = employees.find((e) => e.id === s.employeeId);
    if (!emp) { console.warn(`skip ${s.employeeId}: not in hr_employees`); continue; }

    await query('DELETE FROM hr_attendance WHERE employee_id = ? AND attendance_date BETWEEN ? AND ?', [emp.id, CYCLE_FROM, CYCLE_TO]);
    await query('DELETE FROM hr_regularizations WHERE employee_id = ? AND reg_date BETWEEN ? AND ?', [emp.id, CYCLE_FROM, CYCLE_TO]);
    await query('DELETE FROM hr_leave_requests WHERE employee_id = ? AND from_date >= ? AND to_date <= ?', [emp.id, CYCLE_FROM, CYCLE_TO]);

    // Dates still covered by a kept (boundary-spanning) approved leave — no punches there.
    const kept = await query<{ from_date: string | Date; to_date: string | Date }>(
      "SELECT from_date, to_date FROM hr_leave_requests WHERE employee_id = ? AND status = 'approved' AND to_date >= ? AND from_date <= ?",
      [emp.id, CYCLE_FROM, CYCLE_TO]
    );
    const ymd = (v: string | Date) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));
    const keptDates = new Set(kept.flatMap((k) => eachDateInRange(ymd(k.from_date), ymd(k.to_date))));

    let rows = 0;
    for (const date of workingDays) {
      if (keptDates.has(date)) continue;
      const day = s.days[date] ?? NORMAL_DAY;
      if (day === 'none') continue;
      await repo.upsertAttendance({
        employeeId: emp.id, emp: emp.name, date, status: 'Present',
        inTime: day.in != null ? formatTime12h(day.in) : '—', inMinutes: day.in,
        outTime: day.out != null ? formatTime12h(day.out) : '—', outMinutes: day.out,
        inGeo: null, outGeo: null,
      });
      rows++;
    }
    for (const l of s.leaves || []) {
      await repo.insertLeaveRequest({
        id: l.id, employeeId: emp.id, emp: emp.name, type: 'Casual', from: l.from, to: l.to, remarks: 'Payroll test',
        stage: l.status === 'pending' ? 'hr' : 'done', status: l.status, rmRemarks: '', hrRemarks: '', halfDay: l.halfDay || null,
      });
    }
    for (const r of s.regularizations || []) {
      await repo.insertRegularization({
        id: r.id, employeeId: emp.id, emp: emp.name, date: r.date, punchType: r.punchType, requestedTime: r.time,
        reason: r.reason, stage: 'hr', status: 'pending', rmRemarks: '', hrRemarks: '', source: 'employee',
      });
    }
    console.log(`${emp.id} ${emp.name.padEnd(20)} ${s.label} — ${rows} attendance rows, ${(s.leaves || []).length} leave, ${(s.regularizations || []).length} regularization${keptDates.size ? ` (kept earlier leave on ${[...keptDates].filter((d) => d >= CYCLE_FROM).join(', ')})` : ''}`);
  }
  console.log('\nDone. Run verify.ts to compare payroll with the expected results.');
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => closeDbConnection());
