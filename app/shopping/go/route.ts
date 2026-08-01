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

  // 2026-07-30: 모바일에서 /re/AFFSDP 인터스티셜이 앱 flow-engine 버그로 엉뚱한
  // 추천화면("고객님을 위한 상품")에 랜딩하는 문제 때문에, 모바일만 /vp/products
  // 직행으로 우회했었음 — 착지는 정확했지만, 2026-07-31 실브라우저(Playwright) 실측
  // 결과 www.coupang.com은 URL 파라미터만으로는 추적쿠키(trac_lptag 등)를 전혀
  // 발급하지 않음이 확정됨(200 정상 로드인데도 쿠키 0개). 즉 그 "정확한 착지"는
  // 커미션 귀속이 아예 안 되는 착지였음 — 모바일 구매가 전부 정산 밖으로 샜을 것.
  // 반대로 /re/AFFSDP는 모바일에서도 trac_lptag 등 추적쿠키가 정상 발급됨(형님
  // 실기기 실측: 200 + 쿠키 6종). 유일한 결함은 앱이 열렸을 때의 착지 화면 UX뿐이고,
  // 이건 쿠팡 앱 내부 버그라 우리 쪽에서 못 고침. "추적 안 되는 완벽 착지(GMV 확정
  // 0원)" 보다 "추적되는 불완전 착지(구매 시 GMV 인정)"가 명백히 낫다고 판단해
  // 모바일도 데스크탑과 동일하게 /re/AFFSDP 경유로 되돌림.
  return NextResponse.redirect(dest.toString(), { status: 302 });
}
