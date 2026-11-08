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

const BAR_H = 56;
const AD_GAP = 48;

const TABS = [
  { href: "/", label: "오늘", match: (p: string) => p === "/" },
  { href: "/consensus", label: "목표가", match: (p: string) => p === "/consensus" },
  { href: "/liquidation", label: "청산맵", match: (p: string) => p.startsWith("/liquidation") },
  { href: "/korea/kospi-night", label: "야간선물", match: (p: string) => p === "/korea/kospi-night" },
] as const;

const MORE = [
  { href: "/poll", label: "인간지표" },
  { href: "/news", label: "뉴스" },
  { href: "/korea/hynix/buyback", label: "자사주매입" },
  { href: "/shopping", label: "핫딜" },
  { href: "/community", label: "커뮤니티" },
  { href: "/guide/korean-overnight-prices", label: "야간 가격 가이드" },
  { href: "/guide/vix-index", label: "VIX지수 가이드" },
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

  const moreActive = MORE.some((m) => pathname.startsWith(m.href));
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
            const active = t.match(pathname);
            return (
              <Link
                key={t.href}
                href={t.href}
                prefetch={false}
                tabIndex={hidden ? -1 : undefined}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-center text-[13px] font-bold ${active ? "text-text" : "text-text-dim"}`}
              >
                {t.label}
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
