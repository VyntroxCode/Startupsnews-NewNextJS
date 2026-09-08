"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { TOTAL_STEPS } from "./useFeatureStartupForm";

interface StepImage {
  step: number;
  src: string;
  alt: string;
  title: string;
  subtitle: string;
}

// Reusing the same Unsplash photos already proven-working elsewhere on this site
// (src/app/advertise-with-us/page.tsx, src/lib/data-adapter.ts's default event image) instead of
// unverified new IDs.
const STEP_IMAGES: StepImage[] = [
  {
    step: 1,
    src: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1400&q=80&auto=format&fit=crop",
    alt: "Founders collaborating in a startup office",
    title: "Every Startup Has a Story",
    subtitle: "Tell us who's behind it.",
  },
  {
    step: 2,
    src: "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=1400&q=80&auto=format&fit=crop",
    alt: "Team discussing plans around a table",
    title: "Let's Get You Discovered",
    subtitle: "So we know where and how to reach you.",
  },
  {
    step: 3,
    src: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1400&q=80&auto=format&fit=crop",
    alt: "Founder preparing a pitch deck on a laptop",
    title: "Show Us What You've Built",
    subtitle: "Share your deck — we'll take it from there.",
  },
];

/** Left-side split panel: a slow Ken-Burns crossfade between one photo per form step, with a
 * caption overlay that changes in step. `currentStep`/`submitted` are lifted state from
 * useFeatureStartupForm (owned by FeatureStartupPage) so this panel stays in sync with the form
 * on the right without any of its own step logic. */
export function ImagePanel({ currentStep, submitted }: { currentStep: number; submitted: boolean }) {
  const activeStep = submitted ? TOTAL_STEPS : currentStep;
  const active = STEP_IMAGES[Math.min(activeStep, STEP_IMAGES.length) - 1];

  return (
    <div className="fys-image-col">
      <AnimatePresence>
        <motion.div
          key={active.step}
          className="fys-image-frame"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{
            opacity: 1,
            scale: 1,
            transition: { opacity: { duration: 0.7 }, scale: { duration: 6, ease: "easeOut" } },
          }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
          <Image
            src={active.src}
            alt={active.alt}
            fill
            sizes="(min-width: 900px) 46vw, 100vw"
            className="fys-image-frame-img"
            priority={active.step === 1}
          />
        </motion.div>
      </AnimatePresence>

      <div className="fys-image-overlay" />

      <AnimatePresence mode="wait">
        <motion.div
          key={active.step}
          className="fys-image-caption"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.15 } }}
          exit={{ opacity: 0, y: -10, transition: { duration: 0.3 } }}
        >
          <h2>{submitted ? "You're All Set!" : active.title}</h2>
          <p>{submitted ? "Thanks for sharing your story with us." : active.subtitle}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
