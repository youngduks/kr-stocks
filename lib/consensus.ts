// 증권사 컨센서스 (목표주가 + 투자의견) 데이터 로더
// 데이터 source: 네이버 금융 리서치 (Phase 1: 정적 JSON, Phase 2: GitHub Actions cron 갱신 예정)

import samsungData from "../data/consensus/samsung.json";
import hynixData from "../data/consensus/hynix.json";
import hyundaiData from "../data/consensus/hyundai.json";

export type BrokerOpinion = "강력매수" | "매수" | "비중확대" | "중립" | "비중축소" | "매도";

export type BrokerReport = {
  broker: string;
  broker_en?: string;
  opinion: BrokerOpinion;
  target_krw: number;
  report_date: string; // YYYY-MM-DD
};

export type ConsensusHistory = {
  date: string;
  avg_target_krw: number;
  opinion_count: number;
};

export type ConsensusData = {
  slug: string;
  ticker: string;
  name_ko: string;
  name_en: string;
  updated_at: string;
  consensus: {
    avg_target_krw: number;
    median_target_krw: number;
    max_target_krw: number;
    max_broker: string;
    min_target_krw: number;
    min_broker: string;
    opinion_count: number;
    broker_count: number;
    current_price_krw?: number | null;
    upside_pct?: number | null;
  };
  opinion_distribution: Record<BrokerOpinion, number>;
  brokers: BrokerReport[];
  history: ConsensusHistory[];
};

const ALL_CONSENSUS: Record<string, ConsensusData> = {
  samsung: samsungData as unknown as ConsensusData,
  hynix: hynixData as unknown as ConsensusData,
  hyundai: hyundaiData as unknown as ConsensusData,
};

export function getConsensus(slug: string): ConsensusData | null {
  return ALL_CONSENSUS[slug] ?? null;
}

export function getAllConsensus(): ConsensusData[] {
  return Object.values(ALL_CONSENSUS);
}

export function hasConsensus(slug: string): boolean {
  return slug in ALL_CONSENSUS;
}

// 현재가 + 상승여력 enrich (페이지에서 호출)
export function enrichWithCurrentPrice(
  c: ConsensusData,
  currentPriceKrw: number | null | undefined
): ConsensusData {
  const cur = currentPriceKrw ?? null;
  const upside =
    cur != null ? ((c.consensus.avg_target_krw - cur) / cur) * 100 : null;
  return {
    ...c,
    consensus: {
      ...c.consensus,
      current_price_krw: cur,
      upside_pct: upside,
    },
  };
}
