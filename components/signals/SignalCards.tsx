/**
 * 시장 신호 카드 모음 — 2026-11-16 정보 구조 재정비 때 app/page.tsx 에서 그대로 옮김(문구·계산 변경 없음).
 *   - TomorrowStatusCard : 미국 반도체 야간 신호 상태 카드. 홈은 요약(detail 없음), /signals 는 기록·채점표 포함.
 *   - HistoryCard        : 같은 구간이었던 날의 다음 한국 거래일 (data/history-stats.json)
 *   - SuddenMovesCard    : 최근 급변 (바이낸스 5분봉, lib/suddenMoves.ts)
 * 전부 서버 컴포넌트. 새 fetch·Redis 없음 — 호출부가 받은 데이터를 그대로 그린다.
 */
import Link from "next/link";
import type { SemiSignal } from "@/lib/semiSignal";
import { StatusCard, StatTile, type StatusTone } from "@/components/ui/StatusCard";
import { changeTextClass, formatPct } from "@/lib/colors";
import { bucketForUsPct, HISTORY_MIN_N, ym, type HistoryStats } from "@/lib/historyStats";
import { HistoryDots } from "@/components/HistoryDots";
import { MoreDetails } from "@/components/ui/MoreDetails";
import { SCORE_RECENT_N, type SignalScoreRow } from "@/lib/signalScore";
import { SUDDEN_MULT, SUDDEN_FLOOR_PCT, SUDDEN_WINDOW_H, type SuddenResult } from "@/lib/suddenMoves";
import { SIGNAL_LOG_MIN_N, type SignalLogSummary, type SignalRecord } from "@/lib/signalLog";

// ── 상태 카드 문구: SemiSignal.direction(= SOXL÷3, 임계값 ±0.4 / ±1.5 — lib/semiSignal.ts classify) 그대로 번역.
//    과거 통계는 아래 HistoryCard — data/history-stats.json(scripts/history-stats.mjs, 실데이터) 기반 (Phase C).
export const SIGNAL_COPY: Record<
  SemiSignal["direction"],
  { tone: StatusTone; pill: string; head: string; hl: string; outlook: string | null }
> = {
  strong_down: { tone: "down", pill: "▼ 강한 약세 신호", head: "미국 반도체가", hl: "많이 약해요", outlook: "약하게 시작할 가능성" },
  down: { tone: "down", pill: "▼ 약세 신호", head: "미국 반도체가", hl: "조금 약해요", outlook: "약하게 시작할 가능성" },
  flat: { tone: "flat", pill: "― 보합", head: "미국 반도체가", hl: "평소와 비슷해요", outlook: null },
  up: { tone: "up", pill: "▲ 강세 신호", head: "미국 반도체가", hl: "조금 강해요", outlook: "강하게 시작할 가능성" },
  strong_up: { tone: "up", pill: "▲ 강한 강세 신호", head: "미국 반도체가", hl: "많이 강해요", outlook: "강하게 시작할 가능성" },
  unknown: { tone: "flat", pill: "신호 대기", head: "미국 반도체 신호를", hl: "아직 못 받았어요", outlook: null },
};

// 상태 카드 "조금 더" 문답 — 화면 문구와 홈 FAQPage JSON-LD 가 같은 문자열을 쓰도록 상수로 공유
export const SIGNAL_METHOD_Q = "조금 더 — 이 신호는 어떻게 만드나요?";
export const SIGNAL_METHOD_A =
  "SOXL(미국 반도체 3배 ETF) 등락을 3으로 나눠 반도체지수 변화를 추정해요. 추정치가 0.4% 넘게 빠지거나 오르면 약세·강세, 1.5%를 넘으면 강한 신호로 표시해요. 방향을 맞히는 예측이 아니라 밤사이 분위기 요약이에요.";

function kstTime(epochSec: number | null): string | null {
  if (!epochSec) return null;
  try {
    return new Date(epochSec * 1000).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return null;
  }
}

const DIR_LABEL: Record<SignalRecord["direction"], string> = {
  strong_up: "▲ 강한 강세",
  up: "▲ 강세",
  flat: "― 보합",
  down: "▼ 약세",
  strong_down: "▼ 강한 약세",
};

