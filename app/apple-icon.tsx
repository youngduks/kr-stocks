// 홈 화면 아이콘 (iOS apple-touch-icon + manifest) — app/icon.tsx 와 같은 디자인, 180px (2026-11-08)
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#15181D",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "84px",
            height: "84px",
            borderRadius: "50%",
            background: "#1FAE6F",
            boxShadow: "0 0 28px #1FAE6F",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
