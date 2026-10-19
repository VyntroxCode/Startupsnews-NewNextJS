'use client';

import { useEffect, useState } from 'react';
import { Check, Crown, X } from 'lucide-react';

interface ProPlanModalProps {
  /** Pages of the section that are open to every reader; 0 = the whole section is locked. */
  freePages: number;
  onClose: () => void;
}

const PERKS = [
  'Open every report in this section, not only the newest ones',
  'Read the full archive of earlier weeks and months',
  'Get each new report as soon as it is published',
];

/** "Pro Plan Needed" dialog on /dashboard/reports: shown when a locked report card is clicked
 * (never while REPORTS_LOCK_ENABLED is off). There is no plan to buy yet, so the upgrade button only says so. */
export default function ProPlanModal({ freePages, onClose }: ProPlanModalProps) {
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-plan-title"
        onClick={(e) => e.stopPropagation()}
        className="relative box-border w-full max-w-md rounded-2xl bg-white px-6 pb-6 pt-8 text-center shadow-2xl md:px-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
        >
          <X size={18} aria-hidden />
        </button>

        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fde8f0] text-[#ee1761]">
          <Crown size={26} aria-hidden />
        </span>
        <p className="m-0 mt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#ee1761]">Startup Reports</p>
        <h2 id="pro-plan-title" className="m-0 mt-1.5 text-2xl font-extrabold leading-tight text-gray-900">Pro Plan Needed</h2>
        <p className="m-0 mt-3 text-[15px] leading-relaxed text-gray-600">
          {freePages > 0
            ? `${freePages === 1 ? 'Page 1 is' : `Pages 1 to ${freePages} are`} free for every member. Reports from page ${freePages + 1} onwards are part of the Pro plan.`
            : 'The reports in this section are part of the Pro plan.'}
          {' '}You can see what is here, but these reports cannot be opened on your current plan.
        </p>

        <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 rounded-xl bg-gray-50 p-4 text-left">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2.5 text-sm leading-snug text-gray-700">
              <Check size={16} aria-hidden className="mt-0.5 shrink-0 text-[#ee1761]" /> {perk}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setAsked(true)}
          className="mt-6 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-[#ee1761] px-5 text-[15px] font-bold text-white hover:bg-[#d6124f]"
        >
          <Crown size={17} aria-hidden /> Upgrade to Pro
        </button>
        <p role="status" className="m-0 mt-3 min-h-5 text-sm text-gray-500">
          {asked && 'Coming soon. The Pro plan is not open yet.'}
        </p>
      </div>
    </div>
  );
}
