/** PostCSS config for bamboo build (Tailwind v3.4) */
module.exports = {
  plugins: {
    tailwindcss3: { config: './tailwind.bamboo.config.js' },
    autoprefixer: {},
  },
};
