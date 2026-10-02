import localFont from "next/font/local";

// The studio's two typefaces, as CSS variables read by the --font-cs-serif / --font-cs-sans theme
// tokens in staff-panel-tailwind.css. Applied on the page root and again on each portaled modal
// root, since a variable set on the page does not reach <body>-level portals.
// Self-hosted (src/fonts, Latin variable files) rather than next/font/google: see src/fonts/README.md.
// The Fraunces files keep the full opsz / SOFT / WONK axes the standalone app requested.
const fraunces = localFont({
  src: [
    { path: "../../../../fonts/fraunces-latin-var.woff2", style: "normal" },
    { path: "../../../../fonts/fraunces-italic-latin-var.woff2", style: "italic" },
  ],
  weight: "100 900",
  display: "swap",
  variable: "--font-fraunces",
});

const jakarta = localFont({
  src: "../../../../fonts/plus-jakarta-sans-latin-var.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-jakarta",
});

export const studioFontVars = `${fraunces.variable} ${jakarta.variable}`;
