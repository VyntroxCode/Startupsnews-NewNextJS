'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import CategoryCard from './CategoryCard';
import CategorySkeleton from './CategorySkeleton';
import SelectionProgress from './SelectionProgress';
import SectionDivider from './SectionDivider';
import { AlertIcon, CheckIcon, MailIcon, RefreshIcon, SaveIcon } from './icons';

interface NLCategory { id: number; name: string; slug: string; color: string; }

export default function NewsletterCard({
  isMobile,
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
  isMobile: boolean;
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

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}
    >
      {/* Card header */}
      <div style={{ padding: isMobile ? '1.125rem 1.25rem' : '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg, #fde8f0, #fff0f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #fecdd3' }}>
            <MailIcon width={18} height={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Your Interests</h2>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.78rem' }}>Select newsletter categories you care about</p>
          </div>
        </div>
        <SelectionProgress count={selectedCats.length} />
      </div>

      <div style={{ padding: isMobile ? '1.125rem 1.25rem' : '1.375rem 1.5rem' }}>
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '11px 14px', marginBottom: '1.125rem', fontSize: '0.875rem', color: '#065f46', fontWeight: 600 }}
            >
              <CheckIcon width={16} height={16} />
              Saved! Your next briefing will match your choices.
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '11px 14px', marginBottom: '1.125rem', fontSize: '0.875rem', color: '#b42318', fontWeight: 500 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {categoriesError ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '2.5rem 1rem' }}>
            <span style={{ color: '#cbd5e1' }}><AlertIcon /></span>
            <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#334155' }}>Couldn&apos;t load your interests</p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#94a3b8' }}>Please try again.</p>
            <button
              type="button"
              onClick={onRetryCategories}
              className="nl-retry-btn"
              style={{
                marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff',
                color: '#374151', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <RefreshIcon /> Try again
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: isMobile ? 10 : 12,
              marginBottom: '1.375rem',
            }}
          >
            {categoriesLoading ? (
              <CategorySkeleton count={6} />
            ) : (
              categories.map((cat, i) => {
                const isSelected = selectedCats.includes(cat.slug);
                const maxReached = selectedCats.length >= 3 && !isSelected;
                return (
                  <CategoryCard
                    key={cat.slug}
                    cat={cat}
                    isSelected={isSelected}
                    disabled={maxReached}
                    index={i}
                    onToggle={() => onToggleCat(cat.slug)}
                  />
                );
              })
            )}
          </div>
        )}

        {!categoriesError && (
          <>
            <div style={{ marginBottom: '1.125rem' }}>
              <SectionDivider />
            </div>

            {/* Footer actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={onClear}
                disabled={selectedCats.length === 0}
                className="nl-clear-btn"
                style={{ fontSize: '0.8125rem', color: selectedCats.length === 0 ? '#e2e8f0' : '#94a3b8', background: 'none', border: 'none', cursor: selectedCats.length === 0 ? 'default' : 'pointer', fontWeight: 500, padding: '6px 2px', fontFamily: 'inherit' }}
              >
                Clear selection
              </button>
              <motion.button
                type="button"
                onClick={onSave}
                disabled={saving || selectedCats.length === 0}
                whileHover={saving || selectedCats.length === 0 || reducedMotion ? undefined : { y: -1 }}
                whileTap={saving || selectedCats.length === 0 || reducedMotion ? undefined : { scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="nl-save-btn"
                style={{
                  padding: '0.75rem 2rem',
                  background: selectedCats.length === 0 ? '#e2e8f0' : saving ? '#f9a8c9' : 'linear-gradient(135deg, #ee1761 0%, #c8114d 100%)',
                  color: selectedCats.length === 0 ? '#9ca3af' : '#fff',
                  border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.9375rem',
                  cursor: selectedCats.length === 0 || saving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  boxShadow: selectedCats.length === 0 ? 'none' : '0 2px 10px rgba(238,23,97,0.3)',
                  width: isMobile ? '100%' : 'auto', justifyContent: 'center',
                  fontFamily: 'inherit',
                }}
              >
                {saving ? (
                  <span className="nl-spinner" style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', display: 'inline-block' }} />
                ) : (
                  <SaveIcon />
                )}
                {saving ? 'Saving…' : 'Save Preferences'}
              </motion.button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .nl-retry-btn { transition: border-color 0.2s ease, color 0.2s ease; }
        .nl-retry-btn:hover { border-color: #cbd5e1; color: #0f172a; }
        .nl-clear-btn { transition: color 0.2s ease; border-radius: 6px; }
        .nl-clear-btn:not(:disabled):hover { color: #ee1761; }
        .nl-clear-btn:focus-visible, .nl-retry-btn:focus-visible, .nl-save-btn:focus-visible {
          outline: none; box-shadow: 0 0 0 3px #fde8f0;
        }
        .nl-save-btn { transition: box-shadow 0.25s ease; }
        .nl-save-btn:not(:disabled):hover { box-shadow: 0 6px 16px rgba(238,23,97,0.35); }
        .nl-spinner { animation: nl-spin 0.7s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .nl-spinner { animation-duration: 1.4s; }
        }
        @keyframes nl-spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}
