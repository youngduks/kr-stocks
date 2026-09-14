// "인간지표" 페이지의 인물 지표 섹션 — 특정 인물(유튜버 등)의 시장 발언을 수동 큐레이션.
// data/human_indicators.json을 직접 편집해 갱신 (자동화 아님, 봇 커밋 아님 → 빌드타임 import 안전).

import raw from "../data/human_indicators.json";

export type IndicatorStance = "bullish" | "bearish" | "cautious" | "neutral";

export type IndicatorOpinion = {
  date: string;
  title: string;
  summary: string;
  /** 홈 얇은 카드용 한 줄 요약 (없으면 summary 사용). */
  summary_short?: string;
  stance: IndicatorStance;
  video_url: string;
};

export type IndicatorPerson = {
  id: string;
  name: string;
  channel: string;
  channel_url: string;
  tagline: string;
  note: string;
  opinions: IndicatorOpinion[];
};

const DATA = raw as unknown as { people: IndicatorPerson[] };

export function getHumanIndicators(): IndicatorPerson[] {
  return DATA.people;
}

export const STANCE_LABEL: Record<IndicatorStance, { ko: string; color: string }> = {
  bullish: { ko: "강세", color: "text-accent-green" },
  bearish: { ko: "약세", color: "text-accent-red" },
  cautious: { ko: "경계", color: "text-accent-amber" },
  neutral: { ko: "중립", color: "text-text-dim" },
};

/** 발언 성격을 매수/매도 의견 형태로 짧게 (홈 얇은 카드 1행용).
 * cautious는 "매도의견"이라고 단정하면 본인이 안 한 말이 되므로 "경계론"으로 표기. */
export const OPINION_LABEL: Record<IndicatorStance, string> = {
  bullish: "매수의견",
  bearish: "매도의견",
  cautious: "경계론",
  neutral: "중립",
};

/** 역발상 해석 — 이 지표의 핵심. 발언 방향의 반대를 검토하라는 뜻. */
export const CONTRARIAN_LABEL: Record<IndicatorStance, { ko: string; color: string }> = {
  bullish: { ko: "매도 방향 검토", color: "text-accent-red" },
  bearish: { ko: "매수 방향 검토", color: "text-accent-green" },
  cautious: { ko: "매수 방향 검토", color: "text-accent-green" },
  neutral: { ko: "관망", color: "text-text-dim" },
};
