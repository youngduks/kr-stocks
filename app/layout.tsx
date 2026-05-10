import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KR Stocks · 24시간 글로벌 자산 시세",
  description: "삼성전자·SK하이닉스·현대차·테슬라·엔비디아·SpaceX·OpenAI·Anthropic 24시간 실시간 시세. 한국 야간/주말에도 끊김 없이 추적.",
  keywords: ["야간 시세", "삼성전자 야간", "테슬라 24시간", "OpenAI 주가", "SpaceX 시가총액", "Anthropic 주가", "한국 주식 야간", "코스피 야간"],
  openGraph: {
    title: "KR Stocks — 24시간 글로벌 자산 시세",
    description: "한국·미국·비상장 회사 38종목 24시간 실시간",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-bg text-text">{children}</body>
    </html>
  );
}
