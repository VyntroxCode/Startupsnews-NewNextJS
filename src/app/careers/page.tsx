"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { PageHeading } from "@/components/PageHeading";

const SITE_FONT_FAMILY = '"Garnett", Helvetica, Arial, sans-serif';

const CAREERS_EMAIL = "office@startupnews.fyi";
const MAILTO_HREF = `mailto:${CAREERS_EMAIL}?subject=${encodeURIComponent(
  "Career Application – StartupNews.fyi"
)}`;

const VALUES = [
  {
    label: "SPEED",
    title: "Ship Fast, Learn Faster",
    body: "Small team, real ownership — what you build this week is live for readers by the weekend.",
  },
  {
    label: "REACH",
    title: "Work That Reaches Millions",
    body: "Your features and stories ship to 10M+ monthly readers across 24 countries, not a staging server.",
  },
  {
    label: "CRAFT",
    title: "Obsess Over The Details",
    body: "Clean code, sharp writing, fast pages — we care about the craft behind a product founders trust.",
  },
  {
    label: "GROWTH",
    title: "Room To Grow",
    body: "Wear more than one hat, pick up new skills, and help shape a media company while it's still being built.",
  },
];

const STATS = [
  { value: "10M+", label: "Monthly impressions you'd help earn" },
  { value: "24", label: "Countries our readers write in from" },
  { value: "445K+", label: "Instagram followers in the community" },
  { value: "250+", label: "Global media partners we work with" },
];

const STEPS = [
  {
    step: "01",
    title: "Send us your resume",
    body: "Email a short note on what you'd want to work on, along with your resume or portfolio.",
  },
  {
    step: "02",
    title: "We review & reach out",
    body: "If there's a mutual fit for an open or upcoming role, we'll get back to you for a quick call.",
  },
  {
    step: "03",
    title: "Meet the team",
    body: "A short, honest conversation about the role and the team — not a marathon of interview rounds.",
  },
];

/** Fires `inView` once the element scrolls into the viewport, then stops watching. */
function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    // Safety net: if the observer never fires (stale bundle, hydration hiccup, etc.), don't
    // leave this content permanently invisible — force it visible after a few seconds regardless.
    const fallback = setTimeout(() => setInView(true), 4000);
    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [threshold]);

  return { ref, inView };
}

/** Counts up from 0 to `target` (as a float — callers round/format) once `active` flips true. */
function useCountUp(target: number, active: boolean, durationMs = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, durationMs]);

  return value;
}

/** Reveal-on-scroll wrapper shared by every block on this page — fades in while sliding from
 * the left, right, or up, so the page reads as animated rather than static. */
