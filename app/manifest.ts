import type { MetadataRoute } from "next";

// 홈 화면 추가 시 이름·아이콘 (2026-11-08). 설치 안내 배너는 넣지 않음 — 광고 오클릭 위험·첫 화면 공간 때문.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KR Stocks · 24시간 시세",
    short_name: "KR Stocks",
    description: "삼성전자·SK하이닉스·현대차와 미국·비상장 종목 24시간 시세",
    start_url: "/",
    scope: "/",
    display: "minimal-ui",
    background_color: "#0F1115",
    theme_color: "#0F1115",
    lang: "ko-KR",
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}
