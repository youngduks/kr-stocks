import type { Metadata, Viewport } from "next";
import "./fonts.css";
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

// 모바일 브라우저 UI 색 — 디자인 토큰 --bg (라이트 #F4F5F7 / 다크 #0F1115)
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F5F7" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1115" },
  ],
};

// 모든 페이지가 쓰는 Pretendard 청크 중 라틴 청크 선로딩 (Phase C 성능):
//   pv-91 = 라틴·숫자·기호 (30KB) 1개만. 한글 최빈 청크(pv-90/89)까지 넣으면 느린 4G에서 첫 paint 가 ~200ms 늦어져 제외(실측).
//   폰트가 CSS 파싱 뒤에야 발견돼 늦게 교체되며
//   생기던 글자 폭 변화(= /en 데스크톱 칩 네비 CLS ~0.009)를 줄임.
//   ⚠ scripts/build-font-subsets.py 로 청크를 다시 만들면 해시가 바뀜 → app/fonts.css 에서 새 파일명으로 교체.
const PRELOAD_FONTS = [
  "/fonts/pretendard/pv-91.cb5098d4.woff2",
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="dark" suppressHydrationWarning>
      <head>
        {PRELOAD_FONTS.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
        {/* 첫 paint 전 theme 적용 — flicker 0 */}
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        {/* Google AdSense 사이트 소유권 확인 전용 meta — 광고 로더(adsbygoogle.js)는 전역 로드 X.
            오클릭/무효트래픽 방지(2026-09): 스크립트는 components/AdSlot 이 수동 슬롯 ID + 프로덕션 도메인일 때만 주입. */}
        <meta name="google-adsense-account" content="ca-pub-5171852166925849" />
      </head>
      <body className="min-h-screen bg-bg text-text">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
