import { NextResponse } from "next/server";
import { getStats } from "@/lib/visitorStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getStats();
  // CDN 60초 캐시 — 접속자 수와 무관하게 Redis 조회를 분당 1회 수준으로(2026-10-01 Upstash 과금 절감)
  return NextResponse.json(stats, {
    headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
