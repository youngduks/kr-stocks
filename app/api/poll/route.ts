import { NextRequest, NextResponse } from "next/server";
import { getPoll, vote, type PollChoice } from "@/lib/poll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Poll registry. 5/21 09:00 KST = 5/21 00:00 UTC
const POLLS: Record<string, { closedAt: string }> = {
  "samsung-strike-2026-05-21": { closedAt: "2026-05-21T00:00:00.000Z" },
  "market-updown-2026-06-08": { closedAt: "2026-06-07T23:00:00.000Z" },
  "market-updown-2026-06-09": { closedAt: "2026-06-08T23:00:00.000Z" },
  "market-updown-2026-06-10": { closedAt: "2026-06-09T23:00:00.000Z" },
  "market-updown-2026-06-12": { closedAt: "2026-06-12T00:00:00.000Z" },
  // 인간지표 — 6/15(월) 한국 증시. 마감 = 월요일 정규장 오픈 09:00 KST = 2026-06-15 00:00 UTC (주말 내내 투표 가능)
  "market-updown-2026-06-15": { closedAt: "2026-06-15T00:00:00.000Z" },
};

function getClosedAt(pollId: string): string | null {
  return POLLS[pollId]?.closedAt ?? null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pollId = url.searchParams.get("pollId") || "";
  const sessionId = url.searchParams.get("sessionId");
  const closedAt = getClosedAt(pollId);
  if (!closedAt) {
    return NextResponse.json({ error: "unknown poll" }, { status: 404 });
  }
  const result = await getPoll(pollId, sessionId, closedAt);
  return NextResponse.json(result, {
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const pollId = String(body?.pollId ?? "");
  const sessionId = String(body?.sessionId ?? "");
  const choice = String(body?.choice ?? "");
  const closedAt = getClosedAt(pollId);
  if (!closedAt) {
    return NextResponse.json({ error: "unknown poll" }, { status: 404 });
  }
  if (!sessionId || sessionId.length < 8 || sessionId.length > 64) {
    return NextResponse.json({ error: "invalid sessionId" }, { status: 400 });
  }
  if (choice !== "yes" && choice !== "no") {
    return NextResponse.json({ error: "invalid choice" }, { status: 400 });
  }
  const result = await vote(
    pollId,
    sessionId,
    choice as PollChoice,
    closedAt,
  );
  return NextResponse.json(result, {
    headers: { "cache-control": "no-store" },
  });
}
