// 음성 녹음 실시간 요약 엔진 — Claude Messages API + structured outputs.
//
// 모바일 앱(mobile/)이 기기 내장 STT로 만든 자막을 조각조각 보내면,
// 여기서 "이전 요약 + 새 자막" → "갱신된 요약"으로 롤링 업데이트한다.
// 전체 녹취록을 매번 다시 보내지 않으므로 녹음이 길어져도 비용/지연이 선형으로 늘지 않는다.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const VOICE_MODES = ["meeting", "interview"] as const;
export type VoiceMode = (typeof VOICE_MODES)[number];

export function isVoiceMode(v: unknown): v is VoiceMode {
  return typeof v === "string" && (VOICE_MODES as readonly string[]).includes(v);
}

/** 녹음 중 계속 갱신되는 요약. 모든 필드는 항상 존재하며, 내용이 없으면 빈 배열. */
export const LiveSummarySchema = z.object({
  headline: z.string().describe("지금까지의 내용 전체를 한 문장으로 요약"),
  topics: z
    .array(
      z.object({
        title: z.string().describe("주제 제목 (10자 내외)"),
        points: z.array(z.string()).describe("그 주제에서 오간 핵심 내용"),
      }),
    )
    .describe("이야기된 순서대로의 주제 블록"),
  decisions: z
    .array(z.string())
    .describe("회의: 확정된 결정사항 / 인터뷰: 확인된 사실"),
  actionItems: z
    .array(
      z.object({
        text: z.string().describe("해야 할 일"),
        owner: z.string().describe("담당자. 언급되지 않았으면 빈 문자열"),
      }),
    )
    .describe("회의: 액션아이템 / 인터뷰: 후속 확인이 필요한 항목"),
  quotes: z
    .array(
      z.object({
        speaker: z.string().describe("발화자. 특정되지 않으면 빈 문자열"),
        text: z.string().describe("그대로 옮길 만한 발언"),
      }),
    )
    .describe("인용할 만한 발언. 인터뷰 모드에서 특히 중요"),
  openQuestions: z
    .array(z.string())
    .describe("아직 답이 나오지 않은 쟁점 / 더 물어볼 것"),
  keywords: z.array(z.string()).describe("핵심 키워드 5개 이내"),
});

export type LiveSummary = z.infer<typeof LiveSummarySchema>;

/** 녹음 종료 후 한 번 만드는 최종 노트. 라이브 요약에 제목과 본문이 붙는다. */
export const FinalNoteSchema = LiveSummarySchema.extend({
  title: z.string().describe("노트 제목 (20자 내외)"),
  markdown: z
    .string()
    .describe("바로 공유할 수 있는 마크다운 본문. 제목(#)은 포함하지 않는다"),
});

export type FinalNote = z.infer<typeof FinalNoteSchema>;

export const EMPTY_SUMMARY: LiveSummary = {
  headline: "",
  topics: [],
  decisions: [],
  actionItems: [],
  quotes: [],
  openQuestions: [],
  keywords: [],
};

const MODEL = "claude-opus-5";

const SYSTEM_BASE = `당신은 한국어 음성 기록을 실시간으로 정리하는 노트 편집자입니다.

입력 자막은 기기 내장 음성인식(STT)이 만든 것이라 다음 특성이 있습니다.
- 화자 구분이 없고, 문장 경계가 어긋나 있습니다.
- 고유명사·숫자·전문용어가 자주 오인식됩니다.
- 말줄임, 반복, 잡담이 섞여 있습니다.

정리 규칙:
- 문맥상 명백한 오인식(예: "삼성전다" → "삼성전자")은 조용히 교정합니다. 확신이 없으면 들린 대로 둡니다.
- 자막에 없는 내용을 추측해서 채우지 않습니다. 근거 없는 요약은 오답보다 나쁩니다.
- 각 항목은 한국어 개조식으로 짧게 씁니다. "~함", "~하기로 함" 같은 명사형 종결을 씁니다.
- 잡담·인사·중복 발언은 버립니다.
- 아직 해당하는 내용이 없는 항목은 빈 배열로 둡니다. 억지로 채우지 않습니다.`;

const INCREMENTAL_RULES = `이번 호출은 **진행 중인 녹음의 중간 갱신**입니다.
- 이전 요약(PREVIOUS_SUMMARY)은 지금까지의 누적 결과입니다. 이것을 대체하지 말고 **갱신**하세요.
- 새 자막(NEW_TRANSCRIPT)에서 확인된 내용만 추가하거나, 기존 항목을 더 정확하게 고칩니다.
- 이전 항목을 이유 없이 삭제하지 마세요. 뒤 내용에서 명시적으로 뒤집힌 경우에만 수정/삭제합니다.
- 같은 주제가 이어지면 새 topic을 만들지 말고 기존 topic의 points에 덧붙입니다.
- 출력은 항상 "처음부터 지금까지"의 전체 누적 요약입니다. 새로 추가된 부분만 내보내지 마세요.`;

