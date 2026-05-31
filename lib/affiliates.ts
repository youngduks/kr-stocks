// Affiliate / Referral 링크 config
// 환경변수 미설정 시 해당 카드 자동 숨김 (graceful).

export type Affiliate = {
  id: string;
  name: string;
  category: "exchange" | "broker" | "shopping" | "other";
  description: string;
  emoji: string;
  url: string | null;
  highlight?: string;
};

const AFFILIATES: Affiliate[] = [
  {
    id: "binance",
    name: "Binance",
    category: "exchange",
    description: "글로벌 최대 코인 거래소 · 수수료 10% 할인",
    emoji: "🟡",
    url: process.env.NEXT_PUBLIC_AFFILIATE_BINANCE || null,
    highlight: "최대 -10% 수수료",
  },
  {
    id: "upbit",
    name: "업비트",
    category: "exchange",
    description: "한국 1위 코인 거래소",
    emoji: "🇰🇷",
    url: process.env.NEXT_PUBLIC_AFFILIATE_UPBIT || null,
  },
  {
    id: "bithumb",
    name: "빗썸",
    category: "exchange",
    description: "한국 대형 코인 거래소",
    emoji: "🔶",
    url: process.env.NEXT_PUBLIC_AFFILIATE_BITHUMB || null,
  },
  {
    id: "okx",
    name: "OKX",
    category: "exchange",
    description: "글로벌 코인 거래소 · 한국어 지원",
    emoji: "⚫",
    url: process.env.NEXT_PUBLIC_AFFILIATE_OKX || null,
  },
  {
    id: "toss-securities",
    name: "토스증권",
    category: "broker",
    description: "수수료 평생 무료 · 모바일 친화",
    emoji: "💙",
    url: process.env.NEXT_PUBLIC_AFFILIATE_TOSS_SECURITIES || null,
  },
  {
    id: "kiwoom",
    name: "키움증권",
    category: "broker",
    description: "국내 1위 증권사 · 영웅문",
    emoji: "🟦",
    url: process.env.NEXT_PUBLIC_AFFILIATE_KIWOOM || null,
  },
  {
    id: "coupang",
    name: "쿠팡 파트너스",
    category: "shopping",
    description: "관련 도서/장비 추천",
    emoji: "🛒",
    url: process.env.NEXT_PUBLIC_AFFILIATE_COUPANG || null,
  },
];

export function getActiveAffiliates(): Affiliate[] {
  return AFFILIATES.filter((a) => !!a.url);
}

export function getAffiliatesByCategory(cat: Affiliate["category"]): Affiliate[] {
  return getActiveAffiliates().filter((a) => a.category === cat);
}
