import { NextRequest, NextResponse } from "next/server";
import { deletePost, getPost } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const post = await getPost(params.id);
  if (!post) return NextResponse.json({ error: "존재하지 않거나 숨김 처리된 게시글입니다." }, { status: 404 });
  return NextResponse.json(post, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const password = String(body?.password ?? "");
  if (!password) return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
  const ok = await deletePost(params.id, password);
  if (!ok) return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
