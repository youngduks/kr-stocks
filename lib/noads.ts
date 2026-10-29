/**
 * 내부 방문자(우리 자동화 브라우저·운영자) 광고 차단 — 2026-10-29.
 *
 * 배경: AdSense 가 '반복 클릭(무효 트래픽)' 사유로 ~10/28 정지됐었음 → 재정지 방지.
 *  - URL ?noads=1 → 쿠키 krs_noads=1 (1년) + localStorage krs_noads=1 저장. 그 페이지부터 광고 미로드.
 *  - URL ?noads=0 → 쿠키·localStorage 해제.
 *  - 쿠키 또는 localStorage 에 krs_noads=1 이 있으면 AdSense·AdFit 모두 로드하지 않음.
 *  - 처리 순서: layout <head> 인라인 스크립트(NOADS_INIT_SCRIPT)가 hydration·광고 코드보다 먼저 실행.
 *    AdSlot.adsAllowed() 도 같은 처리를 맨 앞에서 한 번 더 수행(클라이언트 내비게이션 대비).
 *
 * ⚠ 이 파일은 서버 컴포넌트(layout)에서도 import 하므로 "use client" 를 붙이지 않는다.
 */

export const NOADS_KEY = "krs_noads";
const ONE_YEAR_SEC = 31536000;

/** layout <head> 에 인라인으로 넣는 스크립트 (의존성 없음, 실패해도 조용히 무시). */
export const NOADS_INIT_SCRIPT = `(function(){try{var p=new URLSearchParams(location.search).get("noads");if(p!=="1"&&p!=="0")return;var on=p==="1";var h=location.hostname;var d=(h==="kr-stocks.com"||/\\.kr-stocks\\.com$/.test(h))?"; domain=kr-stocks.com":"";var sec=location.protocol==="https:"?"; Secure":"";document.cookie="${NOADS_KEY}="+(on?"1":"")+"; path=/; max-age="+(on?${ONE_YEAR_SEC}:0)+"; SameSite=Lax"+d+sec;try{if(on)localStorage.setItem("${NOADS_KEY}","1");else localStorage.removeItem("${NOADS_KEY}")}catch(e){}}catch(e){}})();`;

/** URL ?noads=1/0 처리 (클라이언트 전용, 멱등). */
export function applyNoadsParam(): void {
  if (typeof window === "undefined") return;
  try {
    const p = new URLSearchParams(window.location.search).get("noads");
    if (p !== "1" && p !== "0") return;
    const on = p === "1";
    const h = window.location.hostname;
    const domain = h === "kr-stocks.com" || h.endsWith(".kr-stocks.com") ? "; domain=kr-stocks.com" : "";
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${NOADS_KEY}=${on ? "1" : ""}; path=/; max-age=${on ? ONE_YEAR_SEC : 0}; SameSite=Lax${domain}${secure}`;
    try {
      if (on) window.localStorage.setItem(NOADS_KEY, "1");
      else window.localStorage.removeItem(NOADS_KEY);
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}

/** 내부 방문자인가? (쿠키 또는 localStorage 에 krs_noads=1) */
export function isInternalVisitor(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (document.cookie.split(";").some((c) => c.trim() === `${NOADS_KEY}=1`)) return true;
  } catch {
    /* ignore */
  }
  try {
    if (window.localStorage.getItem(NOADS_KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}
