import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 쿠팡파트너스 링크(link.coupang.com, www.coupang.com)만 목적지로 허용 — 임의 URL을
// 넘기면 오픈리다이렉트가 되므로 화이트리스트 밖은 /shopping으로 되돌림.
const ALLOWED_HOSTS = new Set(["link.coupang.com", "www.coupang.com"]);

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

  // link.coupang.com을 직접(형님이 텔레그램/사이트에서 원본 링크를) 탭하면, iOS/안드로이드가
  // HTTP 요청이 일어나기도 전에 URL을 유니버설링크로 가로채 쿠팡 앱을 raw하게 열어버림 —
  // 이때 앱은 /re/AFFSDP 파라미터를 상품으로 해석 못 해 홈/추천피드로 떨어짐(2026-07-30 실측:
  // link.coupang.com의 apple-app-site-association이 /re/* 를 유니버설링크로 등록, 공식
  // 단축링크 /a/{code}는 그 목록에 없어 서버까지 도달).
  //
  // 우리 도메인(쿠팡 AASA와 무관)을 거치면 이 raw 가로채기는 피하지만, 실제 인터스티셜
  // HTML(/re/AFFSDP, /a/ 공통)을 직접 열어보니 둘 다 동일한 메커니즘이었음: JS가
  // `window.location = coupang://mlp?...`로 앱을 열고, 300ms 안에 안 열리면
  // `title=고객님을 위한 상품` 쿠팡 자체 추천페이지로 자동 폴백. 여기서 앱이 안 열리는
  // 이유는 meta-refresh(자동 재탐색)를 거치면 사용자의 진짜 탭 신호(user activation)가
  // 끊겨서 브라우저가 커스텀 스킴(coupang://) 실행을 차단하기 때문 — 진짜 HTTP 302는
  // 같은 네비게이션의 연장으로 취급돼 activation이 유지됨(공식 /a/ 링크가 항상 되는 이유).
  // 그래서 302로 변경 — link.coupang.com이 AASA에서 /re/*만 등록해뒀으므로 "직접 탭"이
  // 아닌 "리다이렉트로 도달"이면 raw 가로채기 자체는 여전히 스킵됨(iOS 17+, 실측 인용).
  return NextResponse.redirect(dest.toString(), { status: 302 });
}
