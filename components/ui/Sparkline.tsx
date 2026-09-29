/**
 * 순수 SVG 스파크라인 (서버/클라이언트 공용, 의존성 0).
 * 색은 currentColor → 호출부에서 text-up / text-down / text-flat 로 지정 (tone 으로 자동 지정 가능).
 * 데이터가 2개 미만이면 같은 크기의 빈 박스를 렌더 → 레이아웃 고정.
 */
import { direction } from "@/lib/colors";

export type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  /** "auto" = 처음 vs 끝 비교로 up/down/flat 색 결정 */
  tone?: "auto" | "up" | "down" | "flat";
  className?: string;
  ariaLabel?: string;
};

const TONE_CLASS = { up: "text-up", down: "text-down", flat: "text-flat" } as const;

export function Sparkline({
  values,
  width = 56,
  height = 26,
  strokeWidth = 2,
  tone = "auto",
  className = "",
  ariaLabel,
}: SparklineProps) {
  const pts = values.filter((v) => Number.isFinite(v));
  if (pts.length < 2) {
    return <span className={`inline-block flex-none ${className}`} style={{ width, height }} aria-hidden="true" />;
  }
  const mn = Math.min(...pts);
  const mx = Math.max(...pts);
  const span = mx - mn || 1;
  const pad = strokeWidth;
  const d = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * (width - pad * 2) + pad;
      const y = height - pad - ((v - mn) / span) * (height - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const t = tone === "auto" ? direction(pts[pts.length - 1] - pts[0]) : tone;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`flex-none ${TONE_CLASS[t]} ${className}`}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
