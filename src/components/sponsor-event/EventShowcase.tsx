"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useScroll, useTransform, type MotionValue } from "motion/react";
import { SectionHead } from "./SectionHead";
import { showcaseItems, type ShowcaseItem } from "./eventImages";
import { ArrowRightIcon } from "./icons";
import { useReducedMotion, useWideScreen } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

function ShowcaseCard({
  item,
  index,
  progress,
  pinned,
}: {
  item: ShowcaseItem;
  index: number;
  progress: MotionValue<number>;
  pinned: boolean;
}) {
  const reducedMotion = useReducedMotion();
  // Each photograph drifts inside its own frame against the track's travel — a little further on
  // every card, so the foreground and the pictures move at visibly different speeds.
  const drift = useTransform(progress, [0, 1], [`${-4 - index}%`, `${4 + index}%`]);
  return (
    <motion.li
      className="sp-show-card"
      initial={reducedMotion ? false : { opacity: 0, y: 40, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.8, ease: EASE }}
    >
      <motion.div className="sp-show-card-media" style={pinned ? { x: drift } : undefined}>
        <Image src={item.src} alt={item.alt} fill sizes="(min-width: 960px) 380px, 78vw" />
      </motion.div>
      <span className="sp-show-card-shade" aria-hidden="true" />
      <div className="sp-show-card-body">
        <p className="sp-show-card-who">{item.who}</p>
        <h3 className="sp-show-card-title">{item.title}</h3>
        <p className="sp-show-card-text">{item.text}</p>
      </div>
    </motion.li>
  );
}

/** "Where ideas meet people." — a horizontal gallery of the event formats we partner on.
 *
 * Desktop: the section is pinned and vertical scrolling drives the track sideways. The section's
 * height is exactly one viewport plus the track's overflow, so the last card lands at the right
 * edge just as the pin releases; the heading stays anchored while the cards, the photographs inside
 * them and the outlined backdrop word each travel at their own speed.
 *
 * Phones, tablets and reduced motion: no pinning at all — a native swipeable row with snap points. */
export function EventShowcase() {
  const reducedMotion = useReducedMotion();
  const wide = useWideScreen();
  const pinned = wide && !reducedMotion;
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const distance = useMotionValue(0);
  const [pinHeight, setPinHeight] = useState(0);

  useEffect(() => {
    if (!pinned) return;
    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport) return;
    // ResizeObserver fires once on observe, which is the initial measurement.
    const observer = new ResizeObserver(() => {
      const next = Math.max(0, track.scrollWidth - viewport.clientWidth);
      distance.set(next);
      setPinHeight(next);
    });
    observer.observe(track);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [pinned, distance]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const trackX = useTransform([scrollYProgress, distance], ([p, d]: number[]) => -p * d);
  const ghostX = useTransform([scrollYProgress, distance], ([p, d]: number[]) => -p * d * 0.3);

  return (
    <section
      ref={sectionRef}
      className={"sp-showcase" + (pinned ? " is-pinned" : " is-static")}
      style={pinned ? { height: `calc(100vh + ${pinHeight}px)` } : undefined}
      aria-labelledby="sp-showcase-title"
    >
      <div className="sp-showcase-sticky">
        <motion.p className="sp-showcase-ghost" aria-hidden="true" style={pinned ? { x: ghostX } : undefined}>
          Ideas · People · Momentum
        </motion.p>

        <div className="sp-wrap sp-showcase-head">
          <SectionHead
            align="left"
            kicker="Formats we partner on"
            id="sp-showcase-title"
            title={
              <>
                Where ideas <em>meet people.</em>
              </>
            }
          />
          <p className="sp-showcase-hint" aria-hidden="true">
            {pinned ? "Keep scrolling" : "Swipe"}
            <ArrowRightIcon />
          </p>
        </div>

        <div className="sp-showcase-viewport" ref={viewportRef}>
          <motion.ul className="sp-showcase-track" ref={trackRef} style={pinned ? { x: trackX } : undefined}>
            {showcaseItems.map((item, i) => (
              <ShowcaseCard key={item.key} item={item} index={i} progress={scrollYProgress} pinned={pinned} />
            ))}
          </motion.ul>
        </div>
      </div>
    </section>
  );
}
