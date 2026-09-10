"use client";

import { motion } from "motion/react";
import { SectionHead } from "./SectionHead";
import { useReducedMotion } from "./hooks";
import {
  FacebookIcon,
  GoogleIcon,
  InstagramIcon,
  LinkedInIcon,
  MailIcon,
  SiteIcon,
  WhatsAppIcon,
  XIcon,
} from "./icons";

/** The surfaces this business actually operates: the accounts in siteConfig.social, the WhatsApp
 * communities and search presence published on /advertise-with-us, this site's own newsletter, and
 * the site itself. They are presented as places an event story *can* travel — the section never
 * claims automatic publication to any of them, because nothing on this page guarantees that. */
const CHANNELS = [
  { key: "site", label: "StartupNews.fyi", Icon: SiteIcon, note: "The events page and editorial" },
  { key: "instagram", label: "Instagram", Icon: InstagramIcon, note: "Visual announcements" },
  { key: "linkedin", label: "LinkedIn", Icon: LinkedInIcon, note: "Professional reach" },
  { key: "x", label: "X", Icon: XIcon, note: "Short-form updates" },
  { key: "newsletter", label: "Newsletter", Icon: MailIcon, note: "Straight to inboxes" },
  { key: "whatsapp", label: "Communities", Icon: WhatsAppIcon, note: "Founder groups" },
  { key: "search", label: "Search", Icon: GoogleIcon, note: "Found long after the day" },
  { key: "facebook", label: "Facebook", Icon: FacebookIcon, note: "Wider community" },
] as const;

/** Illustrative post mock-ups. Deliberately generic — no real handle, no company name, no
 * engagement figure that could be read as a published result. The caption under the row says so. */
const PREVIEWS = [
  {
    key: "instagram",
    chrome: "Instagram",
    Icon: InstagramIcon,
    body: "Happening this month — a room full of founders, builders and investors. Details in bio.",
    foot: "Example announcement format",
  },
  {
    key: "linkedin",
    chrome: "LinkedIn",
    Icon: LinkedInIcon,
    body: "We're partnering on an event bringing together the people building what's next. Here's who should be there.",
    foot: "Example post format",
  },
  {
    key: "newsletter",
    chrome: "Newsletter",
    Icon: MailIcon,
    body: "In this edition — the events worth putting in your calendar, and why each one matters.",
    foot: "Example newsletter slot",
  },
] as const;

/** 06 — where the event can travel. Motion language: *branches drawing outward*. A single trunk
 * leaves the event node at the top and splits into eight branches, each drawing itself as the
 * section arrives, with the channel cards landing on the ends. The graph is horizontal-branching
 * rather than radial so it reads differently to the ecosystem ring in section 02. */
export function DiscoveryChannels() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="sp-discovery" aria-labelledby="sp-discovery-title">
      <div className="sp-wrap">
        <SectionHead
          index="06"
          kicker="Discovery"
          title={<span id="sp-discovery-title">Your event doesn&apos;t have to stay in one place.</span>}
          lede="These are the surfaces where an event story can travel. Which ones a given event actually runs on is an editorial decision, made case by case — not a package."
        />

        <div className="sp-branch" aria-hidden="true">
          <motion.span
            className="sp-branch-trunk"
            initial={reducedMotion ? false : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.span
            className="sp-branch-bar"
            initial={reducedMotion ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <ul className="sp-channels">
          {CHANNELS.map((channel, i) => (
            <motion.li
              key={channel.key}
              className="sp-channel"
              initial={reducedMotion ? false : { opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: 0.6 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="sp-channel-stem" aria-hidden="true" />
              <span className="sp-channel-icon">
                <channel.Icon />
              </span>
              <span className="sp-channel-label">{channel.label}</span>
              <span className="sp-channel-note">{channel.note}</span>
            </motion.li>
          ))}
        </ul>

        <div className="sp-previews">
          {PREVIEWS.map((preview, i) => (
            <motion.figure
              key={preview.key}
              className="sp-preview"
              initial={reducedMotion ? false : { opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="sp-preview-chrome">
                <preview.Icon className="sp-preview-chrome-icon" />
                <span>{preview.chrome}</span>
                <span className="sp-preview-badge">Preview</span>
              </div>
              <div className="sp-preview-body">
                <div className="sp-preview-head">
                  <span className="sp-preview-avatar" aria-hidden="true" />
                  <div>
                    <p className="sp-preview-name">StartupNews.fyi</p>
                    <p className="sp-preview-sub">Event partner</p>
                  </div>
                </div>
                <p className="sp-preview-text">{preview.body}</p>
                <div className="sp-preview-media" aria-hidden="true">
                  <span className="sp-preview-media-tag">Event</span>
                </div>
                <p className="sp-preview-foot">{preview.foot}</p>
              </div>
            </motion.figure>
          ))}
        </div>

        <p className="sp-previews-note">
          Example formats only — mock-ups of how an event story can be laid out, not published posts.
        </p>
      </div>
    </section>
  );
}
