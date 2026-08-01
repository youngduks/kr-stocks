import { NextRequest, NextResponse } from "next/server";
import { trackVisit } from "@/lib/visitorStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let sessionId = "";
  let path = "";
  try {
    const body = await req.json();
    sessionId = String(body?.sessionId ?? "");
    path = String(body?.path ?? "");
  } catch {
    /* ignore */
  }
  if (!sessionId || sessionId.length < 8 || sessionId.length > 64) {
    return NextResponse.json({ error: "invalid sessionId" }, { status: 400 });
  }
  // 페이지별 실방문 계측 — 서버 requestPath는 next/link 프리페치가 섞여 못 씀.
  // Vercel 런타임 로그에 남겨 `vercel logs`로 집계(별도 저장소/비용 없이).
  // 경로는 자체 라우트만 로깅(임의 문자열 로그 오염 방지), 길이도 제한.
  if (path.startsWith("/") && path.length <= 64 && !path.includes(" ")) {
    console.log(`[pageview] ${path}`);
  }
  const stats = await trackVisit(sessionId);
  return NextResponse.json(stats, {
    headers: { "cache-control": "no-store" },
  });
}
