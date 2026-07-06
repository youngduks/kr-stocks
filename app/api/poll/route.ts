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
  // 인간지표 — 내일(6/16 화) 상승 vs 하락. 마감 = 장 시작 전 6/16 화 09:00 KST = 2026-06-16 00:00 UTC
  "market-updown-2026-06-16": { closedAt: "2026-06-15T15:00:00.000Z" },
  // 인간지표 — 내일(6/17 수) 상승 vs 하락. 마감 = 장 시작 전 6/17 수 09:00 KST = 2026-06-17 00:00 UTC
  "market-updown-2026-06-17": { closedAt: "2026-06-16T15:00:00.000Z" },
  // 인간지표 — 내일(6/18 목) 상승 vs 하락. 마감 = 장 시작 전 6/18 목 09:00 KST = 2026-06-18 00:00 UTC
  "market-updown-2026-06-18": { closedAt: "2026-06-17T15:00:00.000Z" },
  // 인간지표 — 내일(6/19 금) 상승 vs 하락. 마감 = 장 시작 전 6/19 금 09:00 KST = 2026-06-19 00:00 UTC
  "market-updown-2026-06-19": { closedAt: "2026-06-18T15:00:00.000Z" },
  // 인간지표 — 내일(6/22 월) 상승 vs 하락. 마감 = 장 시작 전 6/22 월 09:00 KST = 2026-06-22 00:00 UTC
  "market-updown-2026-06-22": { closedAt: "2026-06-21T15:00:00.000Z" },
  // 인간지표 — 내일(6/23 화) 상승 vs 하락. 마감 = 장 시작 전 6/23 화 09:00 KST = 2026-06-23 00:00 UTC
  "market-updown-2026-06-23": { closedAt: "2026-06-22T15:00:00.000Z" },
  // 인간지표 — 내일(6/24 수) 상승 vs 하락. 마감 = 장 시작 전 6/24 수 09:00 KST = 2026-06-24 00:00 UTC
  "market-updown-2026-06-24": { closedAt: "2026-06-23T15:00:00.000Z" },
  // 인간지표 — 내일(6/25 목) 상승 vs 하락. 마감 = 장 시작 전 6/25 목 09:00 KST = 2026-06-25 00:00 UTC
  "market-updown-2026-06-25": { closedAt: "2026-06-24T15:00:00.000Z" },
  // 인간지표 — 내일(6/26 금) 상승 vs 하락. 마감 = 장 시작 전 6/26 금 09:00 KST = 2026-06-26 00:00 UTC
  "market-updown-2026-06-26": { closedAt: "2026-06-25T15:00:00.000Z" },
  // 인간지표 — 내일(6/29 월) 상승 vs 하락. 마감 = 장 시작 전 6/29 월 09:00 KST = 2026-06-29 00:00 UTC
  "market-updown-2026-06-29": { closedAt: "2026-06-28T15:00:00.000Z" },
  // 인간지표 — 내일(6/30 화) 상승 vs 하락. 마감 = 장 시작 전 6/30 화 09:00 KST = 2026-06-30 00:00 UTC
  "market-updown-2026-06-30": { closedAt: "2026-06-29T15:00:00.000Z" },
  // 인간지표 — 내일(7/1 수) 상승 vs 하락. 마감 = 장 시작 전 7/1 수 09:00 KST = 2026-07-01 00:00 UTC
  "market-updown-2026-07-01": { closedAt: "2026-06-30T15:00:00.000Z" },
  // 인간지표 — 내일(7/2 목) 상승 vs 하락. 마감 = 장 시작 전 7/2 목 09:00 KST = 2026-07-02 00:00 UTC
  "market-updown-2026-07-02": { closedAt: "2026-07-01T15:00:00.000Z" },
  // 인간지표 — 내일(7/3 금) 상승 vs 하락. 마감 = 장 시작 전 7/3 금 09:00 KST = 2026-07-03 00:00 UTC
  "market-updown-2026-07-03": { closedAt: "2026-07-02T15:00:00.000Z" },
  // 인간지표 — 내일(7/6 월) 상승 vs 하락. 마감 = 장 시작 전 7/6 월 09:00 KST = 2026-07-06 00:00 UTC
  "market-updown-2026-07-06": { closedAt: "2026-07-05T15:00:00.000Z" },
  // 인간지표 — 내일(7/7 화) 상승 vs 하락. 마감 = 장 시작 전 7/7 화 09:00 KST = 2026-07-07 00:00 UTC
  "market-updown-2026-07-07": { closedAt: "2026-07-06T15:00:00.000Z" },

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
