"use client";

import { motion, type Variants } from "motion/react";
import { RevealWords } from "./RevealWords";
import { EASE, useReducedMotion } from "./hooks";
import { PACKAGE_INCLUSIONS, type Inclusion } from "@/modules/ens-travel-enquiries/domain/participation";

interface Package {
  key: string;
  title: string;
  tone: "ink" | "pink";
  icon: "plane" | "booth";
  items: Inclusion[];
}

/** The two participation packages. The item lists come from `PACKAGE_INCLUSIONS`, the same data the
 * registration form shows under a chosen package, so the cards and the form can never disagree;
 * only the presentation (title, colour, icon) lives here. */
const PACKAGES: Package[] = [
  { key: "delegation", title: "Participate as Delegate", tone: "ink", icon: "plane", items: PACKAGE_INCLUSIONS.delegate },
  { key: "pod", title: "Participate as Exhibitor", tone: "pink", icon: "booth", items: PACKAGE_INCLUSIONS.booth },
];

function PlaneIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
      <path d="M58 8 6 28l18 7 4 19 9-12 14 10L58 8Z" />
      <path d="m24 35 34-27M28 54l3-15" />
    </svg>
  );
}

function BoothIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 22h48l-4-12H12L8 22Z" />
      <path d="M8 22c0 4 3 6 6 6s6-2 6-6c0 4 3 6 6 6s6-2 6-6c0 4 3 6 6 6s6-2 6-6c0 4 3 6 6 6s6-2 6-6" />
      <path d="M12 28v26h40V28M24 54V38h16v16" />
    </svg>
  );
}

/** The card rises in; its header, list and ticks follow in reading order off that one reveal. */
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 48 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, delay: 0.1 + index * 0.16, ease: EASE },
  }),
};

/** A light band that crosses the coloured header once, as the card lands. */
const sheenVariants: Variants = {
  hidden: { x: "-120%" },
  show: { x: "120%", transition: { duration: 1.2, delay: 0.15, ease: EASE } },
};

const ruleVariants: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.7, delay: 0.3, ease: EASE } },
};

const titleVariants: Variants = {
  hidden: { opacity: 0, y: 14, clipPath: "inset(0 100% 0 0)" },
  show: { opacity: 1, y: 0, clipPath: "inset(0 0% 0 0)", transition: { duration: 0.8, ease: EASE } },
};

const listVariants: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.35, staggerChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } },
};

const tickVariants: Variants = {
  hidden: { pathLength: 0 },
  show: { pathLength: 1, transition: { duration: 0.45, delay: 0.2, ease: EASE } },
};

function PackageCard({ pack, index }: { pack: Package; index: number }) {
  const reducedMotion = useReducedMotion();
  // Same rule as hooks.ts's useRise: under reduced motion the card must still land on "show",
  // because the preference only arrives after it has mounted on its hidden `initial`.
  const reveal = reducedMotion
    ? ({ initial: false, animate: "show" } as const)
    : ({ initial: "hidden", whileInView: "show", viewport: { once: true, amount: 0.3 } } as const);

  return (
    <motion.article
      className={`ens-fee-card is-${pack.tone}`}
      aria-labelledby={`ens-fee-${pack.key}`}
      variants={cardVariants}
      custom={index}
      {...reveal}
    >
      <header className="ens-fee-head">
        <motion.span className="ens-fee-sheen" aria-hidden="true" variants={sheenVariants} />
        <span className="ens-fee-icon" aria-hidden="true">
          {pack.icon === "plane" ? <PlaneIcon /> : <BoothIcon />}
        </span>
        <motion.h3 className="ens-fee-card-title" id={`ens-fee-${pack.key}`} variants={titleVariants}>
          {pack.title}
        </motion.h3>
        <motion.span className="ens-fee-card-rule" aria-hidden="true" variants={ruleVariants} />
      </header>

      <motion.ul className="ens-fee-list" variants={listVariants}>
        {pack.items.map((item) => (
          <motion.li
            key={item.text}
            className={"ens-fee-item" + (item.highlight ? " is-highlight" : "")}
            variants={itemVariants}
          >
            <span className="ens-fee-tick" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <motion.path d="M5.5 12.5 10 17l8.5-9.5" variants={tickVariants} />
              </svg>
            </span>
            <span>{item.text}</span>
          </motion.li>
        ))}
      </motion.ul>
    </motion.article>
  );
}

/** "Participation Charges, ₹1.65L onwards" — the two ways to take part, side by side, just
 * before the registration form.
 *
 * The headline's words rise out of their masks with the charge in pink and "onwards" small; a short pink rule draws out
 * beneath it. Each card then rises (the second a beat after the first), a light band crosses its
 * coloured header, the card title wipes in left to right with a rule drawing under it, and the
 * items follow one by one, each tick drawing itself. Cards lift on hover. The ground fades to the
 * tint the registration section opens on, so the two read as one closing passage. */
export function ParticipationFee() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="ens-fee" aria-labelledby="ens-fee-title">
      <span className="ens-blob ens-fee-blob-a" aria-hidden="true" />
      <span className="ens-blob ens-fee-blob-b" aria-hidden="true" />

      <div className="ens-wrap">
        <RevealWords
          id="ens-fee-title"
          className="ens-title is-oneline ens-fee-title"
          inline
          lines={[
            { text: "Participation Charges," },
            // The rupee sign, not "Rs." (on request, 2026-09-19).
            { text: "₹1.65L", className: "ens-fee-accent" },
            // Lower-case, 40% size and on the baseline, against the heading's uppercase (2026-09-19).
            { text: "onwards", className: "ens-fee-onwards" },
          ]}
        />
        <motion.span
          className="ens-fee-rule"
          aria-hidden="true"
          {...(reducedMotion
            ? { initial: false, animate: { scaleX: 1 } }
            : {
                initial: { scaleX: 0 },
                whileInView: { scaleX: 1 },
                viewport: { once: true, amount: 1 },
                transition: { duration: 0.8, delay: 0.5, ease: EASE },
              })}
        />

        <div className="ens-fee-grid">
          {PACKAGES.map((pack, i) => (
            <PackageCard key={pack.key} pack={pack} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
