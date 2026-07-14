import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import { fetchCvdSet } from "@/lib/cvd";
import { CvdChart, type CvdDataset } from "@/components/CvdChart";
import { fetchLeverageEtfHistory, LEVERAGE_ETF_NAME_KO } from "@/lib/leverageEtf";
import { LeverageEtfChart } from "@/components/LeverageEtfChart";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

// CVD 계산 가능 종목 — 바이낸스 상장(taker buy/sell 분해 데이터 존재)
const CVD_TICKERS = [
  { symbol: "SAMSUNGUSDT", label: "삼성전자" },
  { symbol: "SKHYNIXUSDT", label: "SK하이닉스" },
  { symbol: "HYUNDAIUSDT", label: "현대차" },
] as const;

const COINGLASS_BASE = "https://www.coinglass.com/pro/futures/LiquidationHeatMap";

type LiqTicker = {
  name: string;
  ticker: string;
  note: string;
  coinglassCoin: string;
  /** 우리 사이트에서 이미 추적 중인 종목이면 상세 페이지 경로 */
  internalHref?: string;
};

const TICKERS: LiqTicker[] = [
  { name: "삼성전자", ticker: "SMSN", note: "메모리 반도체 대장주", coinglassCoin: "SMSN", internalHref: "/korea/samsung" },
  { name: "SK하이닉스", ticker: "SKHX", note: "HBM·D램 공급사", coinglassCoin: "SKHX", internalHref: "/korea/hynix" },
  { name: "NVIDIA", ticker: "NVDA", note: "AI 반도체 대장주", coinglassCoin: "NVDA", internalHref: "/us/nvidia" },
  { name: "DRAM", ticker: "DRAM", note: "메모리 반도체 지수", coinglassCoin: "DRAM" },
  { name: "S&P500", ticker: "SPX", note: "미국 대표 지수", coinglassCoin: "SPX" },
  { name: "KORU", ticker: "KORU", note: "코스피 3배 레버리지 ETF", coinglassCoin: "KORU" },
];

export const metadata: Metadata = {
  title: "청산맵 — 삼성전자·SK하이닉스·NVIDIA 청산 지도 · 레버리지 ETF",
  description:
    "거래소들이 토큰화 주식을 상장하면서 청산맵(리퀴데이션 히트맵)도 주식 티커까지 지원. 삼성전자·SK하이닉스·NVIDIA·DRAM·S&P500·KORU 청산 지도 바로가기 + 삼전·닉스·현대차 CVD(체결강도 누적) 실측 차트 + 코스피 SK하이닉스 레버리지 ETF 패닉셀 캐스케이드 자동 탐지.",
  keywords: [
    "청산맵",
    "청산 지도",
    "리퀴데이션 히트맵",
    "liquidation heatmap",
    "CVD",
    "체결강도",
    "SK하이닉스 레버리지",
    "KODEX SK하이닉스레버리지",
    "레버리지 ETF",
    "패닉셀 캐스케이드",
    "삼성전자 청산가",
    "SK하이닉스 청산가",
    "NVIDIA 청산맵",
    "코인글래스",
    "coinglass",
    "토큰화 주식",
    "KORU 청산",
  ],
  openGraph: {
    title: "청산맵 — 주식러분들 꿀팁",
    description: "토큰화 주식 청산맵으로 보는 내일의 변곡점. 삼성전자·SK하이닉스·NVIDIA 등.",
    url: "https://kr-stocks.com/liquidation",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "청산맵 — 주식러분들 꿀팁",
    description: "토큰화 주식 청산맵으로 보는 내일의 변곡점.",
  },
  alternates: {
    canonical: "https://kr-stocks.com/liquidation",
  },
};

