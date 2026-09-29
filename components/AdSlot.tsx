"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 광고 슬롯 (2026-09 Phase A — 오클릭 방지 설계).
 *
 * 배경: AdSense 가 '반복 클릭(무효 트래픽)' 사유로 ~10/28 까지 정지됨.
 *  - 전역 adsbygoogle 로더 제거. AdSense 스크립트는 이 컴포넌트가 '수동 슬롯 ID'가 있을 때만 주입.
 *  - 슬롯 ID 는 NEXT_PUBLIC_ADSENSE_SLOT_* 환경변수 (미설정 = AdSense 미로드).
 *  - 봇/프리뷰/로컬에서는 어떤 광고 스크립트도 로드하지 않음:
 *      navigator.webdriver, 비-프로덕션 빌드(VERCEL_ENV !== 'production'), *.vercel.app, localhost.
 *  - 고정 높이(모바일 100 / 데스크톱 90) → CLS 0. '광고' 라벨 + 상하 32px 여백 + 구분선.
 *  - 섹션 경계에만 배치, 첫 화면(first viewport) 금지, 모바일 페이지당 최대 2개 (배치 규칙 — 호출부 책임).
 *  - 뷰포트 근처에 오기 전엔 로드하지 않음(IntersectionObserver) + 첫 화면 안에서 마운트되면 스크롤 전까지 보류.
 */

const ADSENSE_CLIENT = "ca-pub-5171852166925849";
const ADSENSE_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
const ADFIT_SRC = "https://t1.kakaocdn.net/kas/static/ba.min.js";

/** next.config.mjs 에서 빌드 시점 VERCEL_ENV 를 인라인 (Vercel 외 빌드 = "development"). */
const DEPLOY_ENV = process.env.NEXT_PUBLIC_DEPLOY_ENV || "development";

const MOBILE_H = 100;
const DESKTOP_H = 90;
const DESKTOP_MIN_W = 768; // Tailwind md

type AdFitUnit = { unit: string; width: number; height: number };

export type AdSlotProps = {
  /** AdSense 수동 광고단위 slot id — 반드시 NEXT_PUBLIC_ADSENSE_SLOT_* 에서 전달. 빈 값이면 AdSense 미사용. */
  adsenseSlot?: string;
  /** Kakao AdFit 유닛 (AdSense slot 이 없을 때 대체) */
  adfitMobile?: AdFitUnit;
  adfitDesktop?: AdFitUnit;
  className?: string;
};

/** 광고 스크립트를 로드해도 되는 환경인가? (클라이언트 전용) */
export function adsAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (DEPLOY_ENV !== "production") return false;
  try {
    if (navigator.webdriver) return false;
  } catch {
    return false;
  }
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host.endsWith(".local")) return false;
  if (host.endsWith(".vercel.app")) return false;
  // 정식 도메인에서만 허용
  return host === "kr-stocks.com" || host === "www.kr-stocks.com";
}

function ensureAdsenseScript() {
  if (document.querySelector('script[data-krs-adsense="1"]')) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = ADSENSE_SRC;
  s.crossOrigin = "anonymous";
  s.setAttribute("data-krs-adsense", "1");
  document.head.appendChild(s);
}

export function AdSlot({ adsenseSlot, adfitMobile, adfitDesktop, className }: AdSlotProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [active, setActive] = useState(false);

  // viewport 폭 판정 (첫 render 는 모바일 기준 — SSR 과 동일)
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_W}px)`);
    setIsDesktop(mq.matches);
  }, []);

  // 로드 게이트: 허용 환경 + 뷰포트 근접 + (첫 화면 밖 or 사용자가 스크롤함)
  useEffect(() => {
    if (!adsAllowed()) return;
    const hasAdsense = !!adsenseSlot;
    const hasAdfit = !!(adfitMobile || adfitDesktop);
    if (!hasAdsense && !hasAdfit) return;
    const el = wrapRef.current;
    if (!el) return;

    const inFirstViewport = el.getBoundingClientRect().top < window.innerHeight;
    let scrolled = window.scrollY > 0;
    let visible = false;
    const tryActivate = () => {
      if (visible && (!inFirstViewport || scrolled)) setActive(true);
    };
    const onScroll = () => {
      scrolled = true;
      tryActivate();
    };
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
        tryActivate();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [adsenseSlot, adfitMobile, adfitDesktop]);

  // 실제 광고 주입 (1회)
  useEffect(() => {
    if (!active || loadedRef.current || !boxRef.current) return;
    loadedRef.current = true;
    const box = boxRef.current;
    const h = isDesktop ? DESKTOP_H : MOBILE_H;

    if (adsenseSlot) {
      const w = isDesktop ? 728 : 320;
      const ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.display = "inline-block";
      ins.style.width = `${w}px`;
      ins.style.height = `${h}px`;
      ins.setAttribute("data-ad-client", ADSENSE_CLIENT);
      ins.setAttribute("data-ad-slot", adsenseSlot);
      box.appendChild(ins);
      ensureAdsenseScript();
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch {
        /* ignore */
      }
      return;
    }

    const unit = isDesktop ? adfitDesktop ?? adfitMobile : adfitMobile ?? adfitDesktop;
    if (!unit) return;
    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.style.display = "none";
    ins.setAttribute("data-ad-unit", unit.unit);
    ins.setAttribute("data-ad-width", String(unit.width));
    ins.setAttribute("data-ad-height", String(Math.min(unit.height, h)));
    box.appendChild(ins);
    // ba.min.js 는 로드 시점에 .kakao_ad_area 를 스캔 → 슬롯마다 새로 주입
    const s = document.createElement("script");
    s.async = true;
    s.src = ADFIT_SRC;
    box.appendChild(s);
  }, [active, isDesktop, adsenseSlot, adfitMobile, adfitDesktop]);

  return (
    <aside ref={wrapRef} className={`ds-ad ${className ?? ""}`} aria-label="광고">
      <div className="ds-ad-label">광고</div>
      <div
        ref={boxRef}
        className="ds-ad-box h-[100px] md:h-[90px]"
        // 광고가 안 뜨는 환경(프리뷰/봇/미설정)에서도 동일 높이 유지 → CLS 0
      />
    </aside>
  );
}
