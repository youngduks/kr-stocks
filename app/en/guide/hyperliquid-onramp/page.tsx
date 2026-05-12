import { Header } from "@/components/Header";
import { fetchAllPrices } from "@/lib/fetchPrices";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

// Operator referral links (no extra cost to user, trade-fee rebate funds site operations)
const BINANCE_REF = "https://www.binance.com/register?ref=KRSTOCKS";
const BYBIT_REF = "https://www.bybit.com/invite?ref=OKWEGE";

export const metadata: Metadata = {
  title: "How to Trade Hyperliquid from Korea — 24h Private Big Tech Guide",
  description:
    "Step-by-step onramp for Korean users to trade OpenAI · SpaceX · Anthropic and Korean stock overnight perps via Hyperliquid HIP-3. Binance USDT → HL Bridge → HIP-3 perp.",
  keywords: [
    "Hyperliquid Korea",
    "Hyperliquid signup",
    "OpenAI perp trading",
    "SpaceX perp",
    "Anthropic perp",
    "HIP-3 trading",
    "Binance USDT deposit",
    "Bybit Korea signup",
    "Korean stock overnight perp",
  ],
  openGraph: {
    title: "How to Trade Hyperliquid from Korea",
    description: "Step-by-step guide: Binance USDT → HL Bridge → HIP-3 perp.",
    url: "https://kr-stocks.com/en/guide/hyperliquid-onramp",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Trade Hyperliquid from Korea",
    description: "24h private big tech perp — onramp guide.",
  },
  alternates: {
    canonical: "https://kr-stocks.com/en/guide/hyperliquid-onramp",
    languages: {
      "ko-KR": "https://kr-stocks.com/guide/hyperliquid-onramp",
      "en-US": "https://kr-stocks.com/en/guide/hyperliquid-onramp",
      "x-default": "https://kr-stocks.com/guide/hyperliquid-onramp",
    },
  },
};

