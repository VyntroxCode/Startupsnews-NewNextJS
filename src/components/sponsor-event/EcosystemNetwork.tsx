"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { SectionHead } from "./SectionHead";
import { BuilderIcon, CommunityIcon, FounderIcon, HandshakeIcon, InvestorIcon, MediaIcon, SparkIcon } from "./icons";
import { useReducedMotion, useWideScreen } from "./hooks";

const NODES = [
  { key: "founders", label: "Founders", Icon: FounderIcon },
  { key: "investors", label: "Investors", Icon: InvestorIcon },
  { key: "startups", label: "Startups", Icon: SparkIcon },
  { key: "operators", label: "Operators", Icon: BuilderIcon },
  { key: "communities", label: "Communities", Icon: CommunityIcon },
  { key: "media", label: "Media", Icon: MediaIcon },
  { key: "partners", label: "Partners", Icon: HandshakeIcon },
] as const;

type PlacedNode = (typeof NODES)[number] & { x: number; y: number; d: string };

interface NetworkLayout {
  w: number;
  h: number;
  cx: number;
  cy: number;
  rx: number;
  rings: number[];
  nodes: PlacedNode[];
  web: string;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Nodes on an ellipse around the centre, each wired to it by a gently bowed curve. The SVG uses
 * the same viewBox aspect as the stage box (`meet`, never stretched), so particles stay round and
 * the HTML nodes can be placed with plain percentages. Desktop is landscape, phones portrait. */
function buildLayout(wide: boolean): NetworkLayout {
  const w = wide ? 160 : 100;
  const h = wide ? 100 : 120;
  const cx = w / 2;
  const cy = h / 2;
  const rx = wide ? 62 : 36;
  const ry = wide ? 38 : 46;
  const nodes = NODES.map((node, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / NODES.length;
    const x = round(cx + rx * Math.cos(angle));
    const y = round(cy + ry * Math.sin(angle));
    const mx = round((cx + x) / 2 + (y - cy) * 0.14);
    const my = round((cy + y) / 2 - (x - cx) * 0.14);
    return { ...node, x, y, d: `M ${cx} ${cy} Q ${mx} ${my} ${x} ${y}` };
  });
  const web = nodes.map((n, i) => `${i === 0 ? "M" : "L"} ${n.x} ${n.y}`).join(" ") + " Z";
  return { w, h, cx, cy, rx, rings: wide ? [14, 23, 32] : [10, 17, 25], nodes, web };
}

const WIDE_LAYOUT = buildLayout(true);
const NARROW_LAYOUT = buildLayout(false);

/** The slice of scroll progress over which node `i` arrives. */
function nodeWindow(i: number): [number, number] {
  const start = 0.16 + (i / NODES.length) * 0.5;
  return [start, start + 0.16];
}

function NetworkLine({ d, index, progress }: { d: string; index: number; progress: MotionValue<number> }) {
  const [, end] = nodeWindow(index);
  const pathLength = useTransform(progress, [end - 0.12, end + 0.1], [0, 1]);
  const opacity = useTransform(progress, [end - 0.12, end - 0.06], [0, 1]);
  return <motion.path d={d} className="sp-net-line" style={{ pathLength, opacity }} />;
}

function NetworkNode({
  node,
  index,
  progress,
  layout,
}: {
  node: PlacedNode;
  index: number;
  progress: MotionValue<number>;
  layout: NetworkLayout;
}) {
  const [start, end] = nodeWindow(index);
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const scale = useTransform(progress, [start, end], [0.4, 1]);
  const labelOpacity = useTransform(progress, [end - 0.02, end + 0.14], [0, 1]);
  const labelFilter = useTransform(progress, [end - 0.02, end + 0.14], ["blur(8px)", "blur(0px)"]);
  return (
    <li
      className="sp-net-node"
      style={{ left: `${(node.x / layout.w) * 100}%`, top: `${(node.y / layout.h) * 100}%` }}
    >
      <motion.span className="sp-net-node-dot" style={{ opacity, scale }}>
        <node.Icon />
      </motion.span>
      <motion.span className="sp-net-node-label" style={{ opacity: labelOpacity, filter: labelFilter }}>
        {node.label}
      </motion.span>
    </li>
  );
}

/** "One event. An entire ecosystem." — the page's signature animation, driven by scroll so it
 * builds (and unbuilds) under the reader's thumb:
 *
 *   1. the YOUR EVENT core scales in
 *   2. the seven audiences arrive one by one around it
 *   3. each connector draws out to its node as that node lands
 *   4. once the graph is complete, particles start travelling both ways along every connector
 *   5. the node labels resolve from a blur, and a faint outer web joins the ring
 *
 * Kept deliberately calm: two colours, thin strokes, slow particles. Under reduced motion the
 * finished graph is shown with no particles. */
export function EcosystemNetwork() {
  const reducedMotion = useReducedMotion();
  const wide = useWideScreen();
  const layout = wide ? WIDE_LAYOUT : NARROW_LAYOUT;
  const stageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stageRef, offset: ["start 88%", "center 48%"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 110, damping: 26, restDelta: 0.001 });
  const complete = useMotionValue(1);
  const progress = reducedMotion ? complete : smooth;
  const coreOpacity = useTransform(progress, [0, 0.12], [0, 1]);
  const coreScale = useTransform(progress, [0, 0.16], [0.55, 1]);
  const webOpacity = useTransform(progress, [0.8, 1], [0, 1]);
  const [flowing, setFlowing] = useState(false);

