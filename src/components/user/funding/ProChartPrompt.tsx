'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Crown, X } from 'lucide-react';

/**
 * Chart elements that open the prompt. Covers every chart library used under /dashboard/funding:
 * Recharts (treemap, sankey, small charts), AG Charts (trend, sector lines, stage, models) and
 * Chart.js canvases on Market Analysis, plus hand-built charts marked with `data-pro-chart`.
 */
const CHART_SELECTOR = '.recharts-wrapper, .ag-charts-wrapper, canvas, [data-pro-chart]';

const PERKS = [
  'All deals in one table, filter by sector, stage, city or investor and download as Excel',
  'Deal search across every startup, investor and round',
  'Market Analysis: eight views of the last 12 months',
  '12-Month Outlook on where funding is heading',
];

/**
 * "Get Pro Plan" popup for the Funding section, shown when a reader clicks any chart.
 * One capture-phase listener on the document (mounted by the funding layout, so only on these
 * pages) opens it; the chart's own click behaviour (highlight, tile select) still runs underneath.
 * Closes on Escape, the backdrop, the X or "Maybe Later"; the CTA goes to /dashboard/pro.
 */
export default function ProChartPrompt() {
  const [open, setOpen] = useState(false);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest?.(CHART_SELECTOR)) return;
      returnFocus.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    ctaRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      returnFocus.current?.focus?.();
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      onClick={close}
      className="fixed inset-0 z-[2000] box-border flex animate-cpw-fade items-center justify-center bg-fi-ink/60 p-4 backdrop-blur-sm motion-reduce:animate-none"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fi-pro-prompt-title"
        aria-describedby="fi-pro-prompt-text"
        onClick={(e) => e.stopPropagation()}
        className="relative box-border w-full max-w-[440px] animate-cpw-modal overflow-hidden rounded-[20px] border border-solid border-fi-line bg-fi-surface text-center shadow-[0_24px_60px_-12px_rgba(21,19,26,0.35)] motion-reduce:animate-none"
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-fi-primary to-fi-ai" />

        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-fi-bg text-fi-ink-soft transition-colors hover:bg-fi-line hover:text-fi-ink focus-visible:outline-2 focus-visible:outline-fi-ai"
        >
          <X size={18} aria-hidden />
        </button>

        <div className="px-6 pb-6 pt-8 sm:px-8">
          <span aria-hidden className="mx-auto flex size-14 items-center justify-center rounded-full bg-linear-to-br from-fi-primary via-[#B81F9B] to-fi-ai text-white shadow-[0_10px_24px_-8px_rgba(109,40,217,0.6)]">
            <Crown size={26} />
          </span>
          <p className="m-0 mt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-fi-primary">Pro Plan · Lifetime Access</p>
          <h2 id="fi-pro-prompt-title" className="m-0 mt-1.5 text-[22px] font-extrabold leading-tight tracking-[-0.01em] text-fi-ink">
            Go Deeper With Pro
          </h2>
          <p id="fi-pro-prompt-text" className="m-0 mt-2.5 text-[14px] leading-relaxed text-fi-ink-soft">
            Get the full Funding section behind every chart: the deals, the search and the analysis.
          </p>

          <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 rounded-[14px] bg-fi-bg p-4 text-left">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-fi-ink">
                <span aria-hidden className="mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full bg-fi-ai-light text-fi-ai">
                  <Check size={12} strokeWidth={3} />
                </span>
                {perk}
              </li>
            ))}
          </ul>

          <Link
            ref={ctaRef}
            href="/dashboard/pro"
            onClick={close}
            className="group mt-6 box-border inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-linear-to-r from-fi-primary to-fi-ai px-5 text-[15px] font-bold text-white no-underline shadow-[0_10px_24px_-10px_rgba(109,40,217,0.7)] transition-[transform,box-shadow] duration-200 visited:text-white hover:-translate-y-px hover:shadow-[0_14px_28px_-10px_rgba(109,40,217,0.8)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fi-ai active:translate-y-0 motion-reduce:transition-none"
          >
            <Crown size={17} aria-hidden /> Get Pro Plan
            <ArrowRight size={17} aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
          <button
            type="button"
            onClick={close}
            className="mt-2 h-10 w-full cursor-pointer rounded-[10px] border-0 bg-transparent text-[13.5px] font-semibold text-fi-ink-soft transition-colors hover:bg-fi-bg hover:text-fi-ink focus-visible:outline-2 focus-visible:outline-fi-ai"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
