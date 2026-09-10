"use client";

import { motion } from "motion/react";
import { SectionIntro } from "./SectionIntro";
import { ParallaxImage } from "./ParallaxImage";
import { pressReleaseImages } from "./images";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

const LAYERS = [
  { title: "Press release", body: "The announcement itself, in plain language." },
  { title: "Company profile", body: "What the company does, and who it serves." },
  { title: "Founder details", body: "Names, roles, and who can speak to the story." },
  { title: "Media assets", body: "Logos, product shots, or photographs you own the rights to." },
  { title: "Source links", body: "Official pages an editor can check the claims against." },
] as const;

/** Section 05 — what a useful press kit contains, drawn as a descending stack of labelled sheets
 * beside a photograph.
 *
 * Note what this section does NOT do: it never asks for an upload. The page has no file field at
 * all, by design — this is a description of the material worth *having ready* for the editorial
 * conversation that follows a submission, not a list of things to attach here. Keep it that way if
 * this section is ever extended.
 *
 * The layers' hover shift is a Motion target, not CSS: Motion owns `transform` on them after the
 * entrance, so a stylesheet `:hover { transform }` would never apply. */
export function PressKitSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="pr-section pr-kit" aria-labelledby="pr-kit-title">
      <div className="pr-kit-grid">
        <div className="pr-kit-copy">
          <SectionIntro
            index="05"
            label="Materials"
            heading="Build the press kit around the story."
            headingId="pr-kit-title"
            lede="Nothing is uploaded here. But if our desk follows up, these are what the conversation moves fastest with — so it is worth knowing which of them you already have."
          />
          <ol className="pr-kit-stack">
            {LAYERS.map((layer, i) => (
              <motion.li
                key={layer.title}
                className="pr-kit-layer"
                initial={reducedMotion ? false : { opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                whileHover={reducedMotion ? undefined : { x: 6 }}
                transition={{ duration: 0.55, delay: i * 0.08, ease: PR_EASE }}
              >
                <span className="pr-kit-layer-n" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="pr-kit-layer-main">
                  <span className="pr-kit-layer-title">{layer.title}</span>
                  <span className="pr-kit-layer-body">{layer.body}</span>
                </span>
              </motion.li>
            ))}
          </ol>
        </div>

        <ParallaxImage
          image={pressReleaseImages.pressKit}
          className="pr-kit-figure"
          sizes="(max-width: 900px) 100vw, 38vw"
        />
      </div>
    </section>
  );
}
