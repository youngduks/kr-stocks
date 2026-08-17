import { NextRequest, NextResponse } from "next/server";
import {
  MissingApiKeyError,
  isVoiceMode,
  finalizeNote,
  LiveSummarySchema,
  type LiveSummary,
} from "@/lib/voiceSummary";
import { guardVoiceRequest } from "@/lib/voiceGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Opus 5의 1M 컨텍스트에 비하면 여유롭지만, 한 번에 밀어넣는 양은 제한해 둔다.
// (한국어 기준 약 3~4시간 분량 녹취록)
const MAX_TRANSCRIPT_CHARS = 200000;

export async function POST(req: NextRequest) {
  const blocked = await guardVoiceRequest(req);
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { mode, previous, transcript, durationSec } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (!isVoiceMode(mode)) {
    return NextResponse.json({ error: "invalid_mode" }, { status: 400 });
  }
  if (typeof transcript !== "string" || transcript.trim().length === 0) {
    return NextResponse.json({ error: "empty_transcript" }, { status: 400 });
  }
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    return NextResponse.json(
      { error: "transcript_too_long", maxChars: MAX_TRANSCRIPT_CHARS },
      { status: 413 },
    );
  }

  let prevSummary: LiveSummary | null = null;
  if (previous != null) {
    const parsed = LiveSummarySchema.safeParse(previous);
    if (parsed.success) prevSummary = parsed.data;
    // 최종 정리는 녹취록 원문이 있으면 되므로, 초안이 깨졌으면 그냥 버린다.
  }

  try {
    const note = await finalizeNote({
      mode,
      previous: prevSummary,
      transcript,
      durationSec: typeof durationSec === "number" ? durationSec : 0,
    });
    return NextResponse.json({ note });
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return NextResponse.json({ error: "api_key_missing" }, { status: 503 });
    }
    console.error("[voice/finalize]", err);
    return NextResponse.json({ error: "finalize_failed" }, { status: 502 });
  }
}
