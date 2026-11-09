// 검증형 리서치 글 목록 (2026-11-09 연재 시작). 새 글은 여기에 추가 → /research 목록·사이트맵에 반영.
export type ResearchItem = {
  slug: string;
  title: string;
  summary: string;
  /** 계산 기준일 YYYY-MM-DD */
  date: string;
};

export const RESEARCH: ResearchItem[] = [
  {
    slug: "binance-samsung-overnight-open",
    title: "바이낸스 삼성전자 야간선물, 다음 날 시가 방향을 맞혔나",
    summary: "상장 후 107거래일, 밤사이 바이낸스 삼성전자·SK하이닉스 등락과 다음 날 KRX 시가를 비교했어요.",
    date: "2026-11-09",
  },
];
