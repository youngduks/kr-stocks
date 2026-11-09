// 바이낸스 호출 가드 (2026-11-09)
//
// ⚠ 로컬(맥) 빌드·로컬 서버에서는 바이낸스를 부르지 않는다.
//   2026-11-09 맥 IP가 바이낸스 fapi 에서 차단(-1003 → 418)됨. 로컬 `next build` 1회가 종목 페이지 63개를 미리 만들며
//   바이낸스를 수십~백여 번 호출했고, 하루 15회 빌드 + 리서치 스크립트 + 맥의 다른 바이낸스 작업이 같은 IP에 몰린 것이 원인.
//   같은 IP를 쓰는 맥의 다른 작업까지 막히므로, Vercel(VERCEL=1, 빌드·런타임) 에서만 허용한다.
//   예외가 꼭 필요하면 KRS_ALLOW_BINANCE=1 (사람이 판단해서만).
//
// 가드가 막으면 각 호출부는 '데이터 없음' 경로로 진행(기존 실패 처리와 동일) → 화면은 안내 문구·카드 숨김.

let blocked = 0;

export function binanceAllowed(): boolean {
  if (process.env.KRS_ALLOW_BINANCE === "1") return true;
  if (process.env.VERCEL) return true;
  blocked += 1;
  if (blocked === 1) console.warn("[binanceGuard] 로컬 환경 — 바이낸스 호출을 건너뜀 (lib/binanceGuard.ts)");
  return false;
}

/** 로컬에서 막힌 호출 수 (검증용) */
export function binanceBlockedCount(): number {
  return blocked;
}
