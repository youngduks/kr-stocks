// 바이낸스 선물 롱·숏 비율 (2026-11-09) — 공개 MARKET_DATA, 키 불필요.
// 실측(2026-11-09): SAMSUNG·SKHYNIX·HYUNDAI·EWY·KORU USDT 모두 제공.
// 정의 (Binance 개발자 문서, USDⓈ-M Futures Market Data):
//   - topLongShortPositionRatio: 증거금 잔고 상위 20% 사용자의 전체 미결제 포지션 중 순롱·순숏 포지션 비중
//     (Long Position % = 상위 사용자 롱 포지션 / 상위 사용자 전체 미결제 포지션)
//   - globalLongShortAccountRatio: 그 종목 포지션을 가진 전체 계좌 중 순롱·순숏 계좌 비중
// 1시간 단위 값. 페이지 ISR 주기와 별개로 5분 캐시(과도한 요청 방지).

import { binanceAllowed } from "./binanceGuard";
const BASE = "https://fapi.binance.com/futures/data";

export type LongShortPoint = { longPct: number; shortPct: number; ratio: number; timestamp: number };
export type LongShortData = { top: LongShortPoint | null; global: LongShortPoint | null };

async function one(endpoint: string, symbol: string): Promise<LongShortPoint | null> {
  if (!binanceAllowed()) return null;
  try {
    const r = await fetch(`${BASE}/${endpoint}?symbol=${symbol}&period=1h&limit=1`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    });
    if (!r.ok) return null;
    const a: any[] = await r.json();
    const x = a?.[a.length - 1];
    const l = Number(x?.longAccount);
    const s = Number(x?.shortAccount);
    if (!Number.isFinite(l) || !Number.isFinite(s) || l + s <= 0) return null;
    return { longPct: l * 100, shortPct: s * 100, ratio: Number(x?.longShortRatio), timestamp: Number(x?.timestamp) };
  } catch {
    return null;
  }
}

export async function fetchLongShort(symbol: string): Promise<LongShortData | null> {
  const [top, global] = await Promise.all([one("topLongShortPositionRatio", symbol), one("globalLongShortAccountRatio", symbol)]);
  if (!top && !global) return null;
  return { top, global };
}
