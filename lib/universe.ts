// universe_map.json import + 카테고리 헬퍼
import universeData from "../data/universe_map.json";

export type SymbolMeta = {
  slug: string;
  ticker: string;
  dex: "xyz" | "vntl";
  /** 시세 소스 — 미지정/"hl"이면 Hyperliquid(dex), "binance"면 Binance USDT-M 선물, "adr"이면 Yahoo(미국 ADR·USD). */
  source?: "hl" | "binance" | "adr";
  /** source="binance"일 때 fapi 심볼 (예: SAMSUNGUSDT). */
  binance_symbol?: string;
  name_ko?: string;
  name_en?: string;
  category: "korea" | "us" | "private" | "global" | "themes";
  tier: number;
  is_private?: boolean;
  is_index?: boolean;
  is_etf?: boolean;
  is_fx?: boolean;
  /** 미국 상장 ADR — 카테고리는 korea여도 USD로 렌더링(달러 메인 + 원화 보조). 시세는 Yahoo. */
  is_adr?: boolean;
  share_ratio?: number;
  regular_market?: string;
  krx_code?: string;
  implied_valuation_usd?: number;
  note?: string;
};

export const SYMBOLS: SymbolMeta[] = (universeData as any).symbols as SymbolMeta[];

export function bySlug(slug: string): SymbolMeta | undefined {
  return SYMBOLS.find((s) => s.slug === slug);
}

export function byCategory(cat: SymbolMeta["category"]): SymbolMeta[] {
  return SYMBOLS.filter((s) => s.category === cat);
}

export const CATEGORY_LABELS: Record<SymbolMeta["category"], { ko: string; en: string; emoji: string }> = {
  korea: { ko: "한국 주식", en: "Korea", emoji: "🇰🇷" },
  us: { ko: "미국 주식", en: "US Stocks", emoji: "🇺🇸" },
  private: { ko: "비상장 회사", en: "Private", emoji: "🚀" },
  global: { ko: "글로벌 지수", en: "Global Index", emoji: "🌐" },
  themes: { ko: "테마 ETF", en: "Theme ETF", emoji: "🎯" },
};
