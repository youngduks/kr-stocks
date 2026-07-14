// 미결제약정(Open Interest, "레버리지 TVL") — 바이낸스 공개 openInterestHist로 직접 계산.
// 이 시장에 지금 얼마의 레버리지 포지션이 걸려있는지 나타내는 지표.
//
// 해석: OI 상승 = 레버리지 포지션이 쌓이는 중 (청산 리스크 축적).
//       OI 급락 = 청산 캐스케이드가 막 발생함 — 레버리지가 "터진" 직후이므로
//       매도(또는 매수) 압력이 소진돼 반등(또는 눌림) 후보 구간으로 봄.
//
// 한국 토큰화 주식(삼성전자/SK하이닉스/현대차)은 바이낸스 선물로 상장돼 있어 계산 가능.

const BINANCE_FAPI = "https://fapi.binance.com/fapi/v1";
const BINANCE_FUTURES_DATA = "https://fapi.binance.com/futures/data";

export type OiPoint = {
  /** unix seconds (lightweight-charts 호환) */
  time: number;
  /** 미결제약정 총 가치 (USDT) — "레버리지 TVL" */
  oiUsd: number;
  /** 참고용 종가 (USDT) */
  price: number;
};

export type OiSet = {
  bars1H: OiPoint[];
  bars4H: OiPoint[];
};

async function fetchOiHist(symbol: string, period: "1h" | "4h", limit: number) {
  try {
    const r = await fetch(
      `${BINANCE_FUTURES_DATA}/openInterestHist?symbol=${symbol}&period=${period}&limit=${limit}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
    );
    if (!r.ok) return [];
    const arr = (await r.json()) as any[];
    if (!Array.isArray(arr)) return [];
    return arr
      .map((b) => ({
        time: Math.floor(Number(b?.timestamp) / 1000),
        oiUsd: Number(b?.sumOpenInterestValue),
      }))
      .filter((b) => Number.isFinite(b.time) && Number.isFinite(b.oiUsd));
  } catch {
    return [];
  }
}

async function fetchKlineCloses(symbol: string, interval: "1h" | "4h", limit: number) {
  try {
    const r = await fetch(
      `${BINANCE_FAPI}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
    );
    if (!r.ok) return new Map<number, number>();
    const arr = (await r.json()) as any[];
    if (!Array.isArray(arr)) return new Map<number, number>();
    const out = new Map<number, number>();
    for (const b of arr) {
      const time = Math.floor(Number(b?.[0]) / 1000);
      const close = Number(b?.[4]);
      if (Number.isFinite(time) && Number.isFinite(close)) out.set(time, close);
    }
    return out;
  } catch {
    return new Map<number, number>();
  }
}

async function fetchOiSet(symbol: string, period: "1h" | "4h", limit: number): Promise<OiPoint[]> {
  const [oi, closes] = await Promise.all([
    fetchOiHist(symbol, period, limit),
    fetchKlineCloses(symbol, period, limit),
  ]);
  if (oi.length === 0) return [];
  let lastKnownPrice: number | null = null;
  return oi.map((b) => {
    const price = closes.get(b.time) ?? lastKnownPrice ?? 0;
    if (closes.has(b.time)) lastKnownPrice = price;
    return { time: b.time, oiUsd: b.oiUsd, price };
  });
}

/** 종목 OI 셋 fetch — lib/cvd와 동일한 1H(7일)/4H(30일) 윈도우 구조 */
export async function fetchOpenInterestSet(binanceSymbol: string): Promise<OiSet> {
  const [bars1H, bars4H] = await Promise.all([
    fetchOiSet(binanceSymbol, "1h", 168),
    fetchOiSet(binanceSymbol, "4h", 180),
  ]);
  return { bars1H, bars4H };
}
