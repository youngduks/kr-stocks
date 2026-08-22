// 정리 결과의 자료 구조. 규칙 기반(outline.ts)과 온디바이스 LLM(appleLlm.ts)이
// 같은 모양을 만들어 내므로, 화면은 어느 쪽이 만들었는지 몰라도 된다.

export const VOICE_MODES = ["meeting", "interview"] as const;
export type VoiceMode = (typeof VOICE_MODES)[number];

export const MODE_LABEL: Record<VoiceMode, string> = {
  meeting: "회의록",
  interview: "인터뷰",
};

export const MODE_HINT: Record<VoiceMode, string> = {
  meeting: "결정사항과 액션아이템 위주로 정리합니다",
  interview: "인용할 발언과 확인된 사실 위주로 정리합니다",
};

export type Topic = { title: string; points: string[] };
export type ActionItem = { text: string; owner: string };
export type Quote = { speaker: string; text: string };

export type LiveSummary = {
  headline: string;
  topics: Topic[];
  decisions: string[];
  actionItems: ActionItem[];
  quotes: Quote[];
  openQuestions: string[];
  keywords: string[];
};

export type FinalNote = LiveSummary & {
  title: string;
  markdown: string;
};

export const EMPTY_SUMMARY: LiveSummary = {
  headline: "",
  topics: [],
  decisions: [],
  actionItems: [],
  quotes: [],
  openQuestions: [],
  keywords: [],
};

/** STT가 확정(isFinal)한 자막 한 조각. */
export type Segment = {
  id: string;
  text: string;
  /** 녹음 시작 기준 경과 ms */
  atMs: number;
};

/** 최종 노트를 무엇이 만들었는지. 화면에서 품질 기대치를 알려주는 데 쓴다. */
export type SummaryEngine = "apple-llm" | "rules";

export type Note = {
  id: string;
  mode: VoiceMode;
  title: string;
  createdAt: number;
  durationSec: number;
  segments: Segment[];
  /** 녹음 중 규칙 기반으로 만든 정리본 */
  summary: LiveSummary | null;
  /** 종료 후 만든 최종 노트 */
  finalNote: FinalNote | null;
  engine: SummaryEngine;
};

export type NoteMeta = Pick<
  Note,
  "id" | "mode" | "title" | "createdAt" | "durationSec"
> & { headline: string };

export function isSummaryEmpty(s: LiveSummary | null): boolean {
  if (!s) return true;
  return (
    !s.headline.trim() &&
    s.topics.length === 0 &&
    s.decisions.length === 0 &&
    s.actionItems.length === 0 &&
    s.quotes.length === 0 &&
    s.openQuestions.length === 0
  );
}
