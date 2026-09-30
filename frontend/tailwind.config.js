/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          900: "#10281d",
          800: "#17392a",
          700: "#1f4d39",
          600: "#2a6349",
          500: "#3a7d5c",
          200: "#bfd9c8",
        },
        river: {
          700: "#1c5673",
          500: "#2b7fa8",
          400: "#4f9dc2",
          100: "#d5e8f1",
        },
        sand: {
          50: "#f8f4ea",
          100: "#f1eadb",
          200: "#e6dcc4",
          300: "#d6c8a5",
          500: "#a89670",
          700: "#6b5d3f",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
