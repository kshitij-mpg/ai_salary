/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0c1a2e",
          50: "#f4f1ea",
          100: "#ebe6db",
          200: "#ddd5c6",
        },
        paper: "#fffcf6",
        copper: {
          DEFAULT: "#b86b3a",
          soft: "#d4a574",
        },
        mute: "#6b7280",
        crimson: "#9f1239",
        amber: "#a16207",
        forest: "#166534",
      },
      fontFamily: {
        display: ["Iowan Old Style", "Palatino Linotype", "Palatino", "Book Antiqua", "Georgia", "serif"],
        sans: ["Candara", "Calibri", "Segoe UI", "sans-serif"],
        mono: ["Cascadia Mono", "Consolas", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
