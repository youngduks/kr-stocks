import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 토스/뱅크샐러드 풍 토큰
        bg: {
          DEFAULT: "#15181D",   // 가장 어두운 배경 (Toss dark)
          card: "#1F232B",      // 카드 배경
          hover: "#262B35",
        },
        line: "#2E343F",
        text: {
          DEFAULT: "#E6E8EB",
          muted: "#8B95A1",
          dim: "#5C6370",
        },
        accent: {
          blue: "#3182F6",      // Toss blue
          green: "#1FAE6F",     // 상승 (Toss green)
          red: "#E14B4B",       // 하락
          amber: "#F4A623",
          purple: "#9D7DEC",
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
