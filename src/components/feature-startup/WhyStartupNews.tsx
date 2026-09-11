"use client";

import { motion } from "motion/react";
import { SectionLabel } from "./SectionLabel";
import { GoogleIcon, NetworkIcon, WhatsAppIcon } from "./icons";
import { useReducedMotion } from "./hooks";

/** Only things this business already states publicly: the 2019 founding date in the site-wide
 * Organization JSON-LD (src/app/layout.tsx), and the media-partner / community / search figures
 * published on /advertise-with-us. */
const REASONS = [
  {
    key: "since",
    Icon: NetworkIcon,
    stat: "Since 2019",
    title: "A newsroom, not a directory",
    body: "StartupNews.fyi has covered startup news, funding and founder stories out of India and across the globe since 2019 — features here sit alongside the reporting readers come for.",
  },
  {
    key: "partners",
    Icon: NetworkIcon,
    stat: "250+",
    title: "Global media partners",
    body: "We work with a wide network of media partners, which is part of how stories published here travel further than one site.",
  },
  {
    key: "community",
    Icon: WhatsAppIcon,
    stat: "22K+",
    title: "Members in our communities",
    body: "Beyond the site, our WhatsApp communities are full of founders and operators who follow what's being built.",
  },
  {
    key: "search",
    Icon: GoogleIcon,
    stat: "90.3M",
    title: "Google search impressions",
    body: "Coverage on a domain people already find through search — so your feature keeps being discovered after publish day.",
  },
] as const;

/** Section 09 — trust. Motion language: *alternating lateral entrance*. Rows slide in from
 * opposite sides against a sticky left-hand statement, which makes the section read as a list
 * being handed over one item at a time rather than a grid appearing at once. */
export function WhyStartupNews() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="fys-why" aria-labelledby="fys-why-title">
      <div className="fys-why-inner">
        <div className="fys-why-aside">
          <SectionLabel align="left">
            Credibility
          </SectionLabel>
          <motion.h2
            id="fys-why-title"
            className="fys-h2 fys-h2-left"
            initial={reducedMotion ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            Built for the startup ecosystem.
          </motion.h2>
          <motion.p
            className="fys-why-lede"
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            A feature puts your startup in front of the founders, investors and builders who
            follow what&apos;s being built next — told clearly, and edited by our desk.
          </motion.p>
        </div>

        <ul className="fys-why-list">
          {REASONS.map((reason, i) => (
            <motion.li
              key={reason.key}
              className="fys-why-row"
              initial={reducedMotion ? false : { opacity: 0, x: i % 2 === 0 ? 34 : -34 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="fys-why-icon">
                <reason.Icon />
              </span>
              <div>
                <p className="fys-why-stat">{reason.stat}</p>
                <h3>{reason.title}</h3>
                <p className="fys-why-body">{reason.body}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
