// 정규장 종가 fetch — Naver (한국) + Yahoo Finance (미국/글로벌)
// HL 가격 vs 정규장 종가 비교용. 비상장(SpaceX/OpenAI/Anthropic)은 매핑 없음.

type RegularSource =
  | { source: "naver"; code: string }
  | { source: "yahoo"; symbol: string; fallbackSymbol?: string }
  | null;

const MAPPING: Record<string, RegularSource> = {
  // 한국 주식 (네이버)
  samsung: { source: "naver", code: "005930" },
  hynix: { source: "naver", code: "000660" },
  hyundai: { source: "naver", code: "005380" },
  // SK하이닉스 나스닥 ADR (2026-07-10 상장). 임시 티커 SKHYV → 정식 티커 SKHY(7/13~) 전환 중
  // → 정식 티커 우선 시도, 실패 시 임시 티커로 자동 폴백 (전환일 수동 수정 불필요)
  hynix_adr: { source: "yahoo", symbol: "SKHY", fallbackSymbol: "SKHYV" },
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
  spacex: { source: "yahoo", symbol: "SPCX" },

  // 미국 블루칩 26종 (바이낸스 TRADIFI_PERPETUAL 확장분, 2026-08-25 추가)
  broadcom: { source: "yahoo", symbol: "AVGO" },
  qualcomm: { source: "yahoo", symbol: "QCOM" },
  disney: { source: "yahoo", symbol: "DIS" },
  uber: { source: "yahoo", symbol: "UBER" },
  cisco: { source: "yahoo", symbol: "CSCO" },
  homedepot: { source: "yahoo", symbol: "HD" },
  walmart: { source: "yahoo", symbol: "WMT" },
  jpmorgan: { source: "yahoo", symbol: "JPM" },
  visa: { source: "yahoo", symbol: "V" },
  adobe: { source: "yahoo", symbol: "ADBE" },
  salesforce: { source: "yahoo", symbol: "CRM" },
  ibm: { source: "yahoo", symbol: "IBM" },
  asml: { source: "yahoo", symbol: "ASML" },
  arm: { source: "yahoo", symbol: "ARM" },
  dell: { source: "yahoo", symbol: "DELL" },
  sony: { source: "yahoo", symbol: "SONY" },
  cocacola: { source: "yahoo", symbol: "KO" },
  paypal: { source: "yahoo", symbol: "PYPL" },
  ebay: { source: "yahoo", symbol: "EBAY" },
  goldmansachs: { source: "yahoo", symbol: "GS" },
  caterpillar: { source: "yahoo", symbol: "CAT" },
  texasinstruments: { source: "yahoo", symbol: "TXN" },
  shopify: { source: "yahoo", symbol: "SHOP" },
  reddit: { source: "yahoo", symbol: "RDDT" },
  novonordisk: { source: "yahoo", symbol: "NVO" },
  // 텐센트는 홍콩 1차 상장(0700.HK) — Yahoo 미국 OTC ADR 티커(TCEHY)로 대체
  tencent: { source: "yahoo", symbol: "TCEHY" },

  // 비상장 — 정규장 없음
  openai: null,
  anthropic: null,

  // 글로벌 지수
  sp500: { source: "yahoo", symbol: "^GSPC" },
  nikkei: { source: "yahoo", symbol: "^N225" },
  nifty: { source: "yahoo", symbol: "^NSEI" },
  vix: { source: "yahoo", symbol: "^VIX" },
  dxy: { source: "yahoo", symbol: "DX-Y.NYB" },
};

export type MarketPhase = "live" | "nxt" | "closed";

