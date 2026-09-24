import { NextResponse } from "next/server";
import { getDailyVisits } from "@/lib/visitorStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/stats/daily?days=30 — 최근 N일(최대 90) 일별 방문 세션 수
export async function GET(req: Request) {
  const days = Number(new URL(req.url).searchParams.get("days") ?? 30);
  const daily = await getDailyVisits(days);
  return NextResponse.json({ daily }, { headers: { "cache-control": "no-store" } });
}
