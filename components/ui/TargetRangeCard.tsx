/**
 * 증권사 목표가 상태 카드 (Phase B) — "목표가까지 +N% 남았어요" + 52주 최저~지금~목표가 바 + 쉬운 해석.
 * mockups/stock_card.html 하단 '증권사 평균 목표가' 카드. 훅 없음 → 서버/클라이언트 양쪽에서 사용 가능.
 * 숫자는 모두 네이버 금융 종합 컨센서스(data/consensus/*.json) + 현재가에서 계산.
 */
import type { ConsensusData } from "@/lib/consensus";
import { MoreDetails } from "./MoreDetails";

type Locale = "ko" | "en";

function fmtKRW(n: number): string {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

function fmtDate(iso: string, locale: Locale): string {
  try {
    return new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "ko-KR", {
      timeZone: "Asia/Seoul",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "";
  }
}

function interpret(upside: number, locale: Locale): string {
  if (locale === "en") {
    if (upside >= 30) return "Brokers broadly see a lot of room to rise. Targets lag the price, so the gap can look large after a fast move.";
    if (upside >= 10) return "Brokers think it can rise a bit further from here.";
    if (upside >= 0) return "The price is already close to the average broker target.";
    return "The price is above the average broker target. Either brokers raise targets, or the stock may pause here.";
  }
  if (upside >= 30) return "증권사들은 대체로 ‘더 오를 여지가 크다’고 봐요. 다만 목표가는 주가를 늦게 따라오는 숫자라, 주가가 빠르게 움직인 뒤엔 차이가 크게 보일 수 있어요.";
  if (upside >= 10) return "증권사들은 지금보다 조금 더 오를 수 있다고 봐요.";
  if (upside >= 0) return "지금 가격이 증권사 평균 목표가에 거의 다 왔어요.";
  return "지금 가격이 증권사 평균 목표가보다 높아요. 증권사들이 목표가를 올리거나, 주가가 쉬어갈 수 있는 구간이에요.";
}

export function TargetRangeCard({
  data,
  locale = "ko",
  headingLevel = "h2",
  showName = true,
  className = "",
}: {
  data: ConsensusData;
  locale?: Locale;
  headingLevel?: "h1" | "h2" | "h3";
  showName?: boolean;
  className?: string;
}) {
  const c = data.consensus;
  const snap = data.naver_snapshot;
  const target = c.avg_target_krw;
  const cur = c.current_price_krw ?? null;
  const upside = cur != null && cur > 0 ? ((target - cur) / cur) * 100 : null;
  const low = snap?.low_52w_krw ?? null;
  const high = snap?.high_52w_krw ?? null;
  const name = locale === "en" ? data.name_en : data.name_ko;
  const H = headingLevel;
  const en = locale === "en";

  // 바 스케일: 52주 최저(없으면 min) ~ max(목표가, 현재가)
  const vals = [low, cur, target].filter((v): v is number => v != null && v > 0);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const pos = (v: number) => Math.min(100, Math.max(0, ((v - lo) / span) * 100));
  const inRange52 = low != null && high != null && cur != null && high > low ? Math.round(((cur - low) / (high - low)) * 100) : null;

  const asOf = snap?.fetched_at ?? data.updated_at;
  const up = upside != null && upside >= 0;

  return (
    <section className={`ds-card ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="ds-eyebrow truncate">
          {showName ? `${name} · ` : ""}
          {en ? "Avg broker target" : "증권사 평균 목표가"}
        </div>
        <span className="ds-meta shrink-0">
          {fmtDate(asOf, locale)} {en ? "· Naver Finance" : "기준 · 네이버 금융"}
        </span>
      </div>
      <H className="ds-status mt-2" style={{ fontSize: 21 }}>
        {upside == null ? (
          en ? (
            <>Avg target ₩{fmtKRW(target)}</>
          ) : (
            <>평균 목표가는 ₩{fmtKRW(target)}이에요</>
          )
        ) : en ? (
          up ? (
            <>
              <span className="ds-hl text-up">+{upside.toFixed(1)}%</span> left to target
            </>
          ) : (
            <>
              Already <span className="ds-hl text-down">{Math.abs(upside).toFixed(1)}% above</span> target
            </>
          )
        ) : up ? (
          <>
            목표가까지 <span className="ds-hl text-up">+{upside.toFixed(1)}% 남았어요</span>
          </>
        ) : (
          <>
            이미 목표가보다 <span className="ds-hl text-down">{Math.abs(upside).toFixed(1)}% 높아요</span>
          </>
        )}
      </H>

      {cur != null && (
        <>
          <div className="relative mt-6 h-[8px] rounded-full bg-line" aria-hidden="true">
            {low != null && <div className="absolute top-0 h-full w-[2px] bg-text-dim" style={{ left: `${pos(low)}%` }} />}
            <div
              className="absolute top-[-6px] w-[20px] h-[20px] rounded-full border-4 bg-ink"
              style={{ left: `calc(${pos(cur)}% - ${(pos(cur) / 100) * 20}px)`, borderColor: "rgb(var(--bg-card))" }}
            />
            <div
              className="absolute top-[-6px] w-[20px] h-[20px] rounded-full border-4 bg-up"
              style={{ left: `calc(${pos(target)}% - ${(pos(target) / 100) * 20}px)`, borderColor: "rgb(var(--bg-card))" }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-[12px]">
            <div>
              <div className="ds-meta">{low != null ? (en ? "52w low" : "52주 최저") : ""}</div>
              <div className="num font-bold">{low != null ? fmtKRW(low) : ""}</div>
            </div>
            <div className="text-center">
              <div className="ds-meta">
                <span className="text-text">●</span> {en ? "Now" : "지금"}
              </div>
              <div className="num font-bold">{fmtKRW(cur)}</div>
            </div>
            <div className="text-right">
              <div className="ds-meta">
                <span className="text-up">●</span> {en ? "Avg target" : "평균 목표가"}
              </div>
              <div className="num font-bold text-up">{fmtKRW(target)}</div>
            </div>
          </div>
        </>
      )}

      {upside != null && <p className="ds-explain mt-3">{interpret(upside, locale)}</p>}

      <MoreDetails summary={en ? "More — opinion score & 52-week range" : "조금 더 — 투자의견·52주 범위"}>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {snap && (
            <div className="ds-tile" style={{ padding: 10 }}>
              <div className="ds-meta">{en ? "Opinion score (1–5)" : "투자의견 평점 (1~5)"}</div>
              <div className="num font-extrabold text-text">
                {snap.opinion_score.toFixed(2)} <span className="text-[13px] font-bold text-text-muted">{snap.opinion_label}</span>
              </div>
            </div>
          )}
          {high != null && (
            <div className="ds-tile" style={{ padding: 10 }}>
              <div className="ds-meta">{en ? "52w high" : "52주 최고"}</div>
              <div className="num font-extrabold text-text">₩{fmtKRW(high)}</div>
            </div>
          )}
        </div>
        <p className="pt-3" style={{ fontSize: 14 }}>
          {inRange52 != null &&
            (en
              ? `Within its 52-week range, the price sits at the ${inRange52}% point (0% = low, 100% = high). `
              : `52주 범위(최저 0% ~ 최고 100%)에서 지금은 ${inRange52}% 지점이에요. `)}
          {en
            ? "The average target is Naver Finance’s aggregated broker consensus, refreshed every weekday. Individual broker reports are not shown because they can’t be verified automatically."
            : "평균 목표가는 네이버 금융 종합 컨센서스(매 평일 자동 갱신)예요. 개별 증권사 리포트는 자동 검증이 안 돼 보여주지 않아요."}
        </p>
      </MoreDetails>
    </section>
  );
}
