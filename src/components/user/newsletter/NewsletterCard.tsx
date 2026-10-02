'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  RiCheckboxCircleFill,
  RiEraserLine,
  RiErrorWarningLine,
  RiLoader4Line,
  RiPriceTag3Line,
  RiRefreshLine,
  RiSave3Line,
} from '@remixicon/react';
import CategoryCard from './CategoryCard';
import CategorySkeleton from './CategorySkeleton';
import SelectionProgress from './SelectionProgress';

interface NLCategory { id: number; name: string; slug: string; color: string; }

const MAX = 3;

export default function NewsletterCard({
  categories,
  categoriesLoading,
  categoriesError,
  onRetryCategories,
  selectedCats,
  onToggleCat,
  onClear,
  onSave,
  saving,
  saved,
  error,
}: {
  categories: NLCategory[];
  categoriesLoading: boolean;
  categoriesError: boolean;
  onRetryCategories: () => void;
  selectedCats: string[];
  onToggleCat: (slug: string) => void;
  onClear: () => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  error: string;
}) {
  const reducedMotion = useReducedMotion();
  const nothingPicked = selectedCats.length === 0;
  const selectedNames = categories.filter(c => selectedCats.includes(c.slug)).map(c => c.name);

  const banner = (tone: 'ok' | 'err') =>
    `mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
      tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'
    }`;

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.04)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fde8f0] text-[#ee1761]">
            <RiPriceTag3Line size={20} />
          </span>
          <div>
            <h2 className="m-0 text-base font-bold text-slate-900">Your Interests</h2>
            <p className="m-0 text-xs text-slate-400">Pick up to {MAX} categories for your daily briefing</p>
          </div>
        </div>
        <SelectionProgress count={selectedCats.length} max={MAX} />
      </div>

      <div className="px-5 py-5 sm:px-6">
        <AnimatePresence>
          {saved && (
            <motion.div
              key="saved"
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={banner('ok')}
            >
              <RiCheckboxCircleFill size={18} className="shrink-0" />
              Saved! Your next briefing will match your choices.
            </motion.div>
          )}
          {error && (
            <motion.div
              key="error"
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={banner('err')}
            >
              <RiErrorWarningLine size={18} className="shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {categoriesError ? (
          <div className="flex flex-col items-center gap-2.5 px-4 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <RiErrorWarningLine size={24} />
            </span>
            <p className="m-0 text-[15px] font-bold text-slate-700">Couldn&apos;t load your interests</p>
            <p className="m-0 text-[13px] text-slate-400">Please try again.</p>
            <button
              type="button"
              onClick={onRetryCategories}
              className="mt-1.5 inline-flex cursor-pointer font-[inherit] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ee1761]/15"
            >
              <RiRefreshLine size={15} /> Try again
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {categoriesLoading ? (
                <CategorySkeleton count={6} />
              ) : (
                categories.map((cat, i) => {
                  const isSelected = selectedCats.includes(cat.slug);
                  return (
                    <CategoryCard
                      key={cat.slug}
                      cat={cat}
                      isSelected={isSelected}
                      disabled={selectedCats.length >= MAX && !isSelected}
                      index={i}
                      onToggle={() => onToggleCat(cat.slug)}
                    />
                  );
                })
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={onClear}
                  disabled={nothingPicked}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border-0 bg-transparent px-2 font-[inherit] py-1.5 text-[13px] font-medium text-slate-400 transition-colors enabled:cursor-pointer enabled:hover:text-[#ee1761] disabled:text-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ee1761]/15"
                >
                  <RiEraserLine size={15} /> Clear
                </button>
                {selectedNames.length > 0 && (
                  <span className="truncate text-xs text-slate-400">
                    {selectedNames.join(' · ')}
                  </span>
                )}
              </div>
              <motion.button
                type="button"
                onClick={onSave}
                disabled={saving || nothingPicked}
                whileHover={saving || nothingPicked || reducedMotion ? undefined : { y: -1 }}
                whileTap={saving || nothingPicked || reducedMotion ? undefined : { scale: 0.98 }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-0 font-[inherit] bg-gradient-to-br from-[#ee1761] to-[#c8114d] px-7 py-3 text-[15px] font-bold text-white shadow-[0_2px_10px_rgba(238,23,97,0.3)] transition-shadow enabled:cursor-pointer enabled:hover:shadow-[0_6px_16px_rgba(238,23,97,0.35)] disabled:cursor-not-allowed disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ee1761]/20 sm:w-auto"
              >
                {saving ? <RiLoader4Line size={17} className="animate-spin" /> : <RiSave3Line size={17} />}
                {saving ? 'Saving…' : 'Save Preferences'}
              </motion.button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
