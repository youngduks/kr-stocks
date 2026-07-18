"use client";

import { useEffect, useRef } from "react";

export type KakaoAdFitProps = {
  /** AdFit 발급 광고단위 ID (예: DAN-xxxxxxxxxxxx) */
  unit: string;
  width: number;
  height: number;
  /** Tailwind로 반응형 노출 제어 (예: 모바일 전용이면 "md:hidden", PC 전용이면 "hidden md:block") */
  className?: string;
};

/**
 * 카카오 AdFit 광고단위. ba.min.js는 로드 시점에 페이지의 .kakao_ad_area를 스캔해 채우는 방식이라,
 * Next.js 클라이언트 라우팅으로 이 컴포넌트가 나중에 마운트되면 전역 1회 로드로는 못 잡을 수 있음
 * → 마운트마다 컨테이너 안에서 스크립트를 새로 주입해 항상 스캔이 일어나게 함.
 */
export function KakaoAdFit({ unit, width, height, className }: KakaoAdFitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (injectedRef.current || !containerRef.current) return;
    injectedRef.current = true;
    const script = document.createElement("script");
    script.src = "//t1.kakaocdn.net/kas/static/ba.min.js";
    script.async = true;
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div ref={containerRef} className={`w-full flex justify-center my-4 ${className ?? ""}`}>
      <ins
        className="kakao_ad_area"
        style={{ display: "none" }}
        data-ad-unit={unit}
        data-ad-width={String(width)}
        data-ad-height={String(height)}
      />
    </div>
  );
}
