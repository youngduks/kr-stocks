// HL recentTrades 기반 stateless 고래 활동 분석
// 형님 5/13 요청 (Path B): Vercel KV 없이 즉시 시작 — 최근 ~100건 sample
// 한계: HL API가 단일 호출당 ~10~100건 (시간 span 분~시간), 24h 누적 X
// 라벨: "최근 고래 활동" — 24h 약속 안 함 (정직)

const HL_API = "https://api.hyperliquid.xyz/info";

export type WhaleFlow = {
  /** 거래 쌍 (예: "xyz:SMSN") */
  ticker: string;
  /** 응답에 포함된 전체 fill 수 */
  total_trades: number;
  /** threshold 이상 fill 수 */
  whale_count: number;
  /** 매수 측 fill 누적 USD */
  whale_buy_usd: number;
  /** 매도 측 fill 누적 USD */
  whale_sell_usd: number;
  /** buy - sell (net) */
  net_usd: number;
  /** buy_total / (buy_total+sell_total) × 100, 데이터 없으면 50 */
  long_pct: number;
  /** 최대 단일 fill 의 USD value */
  max_fill_usd: number;
  /** "B" = 매수 / "A" = 매도 */
  max_fill_side: "B" | "A";
  /** taker wallet 주소 (없으면 null) */
  max_fill_wallet: string | null;
  /** 응답 거래의 시간 span (분) — sample 신선도 */
  span_minutes: number;
  /** whale threshold (USD) */
  threshold_usd: number;
};

type HlRawTrade = {
  coin: string;
  side: "B" | "A";
  px: string;
  sz: string;
  time: number;
  hash: string;
  tid: number;
  users?: string[]; // [maker, taker] (or [maker, taker, ...])
};

/**
 * 종목별 최근 fills (~10~100건) 기반 고래 sentiment 산출.
 *
 * 사용 (Server Component):
 * ```ts
 * const flow = await fetchWhaleFlow("xyz:SMSN", 5000);
 * ```
 *
 * @param coin HL ticker (예: "xyz:SMSN", "xyz:SILVER", "vntl:MAG7", "BTC")
 * @param threshold 최소 fill size USD (default $5k)
 */
export async function fetchWhaleFlow(
  coin: string,
  threshold = 5000
): Promise<WhaleFlow | null> {
  try {
    const r = await fetch(HL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "recentTrades", coin }),
      next: { revalidate: 30 }, // 30초 cache (Vercel ISR)
    });
    if (!r.ok) return null;
    const raw: unknown = await r.json();
    if (!Array.isArray(raw) || raw.length === 0) return null;

    // size_usd 계산 + 거래 정보 추출
    const trades = (raw as HlRawTrade[])
      .filter((t) => t && typeof t.px === "string" && typeof t.sz === "string")
      .map((t) => ({
        side: t.side,
        size_usd: parseFloat(t.px) * parseFloat(t.sz),
        time: t.time,
        // users 배열: [maker, taker]. taker가 적극적 거래자 → wallet 추출
        taker_wallet:
          Array.isArray(t.users) && t.users.length >= 2 ? t.users[1] : null,
      }))
      .filter((t) => Number.isFinite(t.size_usd) && t.size_usd > 0);

    if (trades.length === 0) return null;

    // whale threshold 적용
    const whales = trades.filter((t) => t.size_usd >= threshold);

    const buy_total = whales
      .filter((t) => t.side === "B")
      .reduce((s, t) => s + t.size_usd, 0);
    const sell_total = whales
      .filter((t) => t.side === "A")
      .reduce((s, t) => s + t.size_usd, 0);
    const total = buy_total + sell_total;

    // 최대 단일 fill 추출 (whale 중에서)
    let max_fill: (typeof whales)[number] | null = null;
    for (const t of whales) {
      if (!max_fill || t.size_usd > max_fill.size_usd) max_fill = t;
    }

    // 시간 span (분) — sample 신선도 척도
    const last_time = trades[0].time; // 최신
    const first_time = trades[trades.length - 1].time; // 가장 오래된
    const span_minutes = Math.max(0, (last_time - first_time) / 60000);

    return {
      ticker: coin,
      total_trades: trades.length,
      whale_count: whales.length,
      whale_buy_usd: buy_total,
      whale_sell_usd: sell_total,
      net_usd: buy_total - sell_total,
      long_pct: total > 0 ? (buy_total / total) * 100 : 50,
      max_fill_usd: max_fill?.size_usd ?? 0,
      max_fill_side: max_fill?.side ?? "B",
      max_fill_wallet: max_fill?.taker_wallet ?? null,
      span_minutes,
      threshold_usd: threshold,
    };
  } catch {
    return null;
  }
}

/**
 * USD value 한국어 친화 포맷
 *  $1,234   → "$1.2k"
 *  $12,345  → "$12k"
 *  $1.2M    → "$1.2M"
 *  $500     → "$500"
 */
export function fmtUsdShort(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "$0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}$${(abs / 1000).toFixed(0)}k`;
  if (abs >= 1_000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** 시간 span 한국어 라벨 — "X분간" / "X시간 전부터" */
export function fmtSpanLabel(span_minutes: number): string {
  if (span_minutes < 1) return "1분 이내";
  if (span_minutes < 60) return `${Math.round(span_minutes)}분간`;
  const h = span_minutes / 60;
  if (h < 24) return `${h.toFixed(1)}시간`;
  return `${(h / 24).toFixed(1)}일`;
}
