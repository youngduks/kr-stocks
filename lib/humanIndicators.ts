// "인간지표" 페이지의 인물 지표 섹션 — 특정 인물(유튜버 등)의 시장 발언.
// data/human_indicators.json을 scripts/human-indicators/update.mjs가 매일 자동 갱신.
//
// ⚠️ 빌드타임 import(../data/...json) 대신 GitHub raw를 런타임에 fetch — 이 데이터를
// 갱신하는 봇 커밋은 vercel.json ignoreCommand로 재빌드를 스킵하므로(비용 절감), 만약
// 빌드타임 import를 쓰면 그 다음 "진짜" 코드 배포가 있기 전까지 화면이 오래된 값에
// 영구히 멈춤(2026-09-04, trading_flow가 8/24에 멈춰있던 걸로 실측 확인한 기존 버그
// — 동일 실수 반복 방지). lib/buyback.ts와 같은 패턴.

const GITHUB_RAW =
  "https://raw.githubusercontent.com/youngduks/kr-stocks/main/data/human_indicators.json";

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
  /** YouTube 채널 ID — scripts/human-indicators/update.mjs가 RSS 조회에 사용. */
  channel_id?: string;
  /** 마지막으로 확인한 영상 ID — 중복 처리 방지용, 프론트엔드에서는 안 씀. */
  last_checked_video_id?: string;
  tagline: string;
  note: string;
  opinions: IndicatorOpinion[];
};

export async function getHumanIndicators(): Promise<IndicatorPerson[]> {
  try {
    const res = await fetch(GITHUB_RAW, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { people: IndicatorPerson[] };
    return data.people ?? [];
  } catch {
    return [];
  }
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
