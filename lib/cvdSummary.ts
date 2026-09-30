/**
 * CVD 요약 (Phase B /liquidation 상태 카드) — lib/cvd 의 1H 봉(최근 168개 = 7일)으로 계산. 실데이터만.
 *  - cvd7d   = Σ(매수 체결액 − 매도 체결액)  (USDT)
 *  - buyShare = Σ매수 / Σ(매수+매도)
 *  - price7d = 첫 봉 종가 → 마지막 봉 종가 변화율(%)
 */
import type { CvdSet } from "./cvd";

export type CvdSummary = {
  cvd7d: number;
  buyShare: number; // 0..1
  price7dPct: number | null;
  lastTime: number; // unix sec (마지막 봉 시작)
  bars: number;
};

/** 매수 비중이 50% ± 이 값 이내면 '팽팽' */
export const BALANCED_BAND = 0.005;

export function summarizeCvd(set: CvdSet): CvdSummary | null {
  const bars = set.bars1H.slice(-168);
  if (bars.length < 12) return null;
  let buy = 0;
  let sell = 0;
  for (const b of bars) {
    buy += b.buyQuote;
    sell += b.sellQuote;
  }
  const tot = buy + sell;
  if (!(tot > 0)) return null;
  const p0 = bars[0].price;
  const p1 = bars[bars.length - 1].price;
  return {
    cvd7d: buy - sell,
    buyShare: buy / tot,
    price7dPct: p0 > 0 ? ((p1 - p0) / p0) * 100 : null,
    lastTime: bars[bars.length - 1].time,
    bars: bars.length,
  };
}

export type CvdSide = "buy" | "sell" | "balanced";

export function cvdSide(s: CvdSummary): CvdSide {
  if (s.buyShare > 0.5 + BALANCED_BAND) return "buy";
  if (s.buyShare < 0.5 - BALANCED_BAND) return "sell";
  return "balanced";
}

/** $1.23M / $456K */
export function fmtUsdCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}
