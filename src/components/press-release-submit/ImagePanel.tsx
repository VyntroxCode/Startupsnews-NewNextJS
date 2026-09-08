"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LEAD_FORM_TOTAL_STEPS } from "@/components/lead-forms/shared/useLeadForm";

const HEADLINE = "Get Your Story on the Record.";
const TYPE_SPEED_MS = 38;

/** Reveals HEADLINE one character at a time on mount. Skips straight to the full text for
 * reduced-motion users. */
function useTypewriter(text: string, speedMs: number, enabled: boolean) {
  const [shown, setShown] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speedMs);
    return () => window.clearInterval(id);
  }, [text, speedMs, enabled]);

  return shown;
}

interface StepImage {
  step: number;
  src: string;
  alt: string;
  caption: string;
}

// Different photos from Feature Your Startup's panel, verified resolving before use (curl -I
// against images.unsplash.com). A small "writing → meeting → celebrating" story, matching this
// page's 3 steps.
const STEP_IMAGES: StepImage[] = [
  {
    step: 1,
    src: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1000&q=80&auto=format&fit=crop",
    alt: "A vintage typewriter",
    caption: "Every story starts with the details.",
  },
  {
    step: 2,
    src: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1000&q=80&auto=format&fit=crop",
    alt: "A team reviewing notes around a table",
    caption: "So our desk knows how to reach you.",
  },
  {
    step: 3,
    src: "https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=1000&q=80&auto=format&fit=crop",
    alt: "A team celebrating",
    caption: "Attach the details — we'll take it from here.",
  },
];

/** Left-side panel: kicker + typewriter headline, then an inset photo card that swaps per step
 * with a rotate-and-settle entrance — deliberately not the same full-bleed Ken-Burns crossfade
 * Feature Your Startup uses on its panel, per the "don't reuse the exact same UI" brief. */
export function ImagePanel({ currentStep, submitted }: { currentStep: number; submitted: boolean }) {
  const reducedMotion = useReducedMotion();
  const shown = useTypewriter(HEADLINE, TYPE_SPEED_MS, !reducedMotion);
  const activeStep = submitted ? LEAD_FORM_TOTAL_STEPS : currentStep;
  const active = STEP_IMAGES[Math.min(activeStep, STEP_IMAGES.length) - 1];

  return (
    <div className="pr-gif-col">
      <motion.p className="pr-kicker" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        StartupNews.fyi — Press Desk
      </motion.p>
      <h1 className="pr-headline">{shown}</h1>
      <motion.p className="pr-dateline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}>
        Submit a press release, funding announcement, or feature request for editorial review.
      </motion.p>

      <div className="pr-image-frame">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.step}
            className="pr-image-inset"
            initial={{ opacity: 0, rotate: -3, scale: 0.96 }}
            animate={{ opacity: 1, rotate: 0, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, rotate: 2, scale: 0.97, transition: { duration: 0.3 } }}
          >
            <Image
              src={active.src}
              alt={active.alt}
              width={420}
              height={300}
              className="pr-image-inset-img"
              priority={active.step === 1}
            />
          </motion.div>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.p
            key={active.step}
            className="pr-image-caption"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.15, duration: 0.4 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            {submitted ? "Filed and ready for review." : active.caption}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
