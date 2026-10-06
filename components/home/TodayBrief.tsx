/**
 * 홈 최상단 "오늘 한눈에" — 이미 받은 실데이터(반도체 신호·환율·외국인 5일 수급)를 규칙 문장 3줄로 요약 +
 * 다가오는 일정 D-day 칩. 서버 컴포넌트, 새 fetch·Redis 없음. 링크·버튼 없음(광고 오클릭 위험 0).
 */
import type { SemiSignal } from "@/lib/semiSignal";
import { getTradingFlow, formatBigKRW } from "@/lib/tradingFlow";
import { changeTextClass, formatPct } from "@/lib/colors";
import type { UpcomingEvent } from "@/lib/events";

const SEMI_LINE: Record<SemiSignal["direction"], string> = {
  strong_down: "많이 약했어요",
  down: "조금 약했어요",
  flat: "평소와 비슷했어요",
  up: "조금 강했어요",
  strong_up: "많이 강했어요",
  unknown: "",
};

function semiLine(semi: SemiSignal): React.ReactNode {
  if (semi.direction === "unknown") return <>미국 반도체 시세를 아직 못 받았어요.</>;
  const verb = semi.isLive ? SEMI_LINE[semi.direction].replace(/했어요$/, "해요") : SEMI_LINE[semi.direction];
  return (
    <>
      {semi.isLive ? "지금" : "밤사이"} 미국 반도체가 <b className="text-text">{verb}</b> (지수 환산{" "}
      <b className={changeTextClass(semi.impliedSemiPct)}>{formatPct(semi.impliedSemiPct)}</b>)
    </>
  );
}

function fxLine(rate: number, change: number): React.ReactNode {
  if (!(rate > 0)) return <>원·달러 환율을 아직 못 받았어요.</>;
  const won = `₩${rate.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}`;
  const word =
    Math.abs(change) < 0.3 ? "거의 그대로예요" : change > 0 ? "올랐어요 (원화 약세)" : "내렸어요 (원화 강세)";
  return (
    <>
      원·달러 환율 <b className="text-text">{won}</b>, 하루 새 <b className={changeTextClass(change)}>{formatPct(change)}</b> {word}
    </>
  );
}

function flowLine(): React.ReactNode | null {
  const flows = ["samsung", "hynix"].map(getTradingFlow).filter((f): f is NonNullable<typeof f> => !!f);
  if (flows.length === 0) return null;
  const sum = flows.reduce((a, f) => a + f.cumulative_5d.foreign_won, 0);
  const last = flows
    .map((f) => f.daily[f.daily.length - 1]?.date)
    .filter(Boolean)
    .sort()
    .pop();
  const { display, sign } = formatBigKRW(sum);
  const side = sum > 0 ? "사는 쪽이었어요" : sum < 0 ? "파는 쪽이었어요" : "팽팽했어요";
  return (
    <>
      삼성전자·SK하이닉스 외국인은 최근 5거래일 합계{" "}
      <b className={changeTextClass(sum)}>
        {sign}
        {display}
      </b>{" "}
      — {side}
      {last && <span className="ds-meta"> ({last.slice(5).replace("-", "/")}까지)</span>}
    </>
  );
}

function ddayLabel(d: number) {
  return d === 0 ? "오늘" : `D-${d}`;
}

export function TodayBrief({
  semi,
  fxRate,
  fxChange,
  events,
}: {
  semi: SemiSignal;
  fxRate: number;
  fxChange: number;
  events: UpcomingEvent[];
}) {
  const lines = [
    { tag: "반도체", body: semiLine(semi) },
    { tag: "환율", body: fxLine(fxRate, fxChange) },
    { tag: "외국인", body: flowLine() },
  ].filter((l) => l.body != null);

  return (
    <section className="ds-card mb-4" aria-labelledby="brief-h">
      <h2 id="brief-h" className="ds-eyebrow">
        오늘 한눈에
      </h2>
      <ol className="mt-2 space-y-2">
        {lines.map((l) => (
          <li key={l.tag} className="flex gap-3 items-baseline">
            <span className="ds-pill ds-pill-flat shrink-0 w-[58px] justify-center">{l.tag}</span>
            <span className="text-[15px] leading-relaxed text-text-muted">{l.body}</span>
          </li>
        ))}
      </ol>

      {events.length > 0 && (
        <div className="mt-4 pt-3 border-t border-line">
          <div className="ds-meta font-bold">다가오는 일정</div>
          <ul className="flex flex-wrap gap-2 mt-2">
            {events.map((e) => (
              <li
                key={`${e.date}-${e.title}`}
                className="ds-tile !py-2 !px-3 text-[13px] leading-tight"
                title={`${e.date} · 출처: ${e.source}`}
              >
                <b className={e.dday <= 3 ? "text-warn" : "text-text"}>{ddayLabel(e.dday)}</b>{" "}
                <span className="font-bold text-text">{e.title}</span>
                <span className="block ds-meta mt-[2px]">
                  {e.date.slice(5).replace("-", "/")}
                  {e.note ? ` · ${e.note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="ds-meta mt-3">이미 받은 숫자를 규칙대로 옮긴 요약이에요 · 매매 지시가 아니에요</p>
    </section>
  );
}
