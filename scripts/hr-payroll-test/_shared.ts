/**
 * Dev-only payroll test for the 2026-10 cycle (26 Sep → 25 Oct 2026) — shared constants.
 * Flow: backup.ts → seed.ts → (manual testing in the dev admin, verify.ts any time) → restore.ts.
 * Needs NEXT_PUBLIC_HR_TEST_TODAY=2026-10-26 in the dev .env (see todayStr in
 * src/modules/hr-tool/utils/time.ts) so the seeded future days are judged and Run Payroll opens.
 * NEVER run against live.
 */

export const CYCLE = '2026-10';
export const CYCLE_FROM = '2026-09-26';
export const CYCLE_TO = '2026-10-25';
export const ID_PREFIX = 'TEST-';
export const BACKUP_PREFIX = 'zz_hrtest_bak_';

/** Every HR table the seed or the manual test (decisions, punches, runs) can change. */
export const TABLES = [
  'hr_attendance', 'hr_attendance_overrides', 'hr_punch_log', 'hr_leave_requests', 'hr_regularizations',
  'hr_payroll_runs', 'hr_payroll_entries', 'hr_audit_log', 'hr_employees',
] as const;

/** Refuse to touch anything but the local dev database. */
export function assertDevDb(): void {
  const host = process.env.DB_HOST || '';
  if (!['127.0.0.1', 'localhost'].includes(host)) {
    throw new Error(`Refusing to run: DB_HOST is "${host}", expected the local dev database.`);
  }
}

const IN = 600;   // 10:00
const OUT = 1110; // 18:30

/** One day's punches; `null` in/out = no punch that side. A date missing from `days` = no row. */
export interface DayPunch { in: number | null; out: number | null }

export interface Scenario {
  employeeId: string;
  label: string;
  /** Overrides for specific dates; every other working day is a normal 10:00–18:30 day. */
  days: Record<string, DayPunch | 'none'>;
  leaves?: { id: string; from: string; to: string; status: 'approved' | 'pending'; halfDay?: 'first' | 'second' }[];
  regularizations?: { id: string; date: string; punchType: 'in' | 'out'; time: string; reason: string }[];
  /** LOP expected while every pending request is still pending (counts as not approved), for
   * scenarios that don't depend on the leave balance. */
  expectedLop?: number;
  note: string;
}

export const SCENARIOS: Scenario[] = [
  { employeeId: 'E-108', label: 'Present every working day', days: {}, expectedLop: 0,
    note: 'Full salary.' },
  { employeeId: 'E-109', label: '3 absent days (no punch)', days: { '2026-09-29': 'none', '2026-10-08': 'none', '2026-10-22': 'none' }, expectedLop: 3,
    note: '3 days LOP.' },
  { employeeId: 'E-104', label: '3 half days (10:00–15:00)', days: { '2026-09-30': { in: IN, out: 900 }, '2026-10-09': { in: IN, out: 900 }, '2026-10-23': { in: IN, out: 900 } }, expectedLop: 1.5,
    note: '3 × ½ day = 1.5 LOP.' },
  { employeeId: 'E-106', label: '4 short leaves (10:00–17:45)', days: { '2026-10-01': { in: IN, out: 1065 }, '2026-10-07': { in: IN, out: 1065 }, '2026-10-14': { in: IN, out: 1065 }, '2026-10-21': { in: IN, out: 1065 } }, expectedLop: 1,
    note: 'First 2 short leaves free, next 2 cost ½ day each = 1 LOP.' },
  { employeeId: 'E-105', label: 'Approved leave 5–6 Oct + pending leave 19 Oct', days: { '2026-10-05': 'none', '2026-10-06': 'none', '2026-10-19': 'none' },
    leaves: [
      { id: `${ID_PREFIX}L-E105-1005`, from: '2026-10-05', to: '2026-10-06', status: 'approved' },
      { id: `${ID_PREFIX}L-E105-1019`, from: '2026-10-19', to: '2026-10-19', status: 'pending' },
    ],
    note: 'Approve 19 Oct → paid if balance allows; reject → 19 Oct stays absent (1 LOP).' },
  { employeeId: 'E-103', label: 'Approved leave 12–16 Oct (beyond balance)', days: { '2026-10-12': 'none', '2026-10-13': 'none', '2026-10-14': 'none', '2026-10-15': 'none', '2026-10-16': 'none' },
    leaves: [{ id: `${ID_PREFIX}L-E103-1012`, from: '2026-10-12', to: '2026-10-16', status: 'approved' }],
    note: 'Leave past the Casual balance is unpaid → LOP = unpaid leave days.' },
  { employeeId: 'E-112', label: '2 days no punch-out + 2 pending punch-out regularizations', days: { '2026-10-15': { in: IN, out: null }, '2026-10-21': { in: IN, out: null } }, expectedLop: 2,
    regularizations: [
      { id: `${ID_PREFIX}R-E112-1015-out`, date: '2026-10-15', punchType: 'out', time: '18:30', reason: 'Forgot to punch out' },
      { id: `${ID_PREFIX}R-E112-1021-out`, date: '2026-10-21', punchType: 'out', time: '18:30', reason: 'Forgot to punch out' },
    ],
    note: 'Approve both → LOP 2 → 0.' },
  { employeeId: 'E-110', label: 'Half-day leave 13 Oct + pending full-day leave on a punched day (24 Oct)', days: { '2026-10-13': { in: IN, out: 900 } },
    leaves: [
      { id: `${ID_PREFIX}L-E110-1013`, from: '2026-10-13', to: '2026-10-13', status: 'approved', halfDay: 'second' },
      { id: `${ID_PREFIX}L-E110-1024`, from: '2026-10-24', to: '2026-10-24', status: 'pending' },
    ],
    note: 'Approving 24 Oct must be REFUSED (punched in). 13 Oct = ½ worked + ½ leave.' },
  { employeeId: 'E-111', label: 'Left after 3 h (10 Oct) + late 11:30 (17 Oct) + no punch-in (6 Oct) with pending regularization', days: { '2026-10-10': { in: IN, out: 780 }, '2026-10-17': { in: 690, out: OUT }, '2026-10-06': { in: null, out: OUT } }, expectedLop: 2.5,
    regularizations: [{ id: `${ID_PREFIX}R-E111-1006-in`, date: '2026-10-06', punchType: 'in', time: '10:00', reason: 'Biometric not working' }],
    note: '10 Oct absent (1) + 17 Oct half day (0.5) + 6 Oct absent (1). Reject the regularization → stays 2.5; approve → 1.5.' },
];

export const NORMAL_DAY: DayPunch = { in: IN, out: OUT };
