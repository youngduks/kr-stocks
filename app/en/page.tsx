import { fetchAllPrices } from "@/lib/fetchPrices";
import { CATEGORY_LABELS, type SymbolMeta } from "@/lib/universe";
import { PriceCard } from "@/components/PriceCard";
import { Header } from "@/components/Header";
import { HomeHero } from "@/components/HomeHero";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 30;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "24h Global Asset Prices — Korean stocks, Private Big Tech, US",
  description:
    "Live 24-hour prices for Korean stocks, US stocks, and unlisted private big tech (OpenAI · SpaceX · Anthropic). Hyperliquid HIP-3 perp + Upbit KRW/USDT FX feed.",
  keywords: [
    "Hyperliquid Korea",
    "OpenAI stock price",
    "SpaceX valuation",
    "Anthropic stock price",
    "HIP-3 perp",
    "24h Korean stock",
    "Samsung overnight price",
    "SK Hynix perp",
    "private big tech price",
  ],
  openGraph: {
    title: "24h Global Asset Prices — kr-stocks.com",
    description:
      "Korean stocks · US stocks · Private big tech (OpenAI · SpaceX · Anthropic) — live 24h price feed.",
    url: "https://kr-stocks.com/en",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "24h Global Asset Prices",
    description: "Korean stocks · US stocks · Private big tech — live 24h.",
  },
  alternates: {
    canonical: "https://kr-stocks.com/en",
    languages: {
      "ko-KR": "https://kr-stocks.com/",
      "en-US": "https://kr-stocks.com/en",
      "x-default": "https://kr-stocks.com/",
    },
  },
};

export default async function HomeEN() {
  const data = await fetchAllPrices();

  const order: SymbolMeta["category"][] = ["korea", "themes", "private", "us", "global"];
  const grouped = order.map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    rows: data.symbols.filter((r) => r.category === cat),
  }));

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />

      <main className="max-w-6xl mx-auto px-5 pt-6 pb-12">
        <section className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2">24h Global Asset Prices</h1>
          <p className="text-sm text-text-muted">
            Uninterrupted live prices across Korean market hours. Unlisted big tech included (SpaceX · OpenAI · Anthropic).
          </p>
        </section>

        {/* Hero box — Korean stocks deep-dive preview + direct CTA */}
        <HomeHero rows={data.symbols} locale="en" />

        {grouped.map(({ cat, label, rows }) => (
          <section key={cat} className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-lg font-bold text-text">
                <span className="mr-2">{label.emoji}</span>{label.en}
                <span className="ml-2 text-xs text-text-dim font-medium">{rows.length} tickers</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {rows.map((row) => (
                <PriceCard key={row.slug} row={row} locale="en" />
              ))}
            </div>
          </section>
        ))}

        <div className="mt-8 p-4 rounded-xl bg-bg-card border border-line text-xs text-text-dim">
          <span className="font-semibold text-text-muted">⏱ Last updated:</span>{" "}
          {new Date(data.fetched_at).toLocaleString("en-US", { timeZone: "Asia/Seoul" })} KST
          <span className="ml-3 text-text-dim">(auto-refresh every 30s)</span>
        </div>

        <p className="mt-6 text-[11px] text-text-dim leading-relaxed">
          Note: card labels (e.g. "정규장 대비") remain in Korean — full English localization for ticker pages is in progress.
          For the Korean version, click <Link href={"/" as any} className="text-accent-blue hover:underline">한국어</Link> on top.
        </p>
      </main>

      <footer className="border-t border-line mt-12">
        <div className="max-w-6xl mx-auto px-5 py-8 text-xs text-text-dim leading-6">
          <div className="mb-3 text-text-muted font-semibold">Data Sources</div>
          <ul className="space-y-1 mb-6">
            <li>
              • Prices:{" "}
              <a href="https://hyperliquid.xyz" className="text-accent-blue hover:underline" target="_blank" rel="noopener">
                Hyperliquid HIP-3 (xyz, vntl) DEX perp
              </a>
            </li>
            <li>
              • FX:{" "}
              <a href="https://upbit.com" className="text-accent-blue hover:underline" target="_blank" rel="noopener">
                Upbit KRW/USDT spot
              </a>
            </li>
            <li>• Refresh: every 30 seconds</li>
          </ul>

          <div className="mb-3 text-text-muted font-semibold">Analysis · Guide</div>
          <ul className="space-y-1 mb-6">
            <li>
              •{" "}
              <Link href={"/en/consensus" as any} className="text-accent-blue hover:underline">
                Korean Broker Consensus
              </Link>{" "}
              — Samsung · SK Hynix · Hyundai analyst price targets &amp; upside.
            </li>
            <li>
              •{" "}
              <Link href={"/en/guide/hyperliquid-onramp" as any} className="text-accent-blue hover:underline">
                How to trade Hyperliquid from Korea
              </Link>{" "}
              — step-by-step onramp for private big tech &amp; Korean stock perps.
            </li>
          </ul>

          <div className="mb-3 text-text-muted font-semibold">Advertising · Partnerships</div>
          <ul className="space-y-1 mb-6">
            <li>
              •{" "}
              <a href="mailto:contact@kr-stocks.com?subject=%5BAd%20Inquiry%5D%20kr-stocks.com" className="text-accent-blue hover:underline">
                contact@kr-stocks.com
              </a>
            </li>
            <li>• Banner · native · broker/exchange affiliate welcome</li>
            <li>• Response: within 24h on weekdays</li>
          </ul>

          <div className="mb-3 text-text-muted font-semibold">Disclaimer</div>
          <p className="mb-3">
            This service is for informational purposes only and is not investment advice or solicitation. Prices shown are perp DEX
            quotes and may diverge from regular-session exchange prices. Private company prices are implied-valuation estimates.
          </p>
          <p className="text-text-dim">© 2026 KR Stocks. Not investment advice.</p>
        </div>
      </footer>
    </>
  );
}
