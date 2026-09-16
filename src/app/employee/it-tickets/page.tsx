'use client';

import { Suspense } from 'react';
import ItTicketsPage from '@/components/admin/it-tickets/ItTicketsPage';
import { EMPLOYEE_TICKETS_CONFIG } from '@/lib/employee-it-tickets';

/**
 * /employee/it-tickets — IT Support for plain HR employees. The same ticket UI as the admin panel,
 * pointed at /api/employee/it-tickets: the employee only ever sees tickets they raised, can comment
 * and attach files, and can't change status, assignee or delete. Suspense: the page reads
 * useSearchParams() for the `?ticket=IT-12` deep link.
 */
export default function EmployeeItSupportPage() {
  return (
    <Suspense fallback={null}>
      <ItTicketsPage
        config={EMPLOYEE_TICKETS_CONFIG}
        title="IT Support"
        subtitle="Raise an IT request and track it here. Only you and the IT team can see your tickets."
      />
    </Suspense>
  );
}
