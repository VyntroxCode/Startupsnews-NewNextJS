'use client';

import AttendanceWidget from '@/components/admin/AttendanceWidget';
import { getEmployeeAuthHeaders } from '@/lib/employee-auth';

export default function EmployeeAttendancePage() {
  return (
    <div>
      <div className="mb-1">
        <h2 className="m-0 hidden text-[2rem] font-bold tracking-tight text-slate-900 md:block">
          Attendance
        </h2>
        <p className="m-0 text-sm text-slate-500 md:mt-2 md:text-base">
          Mark your daily attendance and view your punch history.
        </p>
      </div>

      <AttendanceWidget apiBase="/api/employee/attendance" getHeaders={getEmployeeAuthHeaders} />
    </div>
  );
}
