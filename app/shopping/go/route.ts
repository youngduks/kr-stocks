import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 쿠팡파트너스 링크(link.coupang.com, www.coupang.com)만 목적지로 허용 — 임의 URL을
// 넘기면 오픈리다이렉트가 되므로 화이트리스트 밖은 /shopping으로 되돌림.
const ALLOWED_HOSTS = new Set(["link.coupang.com", "www.coupang.com"]);

function isMobileUA(ua: string): boolean {
  return /iPhone|iPad|iPod|Android/i.test(ua);
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") || "";
  let dest: URL;
  try {
    dest = new URL(raw);
  } catch {
    return NextResponse.redirect(new URL("/shopping", req.url));
  }
  if (!ALLOWED_HOSTS.has(dest.hostname)) {
    return NextResponse.redirect(new URL("/shopping", req.url));
  }

  if (!isMobileUA(req.headers.get("user-agent") || "")) {
    // 데스크탑은 기존에 검증된 302 그대로 — 문제 없던 경로는 안 건드림
    return NextResponse.redirect(dest.toString(), { status: 302 });
  }

  // 모바일에서 link.coupang.com을 직접 302로 보내면, iOS/안드로이드가 HTTP 요청이
  // 일어나기도 전에 URL을 유니버설링크로 가로채 쿠팡 앱을 직접 열어버림 — 이때 앱은
  // /re/AFFSDP 형식을 상품으로 해석하지 못해 홈/추천피드로 떨어짐(2026-07-30 실측 확인,
  // 원인: link.coupang.com의 apple-app-site-association이 /re/* 를 유니버설링크로
  // 등록해뒀고, 공식 단축링크 /a/{code}는 그 목록에 없어 반대로 서버까지 도달함).
  // 우회: 우리 도메인(쿠팡 AASA와 무관)을 한 번 거치게 한 뒤 meta-refresh로 재이동시키면
  // "리다이렉트로 도달한 링크"가 되어 iOS 17+에서 유니버설링크 가로채기가 스킵되고
  // (직접 탭한 링크에만 발동), 쿠팡 서버가 정상적으로 요청을 받아 상품 딥링크 스킴
  // 변환 + 클릭 로깅(수수료 귀속)을 수행함 — 공식 /a/ 링크와 동일한 경로가 됨.
  const escaped = dest.toString().replace(/"/g, "&quot;");
  const html = `<!doctype html>
<html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="0;url=${escaped}">
<title>이동 중…</title></head>
<body style="font-family:-apple-system,sans-serif;padding:40px;text-align:center;color:#666">
이동 중입니다…<br><a href="${escaped}">계속 진행이 안 되면 여기를 눌러주세요</a>
</body></html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
