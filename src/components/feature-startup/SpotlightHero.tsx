"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import {
  FacebookIcon,
  GoogleIcon,
  InstagramIcon,
  LinkedInIcon,
  NewsletterIcon,
  WhatsAppIcon,
  XIcon,
  YouTubeIcon,
} from "./icons";
import { useReducedMotion } from "./hooks";
import { featureStartupBackgrounds } from "./backgrounds";
import { BackgroundVideo } from "./BackgroundVideo";

const EASE = [0.22, 1, 0.36, 1] as const;

/** The channels StartupNews.fyi actually operates — the social accounts in `siteConfig.social`,
 * the WhatsApp communities and search presence quoted on /advertise-with-us, and this site's own
 * newsletter. Positions are percentages of the stage box; the connector SVG below uses the same
 * numbers with `preserveAspectRatio="none"`, so the lines stay pinned to the nodes at every width
 * without any measurement in JS. Formerly PlatformEcosystem.tsx's own `NODES` — that section was
 * folded into the hero on request, see the file doc comment below. */
const NODES = [
  { key: "instagram", label: "Instagram", Icon: InstagramIcon, x: 50, y: 12 },
  { key: "linkedin", label: "LinkedIn", Icon: LinkedInIcon, x: 79.7, y: 23.1 },
  { key: "x", label: "X", Icon: XIcon, x: 92, y: 50 },
  { key: "newsletter", label: "Newsletter", Icon: NewsletterIcon, x: 79.7, y: 76.9 },
  { key: "whatsapp", label: "Communities", Icon: WhatsAppIcon, x: 50, y: 88 },
  { key: "youtube", label: "YouTube", Icon: YouTubeIcon, x: 20.3, y: 76.9 },
  { key: "search", label: "Search", Icon: GoogleIcon, x: 8, y: 50 },
  { key: "facebook", label: "Facebook", Icon: FacebookIcon, x: 20.3, y: 23.1 },
] as const;

const GRAPH_CENTER = { x: 50, y: 50 };

/** Section 01 — the first viewport. A dark, glowing stage that states what the page is for, then
 * shows the connector graph: a feature at the centre, wired out to every channel it can travel on.
 * The submission form is deliberately far below; this section only has to earn the next scroll.
 *
 * Motion language here is *stagger*, then *line drawing*: the headline and sub enter on one
 * staggered timeline, then the eight connectors draw outward from the centre as the graph scrolls
 * into view, the nodes popping on as each line lands, with a slow dash flow keeping the graph
 * quietly alive afterwards. A scroll-linked parallax lifts the whole composition and fades it as
 * the next section arrives so the hero dissolves into the page rather than cutting.
 *
 * The "Feature My Startup" / "See How It Works" buttons that sat under the lede were removed on
 * request, along with the `onFeature`/`onHowItWorks` props they called and the whole `.fys-btn`
 * family in globals.css, which nothing else used. The hero no longer links anywhere: the reader
 * reaches the form by scrolling the page, which is the order the sections were written in. The
 * 0.24 slot they held in the entrance ladder is simply left out.
 *
 * The illustrative "Featured Startup" card and the six orbiting channel chips that used to sit
 * below the lede were removed on request too — the white boxes read as UI floating over the
 * background video.
 *
 * Then the connector graph and its dotted-globe background video, which used to be their own
 * "Ecosystem" section further down the page (formerly PlatformEcosystem.tsx), were moved up into
 * the hero on request, replacing the hero's own background clip — so the graph is now the first
 * thing the reader sees rather than something they scroll to. The graph's `NODES`/`GRAPH_CENTER`
 * data, its SVG wires and the `.fys-eco-*` classes it renders with were carried over unrenamed
 * (they are plain CSS hooks, not tied to any one section) to avoid rewriting working styling;
 * PlatformEcosystem.tsx and its own "Ecosystem" section were deleted since the graph now appears
 * only once, here. */
