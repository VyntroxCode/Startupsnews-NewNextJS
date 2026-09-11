"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { storyStages } from "./eventImages";
import { useReducedMotion } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

/** How long each stage holds before the next one takes over. Shortened from 5.2s on request — the
 * sequence was being watched, not read at leisure, and the wait between images was the complaint. */
const STAGE_MS = 3200;

/** How long the slide itself takes. Also shortened (from 1.05s), for the same reason. */
const SLIDE_S = 0.62;

/** The travel, as a percentage of the frame's own width. A FULL width, not the old 14%: the
 * photographs now slide clean across rather than drifting a little and cross-fading, so the
 * outgoing and incoming frames stay edge-to-edge through the whole move and the frame is never
 * showing a gap. `.sp-story-media` clips, so everything parked is simply off screen. */
const OFFSCREEN = "100%";

/** 03 — the page's signature section.
 *
 * It USED TO BE SCROLL-DRIVEN: a section five viewports tall, a sticky frame inside it, and scroll
 * position picking the stage. On request it now advances ON A TIMER instead, which changes the
 * section from something the reader operates into something they watch — so the section is a
 * normal height, nothing sticks, and the five stages cycle on their own.
 *
 * Two things follow from that change and are worth keeping:
 *
 *  - The timer only runs while the section is actually on screen (IntersectionObserver). A carousel
 *    advancing in a section nobody is looking at wakes the compositor for nothing, and — worse —
 *    means the reader arrives mid-sequence at whatever stage the clock happened to reach.
 *  - Under reduced motion there is no timer at all. An auto-advancing carousel is exactly the kind
 *    of unrequested motion that setting exists to stop, so those readers get the stacked fallback
 *    below, which lists all five stages in order as plain content.
 *
 * THE MOVE ITSELF was rebuilt on request. It used to be a 14% drift plus a cross-fade, with the
 * inactive frames over-scaled to `1.3` and blurred so their edges could not show through the
 * dissolve — which, being mostly a fade between two zoomed pictures, read as front-to-back rather
 * than as anything travelling sideways. Now the photographs slide a FULL frame width and never
 * change opacity at all: the one leaving and the one arriving stay edge-to-edge for the whole
 * move, so it reads as one picture pushing the last one out of the way. `.sp-story-media` clips,
 * so a parked frame is simply off screen, and no scale or blur is needed to hide an edge.
 *
 * The direction alternates (see `dir`), so consecutive images arrive from opposite sides rather
 * than all sliding the same way — and both it and the hold are faster than they were. */
