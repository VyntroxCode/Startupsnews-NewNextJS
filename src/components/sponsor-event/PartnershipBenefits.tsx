"use client";

import { motion } from "motion/react";
import { SectionHead } from "./SectionHead";
import { useReducedMotion } from "./hooks";

/** Six reasons to bring an event here, written as what a partnership *does* rather than what it
 * will produce. Nothing on this list promises attendance, leads, sponsors, investor participation
 * or coverage, and no figure appears anywhere in it — none of those are ours to guarantee. */
const BENEFITS = [
  { n: "01", title: "Targeted visibility", body: "Put your event in front of people who already choose to read about startups, technology and what's being built next." },
  { n: "02", title: "Ecosystem connection", body: "Reach across the communities, founder groups and networks that make up the startup ecosystem." },
  { n: "03", title: "Event discovery", body: "Make it easier for the audience you actually want to find out your event exists at all." },
  { n: "04", title: "Storytelling", body: "Give the event more context than a date, a venue and a registration link can carry." },
  { n: "05", title: "Community momentum", body: "Create room for conversations before and around the event, not only on the day itself." },
  { n: "06", title: "Brand presence", body: "Build a stronger, more considered presence around the initiative you're putting your name to." },
] as const;

/** 09 — why partner here. Motion language: *a wipe from the left*, each row's background sweeping
 * in behind its number. A list, not a grid, so it reads as a considered argument after two card
 * sections rather than a third one. */
export function PartnershipBenefits() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="sp-benefits" id="sp-why-section" aria-labelledby="sp-benefits-title">
      <div className="sp-wrap">
        <SectionHead
          index="09"
          kicker="Why us"
          title={<span id="sp-benefits-title">Make your event part of a bigger conversation.</span>}
        />

        <ul className="sp-benefit-list">
          {BENEFITS.map((benefit, i) => (
            <motion.li
              key={benefit.n}
              className="sp-benefit"
              initial={reducedMotion ? false : { opacity: 0, x: -28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="sp-benefit-n">{benefit.n}</span>
              <div className="sp-benefit-body">
                <h3>{benefit.title}</h3>
                <p>{benefit.body}</p>
              </div>
              <span className="sp-benefit-sweep" aria-hidden="true" />
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
