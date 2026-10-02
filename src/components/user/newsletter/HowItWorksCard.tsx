'use client';

import { motion, useReducedMotion } from 'motion/react';
import { RiCalendarScheduleLine, RiEditLine, RiFocus3Line, RiInformationLine } from '@remixicon/react';

const STEPS = [
  { Icon: RiCalendarScheduleLine, text: 'Your Morning Signal arrives daily at 8 AM in your timezone.' },
  { Icon: RiFocus3Line, text: 'Pick up to 3 newsletter categories, only matching stories are included.' },
  { Icon: RiEditLine, text: 'Change your preferences anytime; it takes effect next send.' },
];

export default function HowItWorksCard() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_4px_rgba(15,23,42,0.04)]"
    >
      <h3 className="m-0 mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
        <RiInformationLine size={17} className="text-slate-400" />
        How it works
      </h3>
      <ol className="m-0 flex list-none flex-col p-0">
        {STEPS.map(({ Icon, text }, i) => (
          <motion.li
            key={i}
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: reducedMotion ? 0 : 0.38 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className={`flex items-start gap-3 py-2.5 ${i > 0 ? 'border-t border-slate-100' : ''}`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fde8f0] text-[#ee1761]">
              <Icon size={16} />
            </span>
            <p className="m-0 pt-1 text-[13px] leading-normal text-slate-500">{text}</p>
          </motion.li>
        ))}
      </ol>
    </motion.div>
  );
}
