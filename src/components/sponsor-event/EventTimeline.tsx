"use client";

import { motion } from "motion/react";

/** Three stops, down from four ("Event / Schedule / Identity / Review") — the schedule fields
 * moved into step 1 and "Identity" was renamed to what it actually collects. */
const STEPS = ["Event", "Contact", "Review"];

/** Primary step navigation for the wizard — a vertical sticky timeline on desktop (replacing the
 * old horizontal 4-dot stepper), collapsing to a compact "01 / 04 + progress bar" readout on
 * mobile where there's no room for a sidebar. Both renderings share the same done/active/pending
 * logic; which one is visible is pure CSS (`.sp-timeline-desktop` / `.sp-timeline-mobile`), so
 * there's no duplicated state, just duplicated markup for two very different layouts. */
export function EventTimeline({ currentStep }: { currentStep: number }) {
  return (
    <>
      <div className="sp-timeline-desktop" role="list" aria-label="Submission progress">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          return (
            <div className="sp-timeline-item" role="listitem" key={label} data-state={isDone ? "done" : isActive ? "active" : "pending"}>
              <div className="sp-timeline-node-col">
                <motion.div
                  className="sp-timeline-node"
                  animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                  transition={isActive ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
                >
                  {isDone ? "✓" : String(stepNum).padStart(2, "0")}
                </motion.div>
                {i < STEPS.length - 1 && (
                  <div className="sp-timeline-line">
                    <motion.div
                      className="sp-timeline-line-fill"
                      initial={false}
                      animate={{ scaleY: isDone ? 1 : 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                )}
              </div>
              <span className="sp-timeline-label">{label}</span>
            </div>
          );
        })}
      </div>

      <div className="sp-timeline-mobile">
        <div className="sp-timeline-mobile-row">
          <span className="sp-timeline-mobile-count">
            {String(currentStep).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
          </span>
          <span className="sp-timeline-mobile-label">{STEPS[currentStep - 1]}</span>
        </div>
        <div className="sp-timeline-mobile-bar">
          <motion.div
            className="sp-timeline-mobile-bar-fill"
            initial={false}
            animate={{ scaleX: currentStep / STEPS.length }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </>
  );
}
