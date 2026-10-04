'use client';

import { Suspense } from 'react';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import FundingDataPage from '@/components/admin/funding-data/FundingDataPage';

/** /admin/funding-data — funding-round dataset (Financial Analyst + super admin; see FUNDING_ROLES). */
export default function AdminFundingDataPage() {
  return (
    <AdminErrorBoundary>
      {/* useSearchParams (opening ?tab=) needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <FundingDataPage />
      </Suspense>
    </AdminErrorBoundary>
  );
}
