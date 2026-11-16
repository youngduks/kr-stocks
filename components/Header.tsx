"use client";

// 2026-09 리디자인 Phase A — 헤더:
//  ① 브랜드 + 아이콘 버튼(검색·테마·언어, 44px 탭 타깃)
//  ② 메타 한 줄: 기준시각(선택) · USD/KRW · 접속자(StatsBar — /api/visit 기록 담당이라 항상 마운트)
//  ③ sticky 카테고리 내비 — 6칸 고정 한 줄, 가로 스크롤 없음 (2026-11-16 정보 구조 재정비, lib/nav.ts)
//  ④ 하위 탭 — 같은 카테고리 안 페이지 이동 (sticky 아님)

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StatsBar } from "./StatsBar";
import { useTheme } from "./ThemeProvider";
import { SearchPalette } from "./SearchPalette";
import { AsOf } from "./ui/AsOf";
import { CATEGORIES, categoryOf } from "@/lib/nav";

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

/** 카테고리 내비 — 6칸 고정 한 줄(가로 스크롤 없음). 정의는 lib/nav.ts */
function CategoryNav() {
  const { pathname, isEn } = useIsEn();
  const current = categoryOf(pathname);
  return (
    <nav aria-label={isEn ? "Main" : "주요 메뉴"} className="ds-catnav py-2">
      {CATEGORIES.map((c) => (
        <Link
          key={c.key}
          href={(isEn ? c.enHref : c.href) as any}
          prefetch={false}
          aria-current={current === c.key ? "page" : undefined}
          className="ds-chip hover:text-text transition"
        >
          {isEn ? c.en : c.ko}
        </Link>
      ))}
    </nav>
  );
}

/** 하위 탭 — 지금 카테고리 안의 페이지들 (한국어 페이지만). 카테고리에 페이지가 하나뿐이면 표시 안 함. */
function SubTabs() {
  const { pathname, isEn } = useIsEn();
  const key = categoryOf(pathname);
  const cat = key ? CATEGORIES.find((c) => c.key === key) : null;
  if (isEn || !cat || cat.tabs.length < 2) return null;
  return (
    <nav aria-label={`${cat.ko} 메뉴`} className="ds-subtabs ds-chipnav max-w-3xl mx-auto px-4 sm:px-5">
      {cat.tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href as any}
          prefetch={false}
          aria-current={t.match(pathname) ? "page" : undefined}
          className="ds-subtab hover:text-text transition"
        >
          {t.label}
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
      <header className="max-w-3xl mx-auto px-4 sm:px-5 pt-3">
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
          {asOf && <AsOf at={asOf} locale={isEn ? "en" : "ko"} note={isEn ? "refreshes ~2 min" : "약 2분마다 갱신"} autoRefresh />}
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
        <div className="max-w-3xl mx-auto px-4 sm:px-5">
          <CategoryNav />
        </div>
      </div>
      <SubTabs />
    </>
  );
}
