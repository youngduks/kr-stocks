import { fetchAllPrices } from "@/lib/fetchPrices";
import { getAllConsensus, enrichWithCurrentPrice } from "@/lib/consensus";
import { ConsensusView } from "@/components/ConsensusView";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 1800;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "증권사 목표주가 컨센서스 — 삼성전자·하이닉스·현대차",
  description:
    "한국 13~14개 증권사 애널리스트 목표주가 종합. 평균 목표가 vs 현재가 상승여력 시각화. Hyperliquid 야간 + 정규장 + 컨센서스 3in1.",
  keywords: [
    "삼성전자 목표주가",
    "SK하이닉스 목표주가",
    "현대차 목표주가",
    "증권사 컨센서스",
    "애널리스트 목표가",
    "한국 주식 컨센서스",
    "상승여력",
    "네이버 금융 리서치",
  ],
  openGraph: {
    title: "증권사 목표주가 컨센서스 — kr-stocks.com",
    description:
      "삼성전자·SK하이닉스·현대차 증권사 평균 목표가 + 상승여력 + 13~14개 증권사 의견 종합.",
    url: "https://kr-stocks.com/consensus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "증권사 목표주가 컨센서스",
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

  // 현재가 (정규장 종가 우선, fallback HL per_share_krw) + 상승여력 enrich
  const enriched = all.map((c) => {
    const symbol = prices.symbols.find((s) => s.slug === c.slug);
    const cur =
      symbol?.market?.regular_close_krw ?? symbol?.market?.per_share_krw ?? null;
    return enrichWithCurrentPrice(c, cur);
  });

  return (
    <>
      <Header fxRate={prices.fx.krw_per_usdt} fxChange={prices.fx.change_24h_pct} />

      <main className="max-w-6xl mx-auto px-5 pt-6 pb-12">
        <section className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            증권사 목표주가 컨센서스
          </h1>
          <p className="text-sm text-text-muted">
            한국 13~14개 증권사 애널리스트 목표주가 종합 · 평균 vs 현재가 상승여력 시각화 ·{" "}
            <Link href={"/" as any} className="text-accent-blue hover:underline">
              홈으로
            </Link>
          </p>
        </section>

        <ConsensusView all={enriched} locale="ko" />

        <div className="mt-10 p-4 rounded-xl bg-bg-card border border-line text-xs text-text-dim leading-relaxed">
          <span className="font-semibold text-text-muted">컨센서스란?</span>{" "}
          여러 증권사 애널리스트의 종목별 목표주가·투자의견을 모아 평균/중앙값으로
          요약한 지표입니다. 평균 목표가가 현재가보다 높으면 "상승여력 있음(▲)",
          낮으면 "조정 가능성(▼)"으로 해석되지만, 실제 주가는 다양한 요인에 좌우되므로
          단순 참고용입니다.
        </div>
      </main>

      <Footer />
    </>
  );
}