export function EventScrollStory() {
  const sectionRef = useRef<HTMLElement>(null);
  /** `prev` is the stage being left — it is the only other frame that moves — and `dir` is which
   * way this particular change travels: +1 brings the new image in from the RIGHT and takes the
   * old one out to the left, -1 is the mirror of that. It flips on every automatic advance, so
   * consecutive images arrive from opposite edges. */
  const [{ index, prev, dir }, setStage] = useState({ index: 0, prev: -1, dir: 1 });
  const [inView, setInView] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      // Slightly inside the viewport: the sequence should start when the section is being looked
      // at, not the moment its first pixel appears.
      rootMargin: "-15% 0px -15% 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion || !inView) return;
    const id = window.setInterval(
      () =>
        setStage((s) => ({
          index: (s.index + 1) % storyStages.length,
          prev: s.index,
          dir: -s.dir,
        })),
      STAGE_MS
    );
    return () => window.clearInterval(id);
  }, [reducedMotion, inView]);

  // Picking a stage by hand restarts the hold from that stage rather than letting the running
  // interval fire a moment later — otherwise a click can be overwritten almost immediately. A
  // hand-picked stage travels the way the reader asked for it: forwards if it is further along.
  const select = useCallback((i: number) => {
    setStage((s) => (i === s.index ? s : { index: i, prev: s.index, dir: i > s.index ? 1 : -1 }));
  }, []);

  // Where a frame waits, and where the one being left goes. Opposite sides of the same move.
  const enterX = dir > 0 ? OFFSCREEN : `-${OFFSCREEN}`;
  const exitX = dir > 0 ? `-${OFFSCREEN}` : OFFSCREEN;
  // The copy travels the same way but nowhere near as far — its stack is not clipped, so a full
  // width would send a paragraph across the section. It fades as it goes; the images do not.
  const copyEnterX = dir > 0 ? 46 : -46;
  const copyExitX = dir > 0 ? -46 : 46;

  return (
    <section className="sp-story" ref={sectionRef} aria-labelledby="sp-story-title">
      <h2 id="sp-story-title" className="sp-sr-only">
        What An Event Actually Is
      </h2>

      <div className="sp-story-sticky">
        <div className="sp-wrap sp-story-grid">
          <div className="sp-story-copy">
            <div className="sp-story-rail" aria-hidden="true">
              <motion.span
                className="sp-story-rail-fill"
                animate={{ scaleY: (index + 1) / storyStages.length }}
                transition={{ duration: 0.5, ease: EASE }}
              />
            </div>

            {/* Was a list of numbers (01–05); the numbering went with the rest of the page's, so
                these are unlabelled stops that fill as the sequence passes them. They stay
                clickable — with the sequence running on its own, a reader who wants to go back to
                a stage needs some way to do it. */}
            <ol className="sp-story-index">
              {storyStages.map((s, i) => (
                <li key={s.n}>
                  <button
                    type="button"
                    className={"sp-story-dot" + (i === index ? " is-active" : i < index ? " is-done" : "")}
                    aria-label={s.title}
                    aria-current={i === index ? "true" : undefined}
                    onClick={() => select(i)}
                  />
                </li>
              ))}
            </ol>

            {/* Stacked and hand-sequenced rather than swapped through AnimatePresence: `mode="wait"`
                serialises transitions, and a stage change arriving mid-exit left the copy showing a
                stage the sequence had already passed.

                It used to be a straight cross-fade at a matched 0.75s in both directions, which is
                why two stages were legible on top of each other half way through the change. Now
                the outgoing block leaves FASTER than the incoming one arrives, and the incoming is
                held back a beat, so the overlap is nearly gone — and both slide the way their
                photograph is sliding rather than only fading. */}
            <div className="sp-story-copy-stack">
              {storyStages.map((s, i) => {
                const active = i === index;
                const leaving = i === prev && !active;
                return (
                  <motion.div
                    key={s.n}
                    className="sp-story-copy-block"
                    aria-hidden={!active}
                    initial={false}
                    animate={
                      reducedMotion
                        ? { opacity: active ? 1 : 0, x: 0 }
                        : {
                            opacity: active ? 1 : 0,
                            x: active ? 0 : leaving ? copyExitX : copyEnterX,
                          }
                    }
                    transition={
                      reducedMotion
                        ? { duration: 0.25 }
                        : active
                          ? { duration: 0.5, delay: 0.12, ease: EASE }
                          : leaving
                            ? { duration: 0.26, ease: "easeIn" }
                            // Anything neither arriving nor leaving is invisible: it snaps to
                            // where it will come in from rather than animating there.
                            : { duration: 0 }
                    }
                    style={{ pointerEvents: active ? "auto" : "none" }}
                  >
                    <h3 className="sp-story-title">{s.title}</h3>
                    <p className="sp-story-desc">{s.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="sp-story-media">
            {storyStages.map((s, i) => {
              const active = i === index;
              const leaving = i === prev && !active;
              return (
                <motion.div
                  key={s.n}
                  className="sp-story-frame"
                  aria-hidden={!active}
                  initial={false}
                  animate={
                    reducedMotion
                      ? { opacity: active ? 1 : 0, x: "0%" }
                      : {
                          // No opacity here at all: the two frames that move are both fully
                          // opaque and stay edge-to-edge, which is what makes this read as one
                          // picture pushing the last one off rather than a dissolve.
                          opacity: 1,
                          x: active ? "0%" : leaving ? exitX : enterX,
                        }
                  }
                  transition={
                    reducedMotion
                      ? { duration: 0.25 }
                      : active || leaving
                        ? { duration: SLIDE_S, ease: EASE }
                        // Parked frames jump between the two off-screen sides. They are outside
                        // the clip at both ends, so the jump is never rendered.
                        : { duration: 0 }
                  }
                  style={{ zIndex: active ? 1 : 0 }}
                >
                  <Image
                    src={s.src}
                    alt={active ? s.alt : ""}
                    fill
                    sizes="(min-width: 1024px) 52vw, 100vw"
                    className="sp-story-img"
                    priority={i === 0}
                  />
                </motion.div>
              );
            })}
            <span className="sp-story-frame-edge" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Stacked fallback: image, then text, then the next image. Used on narrow screens and under
          reduced motion, where an auto-advancing carousel is the wrong answer. */}
      <div className="sp-story-fallback">
        <div className="sp-wrap">
          {storyStages.map((s) => (
            <article className="sp-story-block" key={s.n}>
              <div className="sp-story-block-media">
                <Image src={s.src} alt={s.alt} fill sizes="100vw" className="sp-story-img" />
              </div>
              <h3 className="sp-story-title">{s.title}</h3>
              <p className="sp-story-desc">{s.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
