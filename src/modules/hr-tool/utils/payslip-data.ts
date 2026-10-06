/**
 * Payslip figures for one payroll entry — shared by the server (the snapshot frozen into
 * hr_payroll_entries.payslip_json at Freeze) and the admin Payroll page (draft/preview slips).
 * Framework-agnostic: no React, no DB access. payslipPdf.ts only renders this shape.
 */
import type { HrCtcBreakdown, HrCtcSplit, HrEmployee, HrPayrollEntry } from '../domain/types';

/** Everything the payslip needs, already computed — payslipPdf.ts only renders it.
 * PAN is deliberately not part of this shape yet (no PAN field exists on HrEmployee today);
 * Income Tax mirrors the admin-entered TDS for the run, Provident Fund is always 0 for now —
 * there's no PF configuration anywhere in the HR module yet to compute a real figure from. */
export interface PayslipData {
  employeeName: string;
  employeeCode: string;
  designation: string;
  monthLabel: string;
  payDateLabel: string;
  dojLabel: string;
  paidDays: number;
  lopDays: number;
  basic: number;
  hra: number;
  convenience: number;
  specialAllowance: number;
  grossEarnings: number;
  incomeTax: number;
  providentFund: number;
  totalDeductions: number;
  netPay: number;
  /** Printed under the month on a draft slip (payroll run but not frozen yet), so a slip
   * downloaded early is never mistaken for the final one. Never set on a frozen snapshot. */
  provisionalNote?: string;
}

/** Basic/HRA/Convenience/Special Allowance for one month, from a CTC Structure config (see
 * HrCtcSplit) and an employee's annual CTC. Basic is a % of monthly salary; HRA is a % of
 * BASIC (not of salary directly); Convenience is either a flat ₹/month amount or a % of
 * monthly salary; Special Allowance is always whatever's left, never its own stored
 * percentage, so the four always add up to exactly one month's salary. */
export function computeCtcBreakdown(annualCtc: number, split: HrCtcSplit): HrCtcBreakdown {
  const monthlySalary = annualCtc / 12;
  const basic = Math.round((monthlySalary * split.basicPct) / 100);
  const hra = Math.round((basic * split.hraPctOfBasic) / 100);
  const convenience = split.convenienceType === 'amount'
    ? Math.round(split.convenienceValue)
    : Math.round((monthlySalary * split.convenienceValue) / 100);
  const specialAllowance = Math.round(monthlySalary - basic - hra - convenience);
  return { basic, hra, convenience, specialAllowance };
}

/** "October 2026" from "2026-10" — built from UTC parts so it's the same on server and browser. */
export function payslipMonthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** "25 Oct 2026" from "2026-10-25"; "—" when empty or invalid. */
export function payslipDateLabel(ymd: string | null | undefined): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return '—';
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Builds one payslip from a payroll entry. Earnings are prorated by the same paid-days ratio
 * computePayrollForMonth applied to get monthlyGross; Special Allowance takes the rounding
 * remainder, so the four earning lines always add up to exactly Gross Earnings. */
export function buildPayslipData(input: {
  entry: HrPayrollEntry;
  employee: Pick<HrEmployee, 'name' | 'designation' | 'doj' | 'ctc' | 'ctcSplitOverride'>;
  defaultSplit: HrCtcSplit;
  employeeCode: string | null | undefined;
  monthKey: string;
  periodTo: string;
  tds?: number;
  netPay?: number;
  provisionalNote?: string;
}): PayslipData {
  const { entry: e, employee, defaultSplit, monthKey, periodTo } = input;
  const tds = input.tds ?? e.tds;
  const netPay = input.netPay ?? e.netPay;
  const ctc = employee.ctc ?? 0;
  const breakdown = computeCtcBreakdown(ctc, employee.ctcSplitOverride || defaultSplit);
  const monthlySalary = Math.round(ctc / 12);
  const ratio = monthlySalary > 0 ? e.monthlyGross / monthlySalary : 0;
  const basic = Math.round(breakdown.basic * ratio);
  const hra = Math.round(breakdown.hra * ratio);
  const convenience = Math.round(breakdown.convenience * ratio);
  const specialAllowance = e.monthlyGross - basic - hra - convenience;
  return {
    employeeName: employee.name,
    employeeCode: input.employeeCode || '—',
    designation: employee.designation,
    monthLabel: payslipMonthLabel(monthKey),
    payDateLabel: payslipDateLabel(periodTo),
    dojLabel: payslipDateLabel(employee.doj),
    paidDays: e.totalDays - e.lopDays,
    lopDays: e.lopDays,
    basic, hra, convenience, specialAllowance,
    grossEarnings: e.monthlyGross,
    incomeTax: tds,
    providentFund: 0,
    totalDeductions: tds,
    netPay,
    provisionalNote: input.provisionalNote,
  };
}
