import { NextRequest, NextResponse } from "next/server";
import { deleteComment } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const password = String(body?.password ?? "");
  const postId = String(body?.postId ?? "");
  if (!password || !postId) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const ok = await deleteComment(params.id, postId, password);
  if (!ok) return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
