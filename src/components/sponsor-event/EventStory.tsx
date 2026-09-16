"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "motion/react";
import { SectionHead } from "./SectionHead";
import { eventImages } from "./eventImages";
import {
  BuilderIcon,
  CommunityIcon,
  FounderIcon,
  InstagramIcon,
  InvestorIcon,
  LinkedInIcon,
  MailIcon,
  SiteIcon,
  WhatsAppIcon,
} from "./icons";
import { useReducedMotion } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ── Discover ─────────────────────────────────────────────────────────────── */

const DISCOVER_CHANNELS = [
  { label: "Event listing", Icon: SiteIcon },
  { label: "Newsletter", Icon: MailIcon },
  { label: "Social channels", Icon: InstagramIcon },
  { label: "Communities", Icon: WhatsAppIcon },
];

/** The photograph unmasks upward while it drifts against the scroll, then the channels it can
 * travel on land one by one along the bottom. */
function DiscoverVisual() {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  return (
    <motion.div
      ref={ref}
      className="sp-beat-visual sp-discover"
      initial={reducedMotion ? false : { clipPath: "inset(22% 0% 0% 0% round 26px)", opacity: 0.4 }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0% round 26px)", opacity: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 1.2, ease: EASE }}
    >
      <motion.div className="sp-discover-img" style={reducedMotion ? undefined : { y: imageY }}>
        <Image src={eventImages.discover.src} alt={eventImages.discover.alt} fill sizes="(min-width: 900px) 560px, 100vw" />
      </motion.div>
      <span className="sp-discover-shade" aria-hidden="true" />
      <ul className="sp-discover-chips" aria-label="Where your event is seen">
        {DISCOVER_CHANNELS.map(({ label, Icon }, i) => (
          <motion.li
            key={label}
            initial={reducedMotion ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.6, delay: 0.55 + i * 0.12, ease: EASE }}
          >
            <Icon />
            {label}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

/* ── Connect ──────────────────────────────────────────────────────────────── */

/** viewBox is 100 x 80, the same 5:4 as the visual box, so `x` doubles as a left percentage. */
const CONNECT_H = 80;
const CONNECT_NODES = [
  { label: "Founders", Icon: FounderIcon, x: 15, y: 24 },
  { label: "Investors", Icon: InvestorIcon, x: 39, y: 54 },
  { label: "Operators", Icon: BuilderIcon, x: 63, y: 21 },
  { label: "Communities", Icon: CommunityIcon, x: 85, y: 50 },
] as const;
const CONNECT_PATHS = CONNECT_NODES.slice(1).map((to, i) => {
  const from = CONNECT_NODES[i];
  const mx = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${to.x} ${to.y}`;
});
/** Small nodes that pop in around the community once the chain completes — the ecosystem growing. */
const SATELLITES = [
  { x: 74, y: 67 },
  { x: 95, y: 66 },
  { x: 96, y: 36 },
  { x: 76, y: 35 },
];

/** Founder → Investor → Operator → Community: the connectors draw in sequence, then small dots keep
 * travelling along them and satellites gather around the last node. */
function ConnectVisual() {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.45 });
  const live = inView || reducedMotion;
  const [flowing, setFlowing] = useState(false);

  return (
    <div
      ref={ref}
      className="sp-beat-visual sp-connect"
      role="img"
      aria-label="Founders connected to investors, operators and communities"
    >
      <svg className="sp-connect-svg" viewBox={`0 0 100 ${CONNECT_H}`} aria-hidden="true">
        {CONNECT_PATHS.map((d, i) => (
          <g key={d}>
            <motion.path
              d={d}
              className="sp-connect-line"
              initial={reducedMotion ? false : { pathLength: 0 }}
              animate={live ? { pathLength: 1 } : undefined}
              transition={{ duration: 0.9, delay: 0.35 + i * 0.35, ease: EASE }}
              onAnimationComplete={i === CONNECT_PATHS.length - 1 ? () => setFlowing(true) : undefined}
            />
            {flowing && !reducedMotion && (
              <>
                <circle r="1.15" className="sp-connect-dot">
                  <animateMotion dur="2.8s" begin={`-${i * 0.6}s`} repeatCount="indefinite" path={d} />
                </circle>
                <circle r="0.7" className="sp-connect-spark">
                  <animateMotion dur="3.6s" begin={`-${1.4 + i * 0.5}s`} repeatCount="indefinite" path={d} />
                </circle>
              </>
            )}
          </g>
        ))}
        {SATELLITES.map((s, i) => (
          <motion.circle
            key={`${s.x}-${s.y}`}
            cx={s.x}
            cy={s.y}
            r={1.1}
            className="sp-connect-sat"
            initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
            animate={live ? { scale: 1, opacity: 1 } : undefined}
            transition={{ duration: 0.45, delay: 1.9 + i * 0.12, ease: EASE }}
          />
        ))}
      </svg>
      <ul className="sp-connect-nodes">
        {CONNECT_NODES.map(({ label, Icon, x, y }, i) => (
          <motion.li
            key={label}
            className="sp-connect-node"
            style={{ left: `${x}%`, top: `${(y / CONNECT_H) * 100}%` }}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.6 }}
            animate={live ? { opacity: 1, scale: 1 } : undefined}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.35, ease: EASE }}
          >
            <span className="sp-connect-node-dot">
              <Icon />
            </span>
            <span className="sp-connect-node-label">{label}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/* ── Amplify ──────────────────────────────────────────────────────────────── */

const SOCIAL = [
  { key: "instagram", name: "Instagram", Icon: InstagramIcon, color: "#E1306C", to: { x: "-92%", y: "-118%", rotate: -9 } },
  { key: "linkedin", name: "LinkedIn", Icon: LinkedInIcon, color: "#0A66C2", to: { x: "94%", y: "-96%", rotate: 8 } },
  { key: "whatsapp", name: "Communities", Icon: WhatsAppIcon, color: "#25D366", to: { x: "-90%", y: "104%", rotate: 7 } },
  { key: "newsletter", name: "Newsletter", Icon: MailIcon, color: "#0F1014", to: { x: "92%", y: "118%", rotate: -6 } },
] as const;

/** The event poster sits still while its social cards slide out from behind it. */
function AmplifyVisual() {
  const reducedMotion = useReducedMotion();
  return (
    <div className="sp-beat-visual sp-amplify" role="img" aria-label="An event poster turning into social, newsletter and community posts">
      {SOCIAL.map(({ key, name, Icon, color, to }, i) => (
        <motion.div
          key={key}
          className="sp-amplify-social"
          aria-hidden="true"
          initial={reducedMotion ? false : { x: "0%", y: "0%", rotate: 0, opacity: 0, scale: 0.8 }}
          whileInView={{ x: to.x, y: to.y, rotate: to.rotate, opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1, delay: 0.45 + i * 0.12, ease: EASE }}
        >
          <span className="sp-amplify-social-head">
            <Icon style={{ color }} />
            {name}
          </span>
          <span className="sp-amplify-social-img" />
          <span className="sp-amplify-social-bar" />
          <span className="sp-amplify-social-bar" />
        </motion.div>
      ))}
      <motion.div
        className="sp-amplify-poster"
        aria-hidden="true"
        initial={reducedMotion ? false : { opacity: 0, y: 30, scale: 0.94 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <Image src={eventImages.examplePoster.src} alt="" fill sizes="240px" />
        <span className="sp-amplify-poster-body">
          <span>Example event</span>
          <b>Your event</b>
        </span>
      </motion.div>
    </div>
  );
}

/* ── Section ──────────────────────────────────────────────────────────────── */

const BEATS = [
  {
    key: "discover",
    label: "Discover",
    title: "Put your event in front of the right people.",
    body: "Partnering with StartupNews.fyi puts your event where the startup ecosystem already looks for what's next: on our site, in our newsletter, across our social channels and inside our communities.",
    points: ["Founders", "Investors", "Operators", "Startup teams"],
    Visual: DiscoverVisual,
  },
  {
    key: "connect",
    label: "Connect",
    title: "Turn attention into meaningful connections.",
    body: "The right audience turns a sponsorship into a pipeline. Founders meet investors, operators meet founders, and communities find the people they've been looking for, right in your room.",
    points: ["Warm introductions", "Deal flow", "Hiring", "Partnerships"],
    Visual: ConnectVisual,
  },
  {
    key: "amplify",
    label: "Amplify",
    title: "Give your event a life beyond the venue.",
    body: "Announcements before the day, highlights while it's happening and recaps after the lights go down, shaped for the channels where our readers already spend their time.",
    points: ["Before the day", "During the event", "After it ends"],
    Visual: AmplifyVisual,
  },
];

/** The "why partnerships work" story: three beats — Discover, Connect, Amplify — each a lateral
 * copy reveal beside its own visual, alternating sides so the page reads as a sequence rather than
 * a grid. Named beats, never numbered. */
export function EventStory() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="sp-story" aria-labelledby="sp-story-title">
      <div className="sp-wrap">
        <SectionHead
          kicker="Why partnerships work"
          id="sp-story-title"
          title={
            <>
              An event is more than <em>a date on a calendar.</em>
            </>
          }
          lede="It's a room full of people who could change each other's trajectory. A partnership makes sure the right ones hear about it, show up, and keep talking afterwards."
        />

        <ol className="sp-beats">
          {BEATS.map(({ key, label, title, body, points, Visual }, index) => {
            const flipped = index % 2 === 1;
            return (
              <li key={key} className={"sp-beat" + (flipped ? " is-flipped" : "")}>
                <motion.div
                  className="sp-beat-copy"
                  initial={reducedMotion ? false : { opacity: 0, x: flipped ? 40 : -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.9, ease: EASE }}
                >
                  <p className="sp-beat-label">{label}</p>
                  <h3 className="sp-beat-title">{title}</h3>
                  <p className="sp-beat-body">{body}</p>
                  <ul className="sp-beat-points">
                    {points.map((point, i) => (
                      <motion.li
                        key={point}
                        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.8 }}
                        transition={{ duration: 0.5, delay: 0.35 + i * 0.08, ease: EASE }}
                      >
                        {point}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
                <Visual />
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