export type RegularClose = {
  /** 마지막 거래가 — 장중이면 실시간 변동, 장 마감 후면 그날 종가. */
  price: number;
  /** 전일 종가 — 장중 비교 reference (안정값). */
  previousClose: number | null;
  /** 정규장 개장 여부 — true면 price = 실시간 장중가. (live phase only) */
  isLive: boolean;
  /**
   * 시장 phase :
   *  - "live"   KRX/NYSE 정규장 거래중
   *  - "nxt"    NXT 시간외 거래중 (한국주식 only, 15:30~20:00 KST)
   *  - "closed" 모두 휴장 (HL 24h perp 만 거래)
   */
  phase: MarketPhase;
  /** NXT 시간외 가격 (한국주식·KRW 단위, phase="nxt"일 때 메인). */
  nxtPrice: number | null;
  /**
   * 메인 가격의 전일 대비 변동률 (%) — phase 매칭.
   *  - live  → 네이버 fluctuationsRatio (KRX 장중 vs 전일 종가)
   *  - nxt   → 네이버 overMarketPriceInfo.fluctuationsRatio (NXT vs 전일 종가)
   *  - closed → null (UI 는 HL 24h chg fallback)
   *  - yahoo (미국 live) → (mark - chartPreviousClose) / chartPreviousClose * 100
   */
  fluctuationsRatio: number | null;
  /** 마지막 거래 시각 (epoch sec). UI 보조. */
  tradedAt: number | null;
  currency: "USD" | "KRW";
  source: "naver" | "yahoo";
};

const UA = "Mozilla/5.0 (compatible; kr-stocks/1.0)";

async function fetchNaver(code: string): Promise<RegularClose | null> {
  try {
    // 장중엔 60s 캐시 (실시간성), 장 마감 후엔 30분 캐시 (서버 부하 ↓)
    // → 항상 60s 로 안전 — fetchPrices 가 revalidate:30 호출하므로 일관
    const r = await fetch(`https://m.stock.naver.com/api/stock/${code}/basic`, {
      headers: { "User-Agent": UA },
      next: { revalidate: 60 },
    });
    if (!r.ok) return null;
    const d: any = await r.json();
    const p = parseFloat(String(d?.closePrice ?? "").replace(/,/g, ""));
    if (!Number.isFinite(p) || p <= 0) return null;
    // 전일 종가 = 현재가 - 전일 대비 변동
    const diff = parseFloat(String(d?.compareToPreviousClosePrice ?? "0").replace(/,/g, ""));
    const previousClose = Number.isFinite(diff) ? p - diff : null;
    // marketStatus: "OPEN" | "CLOSE" | (그 외) → isLive
    const isLive = String(d?.marketStatus ?? "").toUpperCase() === "OPEN";
    // NXT 시간외 — overMarketPriceInfo.overMarketStatus="OPEN" 일 때 nxt phase + overPrice 사용
    const omi = d?.overMarketPriceInfo;
    const overOpen =
      omi != null && String(omi?.overMarketStatus ?? "").toUpperCase() === "OPEN";
    const overPrice = overOpen
      ? parseFloat(String(omi?.overPrice ?? "").replace(/,/g, ""))
      : NaN;
    const nxtPrice = Number.isFinite(overPrice) && overPrice > 0 ? overPrice : null;
    // phase 결정 — 우선순위: KRX 정규장 OPEN > NXT 시간외 OPEN > closed
    const phase: MarketPhase = isLive ? "live" : nxtPrice != null ? "nxt" : "closed";
    // 전일 대비 변동률 — phase 매칭
    let fluctuationsRatio: number | null = null;
    const parseRatio = (v: any): number | null => {
      const r = parseFloat(String(v ?? "").replace(/[,+%]/g, ""));
      return Number.isFinite(r) ? r : null;
    };
    if (phase === "live") fluctuationsRatio = parseRatio(d?.fluctuationsRatio);
    else if (phase === "nxt") fluctuationsRatio = parseRatio(omi?.fluctuationsRatio);
    // localTradedAt: ISO 8601 with KST offset (NXT 시간엔 omi.localTradedAt 가 더 최신)
    let tradedAt: number | null = null;
    try {
      const ts = phase === "nxt" ? String(omi?.localTradedAt ?? "") : String(d?.localTradedAt ?? "");
      const t = new Date(ts).getTime();
      if (Number.isFinite(t)) tradedAt = Math.floor(t / 1000);
    } catch {
      tradedAt = null;
    }
    return { price: p, previousClose, isLive, phase, nxtPrice, fluctuationsRatio, tradedAt, currency: "KRW", source: "naver" };
  } catch {
    return null;
  }
}

