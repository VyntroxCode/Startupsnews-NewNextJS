import type { ReactNode } from 'react';
// Same scoped Tailwind sheet the admin IT Tickets route uses (its @source paths are relative to the
// CSS file, so they resolve from here too). Loaded once for the route.
import '@/components/admin/it-tickets/it-tickets-tailwind.css';

export default function EmployeeItTicketsLayout({ children }: { children: ReactNode }) {
  return children;
}