const FINAL_RULES = `이번 호출은 **녹음이 끝난 뒤의 최종 정리**입니다.
- 전체 녹취록을 처음부터 다시 읽고, 중간 요약의 누락·중복·오류를 바로잡습니다.
- 중복된 항목은 합치고, 순서를 읽기 좋게 재배열합니다.
- markdown 필드에는 그대로 공유할 수 있는 본문을 씁니다. 섹션 제목은 ## 로 시작하고, 모드에 맞는 구성을 씁니다.`;

const MODE_GUIDE: Record<VoiceMode, string> = {
  meeting: `이 녹음은 **회의**입니다.
- decisions: 회의에서 실제로 확정된 것만 담습니다. "논의했다"는 결정이 아닙니다.
- actionItems: 누가/무엇을/언제까지가 드러나면 함께 적습니다. 담당자가 안 나오면 owner는 빈 문자열입니다.
- openQuestions: 결론 없이 넘어간 안건, 다음 회의로 미룬 것.
- quotes는 꼭 필요한 경우(수치 근거, 강한 반대의견 등)만 담습니다.
- markdown 구성: ## 한 줄 요약 / ## 논의 내용 / ## 결정사항 / ## 액션아이템 / ## 미결 사항`,
  interview: `이 녹음은 **인터뷰·취재**입니다.
- quotes가 가장 중요합니다. 기사에 그대로 쓸 만한 발언을 발화자와 함께, 말맛을 살려 담습니다. 문장을 매끄럽게 다듬되 의미는 절대 바꾸지 않습니다.
- decisions: 인터뷰이가 확인해 준 사실·수치·일정.
- actionItems: 추가 취재나 팩트체크가 필요한 항목.
- openQuestions: 아직 묻지 못했거나 답이 두루뭉술했던 질문. 진행 중이라면 다음에 물을 질문을 제안해도 좋습니다.
- topics는 질문 주제 단위로 묶습니다.
- markdown 구성: ## 한 줄 요약 / ## 주요 발언 / ## 확인된 사실 / ## 추가 확인 필요 / ## 남은 질문`,
};

let _client: Anthropic | null = null;

export class MissingApiKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not configured");
    this.name = "MissingApiKeyError";
  }
}

function client(): Anthropic {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) throw new MissingApiKeyError();
  _client = new Anthropic();
  return _client;
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}분 ${s.toString().padStart(2, "0")}초`;
}

/**
 * 녹음 중 롤링 갱신. 지연이 곧 체감 품질이라 effort는 낮게 잡는다
 * (모델은 그대로 Opus 5 — 사고 깊이만 줄인다).
 */
export async function summarizeIncremental(args: {
  mode: VoiceMode;
  previous: LiveSummary | null;
  newTranscript: string;
  elapsedSec: number;
}): Promise<LiveSummary> {
  const { mode, previous, newTranscript, elapsedSec } = args;

  const prev = previous
    ? JSON.stringify(previous, null, 2)
    : "(아직 없음 — 이번이 첫 요약입니다)";

  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system: `${SYSTEM_BASE}\n\n${MODE_GUIDE[mode]}\n\n${INCREMENTAL_RULES}`,
    output_config: {
      effort: "low",
      format: zodOutputFormat(LiveSummarySchema),
    },
    messages: [
      {
        role: "user",
        content: `녹음 경과 시간: ${fmtDuration(elapsedSec)}

<PREVIOUS_SUMMARY>
${prev}
</PREVIOUS_SUMMARY>

<NEW_TRANSCRIPT>
${newTranscript}
</NEW_TRANSCRIPT>

위 새 자막을 반영해 누적 요약을 갱신해 주세요.`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("summary parse failed");
  }
  return response.parsed_output;
}

/** 녹음 종료 후 전체 녹취록으로 최종 노트를 만든다. 여기서는 정확도가 우선이라 effort를 높인다. */
export async function finalizeNote(args: {
  mode: VoiceMode;
  previous: LiveSummary | null;
  transcript: string;
  durationSec: number;
}): Promise<FinalNote> {
  const { mode, previous, transcript, durationSec } = args;

  const prev = previous
    ? JSON.stringify(previous, null, 2)
    : "(중간 요약 없음)";

  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: `${SYSTEM_BASE}\n\n${MODE_GUIDE[mode]}\n\n${FINAL_RULES}`,
    output_config: {
      effort: "high",
      format: zodOutputFormat(FinalNoteSchema),
    },
    messages: [
      {
        role: "user",
        content: `녹음 길이: ${fmtDuration(durationSec)}

<DRAFT_SUMMARY>
${prev}
</DRAFT_SUMMARY>

<FULL_TRANSCRIPT>
${transcript}
</FULL_TRANSCRIPT>

전체 녹취록을 기준으로 최종 노트를 완성해 주세요.`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("final note parse failed");
  }
  return response.parsed_output;
}
