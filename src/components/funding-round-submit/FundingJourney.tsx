"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useInView } from "motion/react";
import { SectionHead } from "./SectionHead";
import { JOURNEY_VISUALS, type JourneyFrame } from "./images";
import { useReducedMotion } from "./hooks";
import { FR_EASE } from "./motion";

/** One step of text on the left. Reports itself as the active step while it holds the middle band
 * of the viewport — a live (not once-only) observation, because the visual beside it has to follow
 * the reader back up the page as well as down.
 *
 * The figure inside it is the mobile presentation of the same frame: below 1000px the pinned stage
 * is display:none, so each step carries its own photograph and the section becomes a plain
 * alternating read. `loading="lazy"` means the copy that is switched off never gets fetched, so
 * the two presentations do not cost two downloads. */
function JourneyStep({
  frame,
  index,
  onActivate,
  isActive,
}: {
  frame: JourneyFrame;
  index: number;
  onActivate: (index: number) => void;
  isActive: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const reducedMotion = useReducedMotion();
  const inView = useInView(ref, { amount: 0.55, margin: "-20% 0px -30% 0px" });

  // In an effect, not during render: this is a child telling its parent which frame to show, and
  // React refuses a render-phase update that crosses a component boundary.
  useEffect(() => {
    if (inView) onActivate(index);
  }, [inView, index, onActivate]);

  return (
    <li className={"fr-journey-step" + (isActive ? " is-active" : "")} ref={ref}>
      <div className="fr-journey-step-figure" aria-hidden="true">
        <Image src={frame.image.src} alt="" fill sizes="100vw" className="fr-img" />
      </div>

      {/* Was the step number ("01") plus this bar; the number went with the page's numbering and
          the bar stayed, since it is what marks the active step against the pinned visual. */}
      <p className="fr-journey-step-n">
        <span className="fr-journey-step-bar" aria-hidden="true" />
      </p>
      <motion.h3
        className="fr-journey-step-title"
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.6, ease: FR_EASE }}
      >
        {frame.title}
      </motion.h3>
      <motion.p
        className="fr-journey-step-body"
        initial={reducedMotion ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.6, delay: 0.1, ease: FR_EASE }}
      >
        {frame.body}
      </motion.p>
    </li>
  );
}

/** Section 02 — the page's centrepiece: a pinned visual on the right that changes as five steps of
 * text scroll past it on the left.
 *
 * Motion language: *scroll-controlled swap*, and the swap is DIRECTIONAL — added on request,
 * because a straight cross-fade gave the reader no sense that the frames were a sequence.
 *
 * Each frame's resting offset alternates by index (see JOURNEY_ENTER_X): even frames sit to the
 * left, odd frames to the right, and the active one is always at 0. That single rule produces the
 * zig-zag for free in both scroll directions — moving from frame 0 to 1, frame 0 returns to its
 * own left offset while frame 1 comes in from the right, so the outgoing and incoming photographs
 * cross rather than dissolve in place; the next pair crosses the other way; scrolling back up
 * reverses it exactly. No "which way did we come from" state to keep, which is what makes it
 * survive a fast scroll that skips a frame.
 *
 * The over-scale is what makes the travel safe, not decoration: a frame translated sideways by 10%
 * of the stage would drag its own edge into view. Inactive frames sit at `scale: 1.24`, so the
 * photograph overhangs the stage by 12% on each side — more than the 10% it ever travels — and the
 * scale and the offset resolve together, so no intermediate frame of the animation can expose an
 * edge either. Only `opacity`, `transform` and `filter` are animated, all compositor-friendly, and
 * the stack is fixed in the DOM so nothing mounts or unmounts mid-scroll.
 *
 * The stage sticks with plain CSS `position: sticky` rather than a scroll-driven translate: it
 * cannot drift out of sync with the browser's own scrolling, it costs nothing per frame, and it
 * degrades to a normal block the moment the layout collapses to one column. */
/** Which side a frame rests on while it is not the active one — alternating, so consecutive frames
 * always enter from opposite sides. Percentages of the frame's own width, so the travel scales with
 * the stage instead of being a fixed pixel distance that reads differently at every breakpoint. */
const JOURNEY_ENTER_X = (index: number) => (index % 2 === 0 ? "-10%" : "10%");

export function FundingJourney() {
  const [active, setActive] = useState(0);
  const reducedMotion = useReducedMotion();
  const onActivate = useCallback((index: number) => setActive(index), []);
  const current = JOURNEY_VISUALS[active];

  return (
    <section className="fr-section fr-journey" id="fr-journey" aria-labelledby="fr-journey-title">
      <div className="fr-container">
        <SectionHead
          label="The journey"
          heading={
            <>
              A round is five stories, <em>not one number</em>.
            </>
          }
          headingId="fr-journey-title"
          lede={
            <>
              Scroll through <em>what an editor is actually reading for</em> when a funding
              announcement lands on the desk.
            </>
          }
        />

        <div className="fr-journey-grid">
          <ol className="fr-journey-steps">
            {JOURNEY_VISUALS.map((frame, i) => (
              <JourneyStep key={frame.key} frame={frame} index={i} isActive={active === i} onActivate={onActivate} />
            ))}
          </ol>

          <div className="fr-journey-sticky" aria-hidden="true">
            <div className="fr-journey-stage">
              {JOURNEY_VISUALS.map((frame, i) => (
                <motion.div
                  className="fr-journey-frame"
                  key={frame.key}
                  initial={false}
                  animate={
                    reducedMotion
                      ? { opacity: active === i ? 1 : 0 }
                      : {
                          opacity: active === i ? 1 : 0,
                          x: active === i ? "0%" : JOURNEY_ENTER_X(i),
                          scale: active === i ? 1 : 1.24,
                          filter: active === i ? "blur(0px)" : "blur(10px)",
                        }
                  }
                  transition={{ duration: 0.85, ease: FR_EASE }}
                >
                  <Image
                    src={frame.image.src}
                    alt={frame.image.alt}
                    fill
                    sizes="(max-width: 1000px) 100vw, 46vw"
                    className="fr-img"
                  />
                  <span className="fr-journey-frame-wash" />
                </motion.div>
              ))}

              <div className="fr-journey-hud">
                {/* Printed "01 / 05" above the title until all numbering was removed from this
                    page. The progress rail below already says where the reader is, without it. */}
                <p className="fr-journey-hud-title">{current.title}</p>
                <span className="fr-journey-hud-rail">
                  <motion.span
                    className="fr-journey-hud-fill"
                    animate={{ scaleX: (active + 1) / JOURNEY_VISUALS.length }}
                    transition={{ duration: 0.6, ease: FR_EASE }}
                  />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
