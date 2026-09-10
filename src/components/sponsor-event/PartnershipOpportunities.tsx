"use client";

import { motion } from "motion/react";
import { SectionHead } from "./SectionHead";
import { useReducedMotion } from "./hooks";
import { CommunityIcon, HandshakeIcon, MediaIcon, MicIcon, PenIcon, SparkIcon } from "./icons";

/** Directions a partnership conversation can take. Worded as things to explore, not a rate card:
 * nothing here is offered as automatically available, and the section says so in as many words —
 * what actually happens is decided case by case after the team has read the submission. */
const OPPORTUNITIES = [
  { n: "01", Icon: MicIcon, title: "Event sponsorship", body: "Support an event and put your brand in front of the audience it was built for." },
  { n: "02", Icon: CommunityIcon, title: "Community partnership", body: "Collaborate around founder and startup communities rather than around a single date." },
  { n: "03", Icon: MediaIcon, title: "Media partnership", body: "Explore ways to amplify the event's story, announcements and outcomes." },
  { n: "04", Icon: PenIcon, title: "Content partnership", body: "Build something worth reading around your event or initiative, not just a listing." },
  { n: "05", Icon: HandshakeIcon, title: "Founders & networking", body: "Create room for the introductions that make an event worth travelling to." },
  { n: "06", Icon: SparkIcon, title: "Custom partnership", body: "Shape something specific to one event, one campaign, or one moment you're building towards." },
] as const;

/** 05 — the offer. Motion language: *a 3D card flip-up on entry*, each card rotating forward from
 * a slight backward tilt on its own delay. Nowhere else on the page uses rotateX, which keeps
 * this section distinct from the audience grid immediately above it despite both being card grids. */
export function PartnershipOpportunities() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="sp-opps" id="sp-opportunities" aria-labelledby="sp-opps-title">
      <div className="sp-wrap">
        <SectionHead
          index="05"
          kicker="Partnership"
          tone="light"
          title={<span id="sp-opps-title">More ways to put your brand in the conversation.</span>}
          lede="These are the directions a partnership can take. Which of them make sense depends entirely on the event — tell us what you're planning and we'll work out what fits."
        />

        <div className="sp-opps-grid">
          {OPPORTUNITIES.map((item, i) => (
            <motion.article
              key={item.n}
              className="sp-opp-card"
              initial={reducedMotion ? false : { opacity: 0, rotateX: -12, y: 30 }}
              whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformPerspective: 900 }}
            >
              <span className="sp-opp-n">{item.n}</span>
              <span className="sp-opp-icon">
                <item.Icon />
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <span className="sp-opp-explore">Explore this →</span>
            </motion.article>
          ))}
        </div>

        <p className="sp-opps-note">
          Every partnership is agreed individually — nothing above is automatic, and we&apos;ll only
          suggest what we can actually stand behind.
        </p>
      </div>
    </section>
  );
}
