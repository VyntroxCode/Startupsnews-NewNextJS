'use client';

import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { getEmployeeAuthHeaders } from '@/lib/employee-auth';
import type { PayslipData } from '@/modules/hr-tool/utils/payslip-data';
import { payslipDateLabel, payslipMonthLabel } from '@/modules/hr-tool/utils/payslip-data';

interface PayslipRow { month: string; periodFrom: string; periodTo: string; netPay: number; payslip: PayslipData }

/** My Payslips — one row per month HR has FROZEN (final). A month that's still a draft or was
 * reversed isn't listed; the PDF is drawn from the frozen snapshot, so it never changes. */
export default function EmployeePayslipsPage() {
  const [rows, setRows] = useState<PayslipRow[] | null>(null);
  const [error, setError] = useState('');
  const [busyMonth, setBusyMonth] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/employee/payslips', { headers: getEmployeeAuthHeaders() })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) setRows(json.data || []);
        else setError(json.error || 'Could not load your payslips.');
      })
      .catch(() => { if (!cancelled) setError('Could not load your payslips.'); });
    return () => { cancelled = true; };
  }, []);

  async function download(row: PayslipRow) {
    setBusyMonth(row.month);
    try {
      // Loaded on demand — the PDF library is only needed when someone actually downloads.
      const { generatePayslipPdf, singlePayslipFilename, triggerPdfDownload } = await import('@/components/admin/hr-tool/payslipPdf');
      triggerPdfDownload(await generatePayslipPdf(row.payslip), singlePayslipFilename(row.payslip, row.month));
    } catch {
      setError('Could not create the PDF. Please try again.');
    } finally {
      setBusyMonth(null);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="m-0 hidden text-[2rem] font-bold tracking-tight text-slate-900 md:block">
          My Payslips
        </h2>
        <p className="m-0 text-sm text-slate-500 md:mt-2 md:text-base">
          Your final salary slips. A month appears here once HR freezes that month&apos;s payroll.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-solid border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-solid border-slate-200 bg-white">
        {rows === null && !error && <div className="px-5 py-10 text-center text-sm text-slate-400">Loading…</div>}
        {rows && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <FileText className="size-8 text-slate-300" aria-hidden />
            <p className="m-0 text-sm font-medium text-slate-700">No payslips yet</p>
            <p className="m-0 text-sm text-slate-500">Your payslip will show here after HR freezes the month&apos;s payroll.</p>
          </div>
        )}
        {rows && rows.length > 0 && (
          <ul className="m-0 list-none divide-y divide-slate-100 p-0">
            {rows.map((row) => (
              <li key={row.month} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <p className="m-0 text-base font-semibold text-slate-900">{payslipMonthLabel(row.month)}</p>
                  <p className="m-0 mt-0.5 text-sm text-slate-500">
                    {payslipDateLabel(row.periodFrom)} – {payslipDateLabel(row.periodTo)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="m-0 text-xs uppercase tracking-wide text-slate-400">Net pay</p>
                    <p className="m-0 text-base font-semibold text-slate-900">₹{row.netPay.toLocaleString('en-IN')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => download(row)}
                    disabled={busyMonth !== null}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-indigo-500 px-4 text-sm font-semibold text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    <Download className="size-4" aria-hidden />
                    {busyMonth === row.month ? 'Preparing…' : 'Download PDF'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
