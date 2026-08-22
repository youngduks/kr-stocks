// 온디바이스 LLM 재서술층 — Apple Foundation Models (iOS 26+).
//
// 규칙 기반 정리(outline.ts)가 뽑아낸 문장을 사람이 쓴 것처럼 다시 쓰는 역할만 한다.
// 비용 0, 네트워크 0, 자막이 기기 밖으로 나가지 않는다.
//
// 두 가지 제약이 설계를 결정한다.
//  1. 컨텍스트가 4,096토큰으로 고정이다 (입력+출력 합산). 녹취록을 통째로 못 넣는다.
//     → 규칙 기반으로 압축한 뒤 블록으로 잘라 map-reduce 한다.
//  2. 구조화 출력 스키마에 배열 타입이 없다.
//     → 목록은 "줄바꿈으로 구분된 문자열"로 받아서 여기서 쪼갠다.

import { Platform } from "react-native";
import type {
  ActionItem,
  FinalNote,
  LiveSummary,
  Quote,
  Topic,
  VoiceMode,
} from "../types";
import { MODE_LABEL } from "../types";

export type LocalEngineStatus =
  | "available"
  | "appleIntelligenceNotEnabled"
  | "modelNotReady"
  | "unavailable";

/** map 단계에서 한 번에 넣을 자막 분량. 4,096토큰 안에 넉넉히 들어가도록 잡았다. */
export const MAX_CHARS_PER_BLOCK = 900;
/** 블록 하나당 호출 한 번이라, 블록 수가 곧 사용자가 기다리는 시간이다. */
export const MAX_BLOCKS = 12;
/** reduce 단계 입력 상한. 넘으면 앞쪽부터 자른다. */
const MAX_REDUCE_CHARS = 1400;

// react-native-apple-llm은 네이티브 모듈이 없으면 **import 시점에 throw** 한다.
// 안드로이드에서 앱이 통째로 죽으므로 반드시 지연 require + try/catch로 감싼다.
type AppleLLMModule = typeof import("react-native-apple-llm");
let cached: AppleLLMModule | null | undefined;

function loadModule(): AppleLLMModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS !== "ios") {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("react-native-apple-llm") as AppleLLMModule;
  } catch {
    cached = null;
  }
  return cached;
}

export async function getLocalEngineStatus(): Promise<LocalEngineStatus> {
  const mod = loadModule();
  if (!mod) return "unavailable";
  try {
    return await mod.isFoundationModelsEnabled();
  } catch {
    return "unavailable";
  }
}

export const ENGINE_STATUS_MESSAGE: Record<LocalEngineStatus, string> = {
  available: "기기 내 AI로 정리합니다",
  appleIntelligenceNotEnabled:
    "설정에서 Apple Intelligence를 켜면 정리 품질이 올라갑니다",
  modelNotReady: "기기 내 AI 모델을 준비 중입니다. 잠시 후 다시 시도해 주세요",
  unavailable: "이 기기는 기기 내 AI를 지원하지 않아 규칙 기반으로 정리합니다",
};

const BASE_INSTRUCTIONS = `너는 한국어 회의·인터뷰 녹취를 정리하는 편집자다.
입력은 음성인식 자막이라 오탈자와 어긋난 문장 경계가 섞여 있다.
문맥상 명백한 오인식만 조용히 고치고, 자막에 없는 내용은 절대 지어내지 마라.
답은 한국어 개조식으로 짧게 쓴다.`;

const MODE_INSTRUCTIONS: Record<VoiceMode, string> = {
  meeting: "이 녹음은 회의다. 결정된 것과 해야 할 일을 놓치지 마라.",
  interview:
    "이 녹음은 인터뷰다. 인터뷰이의 발언을 의미 손상 없이 살리는 것이 가장 중요하다.",
};

function splitLines(value: unknown, limit: number): string[] {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((l) => l.replace(/^\s*[-*·•]\s*/, "").trim())
    .filter((l) => l.length > 0 && l !== "없음" && l !== "-")
    .slice(0, limit);
}

/** "내용 | 부가정보" 형태를 쪼갠다. 구분자가 없으면 부가정보는 빈 문자열. */
function splitPair(line: string): [string, string] {
  const i = line.indexOf("|");
  if (i < 0) return [line.trim(), ""];
  return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
}

type Session = InstanceType<AppleLLMModule["AppleLLMSession"]>;

