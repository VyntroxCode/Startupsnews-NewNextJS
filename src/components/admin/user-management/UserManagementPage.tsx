'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileBarChart, TrendingUp } from 'lucide-react';
import FundingCardsPage from './FundingCardsPage';
import ReportsLockPanel from './ReportsLockPanel';

const SECTIONS = [
  { key: 'funding', label: 'Funding', icon: TrendingUp },
  { key: 'reports', label: 'Reports', icon: FileBarChart },
] as const;

type Section = (typeof SECTIONS)[number]['key'];

/**
 * /admin/user-management — settings for the reader (user) panel, one section per reader area.
 * Super admin only (ADMIN_ONLY_PATHS). `?section=` picks the opening section.
 */
export default function UserManagementPage() {
  const searchParams = useSearchParams();
  const [section, setSection] = useState<Section>(() => {
    const s = searchParams.get('section');
    return SECTIONS.some((x) => x.key === s) ? (s as Section) : 'funding';
  });

  const switchSection = (next: Section) => {
    setSection(next);
    const url = new URL(window.location.href);
    url.searchParams.set('section', next);
    window.history.replaceState(null, '', url.toString());
  };

  return (
    // No max-width: the admin shell's content area widens when the sidebar closes, and this page
    // fills whatever it is given.
    <div className="box-border flex w-full min-w-0 flex-col gap-5 pb-10">
      <div className="min-w-0">
        <h1 className="m-0 text-2xl font-bold leading-tight text-slate-900">User Management</h1>
        <p className="m-0 mt-1 text-sm leading-relaxed text-slate-500">Settings for what readers see in the user panel.</p>
      </div>

      <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-solid border-slate-200 bg-slate-50 p-1" role="tablist">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={section === key}
            onClick={() => switchSection(key)}
            className={`inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border-0 px-4 text-sm font-semibold transition-colors ${section === key ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Icon size={16} aria-hidden /> {label}
          </button>
        ))}
      </div>

      {section === 'funding' && <FundingCardsPage />}

      {section === 'reports' && <ReportsLockPanel />}
    </div>
  );
}
