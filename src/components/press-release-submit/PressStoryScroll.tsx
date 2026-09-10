"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { PRESS_STORY_CHAPTERS } from "./images";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

/** How far through the pinned section each chapter owns. With five chapters the section is five
 * viewports tall and each chapter holds the screen for one of them. */
const COUNT = PRESS_STORY_CHAPTERS.length;

/** Section 01 — the page's signature interaction. The composition pins to the viewport while the
 * reader scrolls a five-viewport-tall section past it; the text on the left and the photograph on
 * the right change together as each chapter takes over.
 *
 * Motion language: *scroll-driven cross-dissolve*. Nothing here animates on a timer — the active
 * chapter is derived from scroll position, so scrolling back up walks the story backwards, which a
 * set of one-shot `whileInView` reveals could never do.
 *
 * The photographs are all mounted at once and stacked, rather than swapped in and out of the tree:
 * an exiting image has to blur and shrink *underneath* the arriving one, which cannot happen if it
 * has already been unmounted. Each slide sits in one of three states — a chapter still ahead of
 * the reader waits slightly enlarged (1.04), the active one is at rest, and one already read
 * settles back to 0.97 — so moving forward always reads as the new image easing *down* into place
 * over the old one shrinking away, and scrolling back up reverses that without any extra logic.
 * Only `opacity`, `transform` and `filter` are animated, all of them compositor-friendly.
 *
 * Layout: side-by-side on desktop, image-above-text on narrow screens (pure CSS on `.pr-story-
 * panel` — the pinning and the chapter logic are identical, so the interaction survives mobile
 * instead of being switched off there). Under reduced motion the cross-dissolve becomes a plain
 * opacity swap with no blur or scale, and the section still works exactly as a scroll story. */
export function PressStoryScroll() {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    // Clamped rather than floored at the far end: progress reaches exactly 1 at the bottom of the
    // section, which would otherwise index one past the last chapter for a single frame.
    const next = Math.min(COUNT - 1, Math.max(0, Math.floor(progress * COUNT)));
    setActive((current) => (current === next ? current : next));
  });

  return (
    <section
      className="pr-story"
      ref={ref}
      style={{ "--pr-story-chapters": COUNT } as React.CSSProperties}
      aria-labelledby="pr-story-title"
    >
      <div className="pr-story-sticky">
        <h2 className="pr-sr-only" id="pr-story-title">
          What a strong submission tells us
        </h2>
        <div className="pr-story-panel">
          <div className="pr-story-copy">
            <p className="pr-folio" aria-hidden="true">
              01 / The Story
            </p>

            <ol className="pr-story-rail" aria-hidden="true">
              {PRESS_STORY_CHAPTERS.map((chapter, i) => (
                <li key={chapter.n} className={"pr-story-rail-item" + (i === active ? " is-active" : "")}>
                  <span className="pr-story-rail-n">{chapter.n}</span>
                  <span className="pr-story-rail-track">
                    <motion.span
                      className="pr-story-rail-fill"
                      initial={false}
                      animate={{ scaleX: i <= active ? 1 : 0 }}
                      transition={{ duration: 0.5, ease: PR_EASE }}
                    />
                  </span>
                </li>
              ))}
            </ol>

            {/* Every chapter is rendered; the inactive ones are hidden from the accessibility tree
                and stacked behind the active one, so the whole story is present in the DOM for
                anyone who is not scrolling it. */}
            <div className="pr-story-text-stack">
              {PRESS_STORY_CHAPTERS.map((chapter, i) => {
                const isActive = i === active;
                return (
                  <motion.div
                    key={chapter.n}
                    className="pr-story-text"
                    aria-hidden={!isActive}
                    initial={false}
                    animate={
                      reducedMotion
                        ? { opacity: isActive ? 1 : 0 }
                        : { opacity: isActive ? 1 : 0, y: isActive ? 0 : 18 }
                    }
                    transition={{ duration: 0.6, ease: PR_EASE }}
                    style={{ pointerEvents: isActive ? "auto" : "none" }}
                  >
                    <p className="pr-story-n">{chapter.n}</p>
                    <h3 className="pr-story-title">{chapter.title}</h3>
                    <p className="pr-story-desc">{chapter.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="pr-story-visual">
            <div className="pr-story-frame">
              {PRESS_STORY_CHAPTERS.map((chapter, i) => {
                const isActive = i === active;
                return (
                  <motion.div
                    key={chapter.n}
                    className="pr-story-slide"
                    initial={false}
                    animate={
                      reducedMotion
                        ? { opacity: isActive ? 1 : 0 }
                        : {
                            opacity: isActive ? 1 : 0,
                            scale: isActive ? 1 : i > active ? 1.04 : 0.97,
                            filter: isActive ? "blur(0px)" : "blur(4px)",
                          }
                    }
                    transition={{ duration: 0.9, ease: PR_EASE }}
                    style={{ zIndex: isActive ? 2 : 1 }}
                  >
                    <Image
                      src={chapter.image.src}
                      alt={chapter.image.alt}
                      fill
                      sizes="(max-width: 900px) 100vw, 46vw"
                      className="pr-figure-img"
                    />
                  </motion.div>
                );
              })}
              <span className="pr-story-frame-rule" aria-hidden="true" />
            </div>
            <p className="pr-story-caption" aria-hidden="true">
              <span className="pr-story-caption-n">{PRESS_STORY_CHAPTERS[active].n}</span>
              {PRESS_STORY_CHAPTERS[active].title}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
