'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { RiArrowRightSLine, RiMailLine, RiSparkling2Line, RiTimeLine } from '@remixicon/react';

export default function NewsletterHeader() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="mb-6">
      <motion.nav
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Breadcrumb"
        className="mb-4 flex items-center gap-1 text-xs text-slate-400"
      >
        <Link href="/dashboard" className="text-slate-400 no-underline transition-colors hover:text-[#ee1761]">Dashboard</Link>
        <RiArrowRightSLine size={14} />
        <span className="font-medium text-slate-500">Newsletter</span>
      </motion.nav>

      <motion.div
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border border-[#fbd5e3] bg-gradient-to-br from-[#fff5f8] via-white to-[#fdf2f8] px-5 py-6 sm:px-8 sm:py-7"
      >
        <RiMailLine aria-hidden size={160} className="pointer-events-none absolute -bottom-8 -right-6 hidden text-[#ee1761]/[0.06] sm:block" />

        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#fde8f0] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#ee1761]">
          <RiSparkling2Line size={13} />
          Morning Signal
        </span>

        <h1 className="m-0 mb-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Your Newsletter Preferences
        </h1>

        <p className="m-0 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-[15px]">
          Pick up to <strong className="text-slate-900">3 categories</strong> and your Morning Signal briefing will be curated just for you.
        </p>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
          <RiTimeLine size={14} className="text-[#ee1761]" />
          Arrives daily at 8 AM
        </div>
      </motion.div>
    </div>
  );
}