async function fetchYahoo(symbol: string): Promise<RegularClose | null> {
  try {
    // range=1d → close 배열이 1개뿐이라 meta.chartPreviousClose를 검증 없이 그대로
    // 믿을 수밖에 없었음. 5d로 늘려 일봉 종가 배열로 전일종가를 직접 계산·우선
    // 신뢰하도록 변경(2026-07-30) — meta.chartPreviousClose가 실제 최근 거래일
    // 종가와 무관한 값을 반환하는 Yahoo API 버그를 실측 확인함(TSLA/AMD/MU/TSM/
    // SKHY 등 29종목 중 21종목에서 등락률 부호까지 반대로 나오는 수준으로 광범위).
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?range=5d&interval=1d`;
    const r = await fetch(url, {
      headers: { "User-Agent": UA },
      next: { revalidate: 60 },
    });
    if (!r.ok) return null;
    const d: any = await r.json();
    const result = d?.chart?.result?.[0];
    const meta = result?.meta;
    const p =
      meta?.regularMarketPrice ?? meta?.previousClose ?? meta?.chartPreviousClose ?? null;
    if (typeof p !== "number" || !Number.isFinite(p) || p <= 0) return null;
    const currency = meta?.currency === "KRW" ? "KRW" : "USD";

    const closes: number[] = (result?.indicators?.quote?.[0]?.close ?? []).filter(
      (v: any) => typeof v === "number" && v > 0
    );
    let previousClose: number | null = closes.length >= 2 ? closes[closes.length - 2] : null;
    if (previousClose == null) {
      previousClose =
        typeof meta?.chartPreviousClose === "number" && meta.chartPreviousClose > 0
          ? meta.chartPreviousClose
          : typeof meta?.previousClose === "number" && meta.previousClose > 0
          ? meta.previousClose
          : null;
    }
    // marketState 가 endpoint 별로 들쭉날쭉 → currentTradingPeriod.regular {start, end} epoch 로 판단
    const period = meta?.currentTradingPeriod?.regular;
    const nowSec = Math.floor(Date.now() / 1000);
    const start = typeof period?.start === "number" ? period.start : null;
    const end = typeof period?.end === "number" ? period.end : null;
    const isLive = start != null && end != null ? nowSec >= start && nowSec < end : false;
    const tradedAt = typeof meta?.regularMarketTime === "number" ? meta.regularMarketTime : null;
    // Yahoo (미국·글로벌) 는 NXT 개념 없음 — live / closed 2-phase 만
    const phase: MarketPhase = isLive ? "live" : "closed";
    // 전일 대비 변동률 — live phase 만 계산 (closed 는 UI 에서 HL 24h fallback)
    const fluctuationsRatio: number | null =
      phase === "live" && previousClose != null && previousClose > 0
        ? ((p - previousClose) / previousClose) * 100
        : null;
    return { price: p, previousClose, isLive, phase, nxtPrice: null, fluctuationsRatio, tradedAt, currency, source: "yahoo" };
  } catch {
    return null;
  }
}

/** symbol 우선 시도, 실패(상장 전/티커 소멸 등) 시 fallbackSymbol 재시도. 티커 전환기 종목용. */
async function fetchYahooWithFallback(symbol: string, fallbackSymbol?: string): Promise<RegularClose | null> {
  const primary = await fetchYahoo(symbol);
  if (primary) return primary;
  if (!fallbackSymbol) return null;
  return fetchYahoo(fallbackSymbol);
}

/** MAPPING에 등록된 슬러그 전체 정규장 종가 fetch (병렬). 매핑 없거나 실패한 종목은 누락. */
export async function fetchAllRegularCloses(): Promise<Record<string, RegularClose>> {
  const tasks: Promise<[string, RegularClose | null]>[] = [];
  for (const [slug, m] of Object.entries(MAPPING)) {
    if (!m) continue;
    const task =
      m.source === "naver"
        ? fetchNaver(m.code).then((v): [string, RegularClose | null] => [slug, v])
        : fetchYahooWithFallback(m.symbol, m.fallbackSymbol).then((v): [string, RegularClose | null] => [slug, v]);
    tasks.push(task);
  }
  const results = await Promise.all(tasks);
  const out: Record<string, RegularClose> = {};
  for (const [slug, v] of results) {
    if (v) out[slug] = v;
  }
  return out;
}
