"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { SectionHead } from "./SectionHead";
import { eventImages } from "./eventImages";
import {
  CalendarIcon,
  CheckIcon,
  InstagramIcon,
  LinkedInIcon,
  MailIcon,
  PinIcon,
  WhatsAppIcon,
  XIcon,
} from "./icons";
import { useReducedMotion } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

/** What actually happens after someone uses the form at the bottom of this page: the submission
 * is saved and sent to the team (POST /api/events/sponsor-event → Sales Tracker + email), the team
 * reviews it and gets in touch, and promotion follows only once a partnership is agreed. Nothing
 * here promises automatic publication. Labelled, never numbered. */
const STEPS = [
  {
    key: "share",
    label: "Share",
    title: "Tell us about your event.",
    text: "What it is, where and when it's happening, and who it's for. The form at the bottom of this page takes a few minutes.",
  },
  {
    key: "details",
    label: "Details",
    title: "Add the details that sell it.",
    text: "Upload your event poster and tell us who to talk to: the name, email and number our team should reach.",
  },
  {
    key: "review",
    label: "Review",
    title: "We review and shape the partnership.",
    text: "Our team reads every submission, then gets in touch to agree the partnership and the channels that fit your event.",
  },
  {
    key: "live",
    label: "Spotlight",
    title: "Your event reaches the ecosystem.",
    text: "Once agreed, your event goes out across the StartupNews.fyi channels in your partnership, reaching the founders, investors and operators you want in the room.",
  },
] as const;

const STATUS = [
  { label: "Draft", tone: "draft" },
  { label: "Details added", tone: "ready" },
  { label: "In review", tone: "review" },
  { label: "Live", tone: "live" },
] as const;

const CHANNELS = [InstagramIcon, LinkedInIcon, XIcon, WhatsAppIcon, MailIcon];

/** An example event card that fills in as the timeline advances — the process made visible. */
function JourneyCard({ step }: { step: number }) {
  const status = STATUS[step];
  return (
    <div className="sp-jcard" aria-hidden="true">
      <div className="sp-jcard-head">
        <span className="sp-jcard-brand">Event preview</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={status.label}
            className={`sp-jcard-status is-${status.tone}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
          >
            <i />
            {status.label}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className={"sp-jcard-poster" + (step >= 1 ? " is-on" : "")}>
        <span className="sp-jcard-poster-empty">Poster</span>
        <span className="sp-jcard-poster-img">
          <Image src={eventImages.examplePoster.src} alt="" fill sizes="420px" />
        </span>
      </div>

      <div className="sp-jcard-body">
        <p className="sp-jcard-title">Founders &amp; Funders Night</p>
        <ul className="sp-jcard-rows">
          <li className="sp-jcard-row">
            <PinIcon />
            Bengaluru, India
          </li>
          <li className="sp-jcard-row">
            <CalendarIcon />
            14 Nov 2026 · 6:30 PM
          </li>
        </ul>

        <div className={"sp-jcard-reveal" + (step >= 1 ? " is-on" : "")}>
          <div className="sp-jcard-contact">
            <b>AK</b>
            <span>
              <strong>Organiser contact added</strong>
              Name, email and phone
            </span>
          </div>
        </div>

        <div className={"sp-jcard-reveal" + (step >= 2 ? " is-on" : "")}>
          <ul className="sp-jcard-checks">
            <li>
              <CheckIcon />
              Details checked by our team
            </li>
            <li>
              <CheckIcon />
              Partnership format agreed
            </li>
          </ul>
        </div>

        <div className={"sp-jcard-reveal" + (step >= 3 ? " is-on" : "")}>
          <ul className="sp-jcard-channels">
            {CHANNELS.map((Icon, i) => (
              <li key={i} style={{ transitionDelay: `${i * 60}ms` }}>
                <Icon />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="sp-jcard-note">Example: how a submission comes together.</p>
    </div>
  );
}

/** "From submission to spotlight" — a vertical timeline whose rail fills with scroll. The step at
 * the reading line is lit, the others stay muted, and the example card beside it updates to match.
 * Below 960px the card is dropped and the steps become plain stacked cards. */
export function SubmissionJourney() {
  const reducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start 62%", "end 62%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setActive(Math.min(STEPS.length - 1, Math.max(0, Math.floor(value * STEPS.length))));
  });

  return (
    <section className="sp-journey" aria-labelledby="sp-journey-title">
      <div className="sp-wrap">
        <SectionHead
          kicker="How it works"
          id="sp-journey-title"
          title={
            <>
              From submission <em>to spotlight.</em>
            </>
          }
          lede="A short form from you, a real conversation with our team, and a partnership built around your event."
        />

        <div className="sp-journey-grid">
          <div className="sp-journey-track" ref={trackRef}>
            <div className="sp-journey-rail" aria-hidden="true">
              <motion.span className="sp-journey-rail-fill" style={reducedMotion ? { scaleY: 1 } : { scaleY: fill }} />
            </div>
            <ol className="sp-journey-list">
              {STEPS.map((step, i) => (
                <li key={step.key} className={"sp-journey-step" + (active === i ? " is-active" : "")}>
                  <span className="sp-journey-dot" aria-hidden="true" />
                  <motion.div
                    initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.7, ease: EASE }}
                  >
                    <p className="sp-journey-kicker">{step.label}</p>
                    <h3 className="sp-journey-title">{step.title}</h3>
                    <p className="sp-journey-text">{step.text}</p>
                  </motion.div>
                </li>
              ))}
            </ol>
          </div>

          <div className="sp-journey-aside">
            <JourneyCard step={active} />
          </div>
        </div>
      </div>
    </section>
  );
}
