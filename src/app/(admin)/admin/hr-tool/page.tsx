'use client';

import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import { HrToolProvider } from '@/components/admin/hr-tool/HrToolContext';
import HrToolApp from '@/components/admin/hr-tool/HrToolApp';

export default function HrToolPage() {
  return (
    <AdminErrorBoundary>
      <HrToolProvider>
        <HrToolApp />
      </HrToolProvider>
    </AdminErrorBoundary>
  );
}
