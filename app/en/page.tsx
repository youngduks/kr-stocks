import { fetchAllPrices } from "@/lib/fetchPrices";
import { CATEGORY_LABELS, type SymbolMeta } from "@/lib/universe";
import { StockRow } from "@/components/home/StockRow";
import { AsOf } from "@/components/ui/AsOf";
import { Header } from "@/components/Header";
import { HomeHero } from "@/components/HomeHero";
import { SemiconductorSignal } from "@/components/SemiconductorSignal";
import { Footer } from "@/components/Footer";
import { fetchSemiSignal } from "@/lib/semiSignal";
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
  const [data, semiSignal] = await Promise.all([fetchAllPrices(), fetchSemiSignal()]);

  // Category order: Korea → Private → US → Themes ETF → Global Index
  const order: SymbolMeta["category"][] = ["korea", "private", "us", "themes", "global"];
  const grouped = order
    .map((cat) => ({
      cat,
      label: CATEGORY_LABELS[cat],
      // is_fx (USD/KRW) sourced from HL perp, differs from header's Upbit-based rate → exclude from home grid
      rows: data.symbols.filter((r) => r.category === cat && !r.is_fx),
    }))
    // Skip categories left with zero symbols (e.g. themes, 5 dead HL perps removed 2026-08-02)
    .filter((g) => g.rows.length > 0);

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />

      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-2 pb-12">
        <h1 className="ds-meta mb-3">
          24h global asset prices · live through Korean market closures · incl. SpaceX · OpenAI · Anthropic
        </h1>

        {/* US semiconductor overnight signal — top. SOXL(3x) preview of tomorrow's Samsung/Hynix */}
        <SemiconductorSignal signal={semiSignal} locale="en" />

        {grouped.map(({ cat, label, rows }) => (
          <div key={cat}>
            <section className="ds-card mb-4" style={{ padding: "8px 20px" }} aria-labelledby={`cat-${cat}`}>
              <div className="flex items-center justify-between pt-3 pb-1">
                <h2 id={`cat-${cat}`} className="text-[17px] font-extrabold">
                  {label.en}
                </h2>
                <span className="ds-meta">{rows.length} tickers</span>
              </div>
              {rows.map((row) => (
                <StockRow key={row.slug} row={row} locale="en" />
              ))}
            </section>

            {/* Korean stocks deep-dive — right below the Korea section */}
            {cat === "korea" && <HomeHero rows={data.symbols} locale="en" />}
          </div>
        ))}

        <AsOf at={data.fetched_at} locale="en" note="auto-refresh every 30s" className="mt-6" />

        <p className="mt-4 ds-meta">
          For the Korean version, click{" "}
          <Link href={"/" as any} className="underline hover:text-text-muted">
            한국어
          </Link>{" "}
          in the top header.
        </p>
      </main>

      <Footer locale="en" />
    </>
  );
}
