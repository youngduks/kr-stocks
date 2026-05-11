// HL candleSnapshot fetcher — HIP-3 builder dex (xyz / vntl) 호환
// 응답 형식: [{ t, T, s, i, o, c, h, l, v, n }, ...]
//   t: open ms, T: close ms, o/h/l/c: string price (USD), v: volume

const HL_API = "https://api.hyperliquid.xyz/info";

export type Candle = {
  /** unix seconds (lightweight-charts compatible) */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type CandleSet = {
  /** 1D = 1h × 24, 7D = 1h × 168, 1M = 4h × 180 */
  bars1H: Candle[];
  bars4H: Candle[];
};

type HlCandle = {
  t: number;
  T: number;
  s: string;
  i: string;
  o: string;
  c: string;
  h: string;
  l: string;
  v: string;
  n: number;
};

async function fetchHlCandles(coin: string, interval: "1h" | "4h", lookbackMs: number): Promise<Candle[]> {
  const endTime = Date.now();
  const startTime = endTime - lookbackMs;
  try {
    const r = await fetch(HL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "candleSnapshot",
        req: { coin, interval, startTime, endTime },
      }),
      next: { revalidate: 300 }, // 5분 ISR 캐시
    });
    if (!r.ok) return [];
    const arr = (await r.json()) as HlCandle[] | null;
    if (!Array.isArray(arr)) return [];
    return arr.map((b) => ({
      time: Math.floor(b.t / 1000),
      open: Number(b.o),
      high: Number(b.h),
      low: Number(b.l),
      close: Number(b.c),
    }));
  } catch {
    return [];
  }
}

/**
 * 종목 차트용 candle 셋 fetch.
 * - bars1H: 7일치 1시간 봉 (≈ 168개) → 1D / 7D 토글이 동일 dataset slice
 * - bars4H: 30일치 4시간 봉 (≈ 180개) → 1M 토글
 *
 * 두 호출 병렬 + ISR 5분 캐시 → 서버 부하 최소.
 */
export async function fetchCandleSet(ticker: string): Promise<CandleSet> {
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const [bars1H, bars4H] = await Promise.all([
    fetchHlCandles(ticker, "1h", SEVEN_DAYS),
    fetchHlCandles(ticker, "4h", THIRTY_DAYS),
  ]);
  return { bars1H, bars4H };
}