function kstYmd(iso: string): string {
  return new Date(Date.parse(iso) + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function mdw(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00+09:00`);
  const w = d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", weekday: "short" });
  return `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}(${w})`;
}

/** 최근 급변 카드 — 실데이터만, 없으면 '없음'이라고 표시. 받은 데이터가 없으면 카드 숨김 */
export function SuddenMovesCard({ s, className = "mt-4" }: { s: SuddenResult | null; className?: string }) {
  if (!s) return null;
  const t = (ms: number) =>
    new Date(ms).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  return (
    <section className={`ds-card ${className}`} style={{ padding: "8px 20px" }} aria-labelledby="sudden-h">
      <div className="flex items-center justify-between gap-3 pt-3 pb-1">
        <h2 id="sudden-h" className="text-[17px] font-extrabold">
          최근 {SUDDEN_WINDOW_H}시간 급변
        </h2>
        <span className="ds-meta shrink-0">바이낸스 5분봉</span>
      </div>
      {s.events.length === 0 ? (
        <p className="ds-explain py-2">최근 {SUDDEN_WINDOW_H}시간 동안 기준을 넘은 5분 급변이 없어요.</p>
      ) : (
        s.events.map((e) => (
          <Link key={`${e.symbol}-${e.at}`} href={e.href} prefetch={false} className="ds-row hover:bg-bg-hover/60 -mx-2 px-2 rounded-xl transition">
            <div className="flex-1 min-w-0">
              <div className="font-sys text-[15px] font-semibold truncate text-text">{e.name}</div>
              <div className="text-[12px] text-text-dim num">{t(e.at)}부터 5분</div>
            </div>
            <div className={`num text-[15px] font-bold ${changeTextClass(e.pct)}`}>{formatPct(e.pct)}</div>
          </Link>
        ))
      )}
      <p className="ds-meta pb-3 pt-1">
        기준: 5분 등락이 그 상품의 최근 24시간 평소 5분 움직임(중앙값)의 {SUDDEN_MULT}배 이상, 최소 ±{SUDDEN_FLOOR_PCT}% · 지금 기준{" "}
        {s.thresholds.map((x) => `${x.name} ±${x.pct.toFixed(2)}%`).join(" · ")} · 매매 권유가 아니에요
      </p>
    </section>
  );
}

/** 개장 전 실제 기록 + 마감 후 채점 (data/signal-log.json, 재구성 없음) — 2026-11-08 시작 */
function SignalRecordBlock({ s }: { s: SignalLogSummary | null }) {
  if (!s) return null;
  const started = s.startedAt ? mdw(kstYmd(s.startedAt)) : null;
  const few = s.stocks.every((x) => x.graded < SIGNAL_LOG_MIN_N);
  return (
    <div className="mt-4 pt-3 border-t border-line">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-extrabold">이 신호의 실제 기록</h3>
        {few && <span className="ds-meta shrink-0">기록 쌓는 중</span>}
      </div>
      <p className="ds-meta mt-1">
        {started
          ? `기록 시작 ${started} · 매 거래일 한국 장 시작 전에 기록하고, 장 마감 후 종가로 채점해요`
          : "다음 한국 거래일부터 장 시작 전 신호를 기록하고, 장 마감 후 종가로 채점해요"}
      </p>
      <div className="mt-2 space-y-1">
        {s.stocks.map((x) => (
          <div key={x.slug} className="flex items-center gap-3 text-[14px]">
            <span className="font-bold w-[84px] shrink-0 truncate">{x.name}</span>
            <span className="num">
              맞음 <b>{x.hits}</b> / 채점 <b>{x.graded}</b>
            </span>
          </div>
        ))}
      </div>
      {s.recent.length > 0 && (
        <ul className="mt-2 space-y-1 text-[13px] text-text-muted">
          {s.recent.map((r) => (
            <li key={r.krDate} className="num">
              <b className="text-text">{mdw(r.krDate)}</b> {DIR_LABEL[r.direction]} ·{" "}
              {r.status === "pending"
                ? "채점 대기"
                : r.status === "no_session"
                  ? "휴장"
                  : r.call === "none"
                    ? "보합 신호라 채점 안 함"
                    : (["samsung", "hynix"] as const)
                        .map((k) => {
                          const v = r.results[k];
                          if (!v) return null;
                          const nm = k === "samsung" ? "삼성" : "하이닉스";
                          return `${nm} ${v.pct > 0 ? "+" : v.pct < 0 ? "−" : ""}${Math.abs(v.pct).toFixed(1)}% ${v.hit ? "맞음" : "틀림"}`;
                        })
                        .filter(Boolean)
                        .join(" · ")}
            </li>
          ))}
        </ul>
      )}
      <p className="ds-meta mt-2">
        강세 신호에 그날 종가가 전날보다 오르면, 약세 신호에 내리면 맞음 · 틀린 기록도 지우지 않아요 · 매매 권유가 아니에요
      </p>
    </div>
  );
}

/** 채점표 — 미국 반도체가 1% 넘게 움직인 날, 다음 한국 거래일 종가 방향이 같았나 (data/history-stats.json) */
function SignalScoreboard({ rows }: { rows: SignalScoreRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-4 pt-3 border-t border-line">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-extrabold">
          참고: 과거 일봉으로 다시 계산한 통계
        </h3>
        <span className="ds-meta shrink-0">● 맞음 · ○ 빗나감</span>
      </div>
      <div className="mt-2 space-y-2">
        {rows.map((r) => {
          const recentHits = r.recent.filter(Boolean).length;
          return (
            <div key={r.name} className="flex items-center gap-3">
              <div className="text-[14px] font-bold w-[84px] shrink-0 truncate">{r.name}</div>
              <div className="num text-[18px] font-extrabold w-[52px] shrink-0">{r.hitRatePct}%</div>
              <div
                className="flex gap-[4px] flex-wrap"
                role="img"
                aria-label={`${r.name} 최근 ${r.recent.length}번 중 ${recentHits}번 방향 맞음`}
              >
                {r.recent.map((ok, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={`inline-block w-[9px] h-[9px] rounded-full ${ok ? "bg-text" : "border border-text-dim"}`}
                  />
                ))}
              </div>
              <div className="ds-meta ml-auto shrink-0 hidden sm:block">
                최근 {r.recent.length}번 중 {recentHits}번
              </div>
            </div>
          );
        })}
      </div>
      <p className="ds-meta mt-2">
        미국 반도체(^SOX)가 1% 넘게 오르거나 내린 날, 다음 한국 거래일 종가가 같은 방향이었던 비율 ·{" "}
        {rows.every((r) => r.n === rows[0].n) ? `${rows[0].n}번 기준` : rows.map((r) => `${r.name} ${r.n}번`).join(" · ")} · 점 = 최근 {SCORE_RECENT_N}번(오른쪽이 최신) · 기간 {ym(rows[0].periodStart)}~{ym(rows[0].periodEnd)}
      </p>
    </div>
  );
}

export function TomorrowStatusCard({
  semi,
  fxRate,
  fxChange,
  detail,
  moreHref,
  headingLevel = "h2",
}: {
  semi: SemiSignal;
  fxRate: number;
  fxChange: number;
  /** 있으면 '이 신호의 실제 기록' + 과거 채점표까지 표시 (/signals). 홈은 생략해 카드 높이를 줄인다. */
  detail?: { score: SignalScoreRow[]; record: SignalLogSummary | null };
  /** 요약 카드(홈)에서 상세 페이지로 가는 링크 */
  moreHref?: string;
  headingLevel?: "h1" | "h2";
}) {
  const c = SIGNAL_COPY[semi.direction];
  const when = semi.direction === "unknown" ? "" : semi.isLive ? "지금 " : "밤사이 ";
  const soxlPct = semi.soxl?.changePct ?? null;
  const asOf = kstTime(semi.asOf);
  return (
    <StatusCard
      headingLevel={headingLevel}
      eyebrow="그래서 내일 아침 한국장은?"
      pill={{ tone: c.tone, label: c.pill }}
      headline={
        <>
          {when}
          {c.head}
          <br />
          <span className="ds-hl">{semi.isLive || semi.direction === "unknown" ? c.hl : c.hl.replace(/해요$/, "했어요")}</span>
        </>
      }
      explain={
        semi.direction === "unknown" ? (
          <>미국 반도체 ETF 시세를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</>
        ) : c.outlook ? (
          <>
            반도체 3배 ETF(SOXL)가 {formatPct(soxlPct)} 움직였어요. 삼성전자·SK하이닉스는 내일 아침{" "}
            <b className="text-text">{c.outlook}</b>이 있어요.
          </>
        ) : (
          <>반도체 3배 ETF(SOXL) 변화가 작아요({formatPct(soxlPct)}). 내일 아침 반도체 쪽 큰 방향 신호는 없어요.</>
        )
      }
      more={{
        summary: SIGNAL_METHOD_Q,
        content: (
          <>
            {SIGNAL_METHOD_A}
            {semi.nvda && <> 참고로 엔비디아는 {formatPct(semi.nvda.changePct)}예요.</>}
            {asOf && (
              <>
                {" "}
                (미국 시세 기준: {asOf} KST{semi.isLive ? ", 미국 정규장 거래 중" : ""})
              </>
            )}
          </>
        ),
      }}
    >
      <div className="grid grid-cols-2 gap-3 mt-4">
        <StatTile
          label="SOXL (반도체 3배)"
          value={formatPct(soxlPct)}
          valueClass={changeTextClass(soxlPct)}
          sub={
            semi.impliedSemiPct != null ? (
              <>
                반도체지수 환산 <b className={changeTextClass(semi.impliedSemiPct)}>{formatPct(semi.impliedSemiPct)}</b>
              </>
            ) : (
              "—"
            )
          }
        />
        <StatTile
          label="원·달러 환율"
          value={fxRate > 0 ? `₩${fxRate.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}` : "—"}
          sub={
            <>
              <b className={changeTextClass(fxChange)}>{formatPct(fxChange)}</b> · 업비트 USDT 24시간
            </>
          }
        />
      </div>
      {detail && (
        <>
          <SignalRecordBlock s={detail.record} />
          <SignalScoreboard rows={detail.score} />
        </>
      )}
      {moreHref && (
        <Link
          href={moreHref as any}
          prefetch={false}
          className="mt-4 flex items-center justify-between gap-3 min-h-[48px] text-[14px] font-bold text-text-muted hover:text-text border-t border-line"
        >
          <span className="truncate">이 신호의 실제 기록 · 과거 사례 · 최근 급변 보기</span>
          <span className="shrink-0">→</span>
        </Link>
      )}
    </StatusCard>
  );
}

/** 과거 사례 — 지금 미국 반도체 등락과 같은 구간이었던 날, 다음 한국 거래일 삼성전자·SK하이닉스.
 *  실데이터(data/history-stats.json)만. 표본 n < HISTORY_MIN_N 이면 숨김. */
export function HistoryCard({ stats, usPct }: { stats: HistoryStats | null; usPct: number | null }) {
  const id = bucketForUsPct(usPct);
  if (!stats || !id) return null;
  const rows = ["samsung", "hynix"]
    .map((slug) => stats.stocks[slug])
    .filter(Boolean)
    .map((s) => {
      const b = s.buckets[id];
      return {
        name: s.name,
        n: b.n,
        hits: b.hits,
        meanPct: b.meanPct,
        periodStart: b.periodStart,
        periodEnd: b.periodEnd,
        recent: (b.recent ?? []).map((d) => d.krRet),
        open: b.open,
        baseline: s.baseline,
      };
    })
    .filter((r) => r.n >= HISTORY_MIN_N);
  if (rows.length === 0) return null;
  const label = stats.stocks.samsung?.buckets[id]?.label ?? "";
  const dotsN = Math.max(...rows.map((r) => r.recent.length));
  const computed = stats.computedAt ? stats.computedAt.slice(0, 10).replace(/-/g, ".") : "";
  return (
    <section className="ds-card mt-4" aria-labelledby="history-h">
      <div className="ds-eyebrow">과거엔 어땠나요?</div>
      <h2 id="history-h" className="ds-h2 mt-2">
        미국 반도체가 <span className="ds-hl">{label}</span>였던 다음 날
      </h2>
      <p className="ds-explain mt-1">최근 약 5년, 다음 한국 거래일 종가가 전날보다 올랐는지 셌어요.</p>
      <div className="mt-3">
        <HistoryDots rows={rows} minN={HISTORY_MIN_N} dotsLabel={`점 = 최근 ${dotsN}번`} />
      </div>
      <p className="ds-meta mt-2">
        <span className="text-up font-bold">●</span> 오른 날 · <span className="text-down font-bold">●</span> 내린 날 · 매매 지시가 아니에요
      </p>
      <MoreDetails summary="조금 더 — 어떻게 셌나요?">
        <>
          필라델피아 반도체지수(^SOX)의 하루 등락이 {label} 구간이었던 날마다, 그다음 한국 거래일의 종가를 전 거래일
          종가와 비교했어요. 한국 종가는 거래소 공식 종가(네이버 금융), 미국은 Yahoo Finance 일봉이에요. 미국장이 연달아
          두 번 열리는 한국 연휴 직후나 미국 휴장일은 어느 날의 영향인지 섞이므로 뺐어요. 위 카드의 신호는 SOXL÷3
          추정치라 실제 지수와 조금 다를 수 있어요.
          <br />
          <br />
          {rows.map((r) => (
            <span key={r.name} className="block">
              {r.name}: 시가 기준으로는 {r.open.n}번 중 {r.open.ups}번 높게 시작(평균 {formatPct(r.open.meanPct)}) · 조건
              없이 전체 {r.baseline.n}일 중 {r.baseline.hits}일 상승(평균 {formatPct(r.baseline.meanPct)})
            </span>
          ))}
          <br />
          과거에 그랬다고 이번에도 그렇다는 보장은 없어요. 표본 수(n)가 작을수록 우연일 가능성이 커요({HISTORY_MIN_N}번
          미만이면 표시하지 않아요). 매매 지시가 아니에요. 기간 {ym(rows[0].periodStart)}~{ym(rows[0].periodEnd)}
          {computed && <> · {computed} 계산 · 매주 갱신</>}
        </>
      </MoreDetails>
    </section>
  );
}
