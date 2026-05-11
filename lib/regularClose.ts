// 정규장 종가 fetch — Naver (한국) + Yahoo Finance (미국/글로벌)
// HL 가격 vs 정규장 종가 비교용. 비상장(SpaceX/OpenAI/Anthropic)은 매핑 없음.

type RegularSource =
  | { source: "naver"; code: string }
  | { source: "yahoo"; symbol: string }
  | null;

const MAPPING: Record<string, RegularSource> = {
  // 한국 주식 (네이버)
  samsung: { source: "naver", code: "005930" },
  hynix: { source: "naver", code: "000660" },
  hyundai: { source: "naver", code: "005380" },
  // 환율
  krw: null, // 환율 자체
  // (kospi200, ewy 제거 — HL 단위 매핑이 KRW로 보여 retail 혼동, 2026-05-11)

  // 미국 mega cap (Yahoo)
  tesla: { source: "yahoo", symbol: "TSLA" },
  nvidia: { source: "yahoo", symbol: "NVDA" },
  apple: { source: "yahoo", symbol: "AAPL" },
  microsoft: { source: "yahoo", symbol: "MSFT" },
  amd: { source: "yahoo", symbol: "AMD" },
  google: { source: "yahoo", symbol: "GOOGL" },
  amazon: { source: "yahoo", symbol: "AMZN" },
  meta: { source: "yahoo", symbol: "META" },
  mstr: { source: "yahoo", symbol: "MSTR" },
  netflix: { source: "yahoo", symbol: "NFLX" },
  intel: { source: "yahoo", symbol: "INTC" },
  palantir: { source: "yahoo", symbol: "PLTR" },
  coinbase: { source: "yahoo", symbol: "COIN" },
  oracle: { source: "yahoo", symbol: "ORCL" },
  micron: { source: "yahoo", symbol: "MU" },
  costco: { source: "yahoo", symbol: "COST" },
  alibaba: { source: "yahoo", symbol: "BABA" },
  rivian: { source: "yahoo", symbol: "RIVN" },
  tsmc: { source: "yahoo", symbol: "TSM" },
  robinhood: { source: "yahoo", symbol: "HOOD" },
  lilly: { source: "yahoo", symbol: "LLY" },
  circle: { source: "yahoo", symbol: "CRCL" },
  gme: { source: "yahoo", symbol: "GME" },
  rocketlab: { source: "yahoo", symbol: "RKLB" },
  draftkings: { source: "yahoo", symbol: "DKNG" },

  // 비상장 — 정규장 없음
  spacex: null,
  openai: null,
  anthropic: null,

  // 글로벌 지수
  sp500: { source: "yahoo", symbol: "^GSPC" },
  nikkei: { source: "yahoo", symbol: "^N225" },
  nifty: { source: "yahoo", symbol: "^NSEI" },
  vix: { source: "yahoo", symbol: "^VIX" },
  dxy: { source: "yahoo", symbol: "DX-Y.NYB" },
};

export type RegularClose = {
  price: number;
  currency: "USD" | "KRW";
  source: "naver" | "yahoo";
};

const UA = "Mozilla/5.0 (compatible; kr-stocks/1.0)";

async function fetchNaver(code: string): Promise<RegularClose | null> {
  try {
    const r = await fetch(`https://m.stock.naver.com/api/stock/${code}/basic`, {
      headers: { "User-Agent": UA },
      next: { revalidate: 3600 }, // 1시간 캐시
    });
    if (!r.ok) return null;
    const d: any = await r.json();
    const p = parseFloat(String(d?.closePrice ?? "").replace(/,/g, ""));
    if (!Number.isFinite(p) || p <= 0) return null;
    return { price: p, currency: "KRW", source: "naver" };
  } catch {
    return null;
  }
}

async function fetchYahoo(symbol: string): Promise<RegularClose | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?range=1d&interval=1d`;
    const r = await fetch(url, {
      headers: { "User-Agent": UA },
      next: { revalidate: 3600 },
    });
    if (!r.ok) return null;
    const d: any = await r.json();
    const meta = d?.chart?.result?.[0]?.meta;
    const p =
      meta?.regularMarketPrice ?? meta?.previousClose ?? meta?.chartPreviousClose ?? null;
    if (typeof p !== "number" || !Number.isFinite(p) || p <= 0) return null;
    const currency = meta?.currency === "KRW" ? "KRW" : "USD";
    return { price: p, currency, source: "yahoo" };
  } catch {
    return null;
  }
}

/** 39 슬러그 전체 정규장 종가 fetch (병렬). 매핑 없거나 실패한 종목은 누락. */
export async function fetchAllRegularCloses(): Promise<Record<string, RegularClose>> {
  const tasks: Promise<[string, RegularClose | null]>[] = [];
  for (const [slug, m] of Object.entries(MAPPING)) {
    if (!m) continue;
    const task =
      m.source === "naver"
        ? fetchNaver(m.code).then((v): [string, RegularClose | null] => [slug, v])
        : fetchYahoo(m.symbol).then((v): [string, RegularClose | null] => [slug, v]);
    tasks.push(task);
  }
  const results = await Promise.all(tasks);
  const out: Record<string, RegularClose> = {};
  for (const [slug, v] of results) {
    if (v) out[slug] = v;
  }
  return out;
}
