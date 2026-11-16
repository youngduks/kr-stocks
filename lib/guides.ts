// 가이드 목록 (2026-11-16) — /guide 목록 페이지·홈 입구 카드가 쓴다.
// 새 가이드를 만들면 여기에 한 줄 추가 (사이트맵 우선순위는 app/sitemap.ts 에서 따로 관리).
export type GuideItem = {
  href: string;
  title: string;
  desc: string;
  group: "지표 읽기" | "거래 시간·야간 시세" | "거래 방법";
  /** 영어판 주소 (있을 때만) */
  enHref?: string;
};

export const GUIDES: GuideItem[] = [
  {
    href: "/guide/korean-overnight-prices",
    title: "삼성전자 야간 가격 확인하는 법",
    desc: "정규장·NXT 시간외·야간 24시간 참조가를 시간대별로 보는 법",
    group: "거래 시간·야간 시세",
  },
  {
    href: "/guide/kospi-night-futures-hours",
    title: "코스피200 야간선물 거래시간",
    desc: "야간 파생상품시장이 몇 시에 열고 닫는지, 시간이 바뀌는 날",
    group: "거래 시간·야간 시세",
  },
  {
    href: "/guide/nxt-after-hours",
    title: "NXT 시간외 거래 완전 가이드",
    desc: "프리장·애프터장 시간과 KRX 정규장과의 차이",
    group: "거래 시간·야간 시세",
  },
  {
    href: "/guide/vix-index",
    title: "VIX지수(빅스지수) 뜻과 보는 법",
    desc: "공포지수가 무엇을 재는지, 숫자를 어떻게 읽는지",
    group: "지표 읽기",
  },
  {
    href: "/guide/fear-greed-index",
    title: "CNN 공포탐욕지수 뜻과 보는 법",
    desc: "7가지 지표와 0~100 점수 읽는 법, VIX와의 차이",
    group: "지표 읽기",
  },
  {
    href: "/guide/liquidation-map",
    title: "청산맵 보는 법",
    desc: "청산 히트맵 뜻과 레버리지별 청산 거리, CVD 차트 읽는 법",
    group: "지표 읽기",
  },
  {
    href: "/guide/binance-korea-stocks",
    title: "바이낸스에서 삼성·SK하이닉스·현대차 거래하는 법",
    desc: "한국 주식 24시간 선물 — 가입부터 진입까지",
    group: "거래 방법",
    enHref: "/en/guide/binance-korea-stocks",
  },
  {
    href: "/guide/hyperliquid-onramp",
    title: "한국에서 Hyperliquid 거래하는 법",
    desc: "비상장 빅테크·한국 주식 야간 perp 단계별 안내",
    group: "거래 방법",
    enHref: "/en/guide/hyperliquid-onramp",
  },
];

export const GUIDE_GROUPS: GuideItem["group"][] = ["거래 시간·야간 시세", "지표 읽기", "거래 방법"];
