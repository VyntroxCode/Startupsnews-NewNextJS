import { Suspense } from 'react';
import ItTicketsPage from '@/components/admin/it-tickets/ItTicketsPage';

// Suspense: ItTicketsPage reads useSearchParams() for the `?ticket=IT-12` deep link, which Next
// requires to sit under a Suspense boundary so the static shell can prerender without it.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ItTicketsPage />
    </Suspense>
  );
}
