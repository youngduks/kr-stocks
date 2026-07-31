import { fetchAllPrices } from "@/lib/fetchPrices";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
// ⚠️ `export const revalidate = 30`을 쓰면 안 됨(2026-07-31 실측):
// 라우트 세그먼트 캐시가 응답의 Cache-Control을 자기 것으로 덮어써서 실제 헤더가
// `cache-control: public`만 남고 s-maxage/stale-while-revalidate가 통째로 사라짐.
// 그러면 CDN에 만료 규칙이 없어져 재검증이 안 붙고, x-vercel-cache=STALE인 채로
// 26분 묵은 응답(그 안에 박제된 market:null 결번 포함)을 계속 서빙하는 사고가 남.
// → 세그먼트 캐시를 끄고(force-dynamic) CDN 캐시를 헤더로 직접 제어한다.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchAllPrices();
    return NextResponse.json(data, {
      headers: {
        // s-maxage=30: CDN에서 30초간 신선 / stale-while-revalidate=60: 만료 후
        // 60초까진 낡은 응답을 즉시 주면서 뒤에서 갱신(사용자 대기 없음).
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (e: any) {
    // 실패 응답이 캐시에 굳으면 그 시간 내내 장애가 고정되므로 캐시 금지.
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
