// 사이트 정보 구조 (2026-11-16 재정비) — 헤더 칩·하위 탭·푸터·홈 입구 카드가 모두 이 정의를 쓴다.
// (모바일 하단 탭은 2026-11-16 대표님 결정으로 없앰 — 상단 6칸 메뉴가 화면 위에 붙어 따라다닌다.)
//
// 카테고리 6개: 오늘(홈) · 시세 · 신호 · 분석 · 핫딜 · 가이드
//   - 헤더에는 카테고리만 한 줄로(모바일에서 넘치지 않게 6칸 고정).
//   - 카테고리 안 페이지들은 헤더 아래 하위 탭(SUBTABS)으로 오간다.
//   - 새 페이지를 만들면 여기 match 와 tabs 에만 추가하면 된다.

export type CategoryKey = "home" | "markets" | "signals" | "analysis" | "deals" | "guide";

export type SubTab = { href: string; label: string; match: (p: string) => boolean };

export type Category = {
  key: CategoryKey;
  href: string;
  ko: string;
  en: string;
  /** 영어 페이지에서 갈 곳 (영어판이 있는 페이지만 다름) */
  enHref: string;
  /** 홈 입구 카드·푸터 설명 */
  desc: string;
  tabs: SubTab[];
};

const eq = (...paths: string[]) => (p: string) => paths.includes(p);
const under = (prefix: string) => (p: string) => p === prefix || p.startsWith(prefix + "/");

const STOCK_CATEGORIES = ["korea", "us", "private", "global", "themes"];

export const CATEGORIES: Category[] = [
  {
    key: "home",
    href: "/",
    ko: "오늘",
    en: "Today",
    enHref: "/en",
    desc: "지금 시장 상태 요약",
    tabs: [],
  },
  {
    key: "markets",
    href: "/markets",
    ko: "시세",
    en: "Markets",
    enHref: "/markets",
    desc: "한국·미국·비상장·글로벌 지수 24시간 시세",
    tabs: [
      { href: "/markets", label: "전체 시세", match: eq("/markets") },
      { href: "/korea/kospi-night", label: "코스피 야간", match: eq("/korea/kospi-night") },
      { href: "/korea/koru", label: "KORU", match: eq("/korea/koru") },
    ],
  },
  {
    key: "signals",
    href: "/signals",
    ko: "신호",
    en: "Signals",
    enHref: "/signals",
    desc: "반도체 야간 신호 · 급변 · 청산맵 · 인간지표 · 고수 지갑",
    tabs: [
      { href: "/signals", label: "신호 모음", match: eq("/signals") },
      { href: "/liquidation", label: "청산맵", match: under("/liquidation") },
      { href: "/poll", label: "인간지표", match: under("/poll") },
      { href: "/smart-money", label: "고수 지갑", match: under("/smart-money") },
    ],
  },
  {
    key: "analysis",
    href: "/analysis",
    ko: "분석",
    en: "Analysis",
    enHref: "/en/consensus",
    desc: "증권사 목표가 · 뉴스 · 자사주매입 · 리서치",
    tabs: [
      { href: "/analysis", label: "분석 모음", match: eq("/analysis") },
      { href: "/consensus", label: "목표가", match: eq("/consensus", "/en/consensus") },
      { href: "/news", label: "뉴스", match: under("/news") },
      { href: "/korea/hynix/buyback", label: "자사주", match: under("/korea/hynix/buyback") },
      { href: "/research", label: "리서치", match: under("/research") },
    ],
  },
  {
    key: "deals",
    href: "/shopping",
    ko: "핫딜",
    en: "Deals",
    enHref: "/shopping",
    desc: "쿠팡·토스쇼핑 핫딜",
    // 핫딜은 다른 것과 묶지 않는다(대표님 결정 2026-11-16) — 탭 1개라 하위 탭 줄은 표시되지 않음. 커뮤니티는 가이드 아래.
    tabs: [{ href: "/shopping", label: "핫딜", match: under("/shopping") }],
  },
  {
    key: "guide",
    href: "/guide",
    ko: "가이드",
    en: "Guide",
    enHref: "/en/guide/binance-korea-stocks",
    desc: "야간 시세·지표 읽는 법 · 커뮤니티",
    tabs: [
      { href: "/guide", label: "가이드", match: (p) => under("/guide")(p) || p.startsWith("/en/guide/") },
      { href: "/community", label: "커뮤니티", match: under("/community") },
    ],
  },
];

/** 경로 → 카테고리. 어느 카테고리에도 안 속하는 페이지(/about, /privacy, /pick)는 null. */
export function categoryOf(pathname: string): CategoryKey | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/" || p === "/en") return "home";
  for (const c of CATEGORIES) {
    if (c.tabs.some((t) => t.match(p))) return c.key;
  }
  // 종목 상세 /korea/samsung · /us/tesla … (자사주 등 고정 페이지는 위에서 먼저 걸림)
  const seg = p.split("/");
  if (seg.length === 3 && STOCK_CATEGORIES.includes(seg[1])) return "markets";
  return null;
}

export function getCategory(key: CategoryKey): Category {
  return CATEGORIES.find((c) => c.key === key)!;
}
