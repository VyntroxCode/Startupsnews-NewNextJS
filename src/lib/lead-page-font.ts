import localFont from "next/font/local";

/**
 * Inter — the one typeface of the six public pages that feed the Sales Tracker
 * (/feature-your-startup, /submit-funding-round, /submit-press-release, /sponsor-event,
 * /advertise-with-us, /expand-north-star). Self-hosted, see src/fonts/README.md.
 *
 * Put `leadPageFont.variable` on the page wrapper; the page's own font variable (--fys-sans,
 * --fr-sans, --pr-sans, --sp-sans, --ens-sans) reads --lead-font from there. The file covers
 * weights 100–900, so the pages' 800/900 headings keep their weight. (It was Space Grotesk for a
 * few hours on 2026-10-08; that file stops at 700 and the user didn't like the look.)
 */
export const leadPageFont = localFont({
  src: "../fonts/inter-latin-var.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--lead-font",
});

/** For inline `style={{ fontFamily }}` on a wrapper that also carries `leadPageFont.variable`. */
export const LEAD_FONT_FAMILY = "var(--lead-font), Helvetica, Arial, sans-serif";
