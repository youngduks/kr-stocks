import { fetchAllPrices } from "@/lib/fetchPrices";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 30; // 30초 캐시

export async function GET() {
  try {
    const data = await fetchAllPrices();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
