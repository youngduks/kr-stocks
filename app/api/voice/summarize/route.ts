import { NextRequest, NextResponse } from "next/server";
import {
  MissingApiKeyError,
  isVoiceMode,
  summarizeIncremental,
  LiveSummarySchema,
  type LiveSummary,
} from "@/lib/voiceSummary";
import { guardVoiceRequest } from "@/lib/voiceGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_CHUNK_CHARS = 12000;

export async function POST(req: NextRequest) {
  const blocked = await guardVoiceRequest(req);
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const {
    mode,
    previous,
    newTranscript,
    elapsedSec,
  } = (body ?? {}) as Record<string, unknown>;

  if (!isVoiceMode(mode)) {
    return NextResponse.json({ error: "invalid_mode" }, { status: 400 });
  }
  if (typeof newTranscript !== "string" || newTranscript.trim().length === 0) {
    return NextResponse.json({ error: "empty_transcript" }, { status: 400 });
  }

  // 이전 요약은 클라이언트가 보내오므로 스키마로 한 번 걸러낸다.
  let prevSummary: LiveSummary | null = null;
  if (previous != null) {
    const parsed = LiveSummarySchema.safeParse(previous);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_previous" }, { status: 400 });
    }
    prevSummary = parsed.data;
  }

  try {
    const summary = await summarizeIncremental({
      mode,
      previous: prevSummary,
      newTranscript: newTranscript.slice(0, MAX_CHUNK_CHARS),
      elapsedSec: typeof elapsedSec === "number" ? elapsedSec : 0,
    });
    return NextResponse.json({ summary });
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return NextResponse.json({ error: "api_key_missing" }, { status: 503 });
    }
    console.error("[voice/summarize]", err);
    return NextResponse.json({ error: "summarize_failed" }, { status: 502 });
  }
}
