import type { PartnerLogo } from "@/modules/inner-pages/domain/types";
import { ENS_REFERRAL_LOGOS } from "./media";

/** Logos for the referral partners in the closing form's "Referred By" list (see
 * `modules/ens-travel-enquiries/domain/sources.ts`), supplied by the user 2026-09-19 into
 * `public/images/expand-north-star/logo_slider/`, renamed to match each partner's `value` slug so
 * a filename and its referrer were never in doubt, then uploaded to the site's S3 bucket and served
 * through the image CDN the same way every other image on this page is — see `ENS_REFERRAL_LOGOS`
 * in `media.ts`, this page's one place for media. The local folder was deleted once the S3 copies
 * were confirmed live (2026-09-19); nothing on this page reads from `public/` for these any more.
 *
 * This is the "Our partners" marquee on /expand-north-star ONLY — a fixed list, not the admin Inner
 * Pages → partner logos feed that /our-partners and this page previously shared. The two pages now
 * show different things on purpose: /our-partners is the site's general ecosystem-partner wall
 * (admin-managed, unrelated to this event), and this page shows the specific organisations that
 * send Expand North Star visitors. `PartnerLogosMarquee` and `PartnerLogoTile` are reused unchanged
 * — the marquee only cares about `imageUrl`/`linkUrl`, and a colored-background logo sits fine
 * inside the shared tile's white card + `object-fit: contain`.
 *
 * Only 10 of the 12 REFERRED_BY_OPTIONS have a supplied logo — TSFP Ventures and Startupreport.in
 * do not, and are left out of the strip rather than shown with a placeholder. Add their file to
 * `media.ts`'s `ENS_REFERRAL_LOGOS` and a row here once artwork exists.
 *
 * `angel-bay` and `indicorn-angels` link out to the partners' own sites (`linkUrl`, opened in a
 * new tab by `PartnerLogoTile`) on request 2026-09-19; every other logo here still links nowhere,
 * same as the plain-logo entries on /our-partners, until asked for. */
interface ReferralPartnerLogo {
  /** Matches `ReferredByValue` in sources.ts and a key in `ENS_REFERRAL_LOGOS`, kept as a plain
   * string here so this file has no import-time dependency on that module — only a naming
   * convention, checked by eye. */
  slug: string;
  name: string;
  linkUrl?: string;
}

const REFERRAL_PARTNER_LOGOS: ReferralPartnerLogo[] = [
  { slug: "easy-knowledge-club", name: "Easy Knowledge Club" },
  { slug: "venture-wolf", name: "Wolf Group" },
  { slug: "billennium-divas", name: "Billennium Divas" },
  { slug: "xcel-ventures", name: "Xccel Ventures" },
  { slug: "confederation-of-indian-startups", name: "Confederation of Indian Startups" },
  { slug: "usp-house", name: "USP House" },
  { slug: "angel-bay", name: "Angel Bay", linkUrl: "https://angelbay.com/" },
  { slug: "meet-day-ai", name: "meetday.ai" },
  { slug: "hbf-direct", name: "HBF Direct" },
  { slug: "indicorn-angels", name: "Indicorn Angels", linkUrl: "https://indicornangels.com/" },
];

/** `PartnerLogosMarquee`-shaped list — `id`/`section`/`sortOrder` are only there to satisfy the
 * shared `PartnerLogo` type; the marquee itself only reads `imageUrl` and `linkUrl`. A slug with
 * no matching `ENS_REFERRAL_LOGOS` entry is dropped rather than rendered with a broken image, the
 * same "no artwork, no tile" rule TSFP Ventures and Startupreport.in follow. */
export const REFERRAL_PARTNER_LOGOS_FOR_MARQUEE: PartnerLogo[] = REFERRAL_PARTNER_LOGOS.map((logo, index) => ({
  id: index + 1,
  section: "referral",
  imageUrl: ENS_REFERRAL_LOGOS[logo.slug] ?? "",
  linkUrl: logo.linkUrl ?? null,
  sortOrder: index + 1,
})).filter((logo) => logo.imageUrl);
