"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { SectionIntro } from "./SectionIntro";
import { ParallaxImage } from "./ParallaxImage";
import { pressReleaseImages } from "./images";
import { ContextIcon, EvidenceIcon, NewsIcon, PeopleIcon, RelevanceIcon } from "./icons";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

/** Each principle carries its own mark instead of a number. The five used to be labelled 01–05
 * down the left with an "01 / 05" counter on the right, which made a set of editorial questions
 * read like a procedure to work through; an icon says the same "this is item four of five" by
 * being visibly different from its neighbours, without implying an order to follow. */
/** Each row carries a question and, since the rows were widened, a short answer under it — the
 * questions alone left a half-empty column beside a full-height photograph.
 *
 * The copy is deliberately about what an editor READS FOR, not about what we will do with it:
 * nothing here promises coverage, publication, timing or reach, which is the same line every other
 * section on this page holds. Keep that if this is ever rewritten. */
const PRINCIPLES = [
  {
    key: "news",
    title: "News",
    body: "What actually happened?",
    detail:
      "A story starts with an event, not an intention. Something launched, closed, shipped, changed hands or reached a number it had not reached before — stated plainly enough that a reader knows what is new before the second paragraph.",
    Icon: NewsIcon,
    image: pressReleaseImages.standardNews,
  },
  {
    key: "relevance",
    title: "Relevance",
    body: "Why should the startup ecosystem care?",
    detail:
      "The same announcement matters differently to a founder, an operator and an investor. The releases that travel are the ones that say who this changes something for, and are honest about who it does not.",
    Icon: RelevanceIcon,
    image: pressReleaseImages.standardRelevance,
  },
  {
    key: "context",
    title: "Context",
    body: "What does the announcement mean?",
    detail:
      "A fact without its surroundings is hard to place. What came before it, what was being done instead, and what it makes possible next are usually the difference between a notice and a story worth a reader's minute.",
    Icon: ContextIcon,
    image: pressReleaseImages.standardContext,
  },
  {
    key: "people",
    title: "People",
    body: "Who is behind it?",
    detail:
      "Names, roles and someone who can speak to the story. Readers place a company through the people building it, and an editor with a question needs to know who is accountable for the answer.",
    Icon: PeopleIcon,
    image: pressReleaseImages.standardPeople,
  },
  {
    key: "evidence",
    title: "Evidence",
    body: "What can be verified?",
    detail:
      "Every claim in a release is one an editor may check. Official pages, documentation, figures you are willing to stand behind — the material that supports the announcement is what lets it be written about with confidence.",
    Icon: EvidenceIcon,
    image: pressReleaseImages.standardEvidence,
  },
] as const;

/** One principle, alternating sides down the page — odd items sit in the left half, even ones in
 * the right, each entering from its own edge so the reader's eye is walked from side to side
 * rather than straight down a column.
 *
 * The half the words do not occupy holds a photograph answering the same question, so neither side
 * of the row is ever empty. **The photograph travels in from the edge it sits on** — a left-hand
 * image from the left, a right-hand one from the right (`enterFrom`) — over 1.25s, slow enough
 * that the arrival is something the reader watches rather than something that has already happened
 * by the time they look. It still drifts against the scroll afterwards.
 *
 * The text's five parts arrive in sequence rather than together — mark, heading, the rule growing
 * out from the aligned edge, the question, then the answer under it — which is what gives the
 * section its deliberate, one-at-a-time cadence. The last two are slowed and spaced further apart
 * than the rest so the added copy reads as it lands instead of appearing all at once. */
function Principle({ principle, side }: { principle: (typeof PRINCIPLES)[number]; side: "left" | "right" }) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reducedMotion = useReducedMotion();
  const from = side === "right" ? 34 : -34;

  const at = (delay: number, duration = 0.6) => ({
    initial: reducedMotion ? false : { opacity: 0, x: from },
    animate: inView ? { opacity: 1, x: 0 } : undefined,
    transition: { duration, delay, ease: PR_EASE },
  });

  return (
    <li className={`pr-principle pr-principle-${side}`} ref={ref}>
      {/* The figure sits in the half the words do not, so it enters from the opposite edge to the
          text — which is the edge the picture itself is on. */}
      <ParallaxImage
        image={principle.image}
        className="pr-principle-figure"
        strength={10}
        sizes="(max-width: 900px) 100vw, 44vw"
        enterFrom={side === "left" ? "right" : "left"}
      />
      <div className="pr-principle-main">
        <motion.span className="pr-principle-mark" aria-hidden="true" {...at(0)}>
          <principle.Icon />
        </motion.span>
        <motion.h3 className="pr-principle-title" {...at(0.1)}>
          {principle.title}
        </motion.h3>
        <motion.span
          className="pr-principle-rule"
          aria-hidden="true"
          initial={reducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : undefined}
          transition={{ duration: 0.6, delay: 0.24, ease: PR_EASE }}
        />
        <motion.p className="pr-principle-body" {...at(0.34, 0.8)}>
          {principle.body}
        </motion.p>
        <motion.p className="pr-principle-detail" {...at(0.52, 0.9)}>
          {principle.detail}
        </motion.p>
      </div>
    </li>
  );
}

/** Section 01 — the five things an editor is actually reading for, set as large editorial type.
 * Each question is paired with a photograph in the opposite half of the row, the pairs alternating
 * sides down a hairline-divided list. */
export function StoryPrinciples() {
  return (
    <section className="pr-section pr-principles" aria-labelledby="pr-principles-title">
      <SectionIntro
        label="Editorial Standards"
        heading={
          <>
            What makes a story <em>worth reading</em>?
          </>
        }
        headingId="pr-principles-title"
        lede={
          <>
            Five questions our desk asks of every submission. A release that answers them is{" "}
            <em>already most of the way to being a story</em>.
          </>
        }
      />
      <ol className="pr-principles-list">
        {PRINCIPLES.map((principle, i) => (
          <Principle key={principle.key} principle={principle} side={i % 2 === 0 ? "left" : "right"} />
        ))}
      </ol>
    </section>
  );
}
