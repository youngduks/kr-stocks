import type { FinalNote, LiveSummary, VoiceMode } from "../types";

const BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://kr-stocks.com"
).replace(/\/$/, "");

const API_KEY = process.env.EXPO_PUBLIC_VOICE_API_KEY ?? "";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const MESSAGES: Record<string, string> = {
  api_key_missing: "서버에 Claude API 키가 설정되지 않았습니다.",
  rate_limited: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  unauthorized: "앱 인증에 실패했습니다. API 키 설정을 확인해 주세요.",
  transcript_too_long: "녹취록이 너무 깁니다. 녹음을 나눠서 진행해 주세요.",
  timeout: "요약 서버 응답이 없습니다.",
  network: "네트워크에 연결할 수 없습니다.",
};

async function postJson<T>(
  path: string,
  body: unknown,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(API_KEY ? { "x-voice-key": API_KEY } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    const code = aborted ? "timeout" : "network";
    throw new ApiError(0, code, MESSAGES[code]);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let code = `http_${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) code = j.error;
    } catch {
      // 본문이 JSON이 아니면 상태 코드만 쓴다.
    }
    throw new ApiError(
      res.status,
      code,
      MESSAGES[code] ?? `요약 서버 오류 (${res.status})`,
    );
  }

  return (await res.json()) as T;
}

export function summarizeChunk(args: {
  mode: VoiceMode;
  previous: LiveSummary | null;
  newTranscript: string;
  elapsedSec: number;
}): Promise<{ summary: LiveSummary }> {
  return postJson("/api/voice/summarize", args, 45000);
}

export function finalizeNote(args: {
  mode: VoiceMode;
  previous: LiveSummary | null;
  transcript: string;
  durationSec: number;
}): Promise<{ note: FinalNote }> {
  return postJson("/api/voice/finalize", args, 180000);
}

export const apiBaseUrl = BASE_URL;
