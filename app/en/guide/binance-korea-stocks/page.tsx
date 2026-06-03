import { Header } from "@/components/Header";
import { fetchAllPrices } from "@/lib/fetchPrices";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

// Operator referral link (no extra cost to user, trade-fee rebate funds site operations)
const BINANCE_REF = "https://www.binance.com/register?ref=KRSTOCKS";

export const metadata: Metadata = {
  title: "How to Trade Samsung · SK Hynix · Hyundai on Binance — 24h Futures Guide",
  description:
    "Step-by-step guide to trade Samsung, SK Hynix and Hyundai Korean stocks as Binance USDT-M perps (SAMSUNGUSDT · SKHYNIXUSDT · HYUNDAIUSDT), 24/7. Sign up → get USDT → transfer to futures → trade.",
  keywords: [
    "Binance Samsung futures",
    "Binance Korean stocks",
    "SAMSUNGUSDT",
    "SKHYNIXUSDT",
    "HYUNDAIUSDT",
    "Samsung 24h trading",
    "SK Hynix perp",
    "Hyundai perp",
    "Binance signup Korea",
    "trade Korean stocks crypto",
  ],
  openGraph: {
    title: "How to Trade Samsung · SK Hynix · Hyundai on Binance",
    description: "Trade 3 Korean stocks as Binance USDT-M perps 24/7 — step-by-step.",
    url: "https://kr-stocks.com/en/guide/binance-korea-stocks",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Trade Samsung · SK Hynix · Hyundai on Binance",
    description: "3 Korean stocks as Binance 24h perps — onramp guide.",
  },
  alternates: {
    canonical: "https://kr-stocks.com/en/guide/binance-korea-stocks",
    languages: {
      "ko-KR": "https://kr-stocks.com/guide/binance-korea-stocks",
      "en-US": "https://kr-stocks.com/en/guide/binance-korea-stocks",
      "x-default": "https://kr-stocks.com/guide/binance-korea-stocks",
    },
  },
};

