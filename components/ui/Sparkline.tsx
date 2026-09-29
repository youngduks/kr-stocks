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
  /** 기준선(예: 60일 평균) — 점선으로 표시. 데이터 범위 밖이면 범위를 넓혀 포함 */
  refValue?: number;
  /** 마지막 점 강조 */
  endDot?: boolean;
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
  refValue,
  endDot = false,
}: SparklineProps) {
  const pts = values.filter((v) => Number.isFinite(v));
  if (pts.length < 2) {
    return <span className={`inline-block flex-none ${className}`} style={{ width, height }} aria-hidden="true" />;
  }
  const hasRef = refValue != null && Number.isFinite(refValue);
  const mn = Math.min(...pts, ...(hasRef ? [refValue as number] : []));
  const mx = Math.max(...pts, ...(hasRef ? [refValue as number] : []));
  const span = mx - mn || 1;
  const pad = endDot ? strokeWidth + 2 : strokeWidth;
  const X = (i: number) => (i / (pts.length - 1)) * (width - pad * 2) + pad;
  const Y = (v: number) => height - pad - ((v - mn) / span) * (height - pad * 2);
  const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const li = pts.length - 1;
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
      {hasRef && (
        <line
          x1={pad}
          x2={width - pad}
          y1={Y(refValue as number).toFixed(1)}
          y2={Y(refValue as number).toFixed(1)}
          stroke="rgb(var(--text-dim))"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}
      <path d={d} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      {endDot && <circle cx={X(li).toFixed(1)} cy={Y(pts[li]).toFixed(1)} r={strokeWidth + 1.5} fill="currentColor" />}
    </svg>
  );
}
