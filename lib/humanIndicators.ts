// "인간지표" 페이지의 인물 지표 섹션 — 특정 인물(유튜버 등)의 시장 발언을 수동 큐레이션.
// data/human_indicators.json을 직접 편집해 갱신 (자동화 아님, 봇 커밋 아님 → 빌드타임 import 안전).

import raw from "../data/human_indicators.json";

export type IndicatorStance = "bullish" | "bearish" | "cautious" | "neutral";

export type IndicatorOpinion = {
  date: string;
  title: string;
  summary: string;
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
