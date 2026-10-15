'use client';

import { useState } from 'react';
import { ArrowRight, Crown, Info, Infinity as InfinityIcon, ReceiptText, UserCheck, WalletCards } from 'lucide-react';
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
 * Right column: the payment card. Top to bottom: total in a deep indigo panel, the plan name under a
 * single bar (no price breakdown is shown), how the plan works, who it is billed to, and the pay button. It is as tall as
 * the benefits card beside it; any spare height is shared evenly between these parts.
 * No payment gateway is connected yet, so the button only tells the reader that checkout is not
 * open; nothing is charged and nothing is unlocked. When a gateway is added, start the order from
 * the button's `onClick`.
 */
export function ProBillingCard({ total, account }: {
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
      <span aria-hidden data-pro="spot" className="pointer-events-none absolute left-0 top-0 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--pro-primary)/8 opacity-0 blur-3xl" />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden className={`${proIconTile} bg-(--pro-primary-soft) text-(--pro-primary)`}><ReceiptText size={18} /></span>
          <h2 id="pro-billing-h" className={proTitle}>
            <span className="inline-block overflow-hidden pb-[0.14em] align-bottom"><span data-pro="rise" className="inline-block">Payment Details</span></span>
          </h2>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-(--pro-primary-soft) px-2.5 py-1 text-[11.5px] font-bold text-(--pro-primary-hover)">
          <Crown size={12} aria-hidden /> Pro Plan
        </span>
      </div>

      {/* Total */}
      <div data-pro="item" className="relative overflow-hidden rounded-[12px] bg-linear-to-br from-(--pro-deep) to-(--pro-deep-2) p-5 text-white shadow-[0_14px_30px_rgba(30,27,75,0.18)]">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full border border-solid border-white/15" />
        <span aria-hidden data-pro="drift" className="pointer-events-none absolute -right-2 -top-6 size-24 rounded-full bg-white/8" />
        <span aria-hidden data-pro="sheen" className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-white/15 to-transparent" />
        <span className="relative block text-[12.5px] font-semibold text-white/75">Total Payable</span>
        <span className="relative mt-1.5 block text-[36px] font-bold leading-none tabular-nums tracking-[-0.02em] sm:text-[40px]"><CountUp value={total} format={inr} /></span>
        <span className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11.5px] font-semibold">
          <InfinityIcon size={13} aria-hidden /> Paid Once, Lifetime Access
        </span>
      </div>

      {/* The plan the total pays for. One bar (decorative, draws in from the left) and the plan name. */}
      <div data-pro="item" className="relative">
        <div aria-hidden className="h-2.5 overflow-hidden rounded-full bg-(--pro-line)">
          <span data-pro="grow" className="block h-full rounded-full bg-(--pro-primary)" />
        </div>
        <p className="m-0 mt-3.5 flex items-center gap-2 text-[14px] text-(--pro-body)">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-(--pro-primary)" /> Pro Plan, Lifetime Access
        </p>
      </div>

      {/* How the plan works */}
      <div className="relative">
        <h3 className="m-0 flex items-center gap-2.5 text-[16px] font-bold leading-tight tracking-[-0.01em] text-(--pro-heading) sm:text-[17px]">
          <span className="inline-block overflow-hidden pb-[0.14em] align-bottom"><span data-pro="rise" className="inline-block">How It Works</span></span>
          <span aria-hidden data-pro="grow" className="h-0.5 flex-1 rounded-full bg-linear-to-r from-(--pro-primary)/40 to-transparent" />
        </h3>
        <div className="relative mt-3">
          {/* Line joining the three icons; it draws downwards when the card appears. */}
          <span aria-hidden data-pro="draw" className="absolute bottom-4 left-[17px] top-4 w-0.5 rounded-full bg-linear-to-b from-(--pro-primary)/60 to-(--pro-line)" />
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {STEPS.map(({ icon: Icon, title, text }) => (
              <li key={title} data-pro="item" className="group relative flex items-center gap-3">
                <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-solid border-(--pro-surface) bg-(--pro-primary-soft) text-(--pro-primary) transition-[scale,background-color,color] duration-300 group-hover:scale-110 group-hover:bg-(--pro-primary) group-hover:text-white">
                  <Icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold leading-snug text-(--pro-heading)">{title}</span>
                  <span className="block text-[12.5px] leading-snug text-(--pro-body)">{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {account && (
        <div data-pro="item" className="relative flex items-center gap-3 rounded-[12px] border border-solid border-(--pro-line) bg-(--pro-bg) px-3.5 py-3">
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--pro-primary-soft) text-[12.5px] font-bold text-(--pro-primary)">{initialsOf(account.name, account.email)}</span>
          <span className="min-w-0 text-[12.5px]">
            <span className="block text-(--pro-muted)">Billed To</span>
            <span className="block truncate text-[13.5px] font-semibold text-(--pro-heading)">{account.name ? `${account.name} · ${account.email}` : account.email}</span>
          </span>
        </div>
      )}

      <div className="relative">
        <button
          data-pro="item"
          type="button"
          onClick={() => setNotice(true)}
          className={`group relative box-border flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-[12px] border-0 bg-(--pro-primary) px-5 py-3.5 text-[15.5px] font-bold text-white shadow-[0_8px_20px_rgba(67,56,202,0.22)] transition-[translate,box-shadow,background-color] duration-300 hover:-translate-y-0.5 hover:bg-(--pro-primary-hover) hover:shadow-[0_12px_26px_rgba(67,56,202,0.28)] active:translate-y-0 active:bg-(--pro-primary-hover) active:shadow-[0_6px_14px_rgba(67,56,202,0.22)] disabled:cursor-not-allowed disabled:bg-(--pro-primary) disabled:opacity-55 disabled:shadow-none disabled:hover:translate-y-0 motion-reduce:hover:translate-y-0 ${proFocus}`}
        >
          {/* One light band crosses the button on hover; it does not loop. */}
          <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[420%] motion-reduce:hidden" />
          <span className="relative">Get Pro Plan</span>
          <ArrowRight size={18} aria-hidden className="relative transition-transform duration-300 group-hover:translate-x-1" />
        </button>

        {/* Takes no space until there is a message. */}
        <p role="status" className={`m-0 text-[12.5px] leading-relaxed text-(--pro-body) ${notice ? 'mt-3' : ''}`}>
          {notice && (
            <span className="flex items-start gap-1.5">
              <Info size={14} aria-hidden className="mt-0.5 shrink-0 text-(--pro-primary)" />
              Online payment is not open yet. You have not been charged.
            </span>
          )}
        </p>
      </div>
    </section>
  );
}
