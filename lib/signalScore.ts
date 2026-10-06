// 반도체 야간 신호 채점표 — data/history-stats.json(실데이터)에서 "미국 반도체가 1% 넘게 움직인 날,
// 다음 한국 거래일 종가가 같은 방향이었나"를 센다. 새 수집·Redis 없음 (getHistoryStats 결과 재사용).
//
// ⚠ history-stats 구간 경계(±1%, ±2%)는 상태 카드 신호 임계값(SOXL÷3 ±0.4 / ±1.5)과 다르다.
//   그래서 화면 문구는 "1% 넘게 움직인 날"로 쓴다 — 카드 신호 자체의 실시간 적중 기록이 아님.
import type { HistoryBucketId, HistoryDot, HistoryStats } from "./historyStats";

const UP_BUCKETS: HistoryBucketId[] = ["1_2", "ge_2"];
const DOWN_BUCKETS: HistoryBucketId[] = ["le_-2", "-2_-1"];

/** 최근 몇 번까지 점으로 보여줄지 */
export const SCORE_RECENT_N = 10;

export type SignalScoreRow = {
  name: string;
  n: number;
  hits: number;
  hitRatePct: number;
  /** 오래된 → 최신, true = 방향 맞음 */
  recent: boolean[];
  periodStart: string | null;
  periodEnd: string | null;
};

const sameDirection = (d: HistoryDot) => (d.usRet > 0 ? d.krRet > 0 : d.krRet < 0);

export function getSignalScore(stats: HistoryStats | null): SignalScoreRow[] {
  if (!stats) return [];
  return ["samsung", "hynix"]
    .map((slug) => stats.stocks[slug])
    .filter(Boolean)
    .map((s) => {
      const up = UP_BUCKETS.map((id) => s.buckets[id]).filter(Boolean);
      const down = DOWN_BUCKETS.map((id) => s.buckets[id]).filter(Boolean);
      const n = [...up, ...down].reduce((a, b) => a + b.n, 0);
      const hits = up.reduce((a, b) => a + b.hits, 0) + down.reduce((a, b) => a + b.downs, 0);
      // 각 구간의 최근 30번을 합쳐 날짜순 → 전체 기준 최근 N번 (최근 N번은 반드시 각 구간 최근 30번 안에 있음)
      const recent = [...up, ...down]
        .flatMap((b) => b.recent ?? [])
        .sort((a, b) => a.kr.localeCompare(b.kr))
        .slice(-SCORE_RECENT_N)
        .map(sameDirection);
      const starts = [...up, ...down].map((b) => b.periodStart).filter((x): x is string => !!x).sort();
      const ends = [...up, ...down].map((b) => b.periodEnd).filter((x): x is string => !!x).sort();
      return {
        name: s.name,
        n,
        hits,
        hitRatePct: n > 0 ? Math.round((hits / n) * 100) : 0,
        recent,
        periodStart: starts[0] ?? null,
        periodEnd: ends[ends.length - 1] ?? null,
      };
    })
    .filter((r) => r.n > 0);
}
