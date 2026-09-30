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

/** outcomeDetail("… — 삼성전자 +1.85%, SK하이닉스 +1.65%, 현대차 −0.99%")에서 3종목 평균 등락(%) — 판정 기준과 동일(scripts/update-poll.mjs) */
function avgPctFromDetail(detail: string): number | null {
  const vals = [...detail.matchAll(/(?:삼성전자|SK하이닉스|현대차) ([+−-]?\d+(?:\.\d+)?)%/g)].map((m) =>
    parseFloat(m[1].replace("−", "-")),
  );
  if (vals.length === 0 || vals.some((v) => !Number.isFinite(v))) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export type CrowdPickGroup = {
  id: "crowd-up" | "crowd-down" | "all";
  name: string;
  n: number;
  hits: number; // 실제 결과가 '상승'이었던 날
  meanPct: number | null; // 3종목 평균 등락의 평균
  periodStart: string | null;
  periodEnd: string | null;
  /** 오래된 → 최신, 3종목 평균 등락(%) — 판정 보합(±0.1% 이내)은 0 으로 */
  recent: number[];
};

/** 군중이 고른 쪽별로 다음 날 실제 결과 — history.json 실데이터만 */
export function getCrowdPickGroups(recentN = 30): CrowdPickGroup[] {
  const { polls } = getPollHistory();
  const asc = [...polls].reverse(); // 오래된 → 최신
  const make = (id: CrowdPickGroup["id"], name: string, list: EnrichedPollHistory[]): CrowdPickGroup => {
    const pcts = list.map((p) => avgPctFromDetail(p.outcomeDetail));
    const valid = pcts.filter((v): v is number => v != null);
    return {
      id,
      name,
      n: list.length,
      hits: list.filter((p) => p.outcome === "up").length,
      meanPct: valid.length === list.length && valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null,
      periodStart: list[0]?.date ?? null,
      periodEnd: list[list.length - 1]?.date ?? null,
      recent: list.slice(-recentN).map((p) => (p.outcome === "up" ? 1 : p.outcome === "down" ? -1 : 0)),
    };
  };
  return [
    make("crowd-up", "‘오른다’가 더 많았던 날", asc.filter((p) => p.crowdPick === "up")),
    make("crowd-down", "‘내린다’가 더 많았던 날", asc.filter((p) => p.crowdPick === "down")),
    make("all", "전체 (비교용)", asc),
  ];
}
