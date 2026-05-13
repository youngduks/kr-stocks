import { fetchAllPrices } from "@/lib/fetchPrices";
import { CATEGORY_LABELS, type SymbolMeta } from "@/lib/universe";
import { PriceCard } from "@/components/PriceCard";
import { Header } from "@/components/Header";
import { HomeHero } from "@/components/HomeHero";
import { Footer } from "@/components/Footer";
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

  // Category order: Korea → Private → US → Themes ETF → Global Index
  const order: SymbolMeta["category"][] = ["korea", "private", "us", "themes", "global"];
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
          For the Korean version, click{" "}
          <Link href={"/" as any} className="text-accent-blue hover:underline">
            한국어
          </Link>{" "}
          in the top header.
        </p>
      </main>

      <Footer locale="en" />
    </>
  );
}
