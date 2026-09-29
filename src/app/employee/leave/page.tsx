'use client';

import LeaveWidget from '@/components/admin/LeaveWidget';
import { getEmployeeAuthHeaders } from '@/lib/employee-auth';

export default function EmployeeLeavePage() {
  return (
    <div>
      <div className="mb-1">
        <h2 className="m-0 hidden text-[2rem] font-bold tracking-tight text-slate-900 md:block">
          Leave
        </h2>
        <p className="m-0 text-sm text-slate-500 md:mt-2 md:text-base">
          Apply for leave in advance and track your requests.
        </p>
      </div>

      <LeaveWidget apiBase="/api/employee/leave-requests" getHeaders={getEmployeeAuthHeaders} />
    </div>
  );
}
