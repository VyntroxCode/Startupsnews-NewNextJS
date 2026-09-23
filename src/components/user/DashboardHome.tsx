'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useReducedMotion } from 'motion/react';
import type { Variants } from 'motion/react';
import { EventByCountryCard } from '@/components/EventByCountryCard';
import { getEventImage } from '@/lib/event-utils';
import type { StartupEvent } from '@/lib/data-adapter';

/* ────────────────────────────────────────────────────────────────────────────
   This page is deliberately just the one section the user asked for: a
   "Welcome back" summary card plus four KPI tiles. Every earlier iteration's
   sections (Today's Brief, Recommended, Saved Stories, Latest Reports, Explore
   Pro, the top search/notification bar) were removed on explicit instruction
   ("make this provided section only, remove everything from dashboard") —
   they still exist in git history if a future request wants any of them back.
   ──────────────────────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────────────────── */

interface ProfileUser {
  name: string;
  email: string | null;
  city: string | null;
  createdAt: string | null;
  // Real subscription state for the "Join The Morning Pulse" card — `newsletter_category_slugs`
  // is set once a member saves 1+ categories on /dashboard/newsletter (the only place a
  // subscription actually happens; this card only links there, it never subscribes anyone
  // itself), and `newsletter_unsubscribed` can later clear it back to false.
  newsletterSubscribed: boolean;
}

interface ProfileStatus {
  percent: number;
  missing: string[];
  user: ProfileUser;
}

interface SiteStats {
  totalReports: number;
  freeReports: number;
  totalEvents: number;
}

interface WeeklyHighlights {
  fundingReportsThisWeek: number;
  cityEventsThisWeek: number;
}

// No dashboard-specific event type — `/api/dashboard/nearby-events` now returns full
// `StartupEvent` objects (via the same `entityToEvent` transform the public /events page uses),
// so the real `EventByCountryCard` component can render them directly with the actual poster
// image, excerpt and formatted date, instead of a hand-built lookalike card.

/* ────────────────────────────────────────────────────────────────────────────
   Constants + helpers
   ──────────────────────────────────────────────────────────────────────────── */

const SAVED_EVENTS_KEY = 'dash_saved_events';
const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029Va6fQrb7DAWuFPhvlm21';

/** Missing-profile-field keys (from /api/public-auth/profile-status's `missing` array) mapped to
 * plain-English labels for the "Add your X & Y" line. Covers every field the wizard can ask for
 * across every category (`RegistrationProfileFields`), not just the startup example in the brief
 * — a lawyer or investor account should see their own missing fields named correctly too. Falls
 * back to a humanised version of the raw key for anything not listed here. */
const FIELD_LABELS: Record<string, string> = {
  phone: 'phone number',
  country: 'country',
  city: 'city',
  linkedin_url: 'LinkedIn profile',
  category: 'profile category',
  other_category: 'category details',
  website: 'website',
  founders: 'founder details',
  s_name: 'startup name',
  s_founded: 'founding year',
  s_entity: 'entity type',
  s_stage: 'startup stage',
  s_team_size: 'team size',
  s_revenue_status: 'revenue status',
  s_pitch: 'pitch',
  s_raising: 'fundraising status',
  i_type: 'investor type',
  i_check_size: 'check size',
  i_stage_focus: 'stage focus',
  i_sector_focus: 'sector focus',
  i_geo_focus: 'geographic focus',
  a_program_name: 'program name',
  a_duration: 'program duration',
  a_sector_focus: 'sector focus',
  c_platforms: 'platforms',
  c_niche: 'niche',
  l_firm: 'firm name',
  l_practice_areas: 'practice areas',
  l_jurisdiction: 'jurisdiction',
  l_years_experience: 'years of experience',
  cs_firm: 'firm name',
  cs_membership_number: 'membership number',
  cs_services: 'services',
  cs_years_experience: 'years of experience',
  ib_firm: 'firm name',
  ib_years_experience: 'years of experience',
  ib_deal_types: 'deal types',
  bk_bank_name: 'bank name',
  bk_years_experience: 'years of experience',
  bk_vertical: 'vertical',
  g_role: 'role',
};

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] || key.replace(/^[a-z]{1,3}_/, '').replace(/_/g, ' ');
}

