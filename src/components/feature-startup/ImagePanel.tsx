"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useReducedMotion } from "./hooks";

// Bundled with this app's own /public as the always-available fallback (self-hosted, versioned
// with the repo) instead of hotlinking images.unsplash.com directly. An admin can replace it with
// a real CDN asset (images.startupnews.fyi) via the "Feature Your Startup — Hero Images" panel on
// /admin — the page reads it on the server and passes it in as `cdnSrc` — without a code deploy;
// until then, or if that lookup fails, this local file keeps the page from ever showing a broken image.
const PANEL_IMAGE = {
  src: "/images/feature-your-startup/step-details.jpg",
  alt: "Founders collaborating in a startup office",
  title: "Every Startup Has a Story",
  subtitle: "Tell us who's behind it, and how we can reach you.",
};

/** Left-side split panel: one photo under a slow Ken-Burns push, with a caption over it.
 *
 * It used to crossfade a photo per wizard step. Dropping the pitch-deck upload left the form with
 * a single step, so there is nothing to crossfade between and the panel is now static. NOTE: the
 * admin settings card still offers a second ("Step 2") image slot, and nothing reads it any more —
 * only `step1` below is used. */
export function ImagePanel({ cdnSrc }: { cdnSrc?: string }) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="fys-image-col">
      <motion.div
        className="fys-image-frame"
        initial={reducedMotion ? false : { scale: 1.08 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 6, ease: "easeOut" }}
      >
        <Image
          src={cdnSrc || PANEL_IMAGE.src}
          alt={PANEL_IMAGE.alt}
          fill
          sizes="(min-width: 900px) 42vw, 100vw"
          className="fys-image-frame-img"
        />
      </motion.div>

      <div className="fys-image-overlay" />

      <motion.div
        className="fys-image-caption"
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <h2>{PANEL_IMAGE.title}</h2>
        <p>{PANEL_IMAGE.subtitle}</p>
      </motion.div>
    </div>
  );
}
