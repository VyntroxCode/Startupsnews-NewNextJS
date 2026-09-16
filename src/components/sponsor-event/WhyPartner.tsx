"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { SectionHead } from "./SectionHead";
import { SponsorVideo } from "./SponsorVideo";
import { sponsorVideos } from "./backgrounds";
import { GoogleIcon, InstagramIcon, LinkedInIcon, MailIcon } from "./icons";
import { useReducedMotion, useWideScreen } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Figures are the ones this business already publishes on /advertise-with-us, and "since 2019"
 * is the founding date in the site-wide Organization JSON-LD — nothing invented for this page. */
const PANELS = [
  {
    key: "visibility",
    label: "Visibility",
    title: "Get seen beyond the room.",
    body: "Your event gets positioned where founders, investors and startup professionals are already discovering what's next.",
    stat: "10M+ monthly impressions · 90.3M Google search impressions",
  },
  {
    key: "audience",
    label: "Audience",
    title: "Reach people who matter.",
    body: "Put your event in front of founders, investors, operators and the broader startup community, not a general crowd.",
    stat: "445K+ Instagram followers · 15M+ organic reach",
  },
  {
    key: "credibility",
    label: "Credibility",
    title: "Build trust around your event.",
    body: "Being part of the StartupNews.fyi ecosystem gives your event additional context and credibility with the people deciding whether to attend.",
    stat: "Covering startups since 2019 · 250+ global media partners",
  },
  {
    key: "community",
    label: "Community",
    title: "Create connections that continue.",
    body: "The value of an event doesn't end when the lights go down. Our communities keep the conversation going long after the last session.",
    stat: "22K+ members across our WhatsApp communities",
  },
] as const;

type PanelKey = (typeof PANELS)[number]["key"];

/** Event card expanding into the placements it can travel to. */
function VisibilityVisual() {
  return (
    <div className="sp-vis">
      <span className="sp-vis-card">
        <i />
        <b />
        <b />
      </span>
      <span className="sp-vis-place sp-vis-place-a">
        <InstagramIcon />
      </span>
      <span className="sp-vis-place sp-vis-place-b">
        <LinkedInIcon />
      </span>
      <span className="sp-vis-place sp-vis-place-c">
        <MailIcon />
      </span>
      <span className="sp-vis-place sp-vis-place-d">
        <GoogleIcon />
      </span>
    </div>
  );
}

/** Deterministic, so server and client agree on which dots are lit. */
const AUDIENCE_DOTS = Array.from({ length: 30 }, (_, i) => ({ hot: [2, 7, 11, 14, 19, 23, 26].includes(i) }));

/** An audience field lighting up. */
function AudienceVisual() {
  return (
    <div className="sp-aud">
      {AUDIENCE_DOTS.map((dot, i) => (
        <span
          key={i}
          className={dot.hot ? "is-hot" : undefined}
          style={{ "--i": i } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/** An editorial feature composition settling straight. */
function CredibilityVisual() {
  return (
    <div className="sp-cred">
      <span className="sp-cred-mast">
        StartupNews<em>.fyi</em>
        <small>Events</small>
      </span>
      <span className="sp-cred-title">The startup events worth being in the room for</span>
      <span className="sp-cred-img" />
      <span className="sp-cred-lines">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

function PanelVisual({ panel }: { panel: PanelKey }) {
  if (panel === "visibility") return <VisibilityVisual />;
  if (panel === "audience") return <AudienceVisual />;
  if (panel === "credibility") return <CredibilityVisual />;
  return (
    <p className="sp-why-big">
      22K+
      <small>Community members</small>
    </p>
  );
}

/** "Why partner with us". Four panels in a row; the one under the pointer (or keyboard focus)
 * widens, its copy fades up and its small visual plays. The Community panel runs on its own
 * background clip. Below 960px the row stacks and every panel is open. */
export function WhyPartner() {
  const reducedMotion = useReducedMotion();
  const wide = useWideScreen();
  const [active, setActive] = useState(0);

  return (
    <section className="sp-why" id="sp-why" aria-labelledby="sp-why-title">
      <div className="sp-wrap">
        <SectionHead
          kicker="Why partner with us"
          id="sp-why-title"
          title={
            <>
              Why partner with <em>StartupNews.fyi</em>
            </>
          }
          lede="Because great events deserve more than an audience. They deserve momentum."
        />

        <ul className="sp-why-panels">
          {PANELS.map((panel, i) => {
            const isActive = !wide || active === i;
            return (
              <motion.li
                key={panel.key}
                className={
                  "sp-why-panel" +
                  (isActive ? " is-active" : "") +
                  (panel.key === "community" ? " is-video" : "")
                }
                tabIndex={wide ? 0 : undefined}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                initial={reducedMotion ? false : { opacity: 0, y: 48 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: EASE }}
              >
                {panel.key === "community" && <SponsorVideo video={sponsorVideos.community} />}
                <p className="sp-why-panel-label">{panel.label}</p>
                <h3 className="sp-why-panel-title">{panel.title}</h3>
                <div className="sp-why-panel-reveal">
                  <p className="sp-why-panel-body">{panel.body}</p>
                  <p className="sp-why-panel-stat">{panel.stat}</p>
                </div>
                <div className="sp-why-visual" aria-hidden="true">
                  <PanelVisual panel={panel.key} />
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
