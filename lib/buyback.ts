// 자사주 매입(바이백) 진행 현황 데이터 로더 — 현재 SK하이닉스 1종만 진행 중.
// 데이터 source: KRX 공시채널 KIND (scripts/update-buyback.mjs가 매일 자동 갱신).
//
// ⚠️ 빌드타임 import(../data/...json) 대신 GitHub raw를 런타임에 fetch — 이 데이터를
// 갱신하는 봇 커밋은 vercel.json ignoreCommand로 재빌드를 스킵하므로(비용 절감), 만약
// 빌드타임 import를 쓰면 그 다음 "진짜" 코드 배포가 있기 전까지 화면이 오래된 값에
// 영구히 멈춤(2026-09-04, trading_flow가 8/24에 멈춰있던 걸로 실측 확인한 기존 버그
// — 동일 실수 반복 방지). app/news 페이지가 쓰는 것과 같은 패턴.

const GITHUB_RAW = "https://raw.githubusercontent.com/youngduks/kr-stocks/main/data/buyback";

export type BuybackDaily = {
  date: string;
  applied_qty: number;
  executed_qty: number;
  execution_rate_pct: number;
};

export type BuybackData = {
  slug: string;
  ticker: string;
  name_ko: string;
  name_en: string;
  updated_at: string;
  source: string;
  source_url: string;
  note: string;
  program: {
    declared_date: string;
    planned_amount_krw: number;
    method: string;
    broker: string;
    purpose: string;
    period_start: string;
    period_end: string;
    planned_qty: number;
    daily_limit_qty: number;
  };
  progress: {
    cum_executed_qty: number;
    cum_amount_krw: number;
    avg_price_krw: number | null;
    progress_pct: number;
    schedule_elapsed_pct: number;
    ahead_pct: number;
    remaining_qty: number;
    remaining_biz_days: number;
    needed_daily_avg_qty: number;
    on_track: boolean;
    eta_date: string | null;
    recent5_avg_qty: number;
  };
  daily: BuybackDaily[];
};

// 바이백 추적 중인 슬러그 목록 — 진행 중인 프로그램이 늘면 여기 추가.
const BUYBACK_SLUGS = new Set(["hynix"]);

export async function getBuyback(slug: string): Promise<BuybackData | null> {
  if (!BUYBACK_SLUGS.has(slug)) return null;
  try {
    const res = await fetch(`${GITHUB_RAW}/${slug}.json`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as BuybackData;
  } catch {
    return null;
  }
}

export function hasBuyback(slug: string): boolean {
  return BUYBACK_SLUGS.has(slug);
}

/** 1억 단위 KRW 포맷 (조/억) */
export function formatKRW(won: number): string {
  const abs = Math.abs(won);
  const eok = abs / 100_000_000;
  if (eok >= 10000) return `${(eok / 10000).toFixed(1)}조원`;
  if (eok >= 1) return `${eok.toFixed(1)}억원`;
  return `${Math.round(abs / 10_000)}만원`;
}

export function formatShares(n: number): string {
  return `${n.toLocaleString("ko-KR")}주`;
}
