// HL + Upbit 합성 (server-side fetch) + 정규장 종가 병합 (Naver/Yahoo)
import { SYMBOLS, type SymbolMeta } from "./universe";
import { fetchAllRegularCloses, type RegularClose } from "./regularClose";

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
    /** 정규장 가격 (장중이면 실시간 변동, 장 마감 후면 그날 종가). Naver KRW 또는 Yahoo USD */
    regular_close: number | null;
    regular_close_krw: number | null;
    regular_close_usd: number | null;
    /** 전일 종가 — 장중 비교 reference (안정값). 가용한 종목만. */
    regular_prev_close_krw: number | null;
    regular_prev_close_usd: number | null;
    /** 정규장 개장 중 여부. true면 regular_close_* = 실시간 장중가. */
    is_intraday_live: boolean;
    regular_source: "naver" | "yahoo" | null;
    /** HL 가격 vs 정규장 종가 premium (%). 비상장/매핑 없으면 null */
    hl_premium_pct: number | null;
    /**
     * 시간대 인지 메인 표시 가격 (UI 우선 사용).
     *  - "live"  KRX/NYSE 정규장 장중 → regular_close
     *  - "nxt"   NXT 시간외 거래중 → nxt_price (한국주식 only)
     *  - "closed" 휴장 → HL per_share / mark
     */
    main_display_krw: number | null;
    main_display_usd: number | null;
    /** 메인 표시 가격의 소스 — UI 라벨/색 분기. */
    main_source: "regular_live" | "nxt_live" | "hl_perp";
    /** 시장 phase — 동그라미 색 + 라벨 분기 (3-tier). */
    market_phase: "live" | "nxt" | "closed";
    /** NXT 시간외 가격 (한국주식·KRW). phase="nxt" 일 때 메인. */
    nxt_price_krw: number | null;
    nxt_price_usd: number | null;
    /**
     * 메인 가격의 변동률 (%) — phase 인지.
     *  - live/nxt → 전일 대비 변동률 (네이버 fluctuationsRatio / yahoo 계산)
     *  - closed → HL 24h chg (mark vs prevDayPx, change_24h_pct 동일)
     */
    main_change_pct: number;
    /** 변동률 라벨 — "전일 대비" / "HL 24h" */
    main_change_label: string;
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
  const [xyz, vntl, fx, regCloses] = await Promise.all([
    fetchHlDex("xyz"),
    fetchHlDex("vntl"),
    fetchKrwUsdt(),
    fetchAllRegularCloses(),
  ]);

  const rows: PriceRow[] = SYMBOLS.map((sym) => {
    const src = sym.dex === "xyz" ? xyz : vntl;
    const ctx = src.get(sym.ticker);
    if (!ctx) return { ...sym, market: null };
    const mark = Number(ctx.markPx ?? 0);
    const prev = Number(ctx.prevDayPx ?? 0) || mark;
    const chg = prev > 0 ? ((mark - prev) / prev) * 100 : 0;
    // is_fx (환율 종목): HL mark가 이미 "1 USDT의 KRW 가격" 단위라
    //   USDT 가격으로 오인해서 × fx.rate 곱하면 ₩2,170,000 같은 이중 곱셈 발생.
    //   → krw_price = mark (그대로), USD 표시는 1.0 (1 USDT = $1).
    const isFx = sym.is_fx === true;
    const krw_price = isFx ? mark : mark * fx.rate;
    const ratio = sym.share_ratio ?? null;
    const per_share_usd = (ratio != null && !isFx) ? mark * ratio : null;
    const per_share_krw = (ratio != null && !isFx) ? krw_price * ratio : null;

    // 정규장 가격 (장중이면 실시간) + 전일 종가 + NXT 시간외 + premium 계산
    const rc: RegularClose | undefined = regCloses[sym.slug];
    let regular_close_krw: number | null = null;
    let regular_close_usd: number | null = null;
    let regular_prev_close_krw: number | null = null;
    let regular_prev_close_usd: number | null = null;
    let nxt_price_krw: number | null = null;
    let nxt_price_usd: number | null = null;
    let hl_premium_pct: number | null = null;
    if (rc) {
      if (rc.currency === "KRW") {
        regular_close_krw = rc.price;
        regular_close_usd = fx.rate > 0 ? rc.price / fx.rate : null;
        if (rc.previousClose != null && rc.previousClose > 0) {
          regular_prev_close_krw = rc.previousClose;
          regular_prev_close_usd = fx.rate > 0 ? rc.previousClose / fx.rate : null;
        }
        if (rc.nxtPrice != null && rc.nxtPrice > 0) {
          nxt_price_krw = rc.nxtPrice;
          nxt_price_usd = fx.rate > 0 ? rc.nxtPrice / fx.rate : null;
        }
      } else {
        regular_close_usd = rc.price;
        regular_close_krw = rc.price * fx.rate;
        if (rc.previousClose != null && rc.previousClose > 0) {
          regular_prev_close_usd = rc.previousClose;
          regular_prev_close_krw = rc.previousClose * fx.rate;
        }
        // Yahoo (미국·글로벌) 는 nxtPrice null — 분기 불필요
      }
      // HL vs 정규장 비교 — USD 기준 (환율 영향 제거)
      // 단 ratio가 적용된 한국 주식은 per_share_usd 기준
      const hlForCompare = per_share_usd ?? mark;
      if (regular_close_usd && regular_close_usd > 0) {
        const raw = ((hlForCompare - regular_close_usd) / regular_close_usd) * 100;
        // Sanity guard: |premium| > 50%면 데이터 신뢰 불가 (잘못된 fetch 가능성) → null
        if (Math.abs(raw) <= 50) {
          hl_premium_pct = raw;
        } else {
          regular_close_krw = null;
          regular_close_usd = null;
          regular_prev_close_krw = null;
          regular_prev_close_usd = null;
          nxt_price_krw = null;
          nxt_price_usd = null;
        }
      }
    }

    return {
      ...sym,
      market: {
        mark_px_usd: round(isFx ? 1.0 : mark, 4),
        prev_day_px_usd: round(isFx ? 1.0 : prev, 4),
        change_24h_pct: round(chg, 3),
        krw_price: round(krw_price, 2),
        per_share_usd: per_share_usd != null ? round(per_share_usd, 4) : null,
        per_share_krw: per_share_krw != null ? round(per_share_krw, 2) : null,
        open_interest: Number(ctx.openInterest ?? 0),
        day_volume_usd: round(Number(ctx.dayNtlVlm ?? 0), 2),
        funding: Number(ctx.funding ?? 0),
        regular_close: rc?.price ?? null,
        regular_close_krw: regular_close_krw != null ? round(regular_close_krw, 2) : null,
        regular_close_usd: regular_close_usd != null ? round(regular_close_usd, 4) : null,
        regular_prev_close_krw: regular_prev_close_krw != null ? round(regular_prev_close_krw, 2) : null,
        regular_prev_close_usd: regular_prev_close_usd != null ? round(regular_prev_close_usd, 4) : null,
        is_intraday_live: rc?.isLive === true,
        regular_source: rc?.source ?? null,
        hl_premium_pct: hl_premium_pct != null ? round(hl_premium_pct, 2) : null,
        nxt_price_krw: nxt_price_krw != null ? round(nxt_price_krw, 2) : null,
        nxt_price_usd: nxt_price_usd != null ? round(nxt_price_usd, 4) : null,
        // 시간대 인지 메인 가격 + 변동률 — 3-phase 분기
        ...(() => {
          const phase = rc?.phase ?? "closed";
          const hlKrw = per_share_krw ?? krw_price;
          // isFx 종목은 mark가 KRW 단위 — USD 표시값은 1.0
          const hlUsd = per_share_usd ?? (isFx ? 1.0 : mark);
          let mainKrw: number, mainUsd: number;
          let mainSource: "regular_live" | "nxt_live" | "hl_perp";
          if (phase === "live" && regular_close_krw != null) {
            mainKrw = regular_close_krw;
            mainUsd = regular_close_usd ?? hlUsd;
            mainSource = "regular_live";
          } else if (phase === "nxt" && nxt_price_krw != null) {
            mainKrw = nxt_price_krw;
            mainUsd = nxt_price_usd ?? hlUsd;
            mainSource = "nxt_live";
          } else {
            mainKrw = hlKrw;
            mainUsd = hlUsd;
            mainSource = "hl_perp";
          }
          // 변동률 phase 인지 :
          //   live/nxt → 네이버/야후 전일 대비 ratio (메인 가격과 정합)
          //   closed → HL 24h chg (mark vs prevDayPx, chg 변수 그대로)
          // 라벨은 phase별로 차별 — 라오니 "5/13 종가 기준" 모방 회피, 형님 phase 인지 강조
          const useRegularChg =
            (phase === "live" || phase === "nxt") && rc?.fluctuationsRatio != null;
          const mainChg = useRegularChg ? rc!.fluctuationsRatio! : chg;
          const mainLabel =
            phase === "live" && useRegularChg
              ? "장중 변동"
              : phase === "nxt" && useRegularChg
              ? "NXT 변동"
              : "HL 24h";
          return {
            main_display_krw: round(mainKrw, 2),
            main_display_usd: round(mainUsd, 4),
            main_source: mainSource,
            market_phase: phase,
            main_change_pct: round(mainChg, 3),
            main_change_label: mainLabel,
          };
        })(),
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
