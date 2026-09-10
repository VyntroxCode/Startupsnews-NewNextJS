"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { storyStages } from "./eventImages";

const EASE = [0.22, 1, 0.36, 1] as const;

/** 03 — the page's signature interaction.
 *
 * The section is tall (one viewport of scroll per stage). Inside it a sticky frame holds the copy
 * on the left and one large photograph on the right; scroll position — not a timer and not a
 * click — decides which stage is showing. All five images come from `storyStages` in
 * eventImages.ts, the page's single image source.
 *
 * The transition is deliberately cinematic rather than a cut: the outgoing image fades while
 * scaling down slightly and blurring, the incoming one comes up from 1.06 scale with its blur
 * clearing. Both are in the DOM together for the length of the crossfade, so an image never
 * simply pops.
 *
 * Under reduced motion, and on narrow screens where a sticky two-column layout stops making
 * sense, this falls back to a plain stacked image-then-text sequence — same content, same order,
 * no scroll coupling. That switch is made in CSS (`.sp-story-sticky` / `.sp-story-fallback`)
 * rather than in JS: both trees render either way, so there is no hydration branch to get wrong,
 * and the media query and the reduced-motion query select between them. */
export function EventScrollStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const railScale = useTransform(smooth, [0, 1], [0, 1]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = Math.min(storyStages.length - 1, Math.max(0, Math.floor(p * storyStages.length)));
    setIndex((current) => (current === next ? current : next));
  });

  const stage = storyStages[index];

  return (
    <section className="sp-story" ref={sectionRef} aria-labelledby="sp-story-title">
      <h2 id="sp-story-title" className="sp-sr-only">
        What an event actually is
      </h2>

      {/* Scroll-driven view. Hidden by CSS on small screens and under reduced motion, where the
          stacked fallback below takes over instead. */}
      <div className="sp-story-sticky">
        <div className="sp-wrap sp-story-grid">
          <div className="sp-story-copy">
            <div className="sp-story-rail" aria-hidden="true">
              <motion.span className="sp-story-rail-fill" style={{ scaleY: railScale }} />
            </div>

            <ol className="sp-story-index" aria-hidden="true">
              {storyStages.map((s, i) => (
                <li key={s.n} className={i === index ? "is-active" : i < index ? "is-done" : ""}>
                  {s.n}
                </li>
              ))}
            </ol>

            {/* Stacked and cross-faded for the same reason as the images: an AnimatePresence
                `mode="wait"` here serialises transitions, and scrolling faster than one exit
                animation left the copy showing a stage the reader had already passed. */}
            <div className="sp-story-copy-stack">
              {storyStages.map((s, i) => {
                const active = i === index;
                return (
                  <motion.div
                    key={s.n}
                    className="sp-story-copy-block"
                    aria-hidden={!active}
                    initial={false}
                    animate={{ opacity: active ? 1 : 0, y: active ? 0 : 18 }}
                    transition={{ duration: 0.45, ease: EASE }}
                    style={{ pointerEvents: active ? "auto" : "none" }}
                  >
                    <p className="sp-story-n">{s.n}</p>
                    <h3 className="sp-story-title">{s.title}</h3>
                    <p className="sp-story-desc">{s.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="sp-story-media">
            {/* All five frames are mounted and stacked; only their opacity/scale/blur changes.
                Driving the crossfade off `active` rather than mounting and unmounting through
                AnimatePresence keeps it deterministic — an exit animation that hasn't finished
                before the next stage arrives would otherwise leave frames piling up in the DOM,
                and the copy beside it lagging behind the scroll position. */}
            {storyStages.map((s, i) => {
              const active = i === index;
              return (
                <motion.div
                  key={s.n}
                  className="sp-story-frame"
                  aria-hidden={!active}
                  initial={false}
                  animate={{
                    opacity: active ? 1 : 0,
                    scale: active ? 1 : 1.05,
                    filter: active ? "blur(0px)" : "blur(10px)",
                  }}
                  transition={{
                    opacity: { duration: 0.6, ease: "easeInOut" },
                    scale: { duration: 0.9, ease: EASE },
                    filter: { duration: 0.6, ease: "easeInOut" },
                  }}
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
            <p className="sp-story-counter" aria-hidden="true">
              <span>{stage.n}</span> / {String(storyStages.length).padStart(2, "0")}
            </p>
          </div>
        </div>
      </div>

      {/* Stacked fallback: image, then text, then the next image. */}
      <div className="sp-story-fallback">
        <div className="sp-wrap">
          {storyStages.map((s) => (
            <article className="sp-story-block" key={s.n}>
              <div className="sp-story-block-media">
                <Image src={s.src} alt={s.alt} fill sizes="100vw" className="sp-story-img" />
              </div>
              <p className="sp-story-n">{s.n}</p>
              <h3 className="sp-story-title">{s.title}</h3>
              <p className="sp-story-desc">{s.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
