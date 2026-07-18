import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://kr-stocks.com"),
  title: {
    default: "KR Stocks · 24시간 글로벌 자산 시세",
    template: "%s · KR Stocks",
  },
  description:
    "삼성전자·SK하이닉스·현대차·테슬라·엔비디아·SpaceX·OpenAI·Anthropic 24시간 실시간 시세. 한국 야간/주말에도 끊김 없이 추적. Hyperliquid HIP-3 + 업비트 KRW/USDT 연동.",
  keywords: [
    "야간 시세",
    "24시간 시세",
    "삼성전자 야간 시세",
    "SK하이닉스 야간 시세",
    "현대차 야간",
    "테슬라 24시간",
    "엔비디아 24시간",
    "OpenAI 주가",
    "SpaceX 시가총액",
    "Anthropic 주가",
    "한국 주식 야간",
    "코스피 야간 거래",
    "비상장 빅테크 시세",
    "하이퍼리퀴드 한국 주식",
  ],
  authors: [{ name: "KR Stocks" }],
  category: "finance",
  applicationName: "KR Stocks",
  openGraph: {
    type: "website",
    siteName: "KR Stocks",
    title: "KR Stocks · 24시간 글로벌 자산 시세",
    description:
      "한국·미국·비상장 (SpaceX/OpenAI/Anthropic) 39종목 24시간 실시간. 야간·주말 끊김 없이 추적.",
    url: "https://kr-stocks.com",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "KR Stocks · 24시간 글로벌 자산 시세",
    description:
      "한국·미국·비상장 39종목 24시간 실시간. 야간·주말도 끊김 없이.",
  },
  alternates: {
    canonical: "https://kr-stocks.com",
    languages: {
      "ko-KR": "https://kr-stocks.com",
      "en-US": "https://kr-stocks.com/en",
      "x-default": "https://kr-stocks.com",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  verification: {
    google: "jSTYCcgsLcSE0DwWUvyc7ktr3az1oZPEmD1z0ZHw85M",
    other: {
      "naver-site-verification": "e8fa5f3640a53009869d85126904b0db2e92bf7c",
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* 첫 paint 전 theme 적용 — flicker 0 */}
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        {/* Google AdSense 사이트 소유권 확인 + 광고 로더 (client=ca-pub-5171852166925849) */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5171852166925849"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-bg text-text">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
