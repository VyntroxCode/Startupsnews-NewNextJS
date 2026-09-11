"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { SectionHead } from "./SectionHead";
import { audienceImages } from "./eventImages";
import { useReducedMotion } from "./hooks";
import {
  ArrowRightIcon,
  BuilderIcon,
  FounderIcon,
  InvestorIcon,
} from "./icons";

/** Who reads StartupNews.fyi and turns up to ecosystem events. Described as the kinds of people an
 * event can be put in front of — never as a guaranteed headcount, and with no numbers attached. */
const AUDIENCE = [
  { key: "founders", Icon: FounderIcon, title: "Founders", body: "People building the next generation of startups — and looking for the rooms where that gets easier.", photo: audienceImages.founders },
  { key: "investors", Icon: InvestorIcon, title: "Investors", body: "People looking for ideas, teams and opportunities before everyone else is talking about them.", photo: audienceImages.investors },
  { key: "builders", Icon: BuilderIcon, title: "Builders", body: "Developers, designers, product leaders and operators who show up for the substance.", photo: audienceImages.builders },
] as const;

/** 04 — who you can reach. All three cards carry a photograph, and it is now the card rather than
 * a texture behind it: the picture runs at full strength under a scrim, with the type reversed out
 * white over it (it used to sit at 7% opacity, which is why the images did not read at all and the
 * middle card, which had no picture, did not look out of place). Motion language: *staggered card
 * entrance plus a hover that opens the card up* — the icon lifts and tints, the arrow slides, and
 * the photograph brightens and pushes in. First light section on the page, and the point where the
 * abstract nodes of the section above become actual people. */
export function EventAudience() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="sp-audience" aria-labelledby="sp-audience-title">
      <div className="sp-wrap">
        <SectionHead
          kicker="Audience"
          tone="light"
          title={<span id="sp-audience-title">Bring The <em>Right People</em> Into The Room.</span>}
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
