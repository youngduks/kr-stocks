// "과거 사례" 통계 로더 — data/history-stats.json (scripts/history-stats.mjs 가 주 1회 생성).
//
// ⚠️ 빌드타임 import 금지 — lib/humanIndicators.ts·lib/buyback.ts 와 같은 이유로 GitHub raw 를
// 런타임에 fetch. 봇 데이터 커밋은 vercel.json ignoreCommand 로 재빌드를 건너뛰므로, 빌드타임
// import 를 쓰면 다음 코드 배포 전까지 화면이 옛 숫자에 멈춤(2026-09-04 trading_flow 사고).
//
// 프리뷰 배포(브랜치)에선 그 브랜치의 파일을 먼저 읽고, 없으면 main 으로 폴백.

const REPO_RAW = "https://raw.githubusercontent.com/youngduks/kr-stocks";
const FILE = "data/history-stats.json";

/** 표본이 이보다 적으면 화면에서 숨김 */
export const HISTORY_MIN_N = 15;

export type HistoryDot = { us: string; kr: string; usRet: number; krRet: number };

export type HistoryBucketStats = {
  label: string;
  n: number;
  hits: number;
  downs: number;
  flats: number;
  hitRatePct: number | null;
  meanPct: number | null;
  medianPct: number | null;
  open: { n: number; ups: number; meanPct: number | null; medianPct: number | null };
  periodStart: string | null;
  periodEnd: string | null;
  recent?: HistoryDot[];
};

export type HistoryBucketId = "le_-2" | "-2_-1" | "-1_1" | "1_2" | "ge_2";

export type HistoryStockStats = {
  symbol: string;
  name: string;
  totalEvents: number;
  baseline: HistoryBucketStats;
  buckets: Record<HistoryBucketId, HistoryBucketStats>;
};

export type HistoryStats = {
  version: number;
  computedAt: string;
  us: { symbol: string; label: string; firstDate: string; lastDate: string };
  stocks: Record<string, HistoryStockStats>;
};

function rawUrls(): string[] {
  const ref = process.env.VERCEL_GIT_COMMIT_REF;
  const urls: string[] = [];
  if (process.env.VERCEL_ENV === "preview" && ref && ref !== "main") {
    urls.push(`${REPO_RAW}/refs/heads/${ref}/${FILE}`);
  }
  urls.push(`${REPO_RAW}/main/${FILE}`);
  return urls;
}

export async function getHistoryStats(): Promise<HistoryStats | null> {
  for (const url of rawUrls()) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const data = (await res.json()) as HistoryStats;
      if (data?.stocks) return data;
    } catch {
      /* 다음 후보 */
    }
  }
  return null;
}

/** 미국 반도체 등락률(%) → 통계 구간 id (scripts/history-stats.mjs BUCKETS 와 동일 경계) */
export function bucketForUsPct(pct: number | null): HistoryBucketId | null {
  if (pct == null || !Number.isFinite(pct)) return null;
  if (pct <= -2) return "le_-2";
  if (pct <= -1) return "-2_-1";
  if (pct < 1) return "-1_1";
  if (pct < 2) return "1_2";
  return "ge_2";
}

/** "2021-11-11" → "2021.11" */
export function ym(d: string | null): string {
  return d ? d.slice(0, 7).replace("-", ".") : "";
}