export function SpotlightHero() {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ["0%", "-14%"]);
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  const enter = (delay: number) =>
    reducedMotion
      ? { initial: false as const, animate: {} }
      : {
          initial: { opacity: 0, y: 30 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: EASE },
        };

  return (
    <section className="fys-hero" ref={sectionRef} aria-labelledby="fys-hero-title">
      <div className="fys-hero-bg" aria-hidden="true">
        {/* Footage first, scrim over it, then the glows and grid — so the brand light sources
            tint the picture rather than being flattened under it. Uses the eco section's own
            photo/scrim treatment (saturate only, undimmed), tuned for this clip, not the hero's
            old brightness-lifted one built for a different clip. */}
        <BackgroundVideo
          video={featureStartupBackgrounds.hero}
          className="fys-eco-photo"
          scrimClassName="fys-eco-scrim"
          preload="auto"
        />
        <motion.span
          className="fys-hero-glow fys-hero-glow-a"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <motion.span
          className="fys-hero-glow fys-hero-glow-b"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.15, ease: "easeOut" }}
        />
        <span className="fys-hero-grain" />
        <span className="fys-hero-grid" />
      </div>

      <motion.div className="fys-hero-inner" style={reducedMotion ? undefined : { y: parallaxY, opacity: fade }}>
        <motion.h1 id="fys-hero-title" className="fys-hero-title" {...enter(0.06)}>
          Put Your Startup
          <br />
          in the{" "}
          {/* "Spotlight." travels in from the right — the one word on the page that gets its own
              move, which is the point of it. It STARTS inside the h1's own entrance (delay 0.2,
              against the line's 0.6s) and then keeps going for a beat after the line has settled:
              starting late would leave a visible hole where the word belongs, but finishing late
              is the whole effect. Slowed from 0.42s on request — 0.42 read as a snap rather than
              as travel.
              `x` in px rather than a percentage: a percentage of the em's own width would start
              the word from a different place at every headline reflow.
              Under reduced motion it simply appears with the rest of the line. */}
          <motion.em
            initial={reducedMotion ? false : { opacity: 0, x: 190 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.95, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Spotlight.
          </motion.em>
        </motion.h1>

        <motion.p className="fys-hero-sub" {...enter(0.16)}>
          Showcase your startup to founders, investors, builders, media, and the wider startup
          ecosystem through StartupNews.fyi.
        </motion.p>

        <div
          className="fys-eco-stage"
          role="img"
          aria-label="A StartupNews.fyi feature connected to the site's social channels, communities, newsletter and search presence"
        >
          <svg className="fys-eco-wires" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {NODES.map((node, i) => {
              // Gentle bow away from the straight line so eight connectors don't read as a star.
              const mx = (GRAPH_CENTER.x + node.x) / 2 + (node.y - GRAPH_CENTER.y) * 0.1;
              const my = (GRAPH_CENTER.y + node.y) / 2 - (node.x - GRAPH_CENTER.x) * 0.1;
              const d = `M ${GRAPH_CENTER.x} ${GRAPH_CENTER.y} Q ${mx} ${my} ${node.x} ${node.y}`;
              return (
                <g key={node.key}>
                  <motion.path
                    d={d}
                    className="fys-eco-wire"
                    vectorEffect="non-scaling-stroke"
                    initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.85, delay: 0.15 + i * 0.07, ease: EASE }}
                  />
                  {!reducedMotion && (
                    <path d={d} className="fys-eco-wire-flow" vectorEffect="non-scaling-stroke" style={{ animationDelay: `${i * 0.4}s` }} />
                  )}
                </g>
              );
            })}
          </svg>

          <div className="fys-eco-core-slot">
            <motion.div
              className="fys-eco-core"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <span className="fys-eco-core-mark">SN</span>
              <span className="fys-eco-core-name">StartupNews.fyi</span>
              <span className="fys-eco-core-sub">Your feature</span>
            </motion.div>
          </div>

          <ul className="fys-eco-nodes">
            {NODES.map((node, i) => (
              <li
                key={node.key}
                className="fys-eco-node-slot"
                style={{ "--fys-node-x": `${node.x}%`, "--fys-node-y": `${node.y}%` } as React.CSSProperties}
              >
                <motion.span
                  className="fys-eco-node"
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.7 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.42, delay: 0.6 + i * 0.07, ease: EASE }}
                >
                  <span className="fys-eco-node-icon">
                    <node.Icon />
                  </span>
                  <span className="fys-eco-node-label">{node.label}</span>
                </motion.span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      <div className="fys-hero-seam" aria-hidden="true" />
    </section>
  );
}
