import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import { fetchCvdSet } from "@/lib/cvd";
import { CvdChart, type CvdDataset } from "@/components/CvdChart";
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
  title: "청산맵 — 삼성전자·SK하이닉스·NVIDIA 청산 지도",
  description:
    "거래소들이 토큰화 주식을 상장하면서 청산맵(리퀴데이션 히트맵)도 주식 티커까지 지원. 삼성전자·SK하이닉스·NVIDIA·DRAM·S&P500·KORU 청산 지도 바로가기 + 청산맵 보는 법.",
  keywords: [
    "청산맵",
    "청산 지도",
    "리퀴데이션 히트맵",
    "liquidation heatmap",
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
  const [data, cvdSets] = await Promise.all([
    fetchAllPrices(),
    Promise.all(CVD_TICKERS.map((t) => fetchCvdSet(t.symbol))),
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
                매수·매도 체결량 분해로 저희가 직접 계산해 무료 제공합니다. 우상향 = 매수 체결
                우세, 우하향 = 매도 체결 우세 — 가격은 그대로인데 CVD가 꺾이면 방향 전환 신호로
                많이 봅니다. (바이낸스 상장 종목만 계산 가능 — NVDA·DRAM·S&P500·KORU는 아래
                청산맵 링크 참고)
              </p>
              <CvdChart datasets={cvdDatasets} />
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
                        href={t.internalHref as any}
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
