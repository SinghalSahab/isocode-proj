import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAFAF7",
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#16181A",
          muted: "#5B6168",
        },
        border: {
          DEFAULT: "#E6E6E1",
          subtle: "#F0F0EB",
        },
        accent: {
          DEFAULT: "#1F6F4A",
          hover: "#185A3B",
          subtle: "#E8F5EE",
        },
        warning: {
          DEFAULT: "#B45309",
          surface: "#FEF3C7",
        },
        danger: {
          DEFAULT: "#B42318",
          surface: "#FEE4E2",
        },
      },
      borderRadius: {
        card: "12px",
        pill: "9999px",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Noto Sans Devanagari"',
          "Mangal",
          "sans-serif",
        ],
      },
      minHeight: {
        touch: "48px",
      },
      minWidth: {
        touch: "48px",
      },
    },
  },
  plugins: [],
};

export default config;
