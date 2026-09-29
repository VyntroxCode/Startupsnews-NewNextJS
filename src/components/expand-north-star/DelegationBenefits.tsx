"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring, type Variants } from "motion/react";
import { EASE, scrollToSection, useFinePointer, useReducedMotion } from "./hooks";

interface Benefit {
  title: string;
  body: string;
}

interface Audience {
  key: string;
  tone: "cream" | "navy";
  eyebrow: string;
  title: string;
  intro: string;
  benefits: Benefit[];
  /** Paid add-ons shown in the dashed box under the list (enablers only). */
  onRequest?: string[];
  cta: string;
}

/** Copy from the reference screenshots (2026-09-28), headings set in Title Case. */
const AUDIENCES: Audience[] = [
  {
    key: "founders",
    tone: "cream",
    eyebrow: "For Startups and Founders",
    title: "Raise, Partner and Enter the UAE Market",
    intro: "Built for founders looking for global investors, cross-border partners and a Middle East growth plan.",
    benefits: [
      {
        title: "Meet Founders from 90+ Countries",
        body: "Swap playbooks with global founders and explore co-selling, integration and distribution partnerships.",
      },
      {
        title: "Pre-Scheduled One-on-One Investor Meetings",
        body: "Land in Dubai with meetings already on your calendar with global VCs, angels and family offices.",
      },
      {
        title: "Closed-Door Side Events Every Evening",
        body: "Choose from 20+ curated, invite-only evening sessions where the real conversations and deals happen.",
      },
      {
        title: "Launchpad Middle East by StartupNews.fyi",
        body: "Warm introductions to UAE-based entrepreneurs and investors for business and investment opportunities.",
      },
      {
        title: "Setting Up a Company in Dubai, Explained",
        body: "Understand the benefits, structures and step-by-step process of opening an entity in Dubai.",
      },
      {
        title: "Go-to-Market in Dubai and the UAE",
        body: "Explore customers, channels and partners to launch and grow in one of the world’s fastest-moving markets.",
      },
    ],
    cta: "Join as a Founder",
  },
  {
    key: "enablers",
    tone: "navy",
    eyebrow: "For Enablers",
    title: "Source Global Deals and Grow Your Portfolio",
    intro: "VCs, angel funds and angel networks, family offices, accelerators and incubators.",
    benefits: [
      {
        title: "Investors Lounge Access",
        body: "Meet global investors and HNIs to explore co-investments, syndicates and LP opportunities.",
      },
      {
        title: "Closed-Door Evenings with Global Capital",
        body: "Join select, invite-only side events alongside international investors and HNIs.",
      },
      {
        title: "Corporate Partnerships for Your Portfolio",
        body: "Connect with corporates and established companies looking to partner with your portfolio startups.",
      },
      {
        title: "Launchpad Middle East by StartupNews.fyi",
        body: "Introductions to UAE-based entrepreneurs and investors for deal flow and business opportunities.",
      },
      {
        title: "Dubai Entity Setup, Explained",
        body: "Understand the benefits and process of opening an entity in Dubai for your fund, network or programme.",
      },
      {
        title: "UAE Go-to-Market for Your Startups",
        body: "Open doors for portfolio companies to launch and scale across Dubai and the wider GCC.",
      },
    ],
    onRequest: ["Speaker Slots", "Branding", "Pavilion"],
    cta: "Join as an Enabler",
  },
];

/** Every class that differs between the two cards, so the markup below stays one template. */
const TONE = {
  cream: {
    card: "border border-ens-cream-line bg-ens-cream text-ens-ink",
    spot: "rgba(201, 150, 62, 0.16)",
    title: "text-ens-ink",
    intro: "text-ens-slate",
    itemTitle: "text-ens-ink",
    itemBody: "text-ens-slate",
    tickHover: "group-hover/item:bg-ens-gold/15",
    cta: "bg-ens-ink text-white group-hover/cta:bg-ens-navy-2 group-hover/cta:shadow-[0_14px_30px_-12px_rgba(14,26,51,0.6)]",
  },
  navy: {
    card: "border border-white/5 bg-linear-to-br from-ens-navy to-ens-navy-2 text-white",
    spot: "rgba(224, 184, 102, 0.14)",
    title: "text-white",
    intro: "text-white/70",
    itemTitle: "text-white",
    itemBody: "text-white/65",
    tickHover: "group-hover/item:bg-ens-gold/20",
    cta: "bg-ens-gold text-ens-navy group-hover/cta:bg-ens-gold-soft group-hover/cta:shadow-[0_14px_30px_-12px_rgba(201,150,62,0.75)]",
  },
} as const;

