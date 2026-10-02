'use client';

import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { RiCheckLine } from '@remixicon/react';
import { categoryIcon } from './icons';

interface Cat { id: number; name: string; slug: string; color: string; }

export default function CategoryCard({
  cat, isSelected, disabled, index, onToggle,
}: {
  cat: Cat;
  isSelected: boolean;
  disabled: boolean;
  index: number;
  onToggle: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const Icon = categoryIcon(cat.slug);

  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      aria-label={cat.name}
      disabled={disabled}
      onClick={onToggle}
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: reducedMotion ? 0 : Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
      whileHover={disabled || reducedMotion ? undefined : { y: -2 }}
      whileTap={disabled || reducedMotion ? undefined : { scale: 0.98 }}
      className={`group relative flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left font-[inherit] transition-[border-color,box-shadow,background-color,opacity] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ee1761]/15 ${
        isSelected
          ? 'border-[#ee1761] bg-[#fff5f8] shadow-[0_4px_14px_rgba(238,23,97,0.14)]'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-[0_6px_16px_rgba(15,23,42,0.07)]'
      } ${disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'}`}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
        style={{ background: `${cat.color}1a`, color: cat.color }}
      >
        <Icon size={20} />
      </span>

      <span className={`min-w-0 flex-1 text-sm leading-snug line-clamp-2 break-words ${isSelected ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
        {cat.name}
      </span>

      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
          isSelected ? 'border-[#ee1761] bg-[#ee1761] text-white' : 'border-slate-300 bg-white text-transparent'
        }`}
      >
        <AnimatePresence>
          {isSelected && (
            <motion.span
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex"
            >
              <RiCheckLine size={13} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
}