  useMotionValueEvent(smooth, "change", (value) => {
    if (value > 0.88) setFlowing(true);
  });

  return (
    <section className="sp-network" aria-labelledby="sp-network-title">
      <div className="sp-wrap">
        <SectionHead
          ground="dark"
          kicker="The network"
          id="sp-network-title"
          title={
            <>
              One event. <em>An entire ecosystem.</em>
            </>
          }
          lede="When StartupNews.fyi partners on your event, it plugs into everyone we already reach, and every line carries your event to a different part of the startup world."
        />

        <div
          ref={stageRef}
          className={"sp-net-stage" + (wide ? "" : " is-narrow")}
          role="img"
          aria-label="Your event at the centre of a network of founders, investors, startups, operators, communities, media and partners"
        >
          <svg className="sp-net-svg" viewBox={`0 0 ${layout.w} ${layout.h}`} aria-hidden="true">
            <defs>
              <radialGradient
                id="sp-net-grad"
                gradientUnits="userSpaceOnUse"
                cx={layout.cx}
                cy={layout.cy}
                r={layout.rx}
              >
                <stop offset="0%" stopColor="#FF5E8F" />
                <stop offset="100%" stopColor="#8B7CF6" stopOpacity="0.75" />
              </radialGradient>
            </defs>
            {layout.rings.map((r, i) => (
              <circle
                key={r}
                cx={layout.cx}
                cy={layout.cy}
                r={r}
                className={"sp-net-ring" + (i === layout.rings.length - 1 ? " sp-net-ring-spin" : "")}
              />
            ))}
            <motion.path d={layout.web} className="sp-net-web" style={{ opacity: webOpacity }} />
            {layout.nodes.map((node, i) => (
              <NetworkLine key={`${node.key}-${wide}`} d={node.d} index={i} progress={progress} />
            ))}
            {flowing &&
              !reducedMotion &&
              layout.nodes.map((node, i) => (
                <g key={`particles-${node.key}-${wide}`}>
                  <circle r={wide ? 0.75 : 1} className="sp-net-particle is-pink">
                    <animateMotion
                      dur={`${2.6 + (i % 3) * 0.4}s`}
                      begin={`-${(i * 0.37).toFixed(2)}s`}
                      repeatCount="indefinite"
                      path={node.d}
                    />
                  </circle>
                  <circle r={wide ? 0.5 : 0.7} className="sp-net-particle">
                    <animateMotion
                      dur={`${3.4 + (i % 2) * 0.5}s`}
                      begin={`-${(i * 0.61).toFixed(2)}s`}
                      repeatCount="indefinite"
                      keyPoints="1;0"
                      keyTimes="0;1"
                      calcMode="linear"
                      path={node.d}
                    />
                  </circle>
                </g>
              ))}
          </svg>

          <motion.div
            className="sp-net-core"
            style={{
              left: `${(layout.cx / layout.w) * 100}%`,
              top: `${(layout.cy / layout.h) * 100}%`,
              opacity: coreOpacity,
              scale: coreScale,
            }}
          >
            <span className="sp-net-core-pulse" aria-hidden="true" />
            <span className="sp-net-core-pulse is-late" aria-hidden="true" />
            <span className="sp-net-core-kicker">Your</span>
            <span className="sp-net-core-label">Event</span>
          </motion.div>

          <ul className="sp-net-nodes">
            {layout.nodes.map((node, i) => (
              <NetworkNode key={node.key} node={node} index={i} progress={progress} layout={layout} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