function readLocalArray(key: string): unknown[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function monthYear(value: string | null): string | null {
  if (!value) return null;
  const t = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(t.getTime())) return null;
  return t.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/* ────────────────────────────────────────────────────────────────────────────
   Motion — the same rise/stagger vocabulary as the rest of the dashboard.
   ──────────────────────────────────────────────────────────────────────────── */

function riseVariants(reduced: boolean, distance = 18): Variants {
  return {
    hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : distance },
    show: { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] } },
  };
}

function staggerVariants(reduced: boolean, stagger = 0.08): Variants {
  return { hidden: {}, show: { transition: { staggerChildren: reduced ? 0 : stagger, delayChildren: reduced ? 0 : 0.03 } } };
}

const HOVER_LIFT = { y: -3, transition: { duration: 0.2, ease: 'easeOut' as const } };

/** Count-up hook: animates 0 → target on first mount, respects prefers-reduced-motion. */
function useCountUp(target: number, ready: boolean, reduced: boolean) {
  const [value, setValue] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (!ready || reduced) return;
    const controls = animate(current.current, target, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        current.current = v;
        setValue(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [target, ready, reduced]);

  return reduced ? target : value;
}

/** Shimmer skeleton block — matches the shape of whatever it's standing in for while data loads. */
function Skel({ className = '' }: { className?: string }) {
  const reduced = useReducedMotion();
  return (
    <div aria-hidden="true" className={`relative overflow-hidden bg-slate-200/60 ${className}`}>
      {!reduced && (
        <motion.div
          className="absolute inset-0 bg-linear-to-r from-transparent via-white/80 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   KPI tile
   ──────────────────────────────────────────────────────────────────────────── */

function KpiCard({ label, children }: { label: string; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={riseVariants(!!reduced, 14)}
      whileHover={reduced ? undefined : HOVER_LIFT}
      className="flex flex-col gap-2 rounded-[20px] border border-db-line bg-db-card p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition-shadow duration-250 ease-out hover:shadow-[0_18px_38px_-24px_rgba(17,24,39,0.28)]"
    >
      <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.08em] text-db-muted">{label}</p>
      {children}
    </motion.div>
  );
}

function KpiSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-[20px] border border-db-line bg-db-card p-5">
      <Skel className="h-3 w-24 rounded-md" />
      <Skel className="mt-1 h-7 w-16 rounded-lg" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────────────────── */

export default function DashboardHome() {
  const reduced = useReducedMotion();
  const router = useRouter();

  // Lazy initialiser, not a `useEffect` + `setState` — this component only ever renders on
  // the client (the layout gates on mount), so reading localStorage here can't cause a
  // hydration mismatch, and avoids the extra render a set-state-in-effect would trigger.
  const [firstName] = useState<string>(() => {
    try {
      const raw = localStorage.getItem('pub_auth_user');
      const parsed = raw ? (JSON.parse(raw) as { name?: string }) : null;
      return parsed?.name?.trim().split(/\s+/)[0] || 'there';
    } catch {
      return 'there';
    }
  });
  const [profile, setProfile] = useState<ProfileStatus | null>(null);
  const [siteStats, setSiteStats] = useState<SiteStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyHighlights | null>(null);
  const [nearbyEvents, setNearbyEvents] = useState<StartupEvent[] | null>(null);

  // Saved-events count is real, dynamic, device-local state — there is no saved-events feature
  // anywhere in the app yet (confirmed: no such DB column or API), so it reads as honestly 0
  // until a real backend exists. The WhatsApp tile always shows the follow link on request (no
  // "Joined" swap) — see the KPI row below.
  const [savedEventsCount] = useState(() => readLocalArray(SAVED_EVENTS_KEY).length);

  useEffect(() => {
    let token: string | null = null;
    try {
      token = localStorage.getItem('pub_auth_token');
    } catch {
      /* noop */
    }
    const auth = token ? { Authorization: `Bearer ${token}` } : undefined;

    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) {
          setSiteStats({
            totalReports: Number(d.data.totalReports) || 0,
            freeReports: Number(d.data.freeReports) || 0,
            totalEvents: Number(d.data.events) || 0,
          });
        } else setSiteStats({ totalReports: 0, freeReports: 0, totalEvents: 0 });
      })
      .catch(() => setSiteStats({ totalReports: 0, freeReports: 0, totalEvents: 0 }));

    fetch('/api/public-auth/profile-status', { headers: auth })
      .then((r) => r.json())
      .then((d) => {
        if (!d?.success) {
          setProfile({ percent: 0, missing: [], user: { name: 'there', email: null, city: null, createdAt: null, newsletterSubscribed: false } });
          // profile-status responded but without success — weekly/nearby-events are chained off
          // it below and would otherwise never resolve, leaving those sections stuck loading.
          setWeekly({ fundingReportsThisWeek: 0, cityEventsThisWeek: 0 });
          setNearbyEvents([]);
          return;
        }
        const u = d.data.user || {};
        const nextProfile: ProfileStatus = {
          percent: Number(d.data.percent) || 0,
          missing: Array.isArray(d.data.missing) ? d.data.missing : [],
          user: {
            name: String(u.name || ''),
            email: u.email ? String(u.email) : null,
            city: u.city ? String(u.city) : null,
            createdAt: u.created_at ? String(u.created_at) : null,
            newsletterSubscribed: Boolean(u.newsletter_category_slugs) && !u.newsletter_unsubscribed,
          },
        };
        setProfile(nextProfile);

        // Weekly highlights and nearby events both need the city, so both are chained off
        // profile-status rather than run with a guessed/empty city; they don't depend on each
        // other, so they fire together once the city is known.
        const cityParam = nextProfile.user.city ? `?city=${encodeURIComponent(nextProfile.user.city)}` : '';
        fetch(`/api/dashboard/weekly-highlights${cityParam}`)
          .then((r) => r.json())
          .then((wd) => {
            if (wd?.success) {
              setWeekly({
                fundingReportsThisWeek: Number(wd.data.fundingReportsThisWeek) || 0,
                cityEventsThisWeek: Number(wd.data.cityEventsThisWeek) || 0,
              });
            } else setWeekly({ fundingReportsThisWeek: 0, cityEventsThisWeek: 0 });
          })
          .catch(() => setWeekly({ fundingReportsThisWeek: 0, cityEventsThisWeek: 0 }));

        fetch(`/api/dashboard/nearby-events${cityParam}`)
          .then((r) => r.json())
          .then((ed) => {
            if (ed?.success && Array.isArray(ed.data.events)) {
              setNearbyEvents(ed.data.events);
            } else {
              setNearbyEvents([]);
            }
          })
          .catch(() => setNearbyEvents([]));
      })
      .catch(() => {
        setProfile({ percent: 0, missing: [], user: { name: 'there', email: null, city: null, createdAt: null, newsletterSubscribed: false } });
        setWeekly({ fundingReportsThisWeek: 0, cityEventsThisWeek: 0 });
        setNearbyEvents([]);
      });
  }, []);

  const ready = profile !== null && siteStats !== null && weekly !== null;
  const percent = profile?.percent ?? 0;
  const complete = percent >= 100;
  const shownPercent = useCountUp(percent, profile !== null, !!reduced);

  const missingLine = useMemo(() => {
    if (!profile) return '';
    if (complete) return 'Every section is filled in. Thanks for keeping it current.';
    const [first, second] = profile.missing;
    if (!first) return 'A couple of fields are still outstanding.';
    const labels = [fieldLabel(first), second ? fieldLabel(second) : null].filter(Boolean);
    return `Add your ${labels.join(' & ')} to unlock personalised picks.`;
  }, [profile, complete]);

  const summaryLine = useMemo(() => {
    if (!profile || !weekly || !siteStats) return '';
    const city = profile.user.city;
    const { fundingReportsThisWeek, cityEventsThisWeek } = weekly;
    const cityPart = city
      ? `${fundingReportsThisWeek} new funding ${fundingReportsThisWeek === 1 ? 'report' : 'reports'} and ${cityEventsThisWeek} founder ${cityEventsThisWeek === 1 ? 'event' : 'events'} dropped in ${city} this week.`
      : `${fundingReportsThisWeek} new funding ${fundingReportsThisWeek === 1 ? 'report' : 'reports'} dropped this week. Add your city to see local founder events too.`;
    return `${cityPart} You've got ${siteStats.totalReports} reports, ${siteStats.totalEvents} events and a full incubator list waiting. Let's pick up where you left off.`;
  }, [profile, weekly, siteStats]);

  const memberSince = monthYear(profile?.user.createdAt ?? null);

  // Both blurbs under the "Welcome back" heading are capped to the heading's own rendered
  // width (not a fixed ch value) so neither line of copy ever reads wider than the title
  // itself. `titleRef`'s element is `w-fit`, so its content-box width (via ResizeObserver,
  // which ignores the wave emoji's transform animation) is exactly the title's text+emoji
  // width — re-measured whenever the name/viewport/breakpoint changes it.
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [titleWidth, setTitleWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setTitleWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const titleWidthStyle = titleWidth ? { maxWidth: titleWidth } : undefined;

  return (
    <div className="min-h-screen bg-db-bg px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6">
        {/* Welcome-back summary card */}
        <motion.div
          variants={riseVariants(!!reduced)}
          initial="hidden"
          animate="show"
          className="rounded-[22px] border border-db-line bg-db-card p-6 shadow-[0_1px_2px_rgba(17,24,39,0.04)] sm:p-8"
        >
          <h1 ref={titleRef} className="m-0 w-fit text-[30px] font-extrabold leading-tight tracking-tight text-db-ink sm:text-[34px]">
            Welcome back, {firstName}{' '}
            <motion.span
              className="inline-block origin-[70%_70%]"
              initial={reduced ? false : { rotate: 0 }}
              animate={reduced ? undefined : { rotate: [0, 18, -8, 14, -4, 0] }}
              transition={{ duration: 1.1, delay: 0.4, ease: 'easeInOut' }}
              aria-hidden="true"
            >
              👋
            </motion.span>
          </h1>

          {ready ? (
            <p className="m-0 mt-3 text-[15px] leading-relaxed text-db-muted" style={titleWidthStyle}>{summaryLine}</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              <Skel className="h-5 w-full max-w-[70ch] rounded-md" />
              <Skel className="h-5 w-2/3 max-w-[50ch] rounded-md" />
            </div>
          )}

          <div className="my-6 h-px w-full bg-db-line" aria-hidden="true" />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Profile completion ring — animates 0 → real percent once on load. */}
              <div className="relative h-14 w-14 shrink-0">
                <svg viewBox="0 0 60 60" className="h-full w-full -rotate-90" aria-hidden="true">
                  <circle cx="30" cy="30" r="25" fill="none" stroke="#f1eff6" strokeWidth="6" />
                  <motion.circle
                    cx="30"
                    cy="30"
                    r="25"
                    fill="none"
                    stroke={complete ? '#16a34a' : '#ec1760'}
                    strokeWidth="6"
                    strokeLinecap="round"
                    initial={{ pathLength: reduced ? percent / 100 : 0 }}
                    animate={{ pathLength: profile !== null ? percent / 100 : 0 }}
                    transition={{ duration: reduced ? 0 : 1, ease: [0.22, 1, 0.36, 1] }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[13px] font-extrabold text-db-pink">
                  {shownPercent}%
                </div>
              </div>

              {profile !== null ? (
                <p className="m-0 text-[14.5px] leading-snug text-db-muted" style={titleWidthStyle}>
                  <span className="font-bold text-db-ink">Your profile is {percent}% complete.</span> {missingLine}
                </p>
              ) : (
                <Skel className="h-5 w-72 max-w-full rounded-md" />
              )}
            </div>

            <Link
              href="/dashboard/settings"
              className="group inline-flex shrink-0 items-center gap-1.5 self-start text-[14px] font-bold text-db-pink visited:text-db-pink no-underline sm:self-auto"
            >
              {complete ? 'View profile' : 'Complete Your Profile'}
              <svg className="transition-transform duration-200 ease-out group-hover:translate-x-1" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </motion.div>

        {/* KPI row */}
        <motion.div
          variants={staggerVariants(!!reduced)}
          initial="hidden"
          animate={ready ? 'show' : 'hidden'}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {!ready ? (
            Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard label="Reports Unlocked">
                <p className="m-0 text-[26px] font-extrabold leading-none tabular-nums tracking-tight text-db-ink">
                  {siteStats!.freeReports} <span className="text-db-muted">/ {siteStats!.totalReports}</span>
                </p>
              </KpiCard>

              <KpiCard label="Saved Events">
                <p className="m-0 text-[26px] font-extrabold leading-none tabular-nums tracking-tight text-db-ink">{savedEventsCount}</p>
              </KpiCard>

              <KpiCard label="WhatsApp Community">
                {/* Always clickable, never a static "Joined" swap — there's no server-side
                    membership check to justify replacing it. Icon-only per request: the label
                    above already says what this is, so the link itself doesn't repeat it. */}
                <a
                  href={WHATSAPP_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow the StartupNews.fyi (MENA) channel on WhatsApp"
                  title="Follow on WhatsApp"
                  className="group inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366] transition-transform duration-200 ease-out hover:scale-105"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.19 0 4.25.85 5.79 2.4a8.13 8.13 0 0 1 2.4 5.8c0 4.53-3.69 8.22-8.22 8.22a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.36c0-4.53 3.69-8.2 8.25-8.2Zm-4.46 4.7c-.16 0-.42.06-.64.31-.22.24-.85.83-.85 2.03 0 1.19.87 2.35.99 2.51.12.16 1.71 2.7 4.24 3.71 2.1.85 2.52.68 2.98.64.46-.05 1.48-.6 1.68-1.19.21-.58.21-1.08.15-1.19-.06-.1-.22-.16-.46-.28-.24-.12-1.48-.73-1.71-.81-.23-.08-.4-.12-.56.12-.16.24-.64.81-.79.98-.15.16-.29.18-.53.06-.24-.12-1.03-.38-1.96-1.21-.72-.65-1.21-1.44-1.35-1.69-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.36-.77-1.86-.2-.48-.4-.42-.56-.42Z" />
                  </svg>
                </a>
              </KpiCard>

              <KpiCard label="Member Since">
                <p className="m-0 text-[26px] font-extrabold leading-none tracking-tight text-db-ink">{memberSince ?? ''}</p>
              </KpiCard>
            </>
          )}
        </motion.div>

        {/* Founder events near you — real events, city-matched to the member's own profile city.
            Selection rule (confirmed with the user before building this): a city with 1+ real
            upcoming events shows exactly those (1, 2 or 3 — never padded with unrelated events);
            a city with none, or no city set at all, falls back to 3 random events pulled from 3
            different cities. No filter bar — explicitly not wanted; this is a plain, live list. */}
        <motion.div
          variants={riseVariants(!!reduced)}
          initial="hidden"
          animate={nearbyEvents !== null ? 'show' : 'hidden'}
          className="rounded-[22px] border border-db-line bg-db-card p-6 shadow-[0_1px_2px_rgba(17,24,39,0.04)] sm:p-8"
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="m-0 text-[22px] font-extrabold leading-tight tracking-tight text-db-ink sm:text-[24px]">
                Startups And Tech Events Near You
              </h2>
            </div>
            <Link
              href="/events"
              className="group inline-flex shrink-0 items-center gap-1.5 text-[13.5px] font-bold text-db-pink visited:text-db-pink no-underline"
            >
              See all events
              <svg className="transition-transform duration-200 ease-out group-hover:translate-x-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          {nearbyEvents === null ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-db-line">
                  <Skel className="aspect-[1260/630] w-full" />
                  <div className="flex flex-col gap-2 p-5">
                    <Skel className="h-3 w-1/3 rounded-md" />
                    <Skel className="h-3.5 w-3/4 rounded-md" />
                    <Skel className="h-3.5 w-1/2 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : nearbyEvents.length === 0 ? (
            <p className="m-0 rounded-2xl border border-dashed border-db-line p-6 text-center text-[13.5px] text-db-muted">
              No upcoming events to show right now. Check back soon.
            </p>
          ) : (
            // The real `EventByCountryCard` component — same one the public /events page uses —
            // renders as a plain <li>, so this stays a semantic <ul> rather than the previous
            // motion.div grid; per-card entrance stagger was dropped for the same reason (can't
            // wrap an <li> in another motion element without breaking the list markup), but the
            // whole section still fades in via the outer card's own `riseVariants`.
            <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {nearbyEvents.map((event) => (
                <EventByCountryCard key={event.id} event={event} imageUrl={getEventImage(event)} showCountry />
              ))}
            </ul>
          )}
        </motion.div>

        {/* Join The Morning Pulse — this card only links to /dashboard/newsletter, it never
            subscribes anyone itself; the real subscription (and the "already subscribed" check
            below) both happen there via /api/public-auth/newsletter-preferences, the same
            account-linked mechanism that page already uses. */}
        <motion.div
          variants={riseVariants(!!reduced)}
          initial="hidden"
          animate={profile !== null ? 'show' : 'hidden'}
          className="rounded-[22px] border border-db-line bg-db-card p-6 shadow-[0_1px_2px_rgba(17,24,39,0.04)] sm:p-8"
        >
          {profile === null ? (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2">
                <Skel className="h-6 w-80 max-w-full rounded-md" />
                <Skel className="h-4 w-64 max-w-full rounded-md" />
              </div>
              <Skel className="h-12 w-full rounded-xl lg:w-96" />
            </div>
          ) : profile.user.newsletterSubscribed ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <div>
                  <h2 className="m-0 text-[18px] font-extrabold leading-tight text-db-ink sm:text-[19px]">
                    You&apos;re subscribed to The Morning Pulse
                  </h2>
                  <p className="m-0 mt-1 text-[13.5px] leading-relaxed text-db-muted">
                    One email, every morning: funding, launches and founder moves.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/newsletter"
                className="group inline-flex shrink-0 items-center gap-1.5 self-start text-[13.5px] font-bold text-db-pink visited:text-db-pink no-underline sm:self-auto"
              >
                Manage preferences
                <svg className="transition-transform duration-200 ease-out group-hover:translate-x-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                router.push('/dashboard/newsletter');
              }}
              className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="max-w-[46ch]">
                <h2 className="m-0 text-[20px] font-extrabold leading-tight tracking-tight text-db-ink sm:text-[22px]">
                  Join 15,000+ founders getting The Morning Pulse
                </h2>
                <p className="m-0 mt-2 text-[14px] leading-relaxed text-db-muted">
                  One email, every morning: funding, launches and founder moves.
                </p>
              </div>
              <div className="flex flex-col gap-3 shrink-0 sm:flex-row sm:items-center">
                <input
                  type="email"
                  required
                  defaultValue={profile.user.email ?? ''}
                  placeholder="you@startup.com"
                  aria-label="Email address"
                  className="w-full rounded-xl border border-db-line bg-db-panel px-4 py-3 text-[14px] text-db-ink outline-none transition-colors focus:border-db-pink sm:w-72"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-db-pink px-6 py-3 text-[14px] font-bold text-white transition-colors hover:bg-db-pink-deep"
                >
                  Subscribe
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
