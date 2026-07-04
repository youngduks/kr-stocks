// CVD (Cumulative Volume Delta, 체결강도 누적) — 바이낸스 공개 klines만으로 자체 계산.
// 청산맵(리퀴데이션 히트맵)은 유료 API(CoinAnk/CoinGlass) 없이는 재현 불가하지만,
// CVD는 캔들의 taker buy/sell 분해 필드가 공개돼 있어 무료로 정확히 계산 가능.
//
// 델타 = takerBuyQuoteVolume - takerSellQuoteVolume (USDT 기준, 캔들 단위)
// CVD  = 델타의 누적합 — 우상향이면 매수 체결 우세, 우하향이면 매도 체결 우세.
//
// 한국 토큰화 주식(삼성전자/SK하이닉스/현대차)은 바이낸스 선물로 상장돼 있어 계산 가능.
// Hyperliquid 상장 종목(NVDA/DRAM 등)은 캔들에 taker buy/sell 분해가 없어 계산 불가.

const BINANCE_FAPI = "https://fapi.binance.com/fapi/v1";

export type CvdPoint = {
  /** unix seconds (lightweight-charts 호환) */
  time: number;
  /** 누적 델타 (USDT) */
  cvd: number;
  /** 참고용 종가 (USDT) */
  price: number;
};

export type CvdSet = {
  bars1H: CvdPoint[];
  bars4H: CvdPoint[];
};

async function fetchCvdKlines(
  symbol: string,
  interval: "1h" | "4h",
  limit: number
): Promise<CvdPoint[]> {
  try {
    const r = await fetch(
      `${BINANCE_FAPI}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
    );
    if (!r.ok) return [];
    const arr = (await r.json()) as any[];
    if (!Array.isArray(arr)) return [];

    let cum = 0;
    return arr.map((b) => {
      // Binance kline: [openTime, o, h, l, c, v, closeTime, quoteVolume, trades, takerBuyBaseVol, takerBuyQuoteVol, ignore]
      const quoteVolume = Number(b[7]);
      const takerBuyQuote = Number(b[10]);
      const takerSellQuote = quoteVolume - takerBuyQuote;
      const delta = takerBuyQuote - takerSellQuote;
      cum += delta;
      return {
        time: Math.floor(Number(b[0]) / 1000),
        cvd: cum,
        price: Number(b[4]),
      };
    });
  } catch {
    return [];
  }
}

/** 종목 CVD 셋 fetch — PriceChart의 fetchCandleSet과 동일한 1H/4H 윈도우 구조 */
export async function fetchCvdSet(binanceSymbol: string): Promise<CvdSet> {
  const [bars1H, bars4H] = await Promise.all([
    fetchCvdKlines(binanceSymbol, "1h", 168),
    fetchCvdKlines(binanceSymbol, "4h", 180),
  ]);
  return { bars1H, bars4H };
}
