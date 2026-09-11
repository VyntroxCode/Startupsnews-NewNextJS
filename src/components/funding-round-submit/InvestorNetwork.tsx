"use client";

import { motion } from "motion/react";
import { SectionHead } from "./SectionHead";
import { useReducedMotion } from "./hooks";
import { FR_EASE } from "./motion";

const CENTER = { x: 360, y: 214 };

/** Five kinds of backer around one company. Positions are hand-placed on the 720×428 viewBox
 * rather than generated on a circle, so the labels have room to sit outside the nodes without
 * colliding at any width. */
const NODES = [
  { key: "angel", label: "Angel investors", x: 110, y: 84, anchor: "start" as const, dx: 0, dy: -26 },
  { key: "vc", label: "VC funds", x: 610, y: 78, anchor: "end" as const, dx: 0, dy: -26 },
  { key: "strategic", label: "Strategic investors", x: 646, y: 316, anchor: "end" as const, dx: 0, dy: 34 },
  { key: "institutional", label: "Institutional capital", x: 340, y: 396, anchor: "middle" as const, dx: 0, dy: 32 },
  { key: "operators", label: "Operator angels", x: 76, y: 312, anchor: "start" as const, dx: 0, dy: 34 },
];

/** Section 04 — an educational picture of who tends to sit behind a round.
 *
 * Motion language: *drawing*. The connectors draw themselves out from the company node with
 * `pathLength`, the nodes pulse in behind them, and a small marker then travels down each
 * connector on a long loop, which is the only continuous animation in the section. Everything is
 * `pathLength`, `opacity` and `transform` — never an animated `clip-path`, which Motion drops
 * silently in exactly this in-view case.
 *
 * IMPORTANT, and the reason the copy is worded the way it is: this is a diagram of how funding
 * ecosystems are generally structured. StartupNews.fyi does not introduce founders to investors,
 * and nothing in this section should ever be edited to imply that it does. */
export function InvestorNetwork() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="fr-section fr-network" aria-labelledby="fr-network-title">
      <div className="fr-container">
        <SectionHead
          label="The ecosystem"
          heading={
            <>
              Behind every round is a <em>network of believers</em>.
            </>
          }
          headingId="fr-network-title"
        />

        <div className="fr-network-stage">
          <svg className="fr-network-svg" viewBox="0 0 720 428" role="img" aria-label="Diagram: a company at the centre, connected to angel investors, VC funds, strategic investors, institutional capital and operator angels">
            <defs>
              <radialGradient id="fr-node-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--fr-accent)" stopOpacity="0.34" />
                <stop offset="100%" stopColor="var(--fr-accent)" stopOpacity="0" />
              </radialGradient>
            </defs>

            {NODES.map((node, i) => (
              <motion.line
                key={`line-${node.key}`}
                x1={CENTER.x}
                y1={CENTER.y}
                x2={node.x}
                y2={node.y}
                className="fr-network-line"
                initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: FR_EASE }}
              />
            ))}

            {/* Capital moving inward. One marker per connector, each on its own long loop so the
                diagram never syncs up into a pulse. */}
            {!reducedMotion &&
              NODES.map((node, i) => (
                <motion.circle
                  key={`spark-${node.key}`}
                  cx={CENTER.x}
                  cy={CENTER.y}
                  r="3.6"
                  className="fr-network-spark"
                  initial={{ opacity: 0 }}
                  whileInView={{
                    opacity: [0, 1, 1, 0],
                    x: [node.x - CENTER.x, 0],
                    y: [node.y - CENTER.y, 0],
                  }}
                  viewport={{ once: false, amount: 0.3 }}
                  transition={{
                    duration: 3.4 + i * 0.35,
                    delay: 1 + i * 0.5,
                    repeat: Infinity,
                    repeatDelay: 1.1,
                    ease: "easeInOut",
                  }}
                />
              ))}

            {NODES.map((node, i) => (
              <motion.g
                key={node.key}
                initial={reducedMotion ? false : { opacity: 0, scale: 0.4 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.12, ease: FR_EASE }}
                style={{ originX: `${node.x}px`, originY: `${node.y}px` }}
              >
                <circle cx={node.x} cy={node.y} r="30" fill="url(#fr-node-glow)" />
                <circle cx={node.x} cy={node.y} r="11" className="fr-network-node" />
                <text x={node.x + node.dx} y={node.y + node.dy} textAnchor={node.anchor} className="fr-network-label">
                  {node.label}
                </text>
              </motion.g>
            ))}

            <motion.g
              initial={reducedMotion ? false : { opacity: 0, scale: 0.7 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, ease: FR_EASE }}
              style={{ originX: `${CENTER.x}px`, originY: `${CENTER.y}px` }}
            >
              <circle cx={CENTER.x} cy={CENTER.y} r="62" fill="url(#fr-node-glow)" />
              <circle cx={CENTER.x} cy={CENTER.y} r="34" className="fr-network-core" />
              <text x={CENTER.x} y={CENTER.y + 5} textAnchor="middle" className="fr-network-core-label">
                You
              </text>
            </motion.g>
          </svg>
        </div>
      </div>
    </section>
  );
}
