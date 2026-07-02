// 미장 반도체 야간 시그널 — SOXL(반도체 3배 레버리지 ETF) 기반.
//
// SOXL은 미국 반도체 지수(ICE Semiconductor)를 3배 추종한다. 미국 정규장은 한국 야간
// (23:30~06:00 KST)에 열리므로, 한국 개장 전 삼성전자·SK하이닉스의 방향을 가늠하는
// 선행지표로 국내 리테일이 실제로 가장 많이 본다.
//
// 원리: SOXL 변동 ÷ 3 ≈ 미국 반도체 지수 실제 변동. 이 값이 삼성·하이닉스 내일 압력.
// 데이터: Yahoo Finance (사이트가 정규장 종가에 이미 사용 중인 소스).

const UA = "Mozilla/5.0 (compatible; kr-stocks/1.0)";

export type SemiQuote = {
  symbol: string;
  price: number;
  prevClose: number;
  changePct: number;
};

export type SemiSignal = {
  soxl: SemiQuote | null;
  nvda: SemiQuote | null;
  /** SOXL 변동 ÷ 3 = 미국 반도체 지수 실제 변동 추정 (%) */
  impliedSemiPct: number | null;
  /** 삼성·하이닉스 내일 방향 압력 */
  direction: "strong_up" | "up" | "flat" | "down" | "strong_down" | "unknown";
  /** 미국 정규장 현재 개장 여부 (한국 야간이면 대개 true) */
  isLive: boolean;
  /** 마지막 거래 시각 (epoch sec) — "지난밤 종가 기준" 라벨용 */
  asOf: number | null;
};

async function fetchYahooQuote(symbol: string): Promise<{ q: SemiQuote; isLive: boolean; asOf: number | null } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?range=5d&interval=1d`;
    const r = await fetch(url, {
      headers: { "User-Agent": UA },
      next: { revalidate: 300 }, // 5분 캐시 — 야간 선행지표라 초단위 불필요 + Yahoo rate 보호
    });
    if (!r.ok) return null;
    const d: any = await r.json();
    const result = d?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return null;

    const price =
      typeof meta.regularMarketPrice === "number" && meta.regularMarketPrice > 0
        ? meta.regularMarketPrice
        : null;
    let prevClose =
      typeof meta.chartPreviousClose === "number" && meta.chartPreviousClose > 0
        ? meta.chartPreviousClose
        : typeof meta.previousClose === "number" && meta.previousClose > 0
        ? meta.previousClose
        : null;

    // fallback: 일봉 close 배열의 마지막 2개로 보정 (주말·공휴일 meta 불안정 대비)
    if ((price == null || prevClose == null)) {
      const closes: number[] = (result?.indicators?.quote?.[0]?.close ?? []).filter(
        (v: any) => typeof v === "number" && v > 0
      );
      if (closes.length >= 2) {
        const last = closes[closes.length - 1];
        const prev = closes[closes.length - 2];
        return {
          q: { symbol, price: last, prevClose: prev, changePct: ((last - prev) / prev) * 100 },
          isLive: false,
          asOf: typeof meta.regularMarketTime === "number" ? meta.regularMarketTime : null,
        };
      }
      return null;
    }

    const changePct = ((price - prevClose) / prevClose) * 100;

    // 정규장 개장 여부 — currentTradingPeriod.regular {start,end} epoch 로 판단
    const period = meta?.currentTradingPeriod?.regular;
    const nowSec = Math.floor(Date.now() / 1000);
    const start = typeof period?.start === "number" ? period.start : null;
    const end = typeof period?.end === "number" ? period.end : null;
    const isLive = start != null && end != null ? nowSec >= start && nowSec < end : false;
    const asOf = typeof meta.regularMarketTime === "number" ? meta.regularMarketTime : null;

    return { q: { symbol, price, prevClose, changePct }, isLive, asOf };
  } catch {
    return null;
  }
}

function classify(impliedSemiPct: number | null): SemiSignal["direction"] {
  if (impliedSemiPct == null) return "unknown";
  if (impliedSemiPct >= 1.5) return "strong_up";
  if (impliedSemiPct >= 0.4) return "up";
  if (impliedSemiPct <= -1.5) return "strong_down";
  if (impliedSemiPct <= -0.4) return "down";
  return "flat";
}

export async function fetchSemiSignal(): Promise<SemiSignal> {
  const [soxlRes, nvdaRes] = await Promise.all([
    fetchYahooQuote("SOXL"),
    fetchYahooQuote("NVDA"),
  ]);

  const soxl = soxlRes?.q ?? null;
  const nvda = nvdaRes?.q ?? null;
  const impliedSemiPct = soxl ? soxl.changePct / 3 : null;

  return {
    soxl,
    nvda,
    impliedSemiPct,
    direction: classify(impliedSemiPct),
    isLive: soxlRes?.isLive ?? false,
    asOf: soxlRes?.asOf ?? null,
  };
}
