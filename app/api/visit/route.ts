import { NextRequest, NextResponse } from "next/server";
import { trackVisit } from "@/lib/visitorStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let sessionId = "";
  try {
    const body = await req.json();
    sessionId = String(body?.sessionId ?? "");
  } catch {
    /* ignore */
  }
  if (!sessionId || sessionId.length < 8 || sessionId.length > 64) {
    return NextResponse.json({ error: "invalid sessionId" }, { status: 400 });
  }
  const stats = await trackVisit(sessionId);
  return NextResponse.json(stats, {
    headers: { "cache-control": "no-store" },
  });
}
