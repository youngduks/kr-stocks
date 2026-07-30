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

  // 데스크탑은 /re/AFFSDP 인터스티셜 경유가 검증된 상태(정확한 상품 착지 + 커미션
  // 트래킹 쿠키 확인) — 그대로 302.
  //
  // 모바일은 실기기 테스트로 확인(2026-07-30): 탭하면 쿠팡 앱이 "즉시" 열리지만
  // (인터스티셜의 coupang://mlp 스킴 자체는 성공) 앱 내부 flow-engine(flowId=7,
  // enableFlowEngine=Y)이 목표 상품(rUrl의 productId)을 무시하고 쿠팡 자체 추천
  // 화면("고객님을 위한 상품")으로 랜딩함 — 이 인터스티셜의 "모바일 웹으로 보기"
  // 버튼조차 같은 추천화면 URL로 연결돼있어(mlp-landing-page), /re/AFFSDP 경로
  // 안에서는 리다이렉트 타이밍을 아무리 손봐도 못 고치는 앱 자체 라우팅 문제로 판단.
  // → 모바일은 /re/AFFSDP를 거치지 않고 곧장 상품 상세 웹페이지(/vp/products/{id})로
  // 보냄 — 이 경로는 데스크탑에서 실제 상품으로 정확히 착지함이 이미 검증됨.
  // ⚠️ 커미션 추적(link.coupang.com 서버의 클릭 로깅)을 우회하는 셈이라, lptag를
  // 쿼리로 유지하되 실제 정산 반영 여부는 미검증 — 소액 실구매로 확인 필요.
  const isMobile = /iPhone|iPad|iPod|Android/i.test(req.headers.get("user-agent") || "");
  if (isMobile && dest.hostname === "link.coupang.com") {
    const productId = dest.searchParams.get("pageKey");
    if (productId) {
      const direct = new URL(`https://www.coupang.com/vp/products/${productId}`);
      for (const k of ["itemId", "vendorItemId", "lptag", "subid"]) {
        const v = dest.searchParams.get(k);
        if (v) direct.searchParams.set(k, v);
      }
      return NextResponse.redirect(direct.toString(), { status: 302 });
    }
  }

  return NextResponse.redirect(dest.toString(), { status: 302 });
}
