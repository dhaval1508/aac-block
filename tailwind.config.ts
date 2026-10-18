import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#13789B",
          50: "#F0F8FA",
          100: "#E1F1F5",
          200: "#B9E0EC",
          300: "#86C7DE",
          400: "#4DAACD",
          500: "#13789B",
          600: "#0F627F",
          700: "#0C4E65",
          800: "#093A4C",
          900: "#062734",
        },
        brandRed: {
          DEFAULT: "#E52332",
          50: "#FEF2F3",
          100: "#FEE2E4",
          200: "#FCC9CD",
          500: "#E52332",
          600: "#C81826",
          700: "#A6121E",
        },
        navy: {
          DEFAULT: "#111827",
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#111827",
          950: "#0B0F19",
        },
        surface: "#F3F6FA",
        swarnim: {
          DEFAULT: "#13789B",
          50: "#F0F8FA",
          100: "#E1F1F5",
          500: "#13789B",
          600: "#0F627F",
          700: "#0C4E65",
        },
        crimson: {
          DEFAULT: "#E52332",
          50: "#FEF2F3",
          500: "#E52332",
          600: "#C81826",
        },
        brick: {
          DEFAULT: "#E52332",
          light: "#F87171",
        },
      },
      boxShadow: {
        "2xs": "0 1px 1px 0 rgba(0, 0, 0, 0.03)",
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        card: "0 1px 3px 0 rgba(17, 24, 39, 0.04), 0 1px 2px -1px rgba(17, 24, 39, 0.04)",
        elevated: "0 10px 25px -3px rgba(17, 24, 39, 0.07), 0 4px 6px -4px rgba(17, 24, 39, 0.04)",
        dropdown: "0 20px 25px -5px rgba(17, 24, 39, 0.1), 0 8px 10px -6px rgba(17, 24, 39, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
