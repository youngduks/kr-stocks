/**
 * 등락 색 공통 헬퍼 (2026-09 리디자인 Phase A).
 * 한국 관례: 상승 = 빨강(up, #E0342F / dark #FF5A55), 하락 = 파랑(down, #2F6FE0 / dark #5B8FF0).
 * 초록(live / accent-green)은 '실시간·정상' 상태 전용 — 등락에 쓰지 말 것.
 * CSS 토큰: app/globals.css --up/--down, Tailwind: text-up / bg-up / text-down / bg-down / bg-up-bg ...
 */

export type Direction = "up" | "down" | "flat";

export function direction(v: number | null | undefined, eps = 0): Direction {
  if (v == null || !Number.isFinite(v)) return "flat";
  if (v > eps) return "up";
  if (v < -eps) return "down";
  return "flat";
}

/** 등락 텍스트 색 class */
export function changeTextClass(v: number | null | undefined, flat = "text-text-muted"): string {
  const d = direction(v);
  return d === "up" ? "text-up" : d === "down" ? "text-down" : flat;
}

/** 등락 pill(배경+글자) class — globals.css .ds-pill-* */
export function changePillClass(v: number | null | undefined): string {
  const d = direction(v);
  return d === "up" ? "ds-pill-up" : d === "down" ? "ds-pill-down" : "ds-pill-flat";
}

/** 차트(lightweight-charts 등 CSS 변수 못 쓰는 곳)용 HEX */
export const CHART_UPDOWN = {
  dark: { up: "#FF5A55", down: "#5B8FF0", upFill: "rgba(255, 90, 85, 0.28)", downFill: "rgba(91, 143, 240, 0.28)" },
  light: { up: "#E0342F", down: "#2F6FE0", upFill: "rgba(224, 52, 47, 0.18)", downFill: "rgba(47, 111, 224, 0.18)" },
} as const;

/** +1.23% / −0.45% (유니코드 마이너스) */
export function formatPct(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const s = Math.abs(v).toFixed(digits);
  return v > 0 ? `+${s}%` : v < 0 ? `−${s}%` : `${s}%`;
}
