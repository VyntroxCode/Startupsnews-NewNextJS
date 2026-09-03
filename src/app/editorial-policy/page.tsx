import type { Metadata } from 'next';
import EditorialPolicyClient from './EditorialPolicyClient';

export const metadata: Metadata = {
  title: 'Editorial Policy — StartupNews.fyi',
  description:
    'StartupNews.fyi editorial policy covering sourcing, verification, EEAT standards, corrections, conflict of interest, and content standards.',
};

// Content and layout live in the client component so the reveal-on-scroll animations can run;
// this stays a server component purely to keep the `metadata` export.
export default function EditorialPolicy() {
  return <EditorialPolicyClient />;
}
