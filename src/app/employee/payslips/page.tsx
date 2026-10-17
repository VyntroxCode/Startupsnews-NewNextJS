'use client';

import PayslipsWidget from '@/components/admin/PayslipsWidget';

export default function EmployeePayslipsPage() {
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

      <PayslipsWidget />
    </div>
  );
}
