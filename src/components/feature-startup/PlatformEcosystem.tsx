"use client";

import { motion } from "motion/react";
import { SectionLabel } from "./SectionLabel";
import {
  FacebookIcon,
  GoogleIcon,
  HeartIcon,
  InstagramIcon,
  LinkedInIcon,
  NewsletterIcon,
  WhatsAppIcon,
  XIcon,
  YouTubeIcon,
} from "./icons";
import { useReducedMotion } from "./hooks";

/** The channels StartupNews.fyi actually operates — the social accounts in `siteConfig.social`,
 * the WhatsApp communities and search presence quoted on /advertise-with-us, and this site's own
 * newsletter. Positions are percentages of the stage box; the connector SVG below uses the same
 * numbers with `preserveAspectRatio="none"`, so the lines stay pinned to the nodes at every width
 * without any measurement in JS. */
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

/** Illustrative post mock-ups. Every one of these is generic on purpose — no real company name,
 * no real handle, no engagement number that could be read as a published result. The caption
 * under the row says so in as many words. */
const FORMATS = [
  {
    key: "instagram",
    chrome: "Instagram",
    Icon: InstagramIcon,
    handle: "startupnews.fyi",
    body: "Meet the team building —————. Here's what they're shipping next.",
    foot: "Example carousel format",
  },
  {
    key: "linkedin",
    chrome: "LinkedIn",
    Icon: LinkedInIcon,
    handle: "StartupNews.fyi",
    body: "Featured today: how one founding team went from prototype to first customers.",
    foot: "Example post format",
  },
  {
    key: "newsletter",
    chrome: "Newsletter",
    Icon: NewsletterIcon,
    handle: "StartupNews.fyi Digest",
    body: "In this edition — the startups we featured this week, and what they're working on.",
    foot: "Example newsletter slot",
  },
] as const;

const CENTER = { x: 50, y: 50 };

/** Section 05/06 — where a feature can travel. Motion language here is *line drawing*: eight
 * connectors draw outward from the centre when the section arrives, the nodes pop on as each line
 * lands, and a slow dash flow keeps the graph quietly alive afterwards. This is the page's second
 * dark section; it re-uses the hero's palette on purpose so the story feels like it has come back
 * around, with the light sections either side acting as the gap between them.
 *
 * Wording note: everything here says a feature *can be shaped for* these channels. Nothing on
 * this page promises placement on any of them. */
export function PlatformEcosystem() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="fys-eco" aria-labelledby="fys-eco-title">
      <div className="fys-eco-inner">
        <SectionLabel index="03" tone="dark">
          Ecosystem
        </SectionLabel>

        <motion.h2
          id="fys-eco-title"
          className="fys-h2 fys-h2-dark"
          initial={reducedMotion ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          One feature. Multiple places to be discovered.
        </motion.h2>

        <motion.p
          className="fys-eco-lede"
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.55, delay: 0.1 }}
        >
          Your story can be shaped for the channels where the startup audience already spends its
          time — the site itself, our social accounts, our communities and the newsletter. Which
          surfaces a given feature runs on is decided editorially, case by case.
        </motion.p>

        <div className="fys-eco-stage" role="img" aria-label="A StartupNews.fyi feature connected to the site's social channels, communities, newsletter and search presence">
          <svg
            className="fys-eco-wires"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {NODES.map((node, i) => {
              // Gentle bow away from the straight line so eight connectors don't read as a star.
              const mx = (CENTER.x + node.x) / 2 + (node.y - CENTER.y) * 0.1;
              const my = (CENTER.y + node.y) / 2 - (node.x - CENTER.x) * 0.1;
              const d = `M ${CENTER.x} ${CENTER.y} Q ${mx} ${my} ${node.x} ${node.y}`;
              return (
                <g key={node.key}>
                  <motion.path
                    d={d}
                    className="fys-eco-wire"
                    vectorEffect="non-scaling-stroke"
                    initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.85, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
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
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
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
                  transition={{ duration: 0.42, delay: 0.6 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
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

        <div className="fys-formats">
          {FORMATS.map((format, i) => (
            <motion.figure
              key={format.key}
              className="fys-format-card"
              initial={reducedMotion ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="fys-format-chrome">
                <format.Icon className="fys-format-chrome-icon" />
                <span>{format.chrome}</span>
              </div>
              <div className="fys-format-body">
                <div className="fys-format-head">
                  <span className="fys-format-avatar" aria-hidden="true" />
                  <div>
                    <p className="fys-format-handle">{format.handle}</p>
                    <p className="fys-format-sub">Featured startup</p>
                  </div>
                </div>
                <p className="fys-format-text">{format.body}</p>
                <div className="fys-format-media" aria-hidden="true">
                  <span className="fys-format-media-logo" />
                  <span className="fys-format-media-line" />
                  <span className="fys-format-media-line short" />
                </div>
                <div className="fys-format-foot">
                  <HeartIcon className="fys-format-heart" />
                  <span>{format.foot}</span>
                </div>
              </div>
            </motion.figure>
          ))}
        </div>

        <p className="fys-formats-note">
          Illustrative formats only — mock-ups of how a feature can be laid out, not published posts.
        </p>
      </div>
    </section>
  );
}
