// 개장 전 신호 실제 기록 로더 — data/signal-log.json (scripts/signal-log.mjs + .github/workflows/signal-log.yml)
// historyStats.ts 와 같은 이유로 빌드타임 import 금지 → GitHub raw 를 런타임에 읽음.
// 재구성 데이터 없음: 개장 전에 실제로 기록된 것만 들어 있다.

const RAW = "https://raw.githubusercontent.com/youngduks/kr-stocks/main/data/signal-log.json";

export type SignalOutcome = "up" | "down" | "flat";
export type SignalStockResult = {
  prevDate: string;
  prevClose: number;
  close: number;
  pct: number;
  outcome: SignalOutcome;
  hit: boolean | null;
};
export type SignalRecord = {
  krDate: string;
  recordedAt: string;
  us: { session: string; soxlPct: number };
  impliedSemiPct: number;
  direction: "strong_up" | "up" | "flat" | "down" | "strong_down";
  call: "up" | "down" | "none";
  status: "pending" | "graded" | "no_session";
  results: Partial<Record<"samsung" | "hynix", SignalStockResult>>;
};
export type SignalLog = { version: number; startedAt: string | null; records: SignalRecord[] };

/** 채점된 방향 신호가 이보다 적으면 "기록 쌓는 중" */
export const SIGNAL_LOG_MIN_N = 20;

export async function getSignalLog(): Promise<SignalLog | null> {
  try {
    const res = await fetch(RAW, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    const d = (await res.json()) as SignalLog;
    return Array.isArray(d?.records) ? d : null;
  } catch {
    return null;
  }
}

export type SignalLogSummary = {
  startedAt: string | null;
  recordedDays: number;
  /** 종목별 채점 (방향 신호가 있었던 날만) */
  stocks: { slug: "samsung" | "hynix"; name: string; graded: number; hits: number }[];
  recent: SignalRecord[];
};

export function summarizeSignalLog(log: SignalLog | null, recentN = 7): SignalLogSummary | null {
  if (!log) return null;
  const recs = log.records;
  const stocks = (
    [
      ["samsung", "삼성전자"],
      ["hynix", "SK하이닉스"],
    ] as const
  ).map(([slug, name]) => {
    const graded = recs.filter((r) => r.status === "graded" && r.results[slug]?.hit != null);
    return { slug, name, graded: graded.length, hits: graded.filter((r) => r.results[slug]!.hit === true).length };
  });
  return { startedAt: log.startedAt, recordedDays: recs.length, stocks, recent: recs.slice(-recentN).reverse() };
}
