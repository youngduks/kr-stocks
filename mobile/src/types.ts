// 서버(lib/voiceSummary.ts)의 zod 스키마와 1:1로 대응하는 타입.
// 두 패키지가 서로 다른 루트에 있어 import 대신 복제한다. 한쪽을 고치면 다른 쪽도 고칠 것.

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

export type Note = {
  id: string;
  mode: VoiceMode;
  title: string;
  createdAt: number;
  durationSec: number;
  segments: Segment[];
  /** 녹음 중 마지막으로 갱신된 라이브 요약 */
  summary: LiveSummary | null;
  /** 종료 후 만든 최종 노트. 실패했으면 null */
  finalNote: FinalNote | null;
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