export default async function HyperliquidOnrampGuideEN() {
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
            <div className="text-xs text-accent-blue font-semibold mb-2 tracking-wider">GUIDE · ONRAMP</div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              How to Trade Hyperliquid from Korea
            </h1>
            <p className="text-text-muted text-base leading-relaxed">
              To trade unlisted OpenAI · SpaceX · Anthropic plus US and Korean stock overnight prices directly from Korea, use the
              Hyperliquid (HL) decentralized exchange. Step-by-step below.
            </p>
          </header>

          <section className="mb-8 p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-2">What is Hyperliquid (HL)?</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Hyperliquid is an Arbitrum-based decentralized perpetual futures exchange. Its HIP-3 builder dexes (<span className="font-mono">xyz</span>, <span className="font-mono">vntl</span>) list unlisted big tech (OpenAI · SpaceX ·
              Anthropic) implied valuation 24/7 and Korean stocks like Samsung · SK Hynix as perps — even when regular sessions are
              closed.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Step-by-step</h2>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-blue font-semibold mb-1 tracking-wider">STEP 1</div>
                <h3 className="font-bold text-base mb-2">Get USDT (Binance or Bybit)</h3>
                <p className="text-sm text-text-muted leading-relaxed mb-3">
                  HL is USDT-denominated. Easiest path: KRW or BTC → USDT on Binance or Bybit. Both accept Korean users; KYC takes
                  about 5 minutes. Pick by fee preference or UI.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={BINANCE_REF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 rounded-lg bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20 text-sm font-semibold transition"
                  >
                    Sign up to Binance →
                  </a>
                  <a
                    href={BYBIT_REF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 text-sm font-semibold transition"
                  >
                    Sign up to Bybit →
                  </a>
                </div>
                <p className="text-[10px] text-text-dim mt-2 leading-relaxed">
                  ※ Links above are operator referrals. No extra cost to you — a portion of trading fees supports
                  kr-stocks.com operations.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-blue font-semibold mb-1 tracking-wider">STEP 2</div>
                <h3 className="font-bold text-base mb-2">Install an Arbitrum-compatible wallet</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Install MetaMask or Rabby (browser extension). HL runs on Arbitrum and the HL Bridge handles gas — you don&apos;t need to
                  buy ETH/ARB separately.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-blue font-semibold mb-1 tracking-wider">STEP 3</div>
                <h3 className="font-bold text-base mb-2">Open Hyperliquid &amp; connect wallet</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Open{" "}
                  <a href="https://app.hyperliquid.xyz" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">
                    app.hyperliquid.xyz
                  </a>
                  {" "}→ click "Connect Wallet" → pick your EVM wallet. First connection requires one signature (no gas). HL
                  auto-creates your account.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-blue font-semibold mb-1 tracking-wider">STEP 4</div>
                <h3 className="font-bold text-base mb-2">Deposit USDT (HL Bridge)</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Click "Deposit" on HL → copy the Arbitrum address shown → withdraw USDT from Binance / Bybit via{" "}
                  <span className="font-mono text-text">Arbitrum One</span> network. HL balance reflects in 5–10 min. Minimum 5 USDT
                  recommended (to amortize fees).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-blue font-semibold mb-1 tracking-wider">STEP 5</div>
                <h3 className="font-bold text-base mb-2">Trade private big tech / Korean stock perps</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  In the HL UI, top-left dex selector → choose <span className="font-mono">xyz</span> or{" "}
                  <span className="font-mono">vntl</span> (HIP-3 builder dexes). Search tickers:
                </p>
                <ul className="text-sm text-text-muted leading-relaxed mt-2 space-y-1">
                  <li>
                    • Private: <span className="font-mono text-text">OPENAI</span>,{" "}
                    <span className="font-mono text-text">SPACEX</span>, <span className="font-mono text-text">ANTHROPIC</span> (vntl dex)
                  </li>
                  <li>
                    • Korean stocks: <span className="font-mono text-text">SMSN</span>,{" "}
                    <span className="font-mono text-text">SKHX</span>, <span className="font-mono text-text">HYUNDAI</span> (xyz dex)
                  </li>
                  <li>
                    • US stocks: <span className="font-mono text-text">TSLA</span>, <span className="font-mono text-text">NVDA</span>,{" "}
                    <span className="font-mono text-text">AAPL</span>, <span className="font-mono text-text">MSFT</span>, etc. (xyz dex)
                  </li>
                </ul>
                <p className="text-sm text-text-muted leading-relaxed mt-2">
                  Open a long / short, set leverage (1×–10× recommended).
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8 p-5 rounded-xl bg-accent-amber/5 border border-accent-amber/20">
            <h2 className="text-sm font-bold text-accent-amber mb-2">⚠️ Notes</h2>
            <ul className="text-xs text-text-muted space-y-1 leading-relaxed">
              <li>• HL perp prices can diverge from regular-session close (premium / discount).</li>
              <li>• Private tickers are implied-valuation estimates (not real per-share quotes).</li>
              <li>• Leverage carries liquidation risk — beginners should learn at 1×.</li>
              <li>• This is information only, not investment advice.</li>
              <li>• Use Binance / HL / Bybit at your own discretion and risk.</li>
            </ul>
          </section>

          <section className="p-5 rounded-xl bg-accent-blue/5 border border-accent-blue/20">
            <h2 className="text-sm font-bold text-accent-blue mb-3">📊 Time your entries with live prices</h2>
            <p className="text-sm text-text-muted leading-relaxed mb-3">
              After signup &amp; deposit, watch live prices and regular-close premium on kr-stocks.com to time entries:
            </p>
            <div className="flex flex-col gap-1.5">
              <Link href={"/private/anthropic" as any} className="text-accent-blue hover:underline font-semibold text-sm">
                → Anthropic 24h price
              </Link>
              <Link href={"/private/spacex" as any} className="text-accent-blue hover:underline font-semibold text-sm">
                → SpaceX 24h price
              </Link>
              <Link href={"/private/openai" as any} className="text-accent-blue hover:underline font-semibold text-sm">
                → OpenAI 24h price
              </Link>
              <Link href={"/korea/samsung" as any} className="text-accent-blue hover:underline font-semibold text-sm">
                → Samsung overnight (with regular-close premium)
              </Link>
              <Link href={"/korea/hynix" as any} className="text-accent-blue hover:underline font-semibold text-sm">
                → SK Hynix overnight
              </Link>
            </div>
            <p className="mt-4 text-[11px] text-text-dim">
              Ticker detail pages are currently Korean — content stays meaningful (numbers, gap %, regular close).
            </p>
          </section>
        </article>
      </main>

      <footer className="border-t border-line mt-12">
        <div className="max-w-6xl mx-auto px-5 py-8 text-xs text-text-dim leading-6">
          <p>© 2026 KR Stocks. Not investment advice.</p>
          <p className="mt-1">
            <Link href={"/guide/hyperliquid-onramp" as any} className="text-accent-blue hover:underline">
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
