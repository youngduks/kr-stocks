// 야간 급변 목록 (2026-11-09) — 홈 '오늘' 카드 근처. 로그인 없음, 별도 폴링 없음(홈 ISR 주기 재사용).
//
// 급변 기준 (상품별 변동성 반영, 매 갱신 때 데이터로 계산):
//   5분봉 |종가/시가 − 1| ≥ max(0.5%, 4 × 최근 24시간 5분봉 |등락| 중앙값)
//   - 고정 ±1% 는 3배 상품(KORU)엔 너무 자주, 거래가 적은 시간엔 너무 드묾 → 상품별 '평소 5분 움직임'의 4배로.
//   - 최소 0.5% 바닥: 아주 조용한 시간에 0.1%대 움직임이 급변으로 잡히는 것 방지.
//   - 최근 6시간 안의 5분봉만 목록에 올림.
// 데이터: 바이낸스 USDT-M 5분봉 (공개, limit 288 → 요청 가중치 2)

import { binanceAllowed } from "./binanceGuard";
const FAPI = "https://fapi.binance.com/fapi/v1/klines";

export const SUDDEN_PRODUCTS = [
  { symbol: "SAMSUNGUSDT", name: "삼성전자", href: "/korea/samsung" },
  { symbol: "SKHYNIXUSDT", name: "SK하이닉스", href: "/korea/hynix" },
  { symbol: "HYUNDAIUSDT", name: "현대차", href: "/korea/hyundai" },
  { symbol: "EWYUSDT", name: "한국 ETF(EWY)", href: "/korea/kospi-night" },
  { symbol: "KORUUSDT", name: "KORU(3배)", href: "/korea/koru" },
] as const;

export const SUDDEN_MULT = 4;
export const SUDDEN_FLOOR_PCT = 0.5;
export const SUDDEN_WINDOW_H = 6;

export type SuddenEvent = { symbol: string; name: string; href: string; at: number; pct: number; thresholdPct: number };
export type SuddenResult = { events: SuddenEvent[]; thresholds: { name: string; pct: number }[]; checkedAt: number; ok: number };

function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : 0;
}

/** 순수 함수 (테스트용): 5분봉 [openTime, open, close] 목록 → 급변 이벤트 */
export function detectSudden(
  rows: { t: number; o: number; c: number }[],
  nowMs: number,
): { thresholdPct: number; hits: { at: number; pct: number }[] } {
  const rets = rows.filter((r) => r.o > 0).map((r) => ({ at: r.t, pct: (r.c / r.o - 1) * 100 }));
  const thr = Math.max(SUDDEN_FLOOR_PCT, SUDDEN_MULT * median(rets.map((r) => Math.abs(r.pct))));
  const from = nowMs - SUDDEN_WINDOW_H * 3600 * 1000;
  return { thresholdPct: thr, hits: rets.filter((r) => r.at >= from && Math.abs(r.pct) >= thr) };
}

export async function fetchSuddenMoves(maxEvents = 6): Promise<SuddenResult | null> {
  if (!binanceAllowed()) return null;
  const now = Date.now();
  const results = await Promise.all(
    SUDDEN_PRODUCTS.map(async (p) => {
      try {
        const r = await fetch(`${FAPI}?symbol=${p.symbol}&interval=5m&limit=288`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 120 },
        });
        if (!r.ok) return null;
        const k: any[] = await r.json();
        if (!Array.isArray(k)) return null;
        // 아직 진행 중인 마지막 봉은 제외 (closeTime > now)
        const rows = k.filter((x) => Number(x[6]) <= now).map((x) => ({ t: Number(x[0]), o: Number(x[1]), c: Number(x[4]) }));
        const d = detectSudden(rows, now);
        return { p, d };
      } catch {
        return null;
      }
    }),
  );
  const ok = results.filter(Boolean) as { p: (typeof SUDDEN_PRODUCTS)[number]; d: ReturnType<typeof detectSudden> }[];
  if (!ok.length) return null;
  const events: SuddenEvent[] = ok
    .flatMap(({ p, d }) => d.hits.map((h) => ({ symbol: p.symbol, name: p.name, href: p.href, at: h.at, pct: h.pct, thresholdPct: d.thresholdPct })))
    .sort((a, b) => b.at - a.at)
    .slice(0, maxEvents);
  return { events, thresholds: ok.map(({ p, d }) => ({ name: p.name, pct: d.thresholdPct })), checkedAt: now, ok: ok.length };
}
