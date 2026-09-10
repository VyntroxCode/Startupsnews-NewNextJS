"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { SectionHead } from "./SectionHead";
import { audienceImages } from "./eventImages";
import { useReducedMotion } from "./hooks";
import {
  ArrowRightIcon,
  BuilderIcon,
  CommunityIcon,
  FounderIcon,
  InvestorIcon,
  MediaIcon,
  TeamIcon,
} from "./icons";

/** Who reads StartupNews.fyi and turns up to ecosystem events. Described as the kinds of people an
 * event can be put in front of — never as a guaranteed headcount, and with no numbers attached. */
const AUDIENCE = [
  { key: "founders", Icon: FounderIcon, title: "Founders", body: "People building the next generation of startups — and looking for the rooms where that gets easier.", photo: audienceImages.founders },
  { key: "investors", Icon: InvestorIcon, title: "Investors", body: "People looking for ideas, teams and opportunities before everyone else is talking about them." },
  { key: "builders", Icon: BuilderIcon, title: "Builders", body: "Developers, designers, product leaders and operators who show up for the substance.", photo: audienceImages.builders },
  { key: "teams", Icon: TeamIcon, title: "Technology teams", body: "Companies creating the tools the rest of the ecosystem is built on." },
  { key: "communities", Icon: CommunityIcon, title: "Communities", body: "Startup groups, accelerators, incubators and founder networks with their own audiences.", photo: audienceImages.community },
  { key: "media", Icon: MediaIcon, title: "Media", body: "People and platforms covering the startup ecosystem, looking for what's worth writing about." },
] as const;

/** 04 — who you can reach. Motion language: *staggered card entrance plus a hover that opens the
 * card up* — the icon lifts and tints, the border ignites, the arrow slides, and on the three
 * cards that carry a photograph the image fades up behind the text. First light section on the
 * page, and the point where the abstract nodes of the section above become actual people. */
export function EventAudience() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="sp-audience" aria-labelledby="sp-audience-title">
      <div className="sp-wrap">
        <SectionHead
          index="04"
          kicker="Audience"
          tone="light"
          title={<span id="sp-audience-title">Bring the right people into the room.</span>}
          lede="An event is only as good as who is in it. These are the groups your event can be put in front of through StartupNews.fyi."
        />

        <div className="sp-audience-grid">
          {AUDIENCE.map((item, i) => (
            <motion.article
              key={item.key}
              className={"sp-audience-card" + ("photo" in item && item.photo ? " has-photo" : "")}
              initial={reducedMotion ? false : { opacity: 0, y: 34 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, delay: (i % 3) * 0.09, ease: [0.22, 1, 0.36, 1] }}
            >
              {"photo" in item && item.photo ? (
                <div className="sp-audience-photo" aria-hidden="true">
                  <Image src={item.photo.src} alt="" fill sizes="(min-width: 900px) 33vw, 100vw" className="sp-audience-photo-img" />
                </div>
              ) : null}
              <span className="sp-audience-icon">
                <item.Icon />
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <ArrowRightIcon className="sp-audience-arrow" />
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
