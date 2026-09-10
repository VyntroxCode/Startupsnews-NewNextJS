"use client";

import { motion } from "motion/react";
import { SectionIntro } from "./SectionIntro";
import { InstagramIcon, LinkedInIcon, NewsletterIcon, SearchIcon, SiteIcon, XIcon } from "./icons";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

/** The places an accepted story *can* surface. Written as capability, never as a promise: nothing
 * here says a submission will be distributed, and there are no reach, audience or traffic figures
 * anywhere in this section — the page has no real numbers to quote, so it quotes none. If real
 * published figures ever exist, they belong here with a source, not as adjectives. */
const SURFACES = [
  { key: "site", label: "StartupNews.fyi", body: "An article on the site.", Icon: SiteIcon },
  { key: "linkedin", label: "LinkedIn", body: "A post for a professional audience.", Icon: LinkedInIcon },
  { key: "instagram", label: "Instagram", body: "A visual summary of the story.", Icon: InstagramIcon },
  { key: "x", label: "X / Twitter", body: "A short-form post.", Icon: XIcon },
  { key: "newsletter", label: "Newsletter", body: "A mention in an editorial send.", Icon: NewsletterIcon },
  { key: "search", label: "Search", body: "A page that can be found later.", Icon: SearchIcon },
] as const;

/** Section 10 — where a story can travel once it exists, as six small paper cards that deal into
 * place. Kept deliberately modest in scale: this is the last thing before the call to action, and
 * over-promising here would undo the credibility the editorial-policy section just built.
 *
 * The hover lift is a Motion target rather than a CSS `:hover { transform }` — Motion owns the
 * `transform` property on these cards once their entrance has run, and an inline transform always
 * beats a stylesheet one. Only the border colour is left to CSS. */
export function DiscoverySurfaces() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="pr-section pr-discovery" aria-labelledby="pr-discovery-title">
      <SectionIntro
        index="10"
        label="Discovery"
        heading="A story can travel further than the submission."
        headingId="pr-discovery-title"
        lede="Potential discovery surfaces for an accepted story — example ways a piece can reach a reader. Which of them apply, if any, is an editorial decision made case by case."
      />

      <ul className="pr-discovery-grid">
        {SURFACES.map((surface, i) => (
          <motion.li
            key={surface.key}
            className="pr-discovery-card"
            initial={reducedMotion ? false : { opacity: 0, y: 26, rotate: i % 2 === 0 ? -1.5 : 1.5 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            whileHover={reducedMotion ? undefined : { y: -4 }}
            transition={{ duration: 0.55, delay: i * 0.07, ease: PR_EASE }}
          >
            <span className="pr-discovery-icon" aria-hidden="true">
              <surface.Icon />
            </span>
            <span className="pr-discovery-label">{surface.label}</span>
            <span className="pr-discovery-body">{surface.body}</span>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
