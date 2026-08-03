import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, createPost, listPosts, ValidationError } from "@/lib/community";
import { getClientIp } from "@/lib/requestIp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cursorParam = req.nextUrl.searchParams.get("cursor");
  const cursor = cursorParam ? Number(cursorParam) : undefined;
  const data = await listPosts(cursor && !Number.isNaN(cursor) ? cursor : undefined);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const allowed = await checkRateLimit("post", ip);
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
    const post = await createPost({
      nickname: String(body?.nickname ?? ""),
      password: String(body?.password ?? ""),
      title: String(body?.title ?? ""),
      body: String(body?.body ?? ""),
      imageUrl: body?.imageUrl ? String(body.imageUrl) : null,
      ip,
    });
    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[community/posts POST]", e);
    return NextResponse.json({ error: "게시글 작성에 실패했습니다." }, { status: 500 });
  }
}
