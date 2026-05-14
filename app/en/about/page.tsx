// About page (EN) — builder narrative + data sources + disclaimer
// 5/14 added — AdSense + site credibility

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
    "Hyperliquid HIP-3 perps + Naver Finance + KRX data integrated across regular hours, NXT after-hours, and overnight.",
  keywords: [
    "kr-stocks about",
    "Korean stocks 24h",
    "Hyperliquid HIP-3 Korea",
    "Samsung overnight price",
    "private SpaceX price",
  ],
  openGraph: {
    title: "About — kr-stocks.com",
    description:
      "24h stock price tracker for Korean retail. Regular hours + NXT + Hyperliquid integrated.",
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

        <article className="mt-4 space-y-8">
          <header>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              About kr-stocks.com
            </h1>
            <p className="text-base text-text-muted leading-relaxed">
              A 24-hour stock price tracker for Korean retail investors.
              <br />
              KRX regular hours → NXT after-hours → Hyperliquid HIP-3 perps overnight — seamlessly tracked.
            </p>
          </header>

          <section className="p-5 rounded-2xl bg-accent-blue/5 border border-accent-blue/20">
            <h2 className="text-lg font-bold mb-3">🎯 What this site is</h2>
            <ul className="space-y-2 text-sm text-text-muted leading-relaxed">
              <li>
                <strong className="text-text">Information site, not an exchange.</strong> No accounts, no
                ads, no trading routing — just live prices.
              </li>
              <li>
                <strong className="text-text">Built for Korean retail investors</strong> who want to track
                Samsung, SK Hynix, Hyundai, and US stocks outside KRX regular hours.
              </li>
              <li>
                <strong className="text-text">Not a crypto exchange.</strong> Hyperliquid HIP-3 perps are
                used purely as a 24-hour price discovery layer.
              </li>
            </ul>
          </section>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-3">📊 Data sources</h2>
            <div className="space-y-3 text-sm text-text-muted leading-relaxed">
              <div>
                <div className="font-semibold text-text mb-1">Regular session prices + previous close</div>
                <ul className="ml-4 list-disc space-y-1 text-xs">
                  <li>Korean stocks: Naver Finance (intraday live + NXT after-hours)</li>
                  <li>US stocks · global indices: Yahoo Finance v8 chart API</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-text mb-1">24/7 perpetual prices</div>
                <ul className="ml-4 list-disc space-y-1 text-xs">
                  <li>
                    Hyperliquid HIP-3 (xyz, vntl) DEX —{" "}
                    <a
                      href="https://hyperliquid.xyz"
                      target="_blank"
                      rel="noopener"
                      className="text-accent-blue hover:underline"
                    >
                      hyperliquid.xyz
                    </a>
                  </li>
                  <li>Korean stocks · US stocks · private big tech · theme ETFs · global indices</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-text mb-1">Korean broker consensus (3 KR tickers)</div>
                <ul className="ml-4 list-disc space-y-1 text-xs">
                  <li>Naver Finance Research — 13~14 Korean brokers average target prices</li>
                  <li>Daily / per-broker history + opinion distribution</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-text mb-1">Foreign · Institutional flow (3 KR tickers)</div>
                <ul className="ml-4 list-disc space-y-1 text-xs">
                  <li>KRX official + Naver Finance — Foreign / Institution / Retail 5-day cumulative</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-text mb-1">FX rate</div>
                <ul className="ml-4 list-disc space-y-1 text-xs">
                  <li>
                    Upbit KRW/USDT spot —{" "}
                    <a
                      href="https://upbit.com"
                      target="_blank"
                      rel="noopener"
                      className="text-accent-blue hover:underline"
                    >
                      upbit.com
                    </a>{" "}
                    (refreshed every 30s)
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="p-5 rounded-2xl bg-accent-green/5 border border-accent-green/20">
            <h2 className="text-lg font-bold mb-3">🚀 Why kr-stocks.com</h2>
            <ul className="space-y-2 text-sm text-text-muted leading-relaxed">
              <li>
                <strong className="text-text">3-phase auto detection</strong> — KRX regular hours
                (09:00~15:30 KST) / NXT after-hours (08:00~08:50 + 15:30~20:00 KST) / Hyperliquid overnight,
                switched automatically.
              </li>
              <li>
                <strong className="text-text">Korean retail-friendly labels</strong> — natural Korean
                vocabulary instead of crypto jargon.
              </li>
              <li>
                <strong className="text-text">Phase-aware source currency</strong> — KRW main during KRX
                hours, KRW + USD secondary during Hyperliquid hours.
              </li>
              <li>
                <strong className="text-text">3-in-1 unified analysis</strong> — Overnight price + regular
                close gap + broker consensus + foreign/institutional flow on one page.
              </li>
              <li>
                <strong className="text-text">Private big tech</strong> — SpaceX, OpenAI, Anthropic implied
                valuations with KRW equivalents.
              </li>
            </ul>
          </section>

          <section className="p-5 rounded-2xl bg-accent-amber/5 border border-accent-amber/20">
            <h2 className="text-lg font-bold mb-3">📬 Contact</h2>
            <p className="text-sm text-text-muted leading-relaxed mb-2">
              Advertising, affiliate, data corrections, feature suggestions — email us:
            </p>
            <a
              href="mailto:contact@kr-stocks.com"
              className="inline-block text-base font-semibold text-accent-blue hover:underline"
            >
              contact@kr-stocks.com
            </a>
            <p className="mt-3 text-xs text-text-dim">Reply within 24h on weekdays.</p>
          </section>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-3">⚠️ Disclaimer</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              This service is for informational purposes only and is not investment advice or solicitation.
              Prices shown are perp DEX quotes and may diverge from regular-session exchange prices. Private
              company prices are implied-valuation estimates. All investment decisions are your own
              responsibility — this site bears no liability for any losses.
            </p>
          </section>

          <div className="text-center pt-4">
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
