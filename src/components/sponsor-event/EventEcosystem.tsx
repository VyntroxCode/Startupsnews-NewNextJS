"use client";

import { useRef } from "react";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { useState } from "react";
import { SectionHead } from "./SectionHead";
import { useReducedMotion } from "./hooks";

/** Who is actually in the room. Positions are percentages of the stage; the connector SVG uses the
 * same numbers with `preserveAspectRatio="none"`, so the lines stay pinned to the nodes at every
 * width without measuring anything in JS. Ordered clockwise from the top so the scroll-driven
 * highlight travels around the ring rather than jumping about. */
const NODES = [
  { key: "founders", label: "Founders", x: 50, y: 8 },
  { key: "investors", label: "Investors", x: 82, y: 22 },
  { key: "builders", label: "Builders", x: 94, y: 52 },
  { key: "media", label: "Media", x: 80, y: 82 },
  { key: "attendees", label: "Attendees", x: 50, y: 94 },
  { key: "communities", label: "Communities", x: 20, y: 82 },
  { key: "teams", label: "Tech teams", x: 6, y: 52 },
  { key: "partners", label: "Partners", x: 18, y: 22 },
] as const;

const CENTER = { x: 50, y: 51 };

/** 02 — the ecosystem around an event. Motion language: *a graph drawing itself, then a travelling
 * highlight*. The eight connectors draw outward when the section arrives; after that, scroll
 * position picks which node is lit, so moving down the page walks the highlight around the ring
 * and the graph reads as something being explored rather than a finished diagram. */
export function EventEcosystem() {
  const reducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({ target: stageRef, offset: ["start 85%", "end 25%"] });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = Math.min(NODES.length - 1, Math.max(0, Math.floor(p * NODES.length)));
    setActive((current) => (current === next ? current : next));
  });

  return (
    <section className="sp-eco" aria-labelledby="sp-eco-title">
      <div className="sp-wrap">
        <SectionHead
          index="02"
          kicker="Ecosystem"
          title={<span id="sp-eco-title">An event is more than a room full of people.</span>}
          lede="It is a moment where founders meet investors, ideas meet opportunity, and communities come together around what comes next."
        />

        <div
          className="sp-eco-stage"
          ref={stageRef}
          role="img"
          aria-label="An event at the centre of founders, investors, builders, media, attendees, communities, technology teams and partners"
        >
          <svg className="sp-eco-wires" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {NODES.map((node, i) => {
              const d = `M ${CENTER.x} ${CENTER.y} L ${node.x} ${node.y}`;
              return (
                <g key={node.key}>
                  <motion.path
                    d={d}
                    className="sp-eco-wire"
                    vectorEffect="non-scaling-stroke"
                    initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <path
                    d={d}
                    className={"sp-eco-wire-live" + (active === i ? " is-active" : "")}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
          </svg>

          <div className="sp-eco-core-slot">
            <motion.div
              className="sp-eco-core"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="sp-eco-core-label">The</span>
              <span className="sp-eco-core-word">Event</span>
              {!reducedMotion && <span className="sp-eco-core-pulse" aria-hidden="true" />}
            </motion.div>
          </div>

          <ul className="sp-eco-nodes">
            {NODES.map((node, i) => (
              <li
                key={node.key}
                className="sp-eco-node-slot"
                style={{ "--sp-node-x": `${node.x}%`, "--sp-node-y": `${node.y}%` } as React.CSSProperties}
              >
                <motion.span
                  className={"sp-eco-node" + (active === i ? " is-active" : "")}
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.7 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, delay: 0.5 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <i className="sp-eco-node-dot" aria-hidden="true" />
                  {node.label}
                </motion.span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
