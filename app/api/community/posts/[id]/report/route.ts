import { NextRequest, NextResponse } from "next/server";
import { reportPost, ValidationError } from "@/lib/community";
import { getClientIp } from "@/lib/requestIp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ip = getClientIp(req);
  try {
    const result = await reportPost(params.id, ip);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    console.error("[community/report POST]", e);
    return NextResponse.json({ error: "신고 처리에 실패했습니다." }, { status: 500 });
  }
}
