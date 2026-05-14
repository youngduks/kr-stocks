// About (EN) — minimal (5/14: compressed — USP / timeline / endpoint matrix removed)

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About — kr-stocks.com",
  description:
    "kr-stocks.com is a 24-hour stock price tracker for Korean retail investors. " +
    "Regular hours + NXT after-hours + overnight in one view.",
  keywords: ["kr-stocks about", "Korean stocks 24h"],
  openGraph: {
    title: "About — kr-stocks.com",
    description: "24h stock price tracker for Korean retail.",
    url: "https://kr-stocks.com/en/about",
    type: "website",
  },
  alternates: {
    canonical: "https://kr-stocks.com/en/about",
    languages: {
      "ko-KR": "https://kr-stocks.com/about",
      "en-US": "https://kr-stocks.com/en/about",
      "x-default": "https://kr-stocks.com/about",
    },
  },
};

export default async function AboutPageEN() {
  const data = await fetchAllPrices();

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />

      <main className="max-w-3xl mx-auto px-5 pt-6 pb-12">
        <Link href="/en" className="text-xs text-text-dim hover:text-text-muted">
          ← Back home
        </Link>

        <article className="mt-4 space-y-6">
          <header>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              About
            </h1>
            <p className="text-base text-text-muted leading-relaxed">
              A 24-hour stock price tracker for Korean retail investors.
              Korean · US · private big tech prices tracked seamlessly across regular hours,
              after-hours, and overnight.
            </p>
          </header>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-base font-bold mb-2">Data sources</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Naver Finance · Yahoo Finance · Hyperliquid · Upbit. Refreshed every 30 seconds.
              <br />
              Korean broker average targets and foreign/institutional flow are available for
              selected Korean tickers.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-base font-bold mb-2">Contact</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Advertising · partnerships · data corrections · feature requests:{" "}
              <a
                href="mailto:contact@kr-stocks.com"
                className="text-accent-blue hover:underline"
              >
                contact@kr-stocks.com
              </a>
              <br />
              <span className="text-xs text-text-dim">Reply within 24h on weekdays</span>
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-base font-bold mb-2">Disclaimer</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              This service is for informational purposes only and is not investment advice or
              solicitation. Prices may diverge from regular-session exchange prices, and private
              company prices are estimates. All investment decisions are your own responsibility.
            </p>
          </section>

          <div className="text-center pt-2">
            <Link
              href="/en"
              className="inline-block px-6 py-3 rounded-xl bg-accent-blue text-white font-semibold hover:bg-accent-blue/90 transition"
            >
              → Explore the site
            </Link>
          </div>
        </article>
      </main>

      <Footer locale="en" />
    </>
  );
}
