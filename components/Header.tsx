"use client";

// 2026-09 리디자인 Phase A — 헤더:
//  ① 브랜드 + 아이콘 버튼(검색·테마·언어, 44px 탭 타깃)
//  ② 메타 한 줄: 기준시각(선택) · USD/KRW · 접속자(StatsBar — /api/visit 기록 담당이라 항상 마운트)
//  ③ sticky 1줄 칩 네비 (가로 스크롤, 더 있으면 오른쪽 페이드 힌트)

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { StatsBar } from "./StatsBar";
import { useTheme } from "./ThemeProvider";
import { SearchPalette } from "./SearchPalette";
import { AsOf } from "./ui/AsOf";

function useIsEn() {
  const pathname = usePathname() || "/";
  return { pathname, isEn: pathname === "/en" || pathname.startsWith("/en/") };
}

function ThemeToggle() {
  const { theme, toggle, mounted } = useTheme();
  const { isEn } = useIsEn();
  const isDark = mounted ? theme === "dark" : true;
  const aria = isEn
    ? isDark ? "Switch to light mode" : "Switch to dark mode"
    : isDark ? "라이트 모드로 전환" : "다크 모드로 전환";
  return (
    <button type="button" onClick={toggle} aria-label={aria} title={aria} className="ds-iconbtn hover:bg-bg-hover transition">
      {/* 아이콘은 SVG — 특수기호 글리프(◐)가 폰트 청크 1개(11KB)를 추가로 끌어오는 것 방지 */}
      <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M10 2a8 8 0 0 1 0 16z" fill="currentColor" />
      </svg>
    </button>
  );
}

function LangToggle() {
  const { pathname, isEn } = useIsEn();
  // /  ↔  /en, 가이드·컨센서스는 대응 경로, 그 외 → 상대 언어 홈
  let href = "/en";
  if (isEn) {
    const rest = pathname.replace(/^\/en/, "");
    href = rest === "" ? "/" : rest;
  } else if (pathname === "/guide/hyperliquid-onramp") href = "/en/guide/hyperliquid-onramp";
  else if (pathname === "/guide/binance-korea-stocks") href = "/en/guide/binance-korea-stocks";
  else if (pathname === "/consensus") href = "/en/consensus";
  return (
    <Link
      href={href as any}
      prefetch={false}
      hrefLang={isEn ? "ko" : "en"}
      aria-label={isEn ? "한국어로 보기" : "View in English"}
      className="ds-iconbtn hover:bg-bg-hover transition text-[14px]"
    >
      {isEn ? "한" : "EN"}
    </Link>
  );
}

function ChipNav() {
  const { pathname, isEn } = useIsEn();
  const navRef = useRef<HTMLElement>(null);
  const [fade, setFade] = useState(false);

  const isConsensus = pathname === "/consensus" || pathname === "/en/consensus";
  const isNews = pathname === "/news" || pathname.startsWith("/news/");
  const isGuide = pathname.includes("/guide/");
  const isPoll = pathname === "/poll" || pathname.startsWith("/poll/") || pathname === "/en/poll";
  const isLiquidation = pathname === "/liquidation" || pathname.startsWith("/liquidation/");
  const isBuyback = pathname.startsWith("/korea/hynix/buyback");
  const isShopping = pathname === "/shopping" || pathname.startsWith("/shopping/");
  const isCommunity = pathname === "/community" || pathname.startsWith("/community/");
  const isHome = !isConsensus && !isNews && !isGuide && !isPoll && !isLiquidation && !isBuyback && !isShopping && !isCommunity;

  const tabs: Array<{ key: string; href: string; ko: string; en: string; active: boolean }> = [
    { key: "home", href: isEn ? "/en" : "/", ko: "오늘", en: "Today", active: isHome },
    { key: "consensus", href: isEn ? "/en/consensus" : "/consensus", ko: "증권사 목표가", en: "Consensus", active: isConsensus },
    { key: "liquidation", href: "/liquidation", ko: "청산맵", en: "Liq. Map", active: isLiquidation },
    { key: "poll", href: "/poll", ko: "인간지표", en: "Poll", active: isPoll },
    { key: "news", href: "/news", ko: "뉴스", en: "News", active: isNews },
    { key: "buyback", href: "/korea/hynix/buyback", ko: "자사주매입", en: "Buyback", active: isBuyback },
    { key: "shopping", href: "/shopping", ko: "핫딜", en: "Hot Deals", active: isShopping },
    { key: "community", href: "/community", ko: "커뮤니티", en: "Community", active: isCommunity },
    {
      key: "guide",
      href: isEn ? "/en/guide/binance-korea-stocks" : "/guide/binance-korea-stocks",
      ko: "가이드",
      en: "Guide",
      active: isGuide,
    },
  ];

  // 활성 칩을 보이게 스크롤 + 오른쪽에 더 있으면 페이드 힌트
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[aria-current="page"]');
    if (active && active.offsetLeft + active.offsetWidth > el.clientWidth) {
      el.scrollLeft = active.offsetLeft - 16;
    }
    const update = () => setFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  return (
    <nav
      ref={navRef}
      aria-label={isEn ? "Main" : "주요 메뉴"}
      className={`ds-chipnav flex gap-2 overflow-x-auto py-2 -mx-4 px-4 sm:mx-0 sm:px-0 ${fade ? "ds-fade-right" : ""}`}
    >
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href as any}
          prefetch={false}
          aria-current={t.active ? "page" : undefined}
          className="ds-chip hover:text-text transition"
        >
          {isEn ? t.en : t.ko}
        </Link>
      ))}
    </nav>
  );
}

export function Header({ fxRate, fxChange, asOf }: { fxRate: number; fxChange: number; asOf?: string | number }) {
  const { isEn } = useIsEn();
  const fxTone = fxChange > 0 ? "text-up" : fxChange < 0 ? "text-down" : "text-text-muted";
  return (
    <>
      <header className="max-w-6xl mx-auto px-4 sm:px-5 pt-3">
        <div className="flex items-center justify-between gap-3">
          <Link href={(isEn ? "/en" : "/") as any} prefetch={false} className="min-w-0">
            <div className="text-[12px] font-extrabold text-live leading-tight">KR Stocks</div>
            <div className="text-[20px] sm:text-[22px] font-extrabold tracking-tight leading-tight text-text truncate">
              {isEn ? "24h Korea Market Desk" : "오늘의 주식 관제실"}
            </div>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <SearchPalette variant="icon" locale={isEn ? "en" : "ko"} />
            <ThemeToggle />
            <LangToggle />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-x-3 gap-y-1 flex-wrap ds-meta">
          {asOf && <AsOf at={asOf} locale={isEn ? "en" : "ko"} note={isEn ? "refreshes ~2 min" : "약 2분마다 갱신"} />}
          {fxRate > 0 && (
            <span className="tabular whitespace-nowrap">
              USD/KRW <b className="text-text-muted">₩{fxRate.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}</b>{" "}
              <span className={`font-bold ${fxTone}`}>
                {fxChange > 0 ? "+" : fxChange < 0 ? "−" : ""}
                {Math.abs(fxChange).toFixed(2)}%
              </span>
            </span>
          )}
          <StatsBar compact />
        </div>
      </header>
      <div className="sticky top-0 z-30 bg-bg/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-5">
          <ChipNav />
        </div>
      </div>
    </>
  );
}
