'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';

export default function ProfileHeader({ isMobile }: { isMobile: boolean }) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="mb-7">
      <motion.div
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mb-4 flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-none text-[#94a3b8]"
      >
        <Link href="/dashboard" className="text-[#94a3b8] no-underline hover:text-[#64748b]">Dashboard</Link>
        <span>/</span>
        <span className="font-medium text-[#64748b]">Profile</span>
      </motion.div>

      <motion.h1
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: reducedMotion ? 0 : 0.05, ease: [0.22, 1, 0.36, 1] }}
        className={`m-0 mb-2 font-extrabold leading-[1.15] tracking-[-0.03em] text-[#0f172a] ${isMobile ? 'text-[1.75rem]' : 'text-[2.375rem]'}`}
      >
        My Profile
      </motion.h1>

      <motion.p
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="m-0 text-[0.9375rem] leading-relaxed text-[#64748b]"
      >
        View &amp; update your profile details.
      </motion.p>
    </div>
  );
}
