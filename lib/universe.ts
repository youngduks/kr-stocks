// universe_map.json import + 카테고리 헬퍼
import universeData from "../data/universe_map.json";

export type SymbolMeta = {
  slug: string;
  ticker: string;
  dex: "xyz" | "vntl";
  name_ko?: string;
  name_en?: string;
  category: "korea" | "us" | "private" | "global";
  tier: number;
  is_private?: boolean;
  is_index?: boolean;
  is_etf?: boolean;
  is_fx?: boolean;
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
};
