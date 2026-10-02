'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { RiMailCloseLine } from '@remixicon/react';

export default function UnsubscribeCard() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl border border-rose-100 bg-[#fff8f8] p-5"
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-rose-600 ring-1 ring-rose-100">
          <RiMailCloseLine size={16} />
        </span>
        <div>
          <p className="m-0 mb-0.5 text-sm font-semibold text-slate-900">Stop receiving emails?</p>
          <p className="m-0 text-xs leading-normal text-slate-400">You can unsubscribe from Morning Signal at any time.</p>
        </div>
      </div>
      <Link
        href="/unsubscribe"
        className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white py-2.5 text-[13px] font-bold text-rose-700 no-underline transition-colors hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 active:scale-[0.98]"
      >
        Unsubscribe
      </Link>
    </motion.div>
  );
}
