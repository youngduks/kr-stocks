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
        // 한국 관례 등락 색 — 상승 = 빨강, 하락 = 파랑 (2026-09 Phase A). 등락 표기는 반드시 이 토큰 사용.
        up: {
          DEFAULT: "rgb(var(--up) / <alpha-value>)",
          bg:      "rgb(var(--up-bg) / <alpha-value>)",
        },
        down: {
          DEFAULT: "rgb(var(--down) / <alpha-value>)",
          bg:      "rgb(var(--down-bg) / <alpha-value>)",
        },
        flat: {
          DEFAULT: "rgb(var(--flat) / <alpha-value>)",
          bg:      "rgb(var(--flat-bg) / <alpha-value>)",
        },
        warn: {
          DEFAULT: "rgb(var(--warn) / <alpha-value>)",
          bg:      "rgb(var(--warn-bg) / <alpha-value>)",
        },
        live: "rgb(var(--live) / <alpha-value>)",
        hl: "rgb(var(--hl) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "on-ink": "rgb(var(--on-ink) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Pretendard", "-apple-system", "BlinkMacSystemFont", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        card: "20px",
        tile: "14px",
      },
      boxShadow: {
        card: "var(--shadow)",
      },
      animation: {
        "pulse-soft": "pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
