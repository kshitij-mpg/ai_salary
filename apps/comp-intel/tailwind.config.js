/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#070b12",
          50: "#0b1018",
          100: "#10161f",
          200: "#161d28",
          300: "#1c2433",
          400: "#243044",
        },
        gold: {
          DEFAULT: "#c9a227",
          dim: "#8a7020",
          soft: "#e8d5a3",
          mist: "rgba(201,162,39,0.14)",
        },
        teal: {
          DEFAULT: "#2f9e94",
          bright: "#5ecfc0",
          dim: "#1a5c56",
        },
        parchment: "#ebe6d8",
        mute: "#9a9484",
        rose: "#c45c5c",
      },
      fontFamily: {
        display: ["Palatino Linotype", "Palatino", "Book Antiqua", "Georgia", "serif"],
        sans: ["Segoe UI", "system-ui", "sans-serif"],
        mono: ["Cascadia Mono", "Consolas", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glass: "0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
        glow: "0 0 40px rgba(201,162,39,0.08)",
      },
      letterSpacing: {
        cin: "0.28em",
      },
    },
  },
  plugins: [],
};
