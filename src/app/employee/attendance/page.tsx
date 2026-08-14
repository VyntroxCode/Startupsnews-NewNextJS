'use client';

import AttendanceWidget from '@/components/admin/AttendanceWidget';
import { getEmployeeAuthHeaders } from '@/lib/employee-auth';

export default function EmployeeAttendancePage() {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Attendance
        </h2>
        <p style={{ color: '#64748b', fontSize: '1rem', margin: '0.5rem 0 0' }}>
          Mark your daily attendance and view your punch history.
        </p>
      </div>

      <AttendanceWidget apiBase="/api/employee/attendance" getHeaders={getEmployeeAuthHeaders} />
    </div>
  );
}
