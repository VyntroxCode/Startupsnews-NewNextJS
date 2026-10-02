import type { Metadata } from 'next';

// The (admin) shell layout is a client component and can't export metadata, so the admin area's
// robots rule lives here. Metadata replaces the root layout's "index, follow" rather than adding a
// second <meta name="robots"> tag next to it.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function AdminRobotsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