export default async function LiquidationPage() {
  const [data, cvdSets, leverageBars] = await Promise.all([
    fetchAllPrices(),
    Promise.all(CVD_TICKERS.map((t) => fetchCvdSet(t.symbol))),
    fetchLeverageEtfHistory(90),
  ]);

  const cvdDatasets: CvdDataset[] = CVD_TICKERS.map((t, i) => ({
    symbol: t.symbol,
    label: t.label,
    set: cvdSets[i],
  })).filter((d) => d.set.bars1H.length > 0 || d.set.bars4H.length > 0);

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />
      <main className="max-w-3xl mx-auto px-5 pt-6 pb-12">
        <Link href="/" className="text-xs text-text-dim hover:text-text-muted">
          ← 홈으로
        </Link>

        <article className="mt-4">
          <header className="mb-8">
            <div className="text-xs text-accent-blue font-semibold mb-2 tracking-wider">주식러분들 꿀팁</div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">🔥 청산맵</h1>
            <p className="text-text-muted text-base leading-relaxed">
              최근 거래소들이 토큰화 주식을 계속 상장시키면서, 청산맵(리퀴데이션 히트맵)도
              주식 티커까지 지원하기 시작했습니다. 삼전·닉스부터 DRAM, 엔비디아, S&P500, KORU 등
              대형주·지수·ETF 대부분을 볼 수 있습니다.
            </p>
          </header>

          <section className="mb-8 p-5 rounded-2xl bg-gradient-to-br from-accent-amber/10 via-accent-purple/5 to-accent-blue/10 border border-line">
            <h2 className="text-lg font-bold mb-2">💡 왜 봐야 하나</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              청산맵은 레버리지 포지션들이 강제 청산되는 가격대를 히트맵으로 보여줍니다.
              <span className="text-text font-semibold"> 많은 사람이 고통받는 자리(청산가)는 변곡점이 됩니다.</span>{" "}
              가격이 그 구간에 다가가면 청산 물량이 연쇄적으로 터지면서 오히려 반대 방향으로
              튕기거나, 반대로 그 구간을 뚫으면 가속이 붙는 경우가 많습니다. 내일 방향을 미리
              가늠할 때 참고하기 좋은 지표입니다.
            </p>
          </section>

          {cvdDatasets.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-1">📊 CVD (체결강도 누적) — 실데이터</h2>
              <p className="text-xs text-text-dim mb-4 leading-relaxed">
                청산맵 자체는 유료 API 없이 재현이 불가하지만, CVD는 바이낸스 공개 캔들의
                매수·매도 체결량 분해로 저희가 직접 계산해 무료 제공합니다. 선택한 구간 시작을
                0으로 놓고 누적하므로 0 위면 구간 순매수, 아래면 순매도 우세입니다. 가격(주황·좌축)과
                CVD(초록·파랑·우축)를 같이 표시해서 지금 CVD 움직임이 가격 대비 무슨 의미인지
                바로 볼 수 있습니다. (바이낸스 상장 종목만 계산 가능 — NVDA·DRAM·S&P500·KORU는
                아래 청산맵 링크 참고)
              </p>
              <CvdChart datasets={cvdDatasets} />
            </section>
          )}

          {leverageBars.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-1">🧨 SK하이닉스 레버리지 ETF — 패닉셀 캐스케이드 탐지</h2>
              <p className="text-xs text-text-dim mb-4 leading-relaxed">
                바이낸스 합성 상품이 아니라 <span className="text-text font-semibold">
                코스피에 실제 상장된 2배 레버리지 ETF({LEVERAGE_ETF_NAME_KO}, 거래대금 기준 동일 상품군 중 최다
                유동성)</span> 실데이터입니다. 하루 급락한 날은 반대매매·손절이 몰렸을 가능성이 높은
                실물 증거로 보고 빨간 화살표(▼)로 자동 표시됩니다 — 많은 사람이 고통받은 그 지점이
                변곡점이 되는 경우가 많습니다.
              </p>
              <LeverageEtfChart bars={leverageBars} label={LEVERAGE_ETF_NAME_KO} />
            </section>
          )}

          {cvdDatasets.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-4">📖 CVD 읽는 법</h2>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-bg-card border border-line">
                  <h3 className="font-bold text-sm mb-1">1. 기본 원리</h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    CVD는 <span className="font-semibold text-text">누적 매수체결 − 누적 매도체결</span>입니다.
                    선이 <span className="text-accent-green font-semibold">우상향</span>하면 시장가로 사려는
                    힘(매수 체결)이 강하다는 뜻, <span className="text-accent-blue font-semibold">우하향</span>하면
                    팔려는 힘이 강하다는 뜻입니다. 차트의 점선(0 기준선)을 위/아래로 넘는 지점이 매수·매도 우세가
                    바뀌는 전환점입니다.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-bg-card border border-line">
                  <h3 className="font-bold text-sm mb-2">2. 다이버전스 — 가장 많이 쓰는 신호</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-accent-blue/5 border border-accent-blue/20">
                      <div className="text-xs font-bold text-accent-blue mb-1">가격 ▲ + CVD ▼</div>
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        약세 다이버전스. 실제 매수 체결은 약해지는데 가격만 오른 것 — 숏 커버링이나
                        소수 매수로 밀어올렸을 가능성. 상승이 힘없이 꺾일 수 있다는 경고 신호로 봅니다.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-accent-green/5 border border-accent-green/20">
                      <div className="text-xs font-bold text-accent-green mb-1">가격 ▼ + CVD ▲</div>
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        강세 다이버전스. 매도 압력은 줄어드는데 가격만 눌린 것 — 팔자 힘이 소진되고
                        있다는 뜻. 반등 가능성을 미리 살펴볼 때 참고합니다.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-bg-card border border-line">
                  <h3 className="font-bold text-sm mb-2">3. 가격과 같이 움직이면 — 추세 컨펌</h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    가격도 오르고 CVD도 같이 오르면(또는 둘 다 내리면), 진짜 체결이 뒷받침하는
                    <span className="font-semibold text-text"> 건강한 추세</span>로 해석합니다. 다이버전스와
                    반대로 이런 동행 구간은 추세가 이어질 가능성에 더 무게를 둡니다.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-bg-card border border-line">
                  <h3 className="font-bold text-sm mb-2">⚠️ 주의</h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    CVD는 절대값보다 <span className="font-semibold text-text">기울기와 방향 전환</span>이
                    중요합니다. 단독 매매 신호가 아니라 가격 차트·뉴스·수급과 함께 보는 보조 지표입니다.
                    참고용이며 투자 조언이 아닙니다.
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">종목별 청산맵 바로가기</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TICKERS.map((t) => (
                <div key={t.ticker} className="p-4 rounded-xl bg-bg-card border border-line flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-base text-text">{t.name}</span>
                    <span className="text-[10px] text-text-dim font-semibold tabular px-1.5 py-0.5 rounded bg-bg-card border border-line">
                      {t.ticker}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mb-3">{t.note}</p>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <a
                      href={`${COINGLASS_BASE}?coin=${t.coinglassCoin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-3 py-1.5 rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 text-xs font-semibold transition"
                    >
                      청산맵 보기 →
                    </a>
                    {t.internalHref && (
                      <Link
                        href={t.internalHref}
                        className="inline-block px-3 py-1.5 rounded-lg bg-bg-card border border-line text-text-dim hover:text-text text-xs font-semibold transition"
                      >
                        kr-stocks 시세
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-text-dim mt-3 leading-relaxed">
              ※ 청산맵 데이터는 <a href="https://www.coinglass.com" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">CoinGlass</a>에서
              제공합니다. "청산맵 보기" 클릭 시 외부 사이트로 이동합니다. 참고용 지표이며 투자 조언이 아닙니다.
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
