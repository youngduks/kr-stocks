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
  /** 리포트 파생값이라 매 스냅샷에 같은 수가 복사돼 있었음(미표시). */
  opinion_count?: number;
};

/**
 * 표시 정책 (2026-08-08 형님 지시로 정리):
 *   네이버 금융에서 매 평일 자동 검증되는 값만 노출한다. 개별 증권사 리포트에서
 *   파생되는 값(중앙값·최고/최저·의견수·의견분포·증권사별 테이블)은 원문이 PDF라
 *   자동 갱신이 불가능해 2026-05 시점에 얼어붙어 있었고, 평균 목표가만 갱신되자
 *   "평균 > 최고" 같은 산술적 모순이 3종목 전부에서 노출됐다.
 *   → 검증 못 하는 값은 타입에서 optional 로 내리고 화면에서 전부 제거.
 *     PDF 파싱이 붙어 신뢰할 수 있게 되면 그때 다시 살린다.
 */
export type ConsensusData = {
  slug: string;
  ticker: string;
  name_ko: string;
  name_en: string;
  updated_at: string;
  consensus: {
    /** 네이버 금융 종합 — 매 평일 자동 갱신. 유일하게 신뢰 가능한 목표가. */
    avg_target_krw: number;
    current_price_krw?: number | null;
    upside_pct?: number | null;
    // ↓ 리포트 파생(2026-05 고정). 현재 미표시. PDF 파싱 전까지 신뢰 불가.
    median_target_krw?: number;
    max_target_krw?: number;
    max_broker?: string;
    min_target_krw?: number;
    min_broker?: string;
    opinion_count?: number;
    broker_count?: number;
  };
  opinion_distribution?: Record<BrokerOpinion, number>;
  brokers?: BrokerReport[];
  history: ConsensusHistory[];
  // 네이버 금융 종합 페이지에서 자동 스크래핑한 최신 컨센서스 요약.
  // brokers 배열의 개별 리포트와 별개로 매일 갱신됨.
  naver_snapshot?: NaverConsensusSnapshot;
};

export type NaverConsensusSnapshot = {
  opinion_score: number; // 1.0(매도) ~ 5.0(강력매수)
  opinion_label: string; // "매수" / "중립" 등 네이버 표기
  avg_target_krw: number;
  high_52w_krw: number | null;
  low_52w_krw: number | null;
  source: string;
  fetched_at: string;
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
