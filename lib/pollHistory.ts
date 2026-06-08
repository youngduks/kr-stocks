// 인간지표 투표 히스토리 로더 — 마감된 투표의 최종 집계 + 실제 시장 결과 + 적중 여부.
// Redis 는 30일 TTL 이라 영구 보존이 안 됨 → 마감 시점 스냅샷을 committed JSON 으로 보관.
// 새 투표가 마감·확정되면 data/polls/history.json 에 항목 추가.

import historyJson from "../data/polls/history.json";

export type PollOutcome = "up" | "down" | "flat";
export type CrowdPick = "up" | "down" | "tie";

export type RawPollHistory = {
  pollId: string;
  date: string; // YYYY-MM-DD
  dateLabel: string;
  question: string;
  yesLabel: string; // 상승 측 라벨
  noLabel: string; // 하락 측 라벨
  yes: number; // 상승 표
  no: number; // 하락 표
  outcome: PollOutcome; // 실제 시장 결과
  outcomeDetail: string;
  resolvedAt: string;
};

export type EnrichedPollHistory = RawPollHistory & {
  total: number;
  yesPct: number;
  noPct: number;
  crowdPick: CrowdPick; // 군중 다수 예측
  correct: boolean | null; // 동률/보합이면 null
};

export type PollHistorySummary = {
  polls: EnrichedPollHistory[];
  resolvedCount: number; // 적중 판정 가능한 투표 수
  correctCount: number;
  hitRate: number | null; // %
};

function enrich(p: RawPollHistory): EnrichedPollHistory {
  const total = p.yes + p.no;
  const yesPct = total > 0 ? Math.round((p.yes / total) * 100) : 0;
  const noPct = total > 0 ? 100 - yesPct : 0;
  const crowdPick: CrowdPick =
    p.yes > p.no ? "up" : p.no > p.yes ? "down" : "tie";
  let correct: boolean | null = null;
  if (crowdPick !== "tie" && p.outcome !== "flat") {
    correct = crowdPick === p.outcome;
  }
  return { ...p, total, yesPct, noPct, crowdPick, correct };
}

export function getPollHistory(): PollHistorySummary {
  const raw = ((historyJson as { polls?: RawPollHistory[] }).polls ?? []) as RawPollHistory[];
  const polls = raw
    .map(enrich)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); // 최신순
  const judged = polls.filter((p) => p.correct !== null);
  const correctCount = judged.filter((p) => p.correct === true).length;
  const hitRate =
    judged.length > 0 ? Math.round((correctCount / judged.length) * 100) : null;
  return { polls, resolvedCount: judged.length, correctCount, hitRate };
}