function Reveal({
  children,
  className = "",
  direction = "up",
  delay = 0,
  threshold = 0.2,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  direction?: "up" | "left" | "right";
  delay?: number;
  threshold?: number;
  as?: "div" | "span" | "li";
}) {
  const { ref, inView } = useInView<HTMLDivElement>(threshold);
  const hiddenTransform =
    direction === "left" ? "-translate-x-16" : direction === "right" ? "translate-x-16" : "translate-y-8";
  return (
    <Tag
      ref={ref as never}
      className={`transition-all duration-700 ease-out ${
        inView ? "opacity-100 translate-x-0 translate-y-0" : `opacity-0 ${hiddenTransform}`
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/** Parses a display string like "10M+", "445K+", or "24" into a numeric count-up target, how
 * many decimal places to preserve, and the trailing suffix to re-append. */
function parseStatValue(raw: string): { target: number; decimals: number; suffix: string } {
  const match = raw.match(/^([\d.]+)(.*)$/);
  if (!match) return { target: 0, decimals: 0, suffix: raw };
  const [, numStr, suffix] = match;
  const decimals = numStr.includes(".") ? numStr.split(".")[1]?.length || 0 : 0;
  return { target: parseFloat(numStr), decimals, suffix };
}

function StatTile({ stat, index, active }: { stat: { value: string; label: string }; index: number; active: boolean }) {
  const { target, decimals, suffix } = parseStatValue(stat.value);
  const value = useCountUp(target, active);
  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();

  return (
    <div
      className={`text-center transition-all duration-700 ease-out ${
        active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
      style={{ transitionDelay: `${150 + index * 90}ms` }}
    >
      <div className="text-[30px] sm:text-[36px] lg:text-[42px] font-black tracking-[-0.03em] text-cr-pink leading-none tabular-nums">
        {display}
        {suffix}
      </div>
      <div className="mt-2.5 text-[13px] font-semibold text-cr-muted leading-[1.4] px-1">{stat.label}</div>
    </div>
  );
}

export default function CareersPage() {
  const { ref: statsRef, inView: statsInView } = useInView<HTMLDivElement>(0.15);

  return (
    <div className="bg-white text-cr-ink overflow-x-hidden" style={{ fontFamily: SITE_FONT_FAMILY }}>
      <div className="mvp-main-box event-by-country-container">
        <PageBreadcrumb current="Careers" />
      </div>
      <PageHeading title="Careers" />

      <div className="max-w-[1200px] mx-auto">
        {/* HERO */}
        <section className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-7 lg:gap-[72px] items-center px-5 sm:px-8 lg:px-10 py-6 sm:py-8 lg:py-12">
          <Reveal direction="left">
            <div className="relative h-[380px] sm:h-[480px] lg:h-[620px] min-w-0 rounded-[24px] overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&q=80&auto=format&fit=crop"
                alt="The team behind StartupNews.fyi at work"
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
          </Reveal>
          <Reveal direction="right" delay={120} className="relative flex flex-col gap-5 min-w-0">
            <span className="text-xs font-bold tracking-[0.16em] uppercase text-cr-pink">We&apos;re hiring</span>
            <h2 className="text-[clamp(34px,6.2vw,64px)] font-black tracking-[-0.03em] leading-[1.05] text-cr-ink">
              Help Build What
              <br />
              Founders <span className="text-cr-pink">Read Every Day.</span>
            </h2>
            <p className="text-lg leading-[1.65] text-cr-muted max-w-[52ch]">
              StartupNews.fyi is a small, fast-moving team building the go-to source for startup and
              technology news. If you want your work to ship fast and reach real readers, we&apos;d love
              to hear from you.
            </p>
            <div className="flex flex-wrap gap-3.5 pt-2">
              <a
                href="#open-roles"
                className="bg-cr-pink hover:bg-cr-pink-deep !text-white text-[15px] font-bold px-8 py-[15px] rounded-full transition-colors"
              >
                View Open Roles
              </a>
              <a
                href={MAILTO_HREF}
                className="border-[1.5px] border-cr-ink text-cr-ink text-[15px] font-bold px-8 py-[15px] rounded-full transition-colors hover:bg-cr-ink hover:text-white"
              >
                Send Your Resume
              </a>
            </div>
          </Reveal>
        </section>

        {/* WHY WORK WITH US */}
        <section className="px-5 sm:px-8 lg:px-10 py-10 sm:py-12 lg:py-16 bg-cr-ink text-white">
          <Reveal direction="left">
            <h2 className="text-white text-[34px] sm:text-[48px] lg:text-[62px] font-black tracking-[-0.035em] leading-[1.02] uppercase">
              Why you&apos;ll <span className="text-cr-pink">like it here</span>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-5 text-lg leading-[1.65] text-[#a8aeb6] max-w-[900px]">
              No layers of process, no waiting months to see your work matter. Just a small team
              moving quickly, with the reach to make that work count.
            </p>
          </Reveal>
          <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={150 + i * 100}>
                <article className="border border-[#2a262c] rounded-[20px] p-[30px] flex flex-col gap-3.5 min-w-0 h-full overflow-hidden transition-transform duration-300 hover:-translate-y-1.5">
                  <span className="block text-[26px] sm:text-[32px] lg:text-[38px] font-black tracking-[-0.04em] leading-none text-[#454049] break-words">
                    {v.label}
                  </span>
                  <h3 className="text-white text-[22px] font-extrabold tracking-[-0.02em] leading-[1.35]">{v.title}</h3>
                  <p className="text-base leading-[1.6] text-[#a8aeb6]">{v.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* REACH / STATS */}
        <section ref={statsRef} className="px-5 sm:px-8 lg:px-10 py-8 sm:py-10 lg:py-14 bg-cr-panel">
          <div className="text-center max-w-[720px] mx-auto">
            <Reveal>
              <span className="text-xs font-bold tracking-[0.16em] uppercase text-cr-pink">The platform you&apos;d build for</span>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="text-cr-ink mt-3.5 text-[26px] sm:text-[34px] lg:text-[44px] font-extrabold tracking-[-0.02em] leading-[1.16]">
                Your work won&apos;t sit in a backlog
              </h2>
            </Reveal>
          </div>
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-y-10 gap-x-6 sm:gap-x-8 max-w-[1100px] mx-auto">
            {STATS.map((s, i) => (
              <StatTile key={s.label} stat={s} index={i} active={statsInView} />
            ))}
          </div>
        </section>

        {/* HOW YOU JOIN US */}
        <section className="px-5 sm:px-8 lg:px-10 py-10 sm:py-12 lg:py-16">
          <Reveal>
            <h2 className="text-cr-ink text-[26px] sm:text-[34px] lg:text-[44px] font-extrabold tracking-[-0.02em] leading-[1.16] text-center">
              How you join us
            </h2>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6 relative">
            {/* Connecting line — desktop only, sits behind the step numbers */}
            <div
              aria-hidden="true"
              className="hidden sm:block absolute top-[27px] left-[16.5%] right-[16.5%] h-[2px] bg-cr-line"
            />
            {STEPS.map((s, i) => (
              <Reveal key={s.step} delay={150 + i * 150} className="relative flex flex-col items-center text-center gap-4 min-w-0">
                <span className="relative z-10 flex items-center justify-center w-[56px] h-[56px] rounded-full bg-cr-pink text-white text-lg font-black">
                  {s.step}
                </span>
                <h3 className="text-cr-ink text-lg font-extrabold tracking-[-0.01em]">{s.title}</h3>
                <p className="text-[15px] leading-[1.6] text-cr-muted max-w-[32ch]">{s.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* OPEN ROLES */}
        <section id="open-roles" className="px-5 sm:px-8 lg:px-10 pt-4 pb-10 sm:pb-12 lg:pb-16 scroll-mt-24">
          <Reveal className="border border-cr-line rounded-[24px] p-8 sm:p-12 text-center bg-cr-panel">
            <span className="text-xs font-bold tracking-[0.16em] uppercase text-cr-pink">Open roles</span>
            <h2 className="mt-3.5 text-cr-ink text-[24px] sm:text-[32px] font-extrabold tracking-[-0.02em] leading-[1.2]">
              No open roles posted right now
            </h2>
            <p className="mt-4 text-base sm:text-lg leading-[1.65] text-cr-muted max-w-[56ch] mx-auto">
              We&apos;re a small team and we hire when we find the right person, not on a fixed
              calendar. If you think you&apos;d be a great fit, we&apos;d still love to hear from you.
            </p>
            <a
              href={MAILTO_HREF}
              className="inline-block mt-7 bg-cr-pink hover:bg-cr-pink-deep !text-white text-[15px] font-bold px-8 py-[15px] rounded-full transition-colors"
            >
              Email Us Your Resume
            </a>
          </Reveal>
        </section>

        {/* FINAL CTA */}
        <section className="px-5 sm:px-8 lg:px-10 py-10 sm:py-12 lg:py-16 bg-cr-ink text-white text-center">
          <Reveal>
            <h2 className="text-white text-[26px] sm:text-[36px] lg:text-[46px] font-black tracking-[-0.03em] leading-[1.1]">
              Still curious? <span className="text-cr-pink">Let&apos;s talk.</span>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-5 text-base sm:text-lg leading-[1.65] text-[#a8aeb6] max-w-[560px] mx-auto">
              Have questions before you apply, or want to know more about the team first? Reach out
              any time.
            </p>
          </Reveal>
          <Reveal delay={200} className="flex flex-wrap justify-center gap-3.5 pt-8">
            <a
              href={MAILTO_HREF}
              className="bg-cr-pink hover:bg-cr-pink-deep !text-white text-[15px] font-bold px-8 py-[15px] rounded-full transition-colors"
            >
              Email {CAREERS_EMAIL}
            </a>
            <Link
              href="/contact-us"
              className="border-[1.5px] border-white text-white text-[15px] font-bold px-8 py-[15px] rounded-full transition-colors hover:bg-white hover:text-cr-ink"
            >
              Contact Us
            </Link>
          </Reveal>
        </section>
      </div>
    </div>
  );
}
