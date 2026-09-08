"use client";

import { useRef, type MouseEvent } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

const BENEFITS = [
  {
    label: "REACH",
    title: "10M+ Monthly Readers",
    body: "Put your round in front of the founders, investors, and operators who actually read us.",
  },
  {
    label: "SPEED",
    title: "Fast Editorial Turnaround",
    body: "Our news desk reviews every submission quickly, so a timely round gets timely coverage.",
  },
  {
    label: "TRUST",
    title: "A Media Brand Investors Know",
    body: "Join the founders already covered across StartupNews.fyi's global startup network.",
  },
  {
    label: "DISTRIBUTION",
    title: "Built-in Amplification",
    body: "Coverage reaches our newsletter, social channels, and partner network automatically.",
  },
];

const TILT_RANGE_DEG = 12;

/** One benefit card that tilts toward the cursor in 3D (mouse position → rotateX/rotateY, eased
 * through a spring) instead of the flat "-translate-y on hover" cards Advertise With Us uses for
 * its own "Why Choose" section. Disabled for prefers-reduced-motion, where it's a plain static
 * card. */
function TiltCard({ benefit, index }: { benefit: (typeof BENEFITS)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 220, damping: 22 });
  const springY = useSpring(rotateY, { stiffness: 220, damping: 22 });

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * TILT_RANGE_DEG);
    rotateX.set(-py * TILT_RANGE_DEG);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      ref={ref}
      className="fr-why-card"
      style={{ rotateX: springX, rotateY: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: index * 0.09 }}
    >
      <span className="fr-why-card-glow" aria-hidden="true" />
      <span className="fr-why-card-label">{benefit.label}</span>
      <h3>{benefit.title}</h3>
      <p>{benefit.body}</p>
    </motion.div>
  );
}

export function WhySubmit() {
  return (
    <section className="fr-why">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.5 }}
      >
        Why founders submit their round here
      </motion.h2>
      <div className="fr-why-grid">
        {BENEFITS.map((benefit, i) => (
          <TiltCard key={benefit.title} benefit={benefit} index={i} />
        ))}
      </div>
    </section>
  );
}
