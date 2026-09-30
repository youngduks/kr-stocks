/**
 * 과거 사례 점 그래프 — 빨강 = 오른 날, 파랑 = 내린 날, 회색 = 보합.
 * 서버 컴포넌트 (JS 0). 표본 n < minN 이면 아무것도 렌더하지 않음(호출부에서도 거름).
 */
import { formatPct } from "@/lib/colors";

export type HistoryDotsRow = {
  name: string;
  n: number;
  hits: number;
  meanPct: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  /** 최근 사례 등락률(%) — 오래된 → 최신 순 */
  recent: number[];
};

const ym = (d: string | null) => (d ? d.slice(0, 7).replace("-", ".") : "");

export function HistoryDots({
  rows,
  minN = 15,
  dotsLabel,
  hitVerb = "올랐어요",
}: {
  rows: HistoryDotsRow[];
  minN?: number;
  /** 점이 무엇인지 (예: "최근 30번") */
  dotsLabel?: string;
  /** "N번 중 M번 ___" */
  hitVerb?: string;
}) {
  const shown = rows.filter((r) => r.n >= minN);
  if (shown.length === 0) return null;
  return (
    <div className="space-y-3">
      {shown.map((r) => {
        const ups = r.recent.filter((x) => x > 0).length;
        const downs = r.recent.filter((x) => x < 0).length;
        const summary = `${r.name}: ${r.n}번 중 ${r.hits}번 ${hitVerb}`;
        return (
          <div key={r.name} className="ds-tile">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-[15px] font-extrabold">{r.name}</div>
              {dotsLabel && <div className="ds-meta shrink-0">{dotsLabel}</div>}
            </div>
            <div
              className="flex flex-wrap gap-[5px] mt-2"
              role="img"
              aria-label={`${summary}. ${dotsLabel ?? "최근 사례"} 중 오름 ${ups}번, 내림 ${downs}번`}
            >
              {r.recent.map((x, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className={`inline-block w-[10px] h-[10px] rounded-full ${x > 0 ? "bg-up" : x < 0 ? "bg-down" : "bg-flat"}`}
                />
              ))}
            </div>
            <p className="text-[14px] leading-relaxed mt-2">
              <b>
                {r.n}번 중 {r.hits}번 {hitVerb}
              </b>
              {r.meanPct != null && (
                <>
                  {" "}
                  · 평균 <b className={r.meanPct > 0 ? "text-up" : r.meanPct < 0 ? "text-down" : ""}>{formatPct(r.meanPct)}</b>
                </>
              )}
            </p>
            <p className="ds-meta mt-[2px]">
              기간 {ym(r.periodStart)}~{ym(r.periodEnd)} · n={r.n}
            </p>
          </div>
        );
      })}
    </div>
  );
}
