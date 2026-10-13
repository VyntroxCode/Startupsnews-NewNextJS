'use client';

import { useState } from 'react';
import { ArrowRight, Crown, Info, Infinity as InfinityIcon, ReceiptText, UserCheck, WalletCards } from 'lucide-react';
import { PRO_PLAN_GST_RATE } from '@/modules/pro-plan/domain/plan';
import CountUp from './CountUp';
import { inr, proCard, proFocus, proIconTile, proPad, proTitle } from './ui';

/** How the plan works, shown as a short timeline. */
const STEPS = [
  { icon: WalletCards, title: 'Pay Once', text: 'A single payment. No renewals, no auto-debit.' },
  { icon: UserCheck, title: 'Linked To Your Account', text: 'Pro goes on the account you are logged in with.' },
  { icon: InfinityIcon, title: 'Yours For Life', text: 'Lifetime access, with no expiry date.' },
];

/** "Yash Goswami" → "YG"; falls back to the first letter of the email. */
function initialsOf(name: string, email: string) {
  const fromName = name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0)).join('');
  return (fromName || email.charAt(0)).toUpperCase();
}

/**
 * Right column: the payment card. Top to bottom: total in a gradient panel, a bar splitting it into
 * plan price and GST, how the plan works, who it is billed to, and the pay button. It is as tall as
 * the benefits card beside it; any spare height is shared evenly between these parts.
 * No payment gateway is connected yet, so the button only tells the reader that checkout is not
 * open; nothing is charged and nothing is unlocked. When a gateway is added, start the order from
 * the button's `onClick`.
 */
