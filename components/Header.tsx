"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StatsBar } from "./StatsBar";

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
    // 영어 동등 경로 — 가이드 + 컨센서스 매핑. 그 외 (/korea/...) → /en 홈
    if (pathname === "/") enHref = "/en";
    else if (pathname === "/guide/hyperliquid-onramp") enHref = "/en/guide/hyperliquid-onramp";
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

export function Header({ fxRate, fxChange }: { fxRate: number; fxChange: number }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/80 border-b border-line">
      <div className="max-w-6xl mx-auto px-5 py-3 sm:py-4">
        {/* Row 1: 로고 + StatsBar + FX */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse-soft shadow-[0_0_12px_#1FAE6F] flex-shrink-0" />
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

        {/* Row 2: 언어 토글 (우측 정렬, 독립 행) */}
        <div className="mt-2 flex justify-end">
          <LangToggle />
        </div>
      </div>
    </header>
  );
}
