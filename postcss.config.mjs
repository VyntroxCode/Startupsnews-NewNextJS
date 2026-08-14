// @tailwindcss/postcss is enabled project-wide, but it only activates on files that actually
// contain Tailwind directives (currently just src/app/about-us/about-tailwind.css and
// src/app/advertise-with-us/advertise-tailwind.css) — files with no `@import "tailwindcss/..."`,
// like globals.css/style.css/media-queries.css, pass through unaffected. Verified: their
// compiled output is byte-for-byte the legacy theme content, no Preflight/utilities leak in.
//
// Order matters: @tailwindcss/postcss MUST run before postcss-import. postcss-import doesn't
// understand Tailwind's special `@import "tailwindcss/theme.css" source(none)` syntax and will
// try to resolve it as a plain local file import if it runs first — this was the original cause
// of "Module not found" errors that led to the old manual-CLI-compile workaround. With
// @tailwindcss/postcss first, it fully resolves and compiles its own imports before
// postcss-import ever sees the file; postcss-import then only has to handle the plain local
// `@import` statements in style.css/media-queries.css, which is what it was already doing.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "postcss-import": {},
  },
};

export default config;
