"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "./hooks";

// Bundled with this app's own /public as the always-available fallback (self-hosted, versioned
// with the repo) instead of hotlinking images.unsplash.com directly. An admin can replace it with
// a real CDN asset (images.startupnews.fyi) via the "Feature Your Startup — Hero Images" panel on
// /admin — see the fetch below — without a code deploy; until then, or if that fetch fails, this
// local file keeps the page from ever showing a broken image.
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
export function ImagePanel() {
  const reducedMotion = useReducedMotion();

  // CDN override (images.startupnews.fyi), set by an admin — an empty string means "use the local
  // fallback above." Fetched client-side so a slow/failed settings lookup never blocks or breaks
  // the page: it just renders the bundled photo until the override arrives, same pattern as
  // Footer.tsx's footer-copyright fetch.
  const [cdnSrc, setCdnSrc] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/site-settings/feature-startup-images", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.success) return;
        if (typeof data.data?.step1 === "string") setCdnSrc(data.data.step1);
      })
      .catch(() => {
        // Keep the local fallback image on any error.
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
