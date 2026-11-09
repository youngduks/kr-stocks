// 한국 ETF(EWY, iShares MSCI South Korea) 24시간 시세 — /korea/kospi-night 전용.
//
// ⚠ 5/11 혼동 재발 방지: EWY는 universe_map(홈 종목 목록)에 다시 넣지 않는다
//   (2026-05-11·05-13 "코스피200이랑 ETF 빼라" — HL 단위가 KRW 지수처럼 보여 retail 혼동).
//   이 모듈은 달러 가격 + 등락률(%)만 만든다. 원화 환산·지수 포인트 환산 값은 만들지 않는다.
//
// 소스 (전부 공개 API, 기존 fetchPrices 와 같은 방식):
//   - 바이낸스 USDT-M 선물 EWYUSDT (24h 티커)
//   - 하이퍼리퀴드 HIP-3 xyz:EWY (fetchHlDex("xyz") 재사용 → 같은 요청이라 Next fetch 캐시 공유)
//   - Yahoo Finance EWY 일봉 (미국 정규장 종가 = 등락률 기준점)

import { fetchHlDex, withRetry } from "./fetchPrices";

import { binanceAllowed } from "./binanceGuard";
const BINANCE_FAPI = "https://fapi.binance.com/fapi/v1";
// 2026-11-09: KORU(/korea/koru)도 같은 방식 → 심볼을 매개변수로 (fetchEtfPerp). fetchEwy 는 래퍼.
export type EtfPerpConfig = {
  binanceSymbol: string;
  hlName: string;
  yahooSymbol: string;
  /** 미국 종가 대비 이 % 넘게 벌어지면 데이터 이상으로 보고 숨김 (3배 상품은 크게) */
  sanityPct?: number;
};
export const EWY_CFG: EtfPerpConfig = { binanceSymbol: "EWYUSDT", hlName: "xyz:EWY", yahooSymbol: "EWY" };
export const KORU_CFG: EtfPerpConfig = { binanceSymbol: "KORUUSDT", hlName: "xyz:KORU", yahooSymbol: "KORU", sanityPct: 90 };
const yahooChart = (sym: string) => `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=5d&interval=1d`;
const UA = "Mozilla/5.0 (compatible; kr-stocks/1.0)";

export type EwyPerp = {
  /** 마지막 거래가 (USD) */
  price: number;
  /** 24시간 전 가격 (USD) — 바이낸스 openPrice / HL prevDayPx */
  price24hAgo: number;
  /** 24시간 전 대비 (%) */
  chg24hPct: number;
  /** 24시간 거래대금 (USD) */
  volume24hUsd: number;
};

export type EwyUsClose = {
  /** 기준 종가 (USD) — 미국 장중이면 '전일 종가', 장 마감 후면 '그날 종가' */
  close: number;
  /** 기준 종가가 나온 미국 거래일 (뉴욕 현지 날짜, YYYY-MM-DD) */
  sessionDate: string;
  /** 지금 미국 정규장이 열려 있는지 */
  usLive: boolean;
  /** 미국 정규장 장중가 (usLive 일 때만) */
  livePrice: number | null;
};

export type EwySnapshot = {
  /** 이 값을 받은 시각 (epoch ms) */
  fetchedAt: number;
  /** 직전 정상값을 재사용 중이면 true (업스트림 일시 실패) */
  stale: boolean;
  binance: EwyPerp | null;
  hl: EwyPerp | null;
  us: EwyUsClose | null;
  /** 요약 문장에 쓰는 대표 가격 소스 — 거래대금이 더 큰 바이낸스 우선, 없으면 HL */
  primary: "binance" | "hl" | null;
  /** 대표 가격 vs 미국 정규장 기준 종가 (%) */
  vsUsClosePct: number | null;
};