/* ---- Motion ------------------------------------------------------------------------------------ */

/** The card rises from its own side with a light blur, then conducts everything inside it. */
const cardVariants: Variants = {
  hidden: (side: number) => ({ opacity: 0, y: 56, x: side * 28, filter: "blur(10px)" }),
  show: (side: number) => ({
    opacity: 1,
    y: 0,
    x: 0,
    filter: "blur(0px)",
    transition: {
      duration: 1,
      delay: side > 0 ? 0.14 : 0,
      ease: EASE,
      delayChildren: side > 0 ? 0.34 : 0.2,
      staggerChildren: 0.09,
    },
  }),
};

const eyebrowVariants: Variants = {
  hidden: { opacity: 0, letterSpacing: "0.22em" },
  show: { opacity: 1, letterSpacing: "0.04em", transition: { duration: 0.9, ease: EASE } },
};

/** The card title wipes in left to right. */
const titleVariants: Variants = {
  hidden: { opacity: 0, y: 16, clipPath: "inset(0 100% 0 0)" },
  show: { opacity: 1, y: 0, clipPath: "inset(0 0% 0 0)", transition: { duration: 0.85, ease: EASE } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/** The list runs on its own trigger (not the card's), so its points reveal one after another,
 * a clear beat apart, once the list itself reaches the screen. */
const listVariants: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.15, staggerChildren: 0.22 } },
};

/** A point glides in from the left out of a soft blur, then conducts its own tick, title and text. */
const itemVariants: Variants = {
  hidden: { opacity: 0, x: -40, filter: "blur(6px)" },
  show: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: EASE, delayChildren: 0.08, staggerChildren: 0.1 },
  },
};

/** The tick's circle pops in… */
const tickRingVariants: Variants = {
  hidden: { scale: 0, rotate: -45 },
  show: { scale: 1, rotate: 0, transition: { type: "spring", stiffness: 380, damping: 20 } },
};

/** …and the check draws itself inside it. */
const tickVariants: Variants = {
  hidden: { pathLength: 0 },
  show: { pathLength: 1, transition: { duration: 0.55, delay: 0.15, ease: EASE } },
};

const pointTitleVariants: Variants = {
  hidden: { opacity: 0, x: -14 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
};

const pointBodyVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

const HEADING = "Benefits of Joining the Delegation";

/** Section heading: each word slides in from the left out of a blur, one after another. */
const headingVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const headingWordVariants: Variants = {
  hidden: { opacity: 0, x: -70, filter: "blur(8px)" },
  show: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: EASE } },
};

const chipsVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE, delayChildren: 0.2, staggerChildren: 0.08 } },
};

const chipVariants: Variants = {
  hidden: { opacity: 0, scale: 0.7 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 420, damping: 22 } },
};

/** A soft band of light that crosses the dark card once as it lands. */
const sheenVariants: Variants = {
  hidden: { x: "-130%" },
  show: { x: "130%", transition: { duration: 1.6, delay: 0.35, ease: EASE } },
};

/* ---- Pieces ------------------------------------------------------------------------------------ */

