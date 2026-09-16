import type { ReactNode } from 'react';
// Scoped Tailwind utilities for this feature only — see that file's header comment
// (mirrors the src/app/isolated-tailwind.css pattern used elsewhere in this
// otherwise non-Tailwind project). Imported here, in a plain layout, so it loads
// once for the route regardless of which child client components use the classes.
import '@/components/admin/it-tickets/it-tickets-tailwind.css';

export default function ItTicketsLayout({ children }: { children: ReactNode }) {
  return children;
}
