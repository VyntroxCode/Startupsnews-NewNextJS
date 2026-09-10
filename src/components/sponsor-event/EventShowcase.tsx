"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "motion/react";
import { SectionHead } from "./SectionHead";
import { eventImages } from "./eventImages";
import { useFinePointer, useReducedMotion } from "./hooks";
import { ArrowRightIcon } from "./icons";

const EASE = [0.22, 1, 0.36, 1] as const;

const META = [
  { label: "Format", value: "Conference · Meetup · Summit" },
  { label: "Where", value: "Your city · Your country" },
  { label: "For", value: "Founders · Investors · Builders" },
  { label: "When", value: "Your date" },
];

/** 07 — what a listing could look like. Everything in the card is placeholder: this site has no
 * "example event" record to read from, and dressing the mock in a real organiser's name would
 * misrepresent both them and what a submission buys. The badge and the caption both say so.
 *
 * Motion language: *a curtain wipe off the photograph*, plus an optional ±3° pointer tilt on
 * devices that have a real pointer. The wipe is a scaleY transform rather than an animated
 * clip-path — cheaper to composite, and Motion animates it reliably. */
export function EventShowcase() {
  const reducedMotion = useReducedMotion();
  const finePointer = useFinePointer();
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const tiltEnabled = finePointer && !reducedMotion;

  const rise = (delay: number) =>
    reducedMotion
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.3 },
          transition: { duration: 0.5, delay, ease: EASE },
        };

  return (
    <section className="sp-showcase" aria-labelledby="sp-showcase-title">
      <div className="sp-wrap">
        <SectionHead
          index="07"
          kicker="Showcase"
          tone="light"
          title={<span id="sp-showcase-title">Imagine your event here.</span>}
        />

        <figure className="sp-showcase-figure">
          <motion.article
            className="sp-showcase-card"
            initial={reducedMotion ? false : { opacity: 0, y: 36, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, ease: EASE }}
            animate={{ rotateX: tilt.rotateX, rotateY: tilt.rotateY }}
            style={{ transformPerspective: 1200 }}
            onPointerMove={(e) => {
              if (!tiltEnabled) return;
              const r = e.currentTarget.getBoundingClientRect();
              setTilt({
                rotateX: -((e.clientY - r.top) / r.height - 0.5) * 6,
                rotateY: ((e.clientX - r.left) / r.width - 0.5) * 6,
              });
            }}
            onPointerLeave={() => setTilt({ rotateX: 0, rotateY: 0 })}
          >
            <div className="sp-showcase-media">
              <Image
                src={eventImages.showcase.src}
                alt={eventImages.showcase.alt}
                fill
                sizes="(min-width: 1024px) 46vw, 100vw"
                className="sp-showcase-img"
              />
              <span className="sp-showcase-badge">Example event preview</span>
              {!reducedMotion && (
                <motion.span
                  className="sp-showcase-curtain"
                  aria-hidden="true"
                  initial={{ scaleY: 1 }}
                  whileInView={{ scaleY: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
                />
              )}
            </div>

            <div className="sp-showcase-body">
              <motion.span className="sp-showcase-tag" {...rise(0.2)}>
                Event
              </motion.span>
              <motion.h3 className="sp-showcase-name" {...rise(0.27)}>
                Your Event Title
              </motion.h3>
              <motion.p className="sp-showcase-lede" {...rise(0.34)}>
                A short, readable write-up of what the event is, who it&apos;s for and why it&apos;s
                worth turning up to — the context a bare calendar listing never carries.
              </motion.p>
              <motion.dl className="sp-showcase-meta" {...rise(0.41)}>
                {META.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </motion.dl>
              <motion.span className="sp-showcase-cta" aria-hidden="true" {...rise(0.48)}>
                Explore event
                <ArrowRightIcon />
              </motion.span>
            </div>
          </motion.article>

          <figcaption className="sp-showcase-caption">
            Placeholder content in a preview layout — your own listing is built from what you send us.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
