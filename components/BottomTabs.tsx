"use client";

// 모바일 하단 고정 탭 (2026-11-08) — md 미만에서만. 데스크톱 변화 없음.
//
// 광고 정책·오클릭 방지 (AdSense 무효 클릭 정지 이력 — components/AdSlot.tsx 주석 참고):
//   - 광고 영역(aside.ds-ad)이 화면 아래쪽 탭 근처(탭 높이 + 여유 48px)에 들어오면 탭을 숨긴다
//     → 탭이 광고를 덮거나 광고 바로 옆에서 눌리는 일이 없게.
//   - 탭 높이만큼 페이지 맨 아래에 빈 공간을 둬서 본문·푸터를 가리지 않음.
//   - 자동 앵커 광고는 현재 쓰지 않음(전역 adsbygoogle 로더 없음). 나중에 켜면 이 탭과 겹치므로 다시 검토할 것.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORIES, categoryOf, type CategoryKey } from "@/lib/nav";

const BAR_H = 56;
const AD_GAP = 48;

// 2026-11-16 정보 구조 재정비: 헤더와 같은 카테고리(lib/nav.ts)로 맞춤 — 오늘·시세·신호·분석 + 더보기.
const TAB_KEYS: CategoryKey[] = ["home", "markets", "signals", "analysis"];
const TABS = TAB_KEYS.map((k) => CATEGORIES.find((c) => c.key === k)!);

// 더보기 = 나머지 카테고리(핫딜·가이드) + 자주 찾는 페이지 바로가기
const MORE = [
  { href: "/shopping", label: "핫딜" },
  { href: "/community", label: "커뮤니티" },
  { href: "/guide", label: "가이드" },
  { href: "/consensus", label: "증권사 목표가" },
  { href: "/liquidation", label: "청산맵" },
  { href: "/korea/kospi-night", label: "코스피 야간" },
  { href: "/poll", label: "인간지표" },
  { href: "/news", label: "뉴스" },
] as const;

export function BottomTabs() {
  const pathname = usePathname() || "/";
  const [hideForAd, setHideForAd] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => setMoreOpen(false), [pathname]);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const vh = window.innerHeight;
      const zoneTop = vh - BAR_H - AD_GAP;
      let near = false;
      document.querySelectorAll<HTMLElement>("aside.ds-ad").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.top < vh && r.bottom > zoneTop) near = true;
      });
      setHideForAd(near);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // 광고가 늦게 그려지며 높이가 바뀌는 경우 대비
    const t = window.setInterval(check, 1500);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.clearInterval(t);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  // 영어 페이지는 라벨이 한국어라 표시하지 않음
  if (pathname.startsWith("/en")) return null;

  const current = categoryOf(pathname);
  // 더보기 강조: 하단 4칸에 없는 카테고리(핫딜·가이드)에 있을 때
  const moreActive = current === "deals" || current === "guide";
  const hidden = hideForAd && !moreOpen;

  return (
    <>
      {/* 탭 높이만큼 아래 여백 — 본문·푸터 가림 방지 */}
      <div aria-hidden="true" className="md:hidden" style={{ height: `calc(${BAR_H + 1}px + env(safe-area-inset-bottom))` }} />

      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMoreOpen(false)} aria-hidden="true" />
      )}
      {moreOpen && (
        <div
          id="bottom-more"
          className="md:hidden fixed inset-x-3 z-50 rounded-2xl bg-bg-card border border-line shadow-lg p-2 grid grid-cols-2 gap-1"
          style={{ bottom: `calc(${BAR_H + 8}px + env(safe-area-inset-bottom))` }}
        >
          {MORE.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              prefetch={false}
              className="block px-3 py-3 rounded-xl text-[14px] font-semibold text-text hover:bg-bg-hover"
              aria-current={pathname.startsWith(m.href) ? "page" : undefined}
            >
              {m.label}
            </Link>
          ))}
        </div>
      )}

      <nav
        aria-label="하단 메뉴"
        aria-hidden={hidden ? true : undefined}
        className={`md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-line bg-bg/95 backdrop-blur transition-transform duration-200 ${
          hidden ? "translate-y-full pointer-events-none" : ""
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5" style={{ height: BAR_H }}>
          {TABS.map((t) => {
            const active = current === t.key;
            return (
              <Link
                key={t.key}
                href={t.href}
                prefetch={false}
                tabIndex={hidden ? -1 : undefined}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-center text-[13px] font-bold ${active ? "text-text" : "text-text-dim"}`}
              >
                {t.ko}
              </Link>
            );
          })}
          <button
            type="button"
            tabIndex={hidden ? -1 : undefined}
            aria-expanded={moreOpen}
            aria-controls="bottom-more"
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex items-center justify-center text-[13px] font-bold ${moreOpen || moreActive ? "text-text" : "text-text-dim"}`}
          >
            더보기
          </button>
        </div>
      </nav>
    </>
  );
}