/** map — 자막 블록 하나를 주제 제목 + 개조식 항목으로 바꾼다. */
async function refineBlock(
  session: Session,
  block: string,
  mode: VoiceMode,
  index: number,
): Promise<Topic | null> {
  await session.configure({
    instructions: `${BASE_INSTRUCTIONS}\n${MODE_INSTRUCTIONS[mode]}`,
  });

  const raw = await session.generateText({
    prompt: `아래는 녹음의 ${index + 1}번째 구간 자막이다. 이 구간에서 오간 내용을 정리해라.

출력 형식(다른 말은 쓰지 마라):
제목: <이 구간을 요약하는 10자 내외 제목>
- <핵심 내용 한 줄>
- <핵심 내용 한 줄>

항목은 최대 4개. 자막에 있는 내용만 쓴다.

<자막>
${block}
</자막>`,
  });

  const lines = raw.split("\n").map((l) => l.trim());
  const titleLine = lines.find((l) => l.startsWith("제목:"));
  const points = lines
    .filter((l) => /^[-*·•]/.test(l))
    .map((l) => l.replace(/^[-*·•]\s*/, "").trim())
    .filter((l) => l.length > 0)
    .slice(0, 4);

  if (points.length === 0) return null;
  return {
    title: titleLine?.replace(/^제목:\s*/, "").trim() || `구간 ${index + 1}`,
    points,
  };
}

