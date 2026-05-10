// HL + Upbit 합성 (server-side fetch)
import { SYMBOLS, type SymbolMeta } from "./universe";

const HL_API = "https://api.hyperliquid.xyz/info";
const UPBIT_API = "https://api.upbit.com/v1/ticker?markets=KRW-USDT";

type HlAssetCtx = {
  markPx: string;
  prevDayPx: string;
  openInterest: string;
  dayNtlVlm: string;
  funding: string;
};

export type PriceRow = SymbolMeta & {
  market: {
    mark_px_usd: number;
    prev_day_px_usd: number;
    change_24h_pct: number;
    krw_price: number;
    per_share_usd: number | null;
    per_share_krw: number | null;
    open_interest: number;
    day_volume_usd: number;
    funding: number;
  } | null;
};

async function fetchHlDex(dex: string): Promise<Map<string, HlAssetCtx>> {
  const r = await fetch(HL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "metaAndAssetCtxs", dex }),
    next: { revalidate: 30 }, // 30초 캐시
  });
  if (!r.ok) throw new Error(`HL ${dex} ${r.status}`);
  const data: any = await r.json();
  const universe = data?.[0]?.universe ?? [];
  const ctxs = data?.[1] ?? [];
  const out = new Map<string, HlAssetCtx>();
  for (let i = 0; i < universe.length; i++) {
    const name = universe[i]?.name;
    if (name && ctxs[i]) out.set(name, ctxs[i]);
  }
  return out;
}

async function fetchKrwUsdt(): Promise<{ rate: number; change_24h_pct: number }> {
  const r = await fetch(UPBIT_API, { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 30 } });
  if (!r.ok) throw new Error(`Upbit ${r.status}`);
  const arr: any[] = await r.json();
  const t = arr?.[0] ?? {};
  return {
    rate: Number(t.trade_price ?? 0),
    change_24h_pct: Number(t.change_rate ?? 0) * 100,
  };
}

export async function fetchAllPrices(): Promise<{
  fetched_at: number;
  fx: { krw_per_usdt: number; change_24h_pct: number };
  symbols: PriceRow[];
}> {
  const [xyz, vntl, fx] = await Promise.all([
    fetchHlDex("xyz"),
    fetchHlDex("vntl"),
    fetchKrwUsdt(),
  ]);

  const rows: PriceRow[] = SYMBOLS.map((sym) => {
    const src = sym.dex === "xyz" ? xyz : vntl;
    const ctx = src.get(sym.ticker);
    if (!ctx) return { ...sym, market: null };
    const mark = Number(ctx.markPx ?? 0);
    const prev = Number(ctx.prevDayPx ?? 0) || mark;
    const chg = prev > 0 ? ((mark - prev) / prev) * 100 : 0;
    const krw_price = mark * fx.rate;
    const ratio = sym.share_ratio ?? null;
    const per_share_usd = ratio != null ? mark * ratio : null;
    const per_share_krw = ratio != null ? krw_price * ratio : null;
    return {
      ...sym,
      market: {
        mark_px_usd: round(mark, 4),
        prev_day_px_usd: round(prev, 4),
        change_24h_pct: round(chg, 3),
        krw_price: round(krw_price, 2),
        per_share_usd: per_share_usd != null ? round(per_share_usd, 4) : null,
        per_share_krw: per_share_krw != null ? round(per_share_krw, 2) : null,
        open_interest: Number(ctx.openInterest ?? 0),
        day_volume_usd: round(Number(ctx.dayNtlVlm ?? 0), 2),
        funding: Number(ctx.funding ?? 0),
      },
    };
  });

  return {
    fetched_at: Date.now(),
    fx: { krw_per_usdt: fx.rate, change_24h_pct: fx.change_24h_pct },
    symbols: rows,
  };
}

function round(n: number, d: number): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
