// 외국인·기관 매매 동향 데이터 로더
// 데이터 source: KRX / 네이버 금융 (Phase 1: 정적 JSON, Phase 2: cron 자동 갱신)

import samsungData from "../data/trading_flow/samsung.json";
import hynixData from "../data/trading_flow/hynix.json";
import hyundaiData from "../data/trading_flow/hyundai.json";

export type DailyFlow = {
  date: string;
  foreign_won: number;       // 외국인 순매수 (KRW, +매수 / -매도)
  institutional_won: number; // 기관 순매수 (KRW, +매수 / -매도)
};

export type TradingFlowData = {
  slug: string;
  ticker: string;
  name_ko: string;
  name_en: string;
  updated_at: string;
  daily: DailyFlow[];
  cumulative_5d: {
    foreign_won: number;
    institutional_won: number;
    retail_won: number;  // 일반 개인 (= -외국인 - 기관, 시장 zero-sum 가정)
  };
};

const ALL_FLOW: Record<string, TradingFlowData> = {
  samsung: samsungData as unknown as TradingFlowData,
  hynix: hynixData as unknown as TradingFlowData,
  hyundai: hyundaiData as unknown as TradingFlowData,
};

export function getTradingFlow(slug: string): TradingFlowData | null {
  return ALL_FLOW[slug] ?? null;
}

export function hasTradingFlow(slug: string): boolean {
  return slug in ALL_FLOW;
}

/** KRW 큰 숫자 포맷: 1억 단위 (한국 retail 친화) */
export function formatBigKRW(won: number): { display: string; sign: string } {
  const abs = Math.abs(won);
  const eok = abs / 100_000_000; // 1억 = 100,000,000원
  const sign = won > 0 ? "+" : won < 0 ? "−" : "";
  if (eok >= 1000) {
    // 1조 이상
    return { display: `${(eok / 10000).toFixed(2)}조`, sign };
  }
  if (eok >= 1) {
    return { display: `${eok.toFixed(0)}억`, sign };
  }
  // 1억 미만 → 만원 단위
  const man = abs / 10_000;
  return { display: `${man.toFixed(0)}만`, sign };
}
