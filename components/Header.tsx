"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StatsBar } from "./StatsBar";
import { useTheme } from "./ThemeProvider";
import { SearchPalette } from "./SearchPalette";

function ThemeToggle() {
  const { theme, toggle, mounted } = useTheme();
  const pathname = usePathname() || "/";
  const isEn = pathname === "/en" || pathname.startsWith("/en/");
  // mount 전(SSR)엔 dark 아이콘 고정 — hydration mismatch 회피
  const isDark = mounted ? theme === "dark" : true;
  // 라벨 + a11y 영어 분기 (형님 5/13 요청)
  const label = isEn ? "Theme" : "화면모드";
  const ariaSwitch = isEn
    ? isDark
      ? "Switch to light mode"
      : "Switch to dark mode"
    : isDark
      ? "라이트 모드로 전환"
      : "다크 모드로 전환";
  const titleAttr = isEn
    ? isDark
      ? "Light mode"
      : "Dark mode"
    : isDark
      ? "라이트 모드"
      : "다크 모드";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={ariaSwitch}
      title={titleAttr}
      className="inline-flex items-center justify-center gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 rounded-md text-text-dim hover:text-text hover:bg-bg-card/70 border border-transparent hover:border-line transition shrink-0"
    >
      {/* 라벨: 아이콘만 있으면 무엇인지 모호 → 한국어 '화면모드' / 영어 'Theme' (5/13) */}
      <span className="text-[10px] sm:text-[11px] leading-none">{label}</span>
      <span className="text-sm sm:text-base leading-none" aria-hidden="true">
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}

function LangToggle() {
  const pathname = usePathname() || "/";
  const isEn = pathname === "/en" || pathname.startsWith("/en/");

  // 현재 path → 반대 locale path 매핑
  // /  ↔  /en
  // /guide/hyperliquid-onramp  ↔  /en/guide/hyperliquid-onramp
  // /korea/samsung 등 종목 상세는 한국어만 유지 (Phase 1) → 영어 클릭 시 /en (홈)으로
  let koHref = "/";
  let enHref = "/en";
  if (isEn) {
    // /en → /, /en/guide/hyperliquid-onramp → /guide/hyperliquid-onramp
    const rest = pathname.replace(/^\/en/, "");
    koHref = rest === "" ? "/" : rest;
  } else {
    // 영어 동등 경로 — 가이드 + 분석 매핑. 그 외 (/korea/...) → /en 홈
    if (pathname === "/") enHref = "/en";
    else if (pathname === "/guide/hyperliquid-onramp") enHref = "/en/guide/hyperliquid-onramp";
    else if (pathname === "/guide/binance-korea-stocks") enHref = "/en/guide/binance-korea-stocks";
    else if (pathname === "/consensus") enHref = "/en/consensus";
    else enHref = "/en";
  }

  return (
    <div className="inline-flex items-center text-[10px] sm:text-[11px] tabular text-text-dim shrink-0">
      <Link
        href={koHref as any}
        className={`px-1 sm:px-1.5 py-0.5 rounded transition ${
          !isEn ? "text-text font-semibold" : "hover:text-text-muted"
        }`}
        aria-current={!isEn ? "page" : undefined}
      >
        한국어
      </Link>
      <span className="text-text-dim/50">/</span>
      <Link
        href={enHref as any}
        className={`px-1 sm:px-1.5 py-0.5 rounded transition ${
          isEn ? "text-text font-semibold" : "hover:text-text-muted"
        }`}
        aria-current={isEn ? "page" : undefined}
      >
        EN
      </Link>
    </div>
  );
}

function PageNav() {
  const pathname = usePathname() || "/";
  const isEn = pathname === "/en" || pathname.startsWith("/en/");

  // 현재 페이지가 어느 카테고리?
  // "주가" = 홈/카드 grid (/, /en, /korea/samsung, /us/tesla 같은 종목 상세)
  // "분석" = /consensus, /en/consensus
  // "뉴스" = /news (국제정세 + 삼성/하이닉스/현대차)
  // "가이드" = /guide/..., /en/guide/...
  const isConsensus = pathname === "/consensus" || pathname === "/en/consensus";
  const isNews = pathname === "/news" || pathname.startsWith("/news/");
  const isGuide = pathname.includes("/guide/");
  const isPrices = !isConsensus && !isNews && !isGuide;

  // locale에 맞는 href (뉴스룸은 현재 한국어 only — EN에서도 /news로 fallback)
  const home = isEn ? "/en" : "/";
  const consensus = isEn ? "/en/consensus" : "/consensus";
  const news = "/news";
  const guide = isEn ? "/en/guide/hyperliquid-onramp" : "/guide/hyperliquid-onramp";

  const tabs: Array<{ key: string; href: string; ko: string; en: string; active: boolean }> = [
    { key: "prices", href: home, ko: "주가", en: "Prices", active: isPrices },
    { key: "consensus", href: consensus, ko: "증권사 분석", en: "Consensus", active: isConsensus },
    { key: "news", href: news, ko: "뉴스", en: "News", active: isNews },
    { key: "guide", href: guide, ko: "가이드", en: "Guide", active: isGuide },
  ];

  return (
    <nav className="inline-flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm tabular shrink-0">
      {tabs.map((t, i) => (
        <span key={t.key} className="flex items-center">
          <Link
            href={t.href as any}
            aria-current={t.active ? "page" : undefined}
            className={`px-2 sm:px-2.5 py-1 rounded-md transition font-semibold ${
              t.active
                ? "bg-bg-card text-text border border-line"
                : "text-text-dim hover:text-text hover:bg-bg-card/50 border border-transparent"
            }`}
          >
            {isEn ? t.en : t.ko}
          </Link>
          {i < tabs.length - 1 && (
            <span className="text-text-dim/30 mx-0.5 hidden sm:inline">·</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Header({ fxRate, fxChange }: { fxRate: number; fxChange: number }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/80 border-b border-line">
      <div className="max-w-6xl mx-auto px-5 py-3 sm:py-4">
        {/* Row 1: 로고 + StatsBar + FX */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse-soft shadow-[0_0_12px_rgb(var(--live-glow))] flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-base font-bold text-text tracking-tight">KR Stocks</div>
              <div className="text-[11px] text-text-dim font-medium hidden sm:block">24h Global Markets</div>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 md:gap-8">
            <StatsBar />
            <div className="text-right leading-tight">
              <div className="text-[10px] text-text-dim">USD/KRW</div>
              <div className="text-xs sm:text-sm font-semibold tabular text-text mt-0.5">
                ₩{fxRate.toFixed(2)}
              </div>
              <div className={`text-[10px] sm:text-[11px] tabular mt-0.5 ${fxChange >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                {fxChange >= 0 ? "+" : ""}{fxChange.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: 페이지 네비 (좌측) + 검색 / 테마 / 언어 토글 (우측) */}
        <div className="mt-2 flex items-center justify-between gap-3">
          <PageNav />
          <div className="flex items-center gap-1 sm:gap-2">
            <SearchPalette />
            <ThemeToggle />
            <LangToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