export default async function BinanceKoreaStocksGuideEN() {
  const data = await fetchAllPrices();

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />
      <main className="max-w-3xl mx-auto px-5 pt-6 pb-12">
        <Link href={"/en" as any} className="text-xs text-text-dim hover:text-text-muted">
          ← Home
        </Link>

        <article className="mt-4">
          <header className="mb-8">
            <div className="text-xs text-accent-amber font-semibold mb-2 tracking-wider">GUIDE · BINANCE</div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              How to Trade Samsung · SK Hynix · Hyundai on Binance
            </h1>
            <p className="text-text-muted text-base leading-relaxed">
              On June 2, 2026 Binance listed USDT-M perpetual futures tracking Samsung Electronics, SK Hynix and
              Hyundai Motor. You can now trade Korean stocks long/short 24/7 — even when the regular session is
              closed — with no external wallet or blockchain bridge. Just one Binance account. Step-by-step below.
            </p>
          </header>

          <section className="mb-8 p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-2">What are Binance Korean-stock perps?</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              <span className="font-mono text-text">SAMSUNGUSDT</span>,
              <span className="font-mono text-text"> SKHYNIXUSDT</span> and
              <span className="font-mono text-text"> HYUNDAIUSDT</span> on Binance USDT-M futures are cash-settled
              perpetuals that track each stock&apos;s price. No real shares change hands — settlement is in USDT — and
              they trade 24/7, including nights and weekends when the Korean market is closed. Up to 20× leverage,
              funding settles every 8 hours.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Step-by-step</h2>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-amber font-semibold mb-1 tracking-wider">STEP 1</div>
                <h3 className="font-bold text-base mb-2">Sign up to Binance + KYC</h3>
                <p className="text-sm text-text-muted leading-relaxed mb-3">
                  Create a Binance account and complete KYC (ID verification). Korean users are accepted; verification
                  takes 5–10 minutes. The first time you enable futures you answer a short suitability quiz, then your
                  futures wallet activates.
                </p>
                <a
                  href={BINANCE_REF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 rounded-lg bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20 text-sm font-semibold transition"
                >
                  Sign up to Binance →
                </a>
                <p className="text-[10px] text-text-dim mt-2 leading-relaxed">
                  ※ Link above is an operator referral. No extra cost to you — a portion of trading fees supports
                  kr-stocks.com operations.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-amber font-semibold mb-1 tracking-wider">STEP 2</div>
                <h3 className="font-bold text-base mb-2">Get USDT</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  These perps settle in USDT. Buy USDT directly with your local currency on Binance P2P, or convert
                  existing BTC/coins to USDT. P2P runs on domestic bank transfers, so you top up without any overseas
                  wire.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-amber font-semibold mb-1 tracking-wider">STEP 3</div>
                <h3 className="font-bold text-base mb-2">Transfer to the USD-M Futures wallet</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  In the Binance app → [Wallet] → [Transfer] → move USDT from Spot to USD-M Futures. It&apos;s an internal
                  transfer — no fee, no wait. Unlike Hyperliquid, you need no external wallet (MetaMask) and no
                  Arbitrum bridge at all.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-amber font-semibold mb-1 tracking-wider">STEP 4</div>
                <h3 className="font-bold text-base mb-2">Search the symbol + go long/short</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  In the futures trading screen, search the symbol:
                </p>
                <ul className="text-sm text-text-muted leading-relaxed mt-2 space-y-1">
                  <li>• Samsung: <span className="font-mono text-text">SAMSUNGUSDT</span></li>
                  <li>• SK Hynix: <span className="font-mono text-text">SKHYNIXUSDT</span></li>
                  <li>• Hyundai: <span className="font-mono text-text">HYUNDAIUSDT</span></li>
                </ul>
                <p className="text-sm text-text-muted leading-relaxed mt-2">
                  Set leverage (1–3× recommended for beginners) → go long if you expect upside, short if you expect
                  downside.
                </p>
              </div>
            </div>
          </section>

          {/* Binance vs HL comparison */}
          <section className="mb-8 p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-3">Binance vs Hyperliquid — what&apos;s different</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-dim text-xs border-b border-line">
                    <th className="text-left py-2 font-medium"> </th>
                    <th className="text-left py-2 font-medium">Binance</th>
                    <th className="text-left py-2 font-medium">Hyperliquid (HL)</th>
                  </tr>
                </thead>
                <tbody className="text-text-muted">
                  <tr className="border-b border-line/50">
                    <td className="py-2 text-text-dim">Onboarding</td>
                    <td className="py-2">Account + KYC</td>
                    <td className="py-2">Connect EVM wallet</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="py-2 text-text-dim">Funding</td>
                    <td className="py-2">P2P · internal transfer</td>
                    <td className="py-2">Arbitrum bridge</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="py-2 text-text-dim">Korean stocks</td>
                    <td className="py-2 text-accent-green">Samsung · Hynix · Hyundai</td>
                    <td className="py-2 text-accent-green">Samsung · Hynix · Hyundai</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="py-2 text-text-dim">Private big tech</td>
                    <td className="py-2 text-text-dim">None</td>
                    <td className="py-2 text-accent-green">OpenAI · SpaceX · Anthropic</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-text-dim">Liquidity</td>
                    <td className="py-2">Deep (stable price)</td>
                    <td className="py-2">Thin (premium swings)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-text-dim mt-3 leading-relaxed">
              If you only trade Samsung · Hynix · Hyundai, Binance is the simpler path; if you also want private big
              tech like OpenAI · SpaceX, you need Hyperliquid.
            </p>
          </section>

          <section className="mb-8 p-5 rounded-xl bg-accent-amber/5 border border-accent-amber/20">
            <h2 className="text-sm font-bold text-accent-amber mb-2">⚠️ Notes</h2>
            <ul className="text-xs text-text-muted space-y-1 leading-relaxed">
              <li>• Perp prices can diverge from the KRX regular-session close (premium / discount).</li>
              <li>• Cash-settled — no real shares, dividends or voting rights (price tracking only).</li>
              <li>• Leverage carries liquidation risk — beginners should learn at 1×.</li>
              <li>• Funding settles every 8h — check cost/credit if you hold long-term.</li>
              <li>• This is information only, not investment advice.</li>
            </ul>
          </section>

          <section className="p-5 rounded-xl bg-accent-blue/5 border border-accent-blue/20">
            <h2 className="text-sm font-bold text-accent-blue mb-3">📊 Time your entries with live prices</h2>
            <p className="text-sm text-text-muted leading-relaxed mb-3">
              After signup &amp; funding, watch the Binance 24h price and the premium vs the regular-session close on
              kr-stocks.com to time your entries:
            </p>
            <div className="flex flex-col gap-1.5">
              <Link href={"/korea/samsung" as any} className="text-accent-blue hover:underline font-semibold text-sm">
                → Samsung 24h price (with Binance premium)
              </Link>
              <Link href={"/korea/hynix" as any} className="text-accent-blue hover:underline font-semibold text-sm">
                → SK Hynix 24h price
              </Link>
              <Link href={"/korea/hyundai" as any} className="text-accent-blue hover:underline font-semibold text-sm">
                → Hyundai 24h price
              </Link>
            </div>
            <p className="text-sm text-text-muted leading-relaxed mt-4">
              For private big tech like OpenAI · SpaceX or US-stock overnight trading, see the{" "}
              <Link href={"/en/guide/hyperliquid-onramp" as any} className="text-accent-blue hover:underline font-semibold">
                Hyperliquid trading guide
              </Link>
              .
            </p>
          </section>
        </article>
      </main>

      <footer className="border-t border-line mt-12">
        <div className="max-w-6xl mx-auto px-5 py-8 text-xs text-text-dim leading-6">
          <p>© 2026 KR Stocks. Not investment advice.</p>
          <p className="mt-1">
            <Link href={"/guide/binance-korea-stocks" as any} className="text-accent-blue hover:underline">
              한국어 버전
            </Link>
            {" · "}
            <a href="mailto:contact@kr-stocks.com" className="text-accent-blue hover:underline">
              contact@kr-stocks.com
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