export function ProBillingCard({ price, gst, total, account }: {
  price: number;
  gst: number;
  total: number;
  account: { name: string; email: string } | null;
}) {
  const [notice, setNotice] = useState(false);

  return (
    <section
      aria-labelledby="pro-billing-h"
      data-pro="block"
      data-pro-delay="0.62"
      data-pro-spot-area
      className={`${proCard} ${proPad} relative flex min-w-0 flex-col justify-between gap-5 overflow-hidden`}
    >
      {/* Soft light that follows the mouse over the card (see motion.ts). */}
      <span aria-hidden data-pro="spot" className="pointer-events-none absolute left-0 top-0 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fi-primary/10 opacity-0 blur-3xl" />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden className={`${proIconTile} bg-fi-primary-light text-fi-primary`}><ReceiptText size={18} /></span>
          <h2 id="pro-billing-h" className={proTitle}>
            <span className="inline-block overflow-hidden pb-[0.14em] align-bottom"><span data-pro="rise" className="inline-block">Payment Details</span></span>
          </h2>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-fi-primary-light px-2.5 py-1 text-[11.5px] font-bold text-fi-primary-dark">
          <Crown size={12} aria-hidden /> Pro Plan
        </span>
      </div>

      {/* Total */}
      <div data-pro="item" className="relative overflow-hidden rounded-[12px] bg-linear-to-br from-fi-primary to-fi-ai p-5 text-white shadow-[0_14px_30px_rgba(224,21,82,0.22)]">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full border border-solid border-white/20" />
        <span aria-hidden data-pro="drift" className="pointer-events-none absolute -right-2 -top-6 size-24 rounded-full bg-white/10" />
        <span aria-hidden data-pro="sheen" className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-white/30 to-transparent" />
        <span className="relative block text-[12.5px] font-semibold text-white/80">Total Payable</span>
        <span className="relative mt-1.5 block text-[36px] font-bold leading-none tabular-nums tracking-[-0.02em] sm:text-[40px]"><CountUp value={total} format={inr} /></span>
        <span className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-semibold">
          <InfinityIcon size={13} aria-hidden /> Paid Once, Lifetime Access
        </span>
      </div>

      {/* Plan price and GST as shares of the total */}
      <div data-pro="item" className="relative">
        {/* Inline flex-grow: the two widths come from the amounts, which Tailwind classes cannot carry. */}
        <div aria-hidden className="flex h-2.5 gap-1 overflow-hidden rounded-full">
          <span data-pro="grow" className="rounded-full bg-fi-primary" style={{ flexGrow: price }} />
          <span data-pro="grow" className="rounded-full bg-fi-ai" style={{ flexGrow: gst }} />
        </div>
        <dl className="m-0 mt-3.5 flex flex-col gap-2 text-[14px]">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="flex items-center gap-2 text-fi-ink-soft"><span aria-hidden className="size-2 shrink-0 rounded-full bg-fi-primary" /> Pro Plan, Lifetime Access</dt>
            <dd className="m-0 font-semibold tabular-nums text-fi-ink">{inr(price)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="flex items-center gap-2 text-fi-ink-soft"><span aria-hidden className="size-2 shrink-0 rounded-full bg-fi-ai" /> GST ({Math.round(PRO_PLAN_GST_RATE * 100)}%), Added On Top</dt>
            <dd className="m-0 font-semibold tabular-nums text-fi-ink">{inr(gst)}</dd>
          </div>
        </dl>
      </div>

      {/* How the plan works */}
      <div className="relative">
        <h3 className="m-0 flex items-center gap-2.5 text-[16px] font-bold leading-tight tracking-[-0.01em] text-fi-ink sm:text-[17px]">
          <span className="inline-block overflow-hidden pb-[0.14em] align-bottom"><span data-pro="rise" className="inline-block">How It Works</span></span>
          <span aria-hidden data-pro="grow" className="h-0.5 flex-1 rounded-full bg-linear-to-r from-fi-primary/50 to-transparent" />
        </h3>
        <div className="relative mt-3">
          {/* Line joining the three icons; it draws downwards when the card appears. */}
          <span aria-hidden data-pro="draw" className="absolute bottom-4 left-[17px] top-4 w-0.5 rounded-full bg-linear-to-b from-fi-primary to-fi-ai" />
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {STEPS.map(({ icon: Icon, title, text }) => (
              <li key={title} data-pro="item" className="group relative flex items-center gap-3">
                <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-solid border-fi-surface bg-fi-primary-light text-fi-primary transition-[scale,background-color,color] duration-300 group-hover:scale-110 group-hover:bg-fi-primary group-hover:text-white">
                  <Icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold leading-snug text-fi-ink">{title}</span>
                  <span className="block text-[12.5px] leading-snug text-fi-ink-soft">{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {account && (
        <div data-pro="item" className="relative flex items-center gap-3 rounded-[12px] bg-fi-bg px-3.5 py-3">
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-fi-primary to-fi-ai text-[12.5px] font-bold text-white">{initialsOf(account.name, account.email)}</span>
          <span className="min-w-0 text-[12.5px]">
            <span className="block text-fi-ink-faint">Billed To</span>
            <span className="block truncate text-[13.5px] font-semibold text-fi-ink">{account.name ? `${account.name} · ${account.email}` : account.email}</span>
          </span>
        </div>
      )}

      <div className="relative">
        <button
          data-pro="item"
          type="button"
          onClick={() => setNotice(true)}
          className={`group relative box-border flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-[12px] border-0 bg-linear-to-r from-fi-primary to-fi-ai px-5 py-3.5 text-[15.5px] font-bold text-white shadow-[0_10px_24px_rgba(224,21,82,0.28)] transition-[translate,box-shadow,filter] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(224,21,82,0.36)] hover:brightness-105 active:translate-y-0 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:hover:translate-y-0 ${proFocus}`}
        >
          {/* One light band crosses the button on hover; it does not loop. */}
          <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-[420%] motion-reduce:hidden" />
          <span className="relative">Get Pro Plan</span>
          <ArrowRight size={18} aria-hidden className="relative transition-transform duration-300 group-hover:translate-x-1" />
        </button>

        {/* Takes no space until there is a message. */}
        <p role="status" className={`m-0 text-[12.5px] leading-relaxed text-fi-ink-soft ${notice ? 'mt-3' : ''}`}>
          {notice && (
            <span className="flex items-start gap-1.5">
              <Info size={14} aria-hidden className="mt-0.5 shrink-0 text-fi-ai" />
              Online payment is not open yet. You have not been charged.
            </span>
          )}
        </p>
      </div>
    </section>
  );
}