/** reduce — map 결과와 규칙 기반 후보를 합쳐 최종 노트의 뼈대를 만든다. */
async function reduceNote(
  session: Session,
  args: {
    mode: VoiceMode;
    topics: Topic[];
    outline: LiveSummary;
    durationSec: number;
  },
): Promise<{
  title: string;
  headline: string;
  decisions: string[];
  actionItems: ActionItem[];
  quotes: Quote[];
  openQuestions: string[];
  keywords: string[];
}> {
  const { mode, topics, outline, durationSec } = args;

  const topicText = topics
    .map((t) => `## ${t.title}\n${t.points.map((p) => `- ${p}`).join("\n")}`)
    .join("\n");

  // 규칙 기반이 뽑은 후보는 "원문 그대로"라 거칠다. 모델에게 걸러내고 다시 쓰게 한다.
  const candidates = [
    outline.decisions.length
      ? `[결정 후보]\n${outline.decisions.map((d) => `- ${d}`).join("\n")}`
      : "",
    outline.actionItems.length
      ? `[할 일 후보]\n${outline.actionItems.map((a) => `- ${a.text}`).join("\n")}`
      : "",
    outline.openQuestions.length
      ? `[질문 후보]\n${outline.openQuestions.map((q) => `- ${q}`).join("\n")}`
      : "",
    outline.quotes.length
      ? `[인용 후보]\n${outline.quotes.map((q) => `- ${q.text}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const body = `${topicText}\n\n${candidates}`.slice(-MAX_REDUCE_CHARS);

  await session.configure({
    instructions: `${BASE_INSTRUCTIONS}\n${MODE_INSTRUCTIONS[mode]}
후보 목록은 자막에서 기계적으로 뽑은 것이라 잘못 분류된 항목이 섞여 있다.
해당하지 않는 항목은 버리고, 남긴 항목은 자연스러운 개조식으로 다시 써라.`,
  });

  const result = (await session.generateStructuredOutput({
    structure: {
      title: { type: "string", description: "노트 제목. 20자 내외" },
      headline: { type: "string", description: "전체 내용을 한 문장으로" },
      decisions: {
        type: "string",
        description:
          mode === "meeting"
            ? "확정된 결정사항. 한 줄에 하나씩. 없으면 빈 문자열"
            : "인터뷰이가 확인해 준 사실. 한 줄에 하나씩. 없으면 빈 문자열",
      },
      actions: {
        type: "string",
        description:
          "해야 할 일. '내용 | 담당자' 형식으로 한 줄에 하나씩. 담당자가 안 나오면 담당자는 빈칸. 없으면 빈 문자열",
      },
      quotes: {
        type: "string",
        description:
          "그대로 인용할 만한 발언. '발언 | 발화자' 형식으로 한 줄에 하나씩. 없으면 빈 문자열",
      },
      questions: {
        type: "string",
        description: "아직 답이 나오지 않은 질문. 한 줄에 하나씩. 없으면 빈 문자열",
      },
      keywords: { type: "string", description: "핵심 키워드 5개 이내. 쉼표로 구분" },
    },
    prompt: `${MODE_LABEL[mode]} 녹음(${Math.round(durationSec / 60)}분)의 정리 결과다.

${body}`,
  })) as Record<string, unknown>;

  return {
    title: typeof result.title === "string" ? result.title.trim() : "",
    headline: typeof result.headline === "string" ? result.headline.trim() : "",
    decisions: splitLines(result.decisions, 10),
    actionItems: splitLines(result.actions, 12).map((line) => {
      const [text, owner] = splitPair(line);
      return { text, owner };
    }),
    quotes: splitLines(result.quotes, 8).map((line) => {
      const [text, speaker] = splitPair(line);
      return { text, speaker };
    }),
    openQuestions: splitLines(result.questions, 10),
    keywords:
      typeof result.keywords === "string"
        ? result.keywords
            .split(/[,、·]/)
            .map((k) => k.trim())
            .filter(Boolean)
            .slice(0, 5)
        : [],
  };
}

export function buildMarkdown(note: Omit<FinalNote, "markdown">, mode: VoiceMode): string {
  const out: string[] = [];
  if (note.headline) out.push(`## 한 줄 요약\n${note.headline}\n`);

  if (note.topics.length) {
    out.push(mode === "meeting" ? "## 논의 내용" : "## 주제별 정리");
    for (const t of note.topics) {
      out.push(`### ${t.title}`);
      out.push(...t.points.map((p) => `- ${p}`), "");
    }
  }
  if (note.quotes.length) {
    out.push("## 주요 발언");
    for (const q of note.quotes) {
      out.push(`> ${q.text}${q.speaker ? `\n> — ${q.speaker}` : ""}`, "");
    }
  }
  if (note.decisions.length) {
    out.push(mode === "meeting" ? "## 결정사항" : "## 확인된 사실");
    out.push(...note.decisions.map((d) => `- ${d}`), "");
  }
  if (note.actionItems.length) {
    out.push(mode === "meeting" ? "## 액션아이템" : "## 추가 확인 필요");
    out.push(
      ...note.actionItems.map(
        (a) => `- ${a.text}${a.owner ? ` (${a.owner})` : ""}`,
      ),
      "",
    );
  }
  if (note.openQuestions.length) {
    out.push("## 남은 질문");
    out.push(...note.openQuestions.map((q) => `- ${q}`), "");
  }
  return out.join("\n").trim();
}

export type RefineProgress = { done: number; total: number; label: string };

/**
 * 규칙 기반 정리 결과와 자막 블록을 받아 최종 노트를 만든다.
 *
 * 블록마다 한 번(map), 마지막에 한 번(reduce) 호출한다. 1시간 녹음이면 대략 6~8회.
 * 한 호출이라도 실패하면 그 부분만 규칙 기반 결과로 남기고 계속 진행한다.
 */
export async function refineNote(args: {
  mode: VoiceMode;
  outline: LiveSummary;
  blocks: string[];
  durationSec: number;
  onProgress?: (p: RefineProgress) => void;
}): Promise<FinalNote> {
  const { mode, outline, blocks, durationSec, onProgress } = args;

  const mod = loadModule();
  if (!mod) throw new Error("기기 내 AI를 사용할 수 없습니다.");

  const session = new mod.AppleLLMSession();
  const total = blocks.length + 1;

  try {
    const topics: Topic[] = [];
    for (let i = 0; i < blocks.length; i++) {
      onProgress?.({ done: i, total, label: `내용 정리 ${i + 1}/${blocks.length}` });
      try {
        const topic = await refineBlock(session, blocks[i], mode, i);
        if (topic) topics.push(topic);
      } catch {
        // 이 구간만 규칙 기반 결과로 대체한다.
        const fallback = outline.topics[i];
        if (fallback) topics.push(fallback);
      }
    }

    onProgress?.({ done: blocks.length, total, label: "최종 정리" });
    const reduced = await reduceNote(session, {
      mode,
      topics,
      outline,
      durationSec,
    });

    const base: Omit<FinalNote, "markdown"> = {
      title: reduced.title || outline.headline.slice(0, 20) || "제목 없음",
      headline: reduced.headline || outline.headline,
      topics: topics.length > 0 ? topics : outline.topics,
      decisions: reduced.decisions.length ? reduced.decisions : outline.decisions,
      actionItems: reduced.actionItems.length
        ? reduced.actionItems
        : outline.actionItems,
      quotes: reduced.quotes.length ? reduced.quotes : outline.quotes,
      openQuestions: reduced.openQuestions.length
        ? reduced.openQuestions
        : outline.openQuestions,
      keywords: reduced.keywords.length ? reduced.keywords : outline.keywords,
    };

    onProgress?.({ done: total, total, label: "완료" });
    return { ...base, markdown: buildMarkdown(base, mode) };
  } finally {
    session.dispose();
  }
}

/** LLM을 못 쓸 때, 규칙 기반 결과를 그대로 최종 노트로 삼는다. */
export function outlineAsFinalNote(
  outline: LiveSummary,
  mode: VoiceMode,
): FinalNote {
  const base: Omit<FinalNote, "markdown"> = {
    ...outline,
    title: outline.headline.slice(0, 20) || "제목 없음",
  };
  return { ...base, markdown: buildMarkdown(base, mode) };
}
