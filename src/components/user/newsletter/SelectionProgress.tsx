'use client';

import { motion } from 'motion/react';

export default function SelectionProgress({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-3.5">
      <div className="flex items-center gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <motion.span
            key={i}
            animate={{ backgroundColor: count > i ? '#ee1761' : '#e2e8f0', width: count > i ? 18 : 8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block h-2 rounded-full"
          />
        ))}
      </div>
      <span className={`whitespace-nowrap text-xs font-bold ${count > 0 ? 'text-[#ee1761]' : 'text-slate-400'}`}>
        {count} of {max} selected
      </span>
    </div>
  );
}
