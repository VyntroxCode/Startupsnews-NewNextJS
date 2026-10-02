import type { Metadata } from 'next';
import EmployeeShell from './EmployeeShell';

// Server wrapper so the employee area can export metadata; the shell itself is a client component.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <EmployeeShell>{children}</EmployeeShell>;
}