function Tick({ hover }: { hover: string }) {
  return (
    <motion.span
      className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-ens-gold/10 text-ens-gold transition-colors duration-300 ${hover}`}
      aria-hidden="true"
      variants={tickRingVariants}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <motion.path d="M5 12.5 10 17.5 19 7" variants={tickVariants} />
      </svg>
    </motion.span>
  );
}

function AudienceCard({ audience, index }: { audience: Audience; index: number }) {
  const reducedMotion = useReducedMotion();
  const finePointer = useFinePointer();
  const tone = TONE[audience.tone];
  const side = index === 0 ? -1 : 1;

  // A soft light that follows the pointer across the card (fine pointers only).
  const mx = useSpring(useMotionValue(-400), { stiffness: 260, damping: 32 });
  const my = useSpring(useMotionValue(-400), { stiffness: 260, damping: 32 });
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${mx}px ${my}px, ${tone.spot}, transparent 70%)`;
  const followPointer = finePointer && !reducedMotion;

  // Same rule as hooks.ts's useRise: under reduced motion the card must still land on "show".
  const reveal = reducedMotion
    ? ({ initial: false, animate: "show" } as const)
    : ({ initial: "hidden", whileInView: "show", viewport: { once: true, amount: 0.2 } } as const);

  return (
    <motion.article
      aria-labelledby={`ens-benefits-${audience.key}`}
      className={`group/card relative flex flex-col overflow-hidden rounded-[28px] px-6 py-9 transition-[translate,box-shadow] duration-500 ease-out hover:-translate-y-1.5 sm:px-10 sm:py-12 lg:px-11 ${tone.card} ${
        audience.tone === "navy"
          ? "shadow-[0_30px_60px_-30px_rgba(14,26,51,0.65)] hover:shadow-[0_40px_80px_-30px_rgba(14,26,51,0.8)]"
          : "shadow-[0_24px_50px_-34px_rgba(120,90,40,0.35)] hover:shadow-[0_34px_70px_-34px_rgba(120,90,40,0.5)]"
      }`}
      variants={cardVariants}
      custom={side}
      onPointerMove={
        followPointer
          ? (e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              mx.set(e.clientX - rect.left);
              my.set(e.clientY - rect.top);
            }
          : undefined
      }
      {...reveal}
    >
      {followPointer && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
          style={{ background: spotlight }}
        />
      )}

      {audience.tone === "navy" && (
        <>
          {/* A warm glow breathing in the top corner of the dark card. */}
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 -right-24 size-80 rounded-full bg-ens-gold/20 blur-3xl"
            animate={reducedMotion ? undefined : { scale: [1, 1.15, 1], opacity: [0.55, 0.9, 0.55] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -skew-x-12 bg-linear-to-r from-transparent via-white/8 to-transparent"
            variants={sheenVariants}
          />
        </>
      )}

      <div className="relative flex flex-1 flex-col">
        <motion.p className="m-0 text-[13px] font-bold tracking-[0.04em] text-ens-gold uppercase sm:text-sm" variants={eyebrowVariants}>
          {audience.eyebrow}
        </motion.p>

        <motion.h3
          id={`ens-benefits-${audience.key}`}
          className={`m-0 mt-3 font-[family-name:inherit] text-[26px] leading-[1.15] font-extrabold tracking-[-0.01em] sm:text-[32px] lg:text-[34px] ${tone.title}`}
          variants={titleVariants}
        >
          {audience.title}
        </motion.h3>

        <motion.span
          aria-hidden="true"
          className="mt-4 block h-[3px] w-14 origin-left rounded-full bg-linear-to-r from-ens-gold to-ens-gold-soft"
          variants={{
            hidden: { scaleX: 0 },
            show: { scaleX: 1, transition: { duration: 0.7, ease: EASE } },
          }}
        />

        <motion.p className={`m-0 mt-4 max-w-[46ch] text-[15px] leading-[1.65] sm:text-base ${tone.intro}`} variants={fadeUp}>
          {audience.intro}
        </motion.p>

        <motion.ul
          className="m-0 mt-8 flex list-none flex-col gap-5 p-0 sm:gap-6"
          variants={listVariants}
          {...(reducedMotion
            ? ({ initial: false, animate: "show" } as const)
            : ({ initial: "hidden", whileInView: "show", viewport: { once: true, amount: 0.15 } } as const))}
        >
          {audience.benefits.map((benefit) => (
            <motion.li key={benefit.title} className="group/item flex gap-3.5" variants={itemVariants}>
              <Tick hover={tone.tickHover} />
              <div className="transition-[translate] duration-300 ease-out group-hover/item:translate-x-1">
                <motion.h4
                  className={`m-0 font-[family-name:inherit] text-[16px] leading-snug font-bold sm:text-[17px] ${tone.itemTitle}`}
                  variants={pointTitleVariants}
                >
                  {benefit.title}
                </motion.h4>
                <motion.p className={`m-0 mt-1.5 text-[14px] leading-[1.7] sm:text-[15px] ${tone.itemBody}`} variants={pointBodyVariants}>
                  {benefit.body}
                </motion.p>
              </div>
            </motion.li>
          ))}
        </motion.ul>

        {audience.onRequest && (
          <motion.div
            className="mt-9 rounded-2xl border border-dashed border-ens-gold/55 bg-white/[0.03] px-5 py-5 sm:px-6"
            variants={chipsVariants}
          >
            <p className="m-0 text-[14px] font-bold text-white sm:text-[15px]">Available on Request (Paid)</p>
            <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
              {audience.onRequest.map((chip) => (
                <motion.li
                  key={chip}
                  className="rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors duration-300 hover:border-ens-gold/70 hover:bg-ens-gold/20"
                  variants={chipVariants}
                >
                  {chip}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* The buttons sit on the same line at the foot of both cards, whatever each list's length. */}
        <motion.div className="mt-auto pt-10" variants={fadeUp}>
          {/* The link itself stays bare: the site-wide `a, a:visited` rule (style.css) outranks a single
              utility class for colour and transition, so the pill is drawn by the span inside it. */}
          <a
            href="#ens-participate"
            onClick={(e) => scrollToSection(e, "ens-participate", reducedMotion)}
            className="group/cta inline-block rounded-full no-underline"
          >
            <span
              className={`relative inline-flex items-center gap-2.5 overflow-hidden rounded-full px-7 py-3.5 text-[15px] font-bold transition-[background-color,box-shadow,translate] duration-300 ease-out group-hover/cta:-translate-y-0.5 group-active/cta:translate-y-0 ${tone.cta}`}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-linear-to-r from-transparent via-white/35 to-transparent transition-[left] duration-700 ease-out group-hover/cta:left-[120%]"
              />
              <span className="relative">{audience.cta}</span>
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="relative size-4 transition-transform duration-300 ease-out group-hover/cta:translate-x-1"
                aria-hidden="true"
              >
                <path d="M4 10h12M11 5l5 5-5 5" />
              </svg>
            </span>
          </a>
        </motion.div>
      </div>
    </motion.article>
  );
}

/** "Benefits of Joining the Delegation" — what founders and what enablers (VCs, angel networks,
 * family offices, accelerators) get from the Dubai delegation, as a cream card and a navy card side
 * by side.
 *
 * The heading's words slide in from the left one after another and a gold rule draws out left to right. Each card rises from
 * its own side out of a light blur (the navy one a beat later, with a band of light crossing it and a
 * warm glow breathing in its corner); inside, the eyebrow letter-spacing settles, the title wipes in,
 * then the points (on the list's own scroll trigger) glide in from the left one by one, each tick
 * popping in and drawing its check before the point's title and text follow, and the paid add-on chips pop in. On a
 * fine pointer a soft light follows the cursor across the card, rows nudge right on hover, and the
 * buttons (both scroll to the enquiry form) lift with a sheen and a sliding arrow.
 *
 * Styled with Tailwind utilities only (the `ens-*` colour tokens live in isolated-tailwind.css);
 * the heading reuses the page's shared `ens-title` type. */
export function DelegationBenefits() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      id="ens-benefits"
      aria-labelledby="ens-benefits-title"
      className="overflow-x-clip bg-linear-to-b from-white via-[#FBF8F2] to-white py-[calc(var(--ens-section-y)*1.6)]"
    >
      <div className="ens-wrap">
        <motion.h2
          id="ens-benefits-title"
          className="ens-title"
          aria-label={HEADING}
          variants={headingVariants}
          {...(reducedMotion
            ? ({ initial: false, animate: "show" } as const)
            : ({ initial: "hidden", whileInView: "show", viewport: { once: true, amount: 0.6 } } as const))}
        >
          {HEADING.split(" ").map((word, i, words) => (
            <span key={i} aria-hidden="true">
              <motion.span className="inline-block will-change-transform" variants={headingWordVariants}>
                {word}
              </motion.span>
              {i < words.length - 1 ? " " : null}
            </span>
          ))}
        </motion.h2>
        <motion.span
          aria-hidden="true"
          className="mx-auto mt-4 block h-1 w-24 origin-left rounded-full bg-linear-to-r from-ens-gold via-ens-gold-soft to-ens-gold sm:mt-6"
          {...(reducedMotion
            ? { initial: false, animate: { scaleX: 1 } }
            : {
                initial: { scaleX: 0 },
                whileInView: { scaleX: 1 },
                viewport: { once: true, amount: 1 },
                transition: { duration: 0.9, delay: 0.7, ease: EASE },
              })}
        />

        <div className="mx-auto mt-10 grid max-w-[1180px] grid-cols-1 items-stretch gap-6 sm:mt-14 lg:grid-cols-2 lg:gap-8">
          {AUDIENCES.map((audience, i) => (
            <AudienceCard key={audience.key} audience={audience} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
