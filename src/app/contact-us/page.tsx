"use client";

import React, { useEffect, useRef, useState } from "react";

interface Stat {
  target: number;
  suffix: string;
  label: string;
}

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
    // leave this content permanently invisible — force it visible after a few seconds
    // regardless, so a JS failure can never hide real content forever.
    const fallback = setTimeout(() => setInView(true), 4000);
    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [threshold]);

  return { ref, inView };
}

const STATS: Stat[] = [
  { target: 4, suffix: "+", label: "years tracking global startups & tech" },
  { target: 10, suffix: "+", label: "industries covered" },
  { target: 30, suffix: "mn+", label: "monthly impressions" },
  { target: 22, suffix: "", label: "countries" },
];

/** Counts up from 0 to `target` once `active` flips true — only runs the animation after the
 * hero has faded in, so the numbers don't finish counting before they're even visible. */
function useCountUp(target: number, active: boolean, durationMs = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, durationMs]);

  return value;
}

function StatTile({ stat, index, active }: { stat: Stat; index: number; active: boolean }) {
  const value = useCountUp(stat.target, active);
  return (
    <div
      className={`text-center transition-all duration-700 ease-out ${
        active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
      style={{ transitionDelay: `${150 + index * 120}ms` }}
    >
      <div className="text-[32px] sm:text-[40px] lg:text-[46px] font-extrabold text-au-pink leading-none tabular-nums">
        {value}
        {stat.suffix}
      </div>
      <div className="mt-2 text-[12px] sm:text-[13px] uppercase tracking-wide text-white/70 leading-snug max-w-[160px] mx-auto">
        {stat.label}
      </div>
    </div>
  );
}

function ContactHero() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="relative overflow-hidden bg-au-ink px-6 py-16 sm:py-20">
      <div
        className={`mx-auto max-w-[860px] text-center transition-all duration-700 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <h1 className="text-[26px] sm:text-[34px] lg:text-[42px] font-extrabold leading-tight text-white">
          Delivering Global Media Intelligence, <span className="text-au-pink">Daily!</span>
        </h1>
      </div>

      <div className="mx-auto mt-12 grid max-w-[860px] grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
        {STATS.map((stat, i) => (
          <StatTile key={stat.label} stat={stat} index={i} active={visible} />
        ))}
      </div>
    </section>
  );
}

/** Centered "Contact Us" heading + company "About Us" copy — sits full-width between the stats
 * hero and the narrower Quick Support/Press/Careers grid below, so the intro text gets to use
 * the page's actual width instead of being squeezed into the 720px support-card column. */
function AboutSection() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section
      ref={ref}
      className={`mx-auto max-w-[1000px] px-6 py-16 sm:py-20 text-center transition-all duration-700 ease-out ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      <h2 className="text-[28px] sm:text-[34px] lg:text-[38px] font-extrabold text-black leading-tight">
        Contact Us
      </h2>

      <h3 className="mt-10 text-[18px] sm:text-[20px] font-bold text-black">
        About Us
      </h3>

      <div className="mx-auto mt-5 max-w-[900px] space-y-5 text-[15px] sm:text-[16px] leading-[1.8] text-[#333]">
        <p>
          StartupNews.fyi is a global intelligence platform chronicling the people, capital, and ideas shaping the world&apos;s technology economy. Since 2023, we have grown into a trusted source for founders, investors, and operators navigating an industry that moves faster than the news cycle delivering sharp reporting, original analysis, and timely dispatches from startup ecosystems across North America, Europe, and Asia.
        </p>
        <p>
          We track everything from early-stage funding rounds to the strategic shifts redefining entire industries. We&apos;ve reported on the deals before they made headlines elsewhere, and our insights are regularly researched. Reaching over 30 million impressions monthly, SNFYI has become a daily habit for professionals who need to know what&apos;s happening and why it matters before everyone else does.
        </p>
        <p>
          Beyond reporting, we work with companies and ecosystem partners to produce research, data-driven insights, and branded content that speaks directly to a global audience of builders and decision-makers. As the technology landscape continues to shift at pace, our mission remains constant: to be the clearest, fastest, and most reliable lens on the startups defining what comes next.
        </p>
      </div>
    </section>
  );
}

interface Offering {
  title: string;
  body: string;
  badge?: string;
  icon: React.ReactNode;
}

const OFFERINGS: Offering[] = [
  {
    title: "Brand Stories",
    body: "Original, narrative-driven content that helps brands connect authentically with our audience of founders, operators, and decision-makers.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11v2a2 2 0 0 0 2 2h1l4 4V5L6 9H5a2 2 0 0 0-2 2z" />
        <path d="M15 8a4 4 0 0 1 0 8" />
        <path d="M18 5a8 8 0 0 1 0 14" />
      </svg>
    ),
  },
  {
    title: "Global Funding Report",
    body: "Our flagship research series tracking capital flows, deal activity, and investment trends shaping startups worldwide.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18" />
        <path d="M12 3a14 14 0 0 0 0 18" />
      </svg>
    ),
  },
  {
    title: "AI Newsletter",
    body: "A regular briefing on the tools, trends, and breakthroughs redefining how startups build and scale.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="6" width="15" height="12" rx="2" />
        <path d="M2.5 8l7.5 5 7.5-5" />
        <path d="M18.5 3.5l0.9 1.8 1.8 0.9-1.8 0.9-0.9 1.8-0.9-1.8-1.8-0.9 1.8-0.9z" />
      </svg>
    ),
  },
  {
    title: "Event IP",
    body: "Signature conferences and gatherings bringing together startup and business leaders from across the world's leading tech ecosystems.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
        <circle cx="12" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: "International Delegation",
    body: "Curated trips and exchange programs connecting founders and investors with startup ecosystems and opportunities abroad.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 16l20-7-7 20-3-8-8-3z" />
      </svg>
    ),
  },
  {
    title: "SNFYI GPT",
    body: "An AI-powered assistant built to help founders and investors navigate startup news, data, and insight faster.",
    badge: "Coming Soon",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        <path d="M12 8v4M12 15h.01" />
      </svg>
    ),
  },
];

/** "Our ecosystem" card grid — pink-tinted rounded cards, gradient icon badges, staggered
 * reveal + subtle hover lift, placed last so it lands right above the shared global Footer. */
function OfferingsSection() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section ref={ref} className="mx-auto max-w-[1100px] px-6 py-16 sm:py-20">
      <div
        className={`text-center transition-all duration-700 ease-out ${
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <h2 className="text-[26px] sm:text-[32px] lg:text-[36px] font-extrabold text-black leading-tight">
          What We Offer
        </h2>
        <p className="mx-auto mt-3 max-w-[620px] text-[14px] sm:text-[15px] text-[#666] leading-relaxed">
          A growing ecosystem built to inform, connect, and empower the people shaping the global startup economy.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {OFFERINGS.map((o, i) => (
          <div
            key={o.title}
            className={`group rounded-2xl border border-au-line bg-au-panel p-8 text-center transition-all duration-700 ease-out hover:-translate-y-1.5 hover:border-au-pink/40 hover:shadow-xl hover:shadow-au-pink/10 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: `${150 + i * 90}ms` }}
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-au-pink to-au-pink-deep text-white shadow-lg shadow-au-pink/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <div className="h-7 w-7">{o.icon}</div>
            </div>
            <h3 className="text-[17px] font-extrabold text-au-ink mb-1.5">{o.title}</h3>
            {o.badge && (
              <span className="mb-2 inline-block rounded-full bg-au-pink/10 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-au-pink-deep">
                {o.badge}
              </span>
            )}
            <p className="mt-2 text-[13.5px] leading-[1.65] text-au-muted">{o.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ContactUsPage() {
  return (
    <div
      id="mvp-article-cont"
      className="left relative contact-us-custom-page">
      <ContactHero />

      <AboutSection />

      <div className="kt-row-column-wrap">
        <section className="contact-us-section">
          <div className="contact-us-sections">
            <div className="contact-us-section-item">
              <h2 className="contact-us-section-item-title">Quick Support</h2>
              <p className="contact-us-section-item-body">
                Please chat with our team using the chat widget at the bottom right hand corner of this page, which typically offers the fastest support.
              </p>
              <p className="contact-us-section-item-body">
                Or you can also share your concern at{" "}
                <a href="mailto:office@startupnews.fyi">
                  office@startupnews.fyi
                </a>
              </p>
            </div>

            <div className="contact-us-section-item">
              <h2 className="contact-us-section-item-title">Press</h2>
              <p className="contact-us-section-item-body">
                For all press inquiries or press releases, please email at{" "}
                <a href="mailto:publishing@startupnews.fyi">
                  publishing@startupnews.fyi
                </a>
              </p>
            </div>

            <div className="contact-us-section-item">
              <h2 className="contact-us-section-item-title">Careers</h2>
              <p className="contact-us-section-item-body">
                For information regarding careers with us, please email at{" "}
                <a className="contact-us-section-item-link" href="mailto:office@startupnews.fyi">
                  office@startupnews.fyi
                </a>
              </p>
            </div>

            <div className="contact-us-section-item">
              <h2 className="contact-us-section-item-title">Website Support</h2>
              {/* <p className="contact-us-section-item-body">
                To report a technical issue with <a className="contact-us-section-item-link" href="https://startupnews.fyi">StartupNews.fyi</a>, please email{" "}
                <a href="mailto:tech@startupnews.fyi">
                  tech@startupnews.fyi
                </a>{" "}
                with a summary of the issue along with a screenshot, the url, your browser version, browser extensions enabled, operating system, and the make &amp; model of your device.
              </p> */}
            </div>
          </div>
        </section>
      </div>

      <OfferingsSection />
    </div>
  );
}
