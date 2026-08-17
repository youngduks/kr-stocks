import { NextResponse } from "next/server";
import { getClickStats } from "@/lib/shoppingStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 읽기 전용 조회용 — 인증 없음(카운터 숫자만 노출, 민감정보 아님).
export async function GET() {
  const stats = await getClickStats();
  return NextResponse.json(stats, { headers: { "cache-control": "no-store" } });
}
