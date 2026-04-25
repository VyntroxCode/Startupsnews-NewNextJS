// No Tailwind - this project uses only globals.css. postcss-import resolves @import so
// ./styles/style.css and ./styles/media-queries.css are inlined.
const config = {
  plugins: {
    "postcss-import": {},
  },
};

export default config;
