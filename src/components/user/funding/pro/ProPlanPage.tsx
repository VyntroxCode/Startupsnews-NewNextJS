'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { FundingOverview } from '@/modules/funding-deals/domain/types';
import { proPlanAmounts } from '@/modules/pro-plan/domain/plan';
import { emptyFilters, fundingGet, toQuery } from '../api';
import { fiFontCls } from '../fonts';
import ProBenefitsCard from './ProBenefitsCard';
import ProFundingStrip from './ProFundingStrip';
import ProHero from './ProHero';
import { ProBillingCard } from './ProSideCards';
import { useProPlanMotion } from './motion';
import { proFocus, proTokens } from './ui';

/**
 * /dashboard/pro — the Pro plan page. Layout: hero on top; below it a two-column grid with the
 * benefits card on the left and the payment card on the right; then a full-width closing
 * strip with sliding sector and stage chips. The pay button sits at the bottom of the payment card. On phones it is one column in that same order.
 * No payment gateway is connected yet (see ProBillingCard); the price is `proPlanAmounts()`.
 */
export default function ProPlanPage() {
  const scope = useRef<HTMLDivElement>(null);
  const { total } = proPlanAmounts();
  // Read once on first render: the dashboard layout only mounts this page in the browser, after login.
  const [account] = useState<{ name: string; email: string } | null>(() => {
    try {
      const u = JSON.parse(localStorage.getItem('pub_auth_user') || 'null');
      return u?.email ? { name: u.name || '', email: u.email } : null;
    } catch {
      return null;
    }
  });
  // Names of the sectors with funding this year, largest first, for the closing strip.
  const [sectors, setSectors] = useState<string[]>([]);

  useProPlanMotion(scope);

  // Same request as the Funding dashboard (India, 1 Jan to today). If it fails the strip keeps its
  // built-in chips.
  useEffect(() => {
    const ctrl = new AbortController();
    const filters = emptyFilters('India');
    fundingGet<{ data: FundingOverview }>(`/api/funding/overview?${toQuery({ ...filters, pinnedCountry: filters.country, range: 'month' })}`, ctrl.signal)
      .then((json) => setSectors(json.data.bySector.map((r) => r.key).filter(Boolean).slice(0, 14)))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  return (
    <div ref={scope} className={`${fiFontCls} ${proTokens} relative min-h-screen min-w-0 overflow-x-clip bg-(--pro-bg) text-(--pro-heading) antialiased`}>
      {/* Background: a faint grid that fades out down the page, and two still glows. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div aria-hidden data-pro="glow" className="pointer-events-none absolute -left-32 -top-32 size-[420px] rounded-full bg-(--pro-primary)/6 blur-3xl" />
      <div aria-hidden data-pro="glow" className="pointer-events-none absolute -right-32 top-52 size-[460px] rounded-full bg-(--pro-muted)/6 blur-3xl" />

      {/* box-border: this dashboard has no Preflight, so w-full + padding would overflow the screen. */}
      <div className="relative mx-auto box-border flex w-full min-w-0 max-w-[1200px] flex-col gap-4 px-4 pb-10 pt-4 sm:gap-5 sm:px-6 sm:pb-14 sm:pt-6 lg:px-8">
        <header data-pro="topbar" className="flex items-center justify-between gap-3">
          <Link href="/" className={`flex shrink-0 items-center rounded-md no-underline ${proFocus}`}>
            <Image src="/logo.png" alt="StartupNews.fyi" width={150} height={52} className="h-11 w-auto object-contain" />
          </Link>
          <Link
            href="/dashboard/funding"
            className={`group inline-flex items-center gap-1.5 whitespace-nowrap rounded-[12px] border border-solid border-(--pro-line) bg-(--pro-surface) px-3.5 py-2 text-[13px] font-semibold text-(--pro-heading) no-underline shadow-(--pro-shadow) transition-colors duration-200 visited:text-(--pro-heading) hover:border-(--pro-muted)/60 hover:bg-(--pro-bg) active:bg-(--pro-neutral-soft) ${proFocus}`}
          >
            <ArrowLeft size={15} aria-hidden className="transition-transform duration-300 group-hover:-translate-x-0.5" /> Back To Funding
          </Link>
        </header>

        <ProHero memberName={account?.name || 'Member'} />

        <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <ProBenefitsCard />
          <ProBillingCard total={total} account={account} />
          <ProFundingStrip sectors={sectors} />
        </div>
      </div>
    </div>
  );
}
