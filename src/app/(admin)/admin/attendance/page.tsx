'use client';

import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import AttendanceWidget from '@/components/admin/AttendanceWidget';

export default function AttendancePage() {
  return (
    <AdminErrorBoundary>
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            fontSize: '2.25rem',
            fontWeight: '700',
            marginTop: '1rem',
            color: '#0f172a',
            letterSpacing: '-0.02em',
          }}>
            Attendance
          </h2>
          <p style={{
            color: '#64748b',
            fontSize: '1rem',
            margin: 0,
            marginTop: '1rem',
          }}>
            Mark your daily attendance and view your punch history.
          </p>
        </div>

        <AttendanceWidget />
      </div>
    </AdminErrorBoundary>
  );
}
