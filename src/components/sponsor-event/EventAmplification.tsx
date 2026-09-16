"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { SectionHead } from "./SectionHead";
import { eventImages } from "./eventImages";
import { CalendarIcon, InstagramIcon, LinkedInIcon, PinIcon, SiteIcon, WhatsAppIcon } from "./icons";
import { useReducedMotion, useWideScreen } from "./hooks";

/** Where each channel card comes to rest, in px from the stage centre (desktop stage is 1080 x 660). */
const CHANNELS = [
  { key: "instagram", to: { x: -372, y: -140, rotate: -7 } },
  { key: "linkedin", to: { x: 376, y: -150, rotate: 6 } },
  { key: "newsletter", to: { x: -384, y: 160, rotate: 5 } },
  { key: "whatsapp", to: { x: 370, y: 150, rotate: -5 } },
] as const;

type ChannelKey = (typeof CHANNELS)[number]["key"];

const MOMENTS = [
  { key: "before", when: "Before", what: "Announcement", x: 0, y: -300 },
  { key: "during", when: "During", what: "Highlights", x: -178, y: 300 },
  { key: "after", when: "After", what: "Recap", x: 178, y: 300 },
] as const;

function ChannelCardContent({ channel }: { channel: ChannelKey }) {
  if (channel === "instagram") {
    return (
      <>
        <div className="sp-amp-card-head">
          <span className="sp-amp-card-icon" style={{ background: "#E1306C" }}>
            <InstagramIcon />
          </span>
          <span className="sp-amp-card-name">
            Instagram
            <span className="sp-amp-card-kind">Event post</span>
          </span>
        </div>
        <div className="sp-amp-card-media">
          <Image src={eventImages.examplePoster.src} alt="" fill sizes="220px" />
        </div>
        <p className="sp-amp-card-text">Save the date: your event is coming to Bengaluru.</p>
      </>
    );
  }
  if (channel === "linkedin") {
    return (
      <>
        <div className="sp-amp-card-head">
          <span className="sp-amp-card-icon" style={{ background: "#0A66C2" }}>
            <LinkedInIcon />
          </span>
          <span className="sp-amp-card-name">
            LinkedIn
            <span className="sp-amp-card-kind">Partner announcement</span>
          </span>
        </div>
        <p className="sp-amp-card-text">Proud to be the media partner for your event. Founders, investors, see you there.</p>
        <span className="sp-amp-card-bars">
          <i />
          <i />
        </span>
      </>
    );
  }
  if (channel === "newsletter") {
    return (
      <>
        <p className="sp-amp-news-mast">
          StartupNews.fyi <span>Newsletter</span>
        </p>
        <p className="sp-amp-news-section">Events this week</p>
        <div className="sp-amp-news-item">
          <span className="sp-amp-news-thumb">
            <Image src={eventImages.examplePoster.src} alt="" fill sizes="52px" />
          </span>
          <span>
            <strong>Your event</strong>
            Bengaluru · 14 Nov
          </span>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="sp-amp-card-head">
        <span className="sp-amp-card-icon" style={{ background: "#25D366" }}>
          <WhatsAppIcon />
        </span>
        <span className="sp-amp-card-name">
          Communities
          <span className="sp-amp-card-kind">WhatsApp</span>
        </span>
      </div>
      <p className="sp-amp-bubble">
        New for founders this month: your event, 14 Nov. Registrations are open.
        <time>9:41</time>
      </p>
    </>
  );
}

function AmpCard({
  channel,
  index,
  progress,
  animated,
}: {
  channel: (typeof CHANNELS)[number];
  index: number;
  progress: MotionValue<number>;
  animated: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const start = 0.06 + index * 0.07;
  const end = start + 0.52;
  const x = useTransform(progress, [start, end], [0, channel.to.x]);
  const y = useTransform(progress, [start, end], [0, channel.to.y]);
  const rotate = useTransform(progress, [start, end], [0, channel.to.rotate]);
  const scale = useTransform(progress, [start, end], [0.7, 1]);
  const opacity = useTransform(progress, [start, start + 0.14], [0, 1]);

  return (
    <motion.li
      className={`sp-amp-card is-${channel.key}`}
      style={animated ? { x, y, rotate, scale, opacity } : undefined}
      initial={animated || reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={animated ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
    >
      <ChannelCardContent channel={channel.key} />
    </motion.li>
  );
}

function AmpMoment({
  moment,
  progress,
}: {
  moment: (typeof MOMENTS)[number];
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(progress, [0.62, 0.82], [0, 1]);
  const y = useTransform(progress, [0.62, 0.82], [moment.y + 18, moment.y]);
  return (
    <motion.li className="sp-amp-moment" style={{ x: moment.x, y, opacity }}>
      <b>{moment.when}</b> · {moment.what}
    </motion.li>
  );
}

/** "Your event doesn't stop at the venue." — the submission turned into a polished event listing
 * at the centre, with the channel cards it becomes scattering outward as the reader scrolls, and
 * the before / during / after moments settling last. Desktop only; smaller screens get the same
 * cards as a simple grid. Every card is a mock-up of a format, labelled as an example event. */
export function EventAmplification() {
  const reducedMotion = useReducedMotion();
  const wide = useWideScreen();
  const animated = wide && !reducedMotion;
  const stageRef = useRef<HTMLUListElement>(null);
  const { scrollYProgress } = useScroll({ target: stageRef, offset: ["start 92%", "center 56%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 24, restDelta: 0.001 });

  return (
    <section className="sp-amp" aria-labelledby="sp-amp-title">
      <div className="sp-wrap">
        <SectionHead
          kicker="Amplification"
          id="sp-amp-title"
          title={
            <>
              Your event doesn&apos;t stop <em>at the venue.</em>
            </>
          }
          lede="Announcements before, highlights during, recaps after, all shaped for the channels where the startup community already spends its time."
        />

        <ul ref={stageRef} className={"sp-amp-stage" + (animated ? "" : " is-static")} aria-label="Example channel formats for a partnered event">
          <motion.li
            className="sp-amp-center"
            initial={reducedMotion ? false : { opacity: 0, y: 30, scale: 0.94 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="sp-amp-center-poster">
              <Image src={eventImages.examplePoster.src} alt={eventImages.examplePoster.alt} fill sizes="300px" />
              <span className="sp-amp-center-flag">Example</span>
            </div>
            <div className="sp-amp-center-body">
              <p className="sp-amp-center-kicker">
                <SiteIcon />
                StartupNews.fyi · Events
              </p>
              <p className="sp-amp-center-title">Your event</p>
              <p className="sp-amp-meta">
                <span>
                  <PinIcon />
                  Bengaluru
                </span>
                <span>
                  <CalendarIcon />
                  14 Nov
                </span>
              </p>
            </div>
          </motion.li>

          {CHANNELS.map((channel, i) => (
            <AmpCard key={channel.key} channel={channel} index={i} progress={progress} animated={animated} />
          ))}

          {animated && MOMENTS.map((moment) => <AmpMoment key={moment.key} moment={moment} progress={progress} />)}
        </ul>
      </div>
    </section>
  );
}