async function fetchBinanceEwy(cfg: EtfPerpConfig): Promise<EwyPerp | null> {
  if (!binanceAllowed()) return null;
  try {
    return await withRetry(async () => {
      const r = await fetch(`${BINANCE_FAPI}/ticker/24hr?symbol=${cfg.binanceSymbol}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 30 },
      });
      if (!r.ok) throw new Error(`Binance ${cfg.binanceSymbol} ${r.status}`);
      const t: any = await r.json();
      const price = Number(t?.lastPrice);
      const open = Number(t?.openPrice);
      if (!(price > 0) || !(open > 0)) throw new Error(`Binance ${cfg.binanceSymbol} 값 없음`);
      return {
        price,
        price24hAgo: open,
        chg24hPct: ((price - open) / open) * 100,
        volume24hUsd: Number(t?.quoteVolume ?? 0),
      };
    });
  } catch (e) {
    console.error("[ewy] Binance 실패:", e);
    return null;
  }
}

async function fetchHlEwy(cfg: EtfPerpConfig): Promise<EwyPerp | null> {
  try {
    const m = await withRetry(() => fetchHlDex("xyz"));
    const c = m.get(cfg.hlName);
    if (!c) return null;
    const price = Number(c.markPx);
    const prev = Number(c.prevDayPx);
    if (!(price > 0) || !(prev > 0)) return null;
    return {
      price,
      price24hAgo: prev,
      chg24hPct: ((price - prev) / prev) * 100,
      volume24hUsd: Number(c.dayNtlVlm ?? 0),
    };
  } catch (e) {
    console.error("[ewy] Hyperliquid 실패:", e);
    return null;
  }
}

function nyDate(epochSec: number): string {
  // en-CA → YYYY-MM-DD
  return new Date(epochSec * 1000).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

async function fetchUsClose(cfg: EtfPerpConfig): Promise<EwyUsClose | null> {
  try {
    const r = await fetch(yahooChart(cfg.yahooSymbol), { headers: { "User-Agent": UA }, next: { revalidate: 60 } });
    if (!r.ok) return null;
    const d: any = await r.json();
    const res = d?.chart?.result?.[0];
    const meta = res?.meta;
    const ts: number[] = res?.timestamp ?? [];
    const closes: (number | null)[] = res?.indicators?.quote?.[0]?.close ?? [];
    const period = meta?.currentTradingPeriod?.regular;
    const nowSec = Math.floor(Date.now() / 1000);
    const start = typeof period?.start === "number" ? period.start : null;
    const end = typeof period?.end === "number" ? period.end : null;
    const usLive = start != null && end != null && nowSec >= start && nowSec < end;
    // 일봉 (시각, 종가) — 장중이면 진행 중인 오늘 봉은 '종가'가 아니므로 제외.
    // (meta.chartPreviousClose 는 Yahoo 버그로 엉뚱한 값이 나와 쓰지 않음 — regularClose.ts 2026-07-30 주석 참고)
    const bars: { t: number; c: number }[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = closes[i];
      if (typeof c !== "number" || !(c > 0)) continue;
      if (usLive && start != null && ts[i] >= start) continue;
      bars.push({ t: ts[i], c });
    }
    const last = bars[bars.length - 1];
    if (!last) return null;
    const lp = meta?.regularMarketPrice;
    return {
      close: last.c,
      sessionDate: nyDate(last.t),
      usLive,
      livePrice: usLive && typeof lp === "number" && lp > 0 ? lp : null,
    };
  } catch (e) {
    console.error("[ewy] Yahoo 실패:", e);
    return null;
  }
}

// 웜 인스턴스 last-known-good — 업스트림이 전부 깜빡여도 '시각 표시한 마지막 값'을 보여주기 위함.
// 너무 오래된 값은 실시간처럼 보이면 안 되므로 6시간까지만.
const LKG_TTL_MS = 6 * 60 * 60 * 1000;
const lkgMap = new Map<string, EwySnapshot>();

export function fetchEwy(): Promise<EwySnapshot> {
  return fetchEtfPerp(EWY_CFG);
}

export async function fetchEtfPerp(cfg: EtfPerpConfig): Promise<EwySnapshot> {
  const now = Date.now();
  const [binance, hl, us] = await Promise.all([fetchBinanceEwy(cfg), fetchHlEwy(cfg), fetchUsClose(cfg)]);
  const lkg = lkgMap.get(cfg.binanceSymbol) ?? null;

  if (!binance && !hl) {
    if (lkg && now - lkg.fetchedAt <= LKG_TTL_MS) return { ...lkg, stale: true };
    return { fetchedAt: now, stale: false, binance: null, hl: null, us, primary: null, vsUsClosePct: null };
  }

  const primary: "binance" | "hl" = binance ? "binance" : "hl";
  const p = (binance ?? hl)!.price;
  let vsUsClosePct: number | null = null;
  if (us && us.close > 0) {
    const raw = ((p - us.close) / us.close) * 100;
    // sanity — 30% 넘게 벌어지면 데이터 이상(티커 변경·분할 등)으로 보고 숨김
    vsUsClosePct = Math.abs(raw) <= (cfg.sanityPct ?? 30) ? raw : null;
  }
  const snap: EwySnapshot = { fetchedAt: now, stale: false, binance, hl, us, primary, vsUsClosePct };
  lkgMap.set(cfg.binanceSymbol, snap);
  return snap;
}
