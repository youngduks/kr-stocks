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
  title: "Korean Broker Consensus — Samsung · SK Hynix · Hyundai",
  description:
    "Aggregated analyst price targets from 13~14 major Korean brokers. Average target vs current price upside. 3in1 view: Hyperliquid overnight + regular close + consensus.",
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
            Korean Broker Consensus
          </h1>
          <p className="text-sm text-text-muted">
            Aggregated analyst price targets from 13~14 major Korean brokers ·{" "}
            <Link href={"/en" as any} className="text-accent-blue hover:underline">
              Back to home
            </Link>
          </p>
        </section>

        <ConsensusView all={enriched} locale="en" />

        <div className="mt-10 p-4 rounded-xl bg-bg-card border border-line text-xs text-text-dim leading-relaxed">
          <span className="font-semibold text-text-muted">What is consensus?</span>{" "}
          The aggregated average/median of analyst price targets and investment
          opinions from multiple brokers. When the average target is above the
          current price, it suggests "upside potential (▲)"; below means
          "downside risk (▼)". Actual market prices depend on many factors —
          treat this as a reference only.
        </div>
      </main>

      <Footer />
    </>
  );
}
