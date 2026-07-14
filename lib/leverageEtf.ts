// SK하이닉스 레버리지 ETF(KODEX SK하이닉스단일종목레버리지, 코스피 0193T0) 일별 시세.
// 네이버 fchart 공개 API — 삼성자산운용이 KRX SK하이닉스 레버리지 지수(2배)를 추종해
// 실제 코스피에 상장한 상품. 바이낸스 합성 perp가 아니라 진짜 한국 시장 레버리지 상품.
//
// 후보 중 거래대금 기준 최다 유동성으로 선정 (2026-07-14 기준):
//   KODEX(0193T0) 2조 1,048억 > TIGER(0195S0) 8,281억 > 그 외 수백억 수준.
//
// "청산 캐스케이드": 하루 만에 큰 폭 급락한 날 — 레버리지 반대매매·패닉셀이 몰렸을 가능성이 높은
// 실물 증거. 다음 거래일 반등 여부를 눈으로 직접 확인하는 용도로 차트에 마킹.

const NAVER_FCHART = "https://fchart.stock.naver.com/sise.nhn";
export const LEVERAGE_ETF_CODE = "0193T0";
export const LEVERAGE_ETF_NAME_KO = "KODEX SK하이닉스레버리지";

export type LeverageBar = {
  /** unix seconds (lightweight-charts 호환) */
  time: number;
  /** 종가 (KRW) */
  price: number;
  /** 거래대금 추정치 (종가 × 거래량, KRW) */
  tradingValueKrw: number;
  /** 전일 종가 대비 변동률 (%) */
  changePct: number;
};

/** count 거래일치 일봉 히스토리 fetch. 실패 시 빈 배열. */
export async function fetchLeverageEtfHistory(count = 90): Promise<LeverageBar[]> {
  try {
    const url = `${NAVER_FCHART}?symbol=${LEVERAGE_ETF_CODE}&timeframe=day&count=${count}&requestType=0`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; kr-stocks/1.0)" },
      next: { revalidate: 3600 },
    });
    if (!r.ok) return [];

    // 네이버 fchart는 EUC-KR — 원시 바이트로 받아 직접 디코딩
    const buf = new Uint8Array(await r.arrayBuffer());
    const xml = new TextDecoder("euc-kr").decode(buf);
    const matches = [...xml.matchAll(/<item data="(\d{8})\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)"/g)];

    const raw = matches
      .map((m) => {
        const [, dateStr, , , , closeStr, volStr] = m;
        const y = Number(dateStr.slice(0, 4));
        const mo = Number(dateStr.slice(4, 6)) - 1;
        const d = Number(dateStr.slice(6, 8));
        const time = Math.floor(Date.UTC(y, mo, d, 0, 0, 0) / 1000);
        const price = Number(closeStr);
        const volume = Number(volStr);
        return { time, price, volume };
      })
      .filter((b) => Number.isFinite(b.time) && Number.isFinite(b.price) && b.price > 0);

    return raw.map((b, i) => {
      const prevPrice = i > 0 ? raw[i - 1].price : b.price;
      const changePct = prevPrice > 0 ? ((b.price - prevPrice) / prevPrice) * 100 : 0;
      return {
        time: b.time,
        price: b.price,
        tradingValueKrw: b.price * b.volume,
        changePct,
      };
    });
  } catch {
    return [];
  }
}
