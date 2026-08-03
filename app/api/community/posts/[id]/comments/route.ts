import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, createComment, listComments, ValidationError } from "@/lib/community";
import { getClientIp } from "@/lib/requestIp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const comments = await listComments(params.id);
  return NextResponse.json({ comments }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ip = getClientIp(req);
  const allowed = await checkRateLimit("comment", ip);
  if (!allowed) {
    return NextResponse.json({ error: "너무 빠르게 요청했습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  try {
    const comment = await createComment({
      postId: params.id,
      nickname: String(body?.nickname ?? ""),
      password: String(body?.password ?? ""),
      body: String(body?.body ?? ""),
      ip,
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[community/comments POST]", e);
    return NextResponse.json({ error: "댓글 작성에 실패했습니다." }, { status: 500 });
  }
}
