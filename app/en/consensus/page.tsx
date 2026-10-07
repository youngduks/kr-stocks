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
  title: "Korean Broker Consensus — Samsung · SK Hynix · Hyundai",
  description:
    "Aggregated analyst price targets from Korean brokers (Naver Finance Research). Average target vs current price upside. 3in1 view: Hyperliquid overnight + regular close + consensus.",
  keywords: [
    "Samsung Electronics price target",
    "SK Hynix price target",
    "Hyundai Motor price target",
    "Korean broker consensus",
    "analyst target price",
    "Korea stock consensus",
    "upside potential",
    "Naver Finance research",
  ],
  openGraph: {
    title: "Korean Broker Consensus — kr-stocks.com",
    description:
      "Samsung · SK Hynix · Hyundai average price targets, opinion distribution, and broker-level reports.",
    url: "https://kr-stocks.com/en/consensus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Korean Broker Consensus",
    description: "Samsung · SK Hynix · Hyundai analyst price targets.",
  },
  alternates: {
    canonical: "https://kr-stocks.com/en/consensus",
    languages: {
      "ko-KR": "https://kr-stocks.com/consensus",
      "en-US": "https://kr-stocks.com/en/consensus",
      "x-default": "https://kr-stocks.com/consensus",
    },
  },
};

export default async function ConsensusPageEN() {
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
        <PageTitle eyebrow="Naver Finance consensus · updated every weekday" title="Broker price targets" backHref="/en" backLabel="Home" className="mb-4" />

        <ConsensusView all={enriched} locale="en" />

        <section className="ds-card mt-6" style={{ paddingTop: 4, paddingBottom: 4 }}>
          <MoreDetails summary="How to read broker targets" className="!mt-0 !border-t-0">
            The aggregated average of analyst price targets and opinions from multiple Korean brokers. A target above the
            current price suggests upside; below suggests the stock may pause. Actual prices depend on many factors — treat
            this as a reference only. All figures refresh automatically every weekday from Naver Finance consensus data.
          </MoreDetails>
        </section>
      </main>

      <Footer locale="en" />
    </>
  );
}
