import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // 토스/뱅크샐러드 풍 토큰 — CSS variable 참조 (theme 분기)
        // Tailwind opacity modifier (bg-bg-card/70 등) 활성화 위해 RGB triplet
        bg: {
          DEFAULT: "rgb(var(--bg) / <alpha-value>)",
          card:    "rgb(var(--bg-card) / <alpha-value>)",
          hover:   "rgb(var(--bg-hover) / <alpha-value>)",
        },
        line: "rgb(var(--line) / <alpha-value>)",
        text: {
          DEFAULT: "rgb(var(--text) / <alpha-value>)",
          muted:   "rgb(var(--text-muted) / <alpha-value>)",
          dim:     "rgb(var(--text-dim) / <alpha-value>)",
        },
        accent: {
          blue:   "rgb(var(--accent-blue) / <alpha-value>)",
          green:  "rgb(var(--accent-green) / <alpha-value>)",
          red:    "rgb(var(--accent-red) / <alpha-value>)",
          amber:  "rgb(var(--accent-amber) / <alpha-value>)",
          purple: "rgb(var(--accent-purple) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "-apple-system", "BlinkMacSystemFont", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      animation: {
        "pulse-soft": "pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
