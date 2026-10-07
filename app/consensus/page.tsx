import { fetchAllPrices } from "@/lib/fetchPrices";
import { getAllConsensus, enrichWithCurrentPrice } from "@/lib/consensus";
import { ConsensusView } from "@/components/ConsensusView";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { Metadata } from "next";
import { PageTitle } from "@/components/ui/PageTitle";
import { MoreDetails } from "@/components/ui/MoreDetails";

export const revalidate = 1800;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "증권사 목표주가 분석 — 삼성전자·하이닉스·현대차",
  description:
    "한국 증권사 애널리스트 목표주가 종합(네이버 금융 리서치 기준). 평균 목표가 vs 현재가 상승여력 시각화. Hyperliquid 야간 + 정규장 + 증권사 분석 3in1.",
  keywords: [
    "삼성전자 목표주가",
    "SK하이닉스 목표주가",
    "현대차 목표주가",
    "증권사 분석",
    "삼성전자 컨센서스",
    "SK하이닉스 컨센서스",
    "증권사 컨센서스",
    "애널리스트 목표가",
    "한국 주식 분석",
    "한국 주식 컨센서스",
    "상승여력",
    "네이버 금융 리서치",
  ],
  openGraph: {
    title: "증권사 목표주가 분석 — kr-stocks.com",
    description:
      "삼성전자·SK하이닉스·현대차 증권사 평균 목표가 + 상승여력 + 13~14개 증권사 의견 종합.",
    url: "https://kr-stocks.com/consensus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "증권사 목표주가 분석",
    description: "삼성전자·SK하이닉스·현대차 증권사 평균 목표가 + 상승여력.",
  },
  alternates: {
    canonical: "https://kr-stocks.com/consensus",
    languages: {
      "ko-KR": "https://kr-stocks.com/consensus",
      "en-US": "https://kr-stocks.com/en/consensus",
      "x-default": "https://kr-stocks.com/consensus",
    },
  },
};

export default async function ConsensusPage() {
  const all = getAllConsensus();
  const prices = await fetchAllPrices();

  // 현재가 — 시간대 인지 메인 가격 (장중=KRX 실시간, 그 외=HL 야간) + 상승여력 enrich
  const enriched = all.map((c) => {
    const symbol = prices.symbols.find((s) => s.slug === c.slug);
    const cur =
      symbol?.market?.main_display_krw ??
      symbol?.market?.regular_close_krw ??
      symbol?.market?.per_share_krw ??
      null;
    return enrichWithCurrentPrice(c, cur);
  });

  return (
    <>
      <Header fxRate={prices.fx.krw_per_usdt} fxChange={prices.fx.change_24h_pct} />

      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-2 pb-12">
        <PageTitle eyebrow="네이버 금융 종합 컨센서스 · 매 평일 갱신" title="증권사 목표가" backHref="/" className="mb-4" />

        <ConsensusView all={enriched} locale="ko" />

        <section className="ds-card mt-6" style={{ paddingTop: 4, paddingBottom: 4 }}>
          <MoreDetails summary="증권사 목표가는 어떻게 보나요?" className="!mt-0 !border-t-0">
            여러 증권사 애널리스트의 종목별 목표주가·투자의견을 평균으로 요약한 숫자예요. 평균 목표가가 지금 가격보다
            높으면 &lsquo;더 오를 여지가 있다&rsquo;, 낮으면 &lsquo;쉬어갈 수 있다&rsquo;로 읽지만, 실제 주가는 여러 요인에
            좌우되니 참고용으로만 봐 주세요. 숫자는 모두 네이버 금융 종합 컨센서스에서 매 평일 자동으로 갱신돼요.
          </MoreDetails>
        </section>
      </main>

      <Footer />
    </>
  );
}
