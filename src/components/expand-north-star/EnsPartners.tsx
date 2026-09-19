"use client";

import { motion } from "motion/react";
import { PartnerLogosMarquee } from "@/components/PartnerLogosMarquee";
import { REFERRAL_PARTNER_LOGOS_FOR_MARQUEE } from "./referralPartnerLogos";
import { RevealWords } from "./RevealWords";
import { useRise } from "./hooks";

/** "Our partners" — the organisations that refer visitors to Expand North Star (the "Referred By"
 * list on the closing form, see modules/ens-travel-enquiries/domain/sources.ts), NOT the site-wide
 * /our-partners feed this section showed until 2026-09-19. On request, the admin Inner Pages logo
 * feed was dropped here in favour of this page's own fixed set — the two pages now deliberately
 * show different logos: /our-partners is the general ecosystem wall, this is who sends this
 * event's visitors. See `referralPartnerLogos.ts` for the source list and file naming.
 *
 * The row is still `PartnerLogosMarquee` itself (auto-scrolling, grab-and-slide, hover pause,
 * still under reduced motion) — only the data feeding it changed, not the mechanics. `rows={1}`:
 * with only 9 logos, splitting into 2 counter-scrolling rows (the /our-partners default, for its
 * much longer list) left each row with just 4-5 tiles and read as sparse: one row keeps every
 * logo together and scrolling in the same direction. Placed directly before the registration
 * form. The row runs the full width of the screen; only the heading sits in the content column. */
export function EnsPartners() {
  const rise = useRise();
  const logos = REFERRAL_PARTNER_LOGOS_FOR_MARQUEE;
  if (logos.length === 0) return null;

  return (
    <section className="ens-partners" aria-labelledby="ens-partners-title">
      <div className="ens-wrap">
        <RevealWords id="ens-partners-title" className="ens-title ens-partners-title" lines={[{ text: "Our partners" }]} />
        <motion.p className="ens-lede ens-partners-lede" {...rise(0.15)}>
          The organisations that help bring founders and investors to Expand North Star.
        </motion.p>
      </div>

      <motion.div className="ens-partners-rows" {...rise(0.25, 36)}>
        <PartnerLogosMarquee logos={logos} rows={1} />
      </motion.div>
    </section>
  );
}
