import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "KR Stocks — 24시간 글로벌 자산 시세";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "70px",
          background:
            "linear-gradient(135deg, #15181D 0%, #1A1E26 50%, #15181D 100%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: "#1FAE6F",
              boxShadow: "0 0 24px #1FAE6F",
            }}
          />
          <div
            style={{
              fontSize: "32px",
              color: "#9CA3AF",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            KR STOCKS · LIVE
          </div>
        </div>

        <div
          style={{
            fontSize: "92px",
            fontWeight: 800,
            marginTop: "30px",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          24시간 글로벌 자산 시세
        </div>

        <div
          style={{
            fontSize: "36px",
            color: "#3182F6",
            marginTop: "26px",
            fontWeight: 600,
          }}
        >
          🇰🇷 삼전 · 하닉 · 현대차 + 🇺🇸 테슬라 · 엔비디아
        </div>

        <div
          style={{
            fontSize: "32px",
            color: "#1FAE6F",
            marginTop: "16px",
            fontWeight: 600,
          }}
        >
          🚀 SpaceX · OpenAI · Anthropic 비상장 perp
        </div>

        <div
          style={{
            fontSize: "26px",
            color: "#6B7280",
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <span>kr-stocks.com</span>
          <span style={{ color: "#374151" }}>·</span>
          <span>Hyperliquid HIP-3 + Upbit 연동</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
