import { fetchAllPrices } from "@/lib/fetchPrices";
import { bySlug, CATEGORY_LABELS } from "@/lib/universe";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 30;
export const dynamic = "force-dynamic";

type Props = { params: { category: string; slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const meta = bySlug(params.slug);
  if (!meta) return {};
  const name = meta.name_ko || meta.name_en || params.slug;
  const url = `https://kr-stocks.com/${params.category}/${params.slug}`;
  const desc = `${name} 실시간 24시간 가격. 정규장 휴장에도 끊김 없이 추적.${meta.is_private ? " 비상장 implied valuation 기준." : ""} Hyperliquid HIP-3 + 업비트 KRW/USDT 연동.`;
  return {
    title: `${name} 24시간 시세`,
    description: desc,
    keywords: [
      `${name} 24시간`,
      `${name} 야간 시세`,
      `${name} 새벽 시세`,
      `${name} 주가`,
      `${name} 가격`,
      `${name} 실시간`,
      meta.is_private ? `${name} 시가총액` : `${name} 주식`,
    ],
    openGraph: { title: `${name} 24시간 시세`, description: desc, url, type: "website" },
    twitter: { card: "summary_large_image", title: `${name} 24시간 시세`, description: desc },
    alternates: { canonical: url },
  };
}

export default async function SymbolPage({ params }: Props) {
  const meta = bySlug(params.slug);
  if (!meta || meta.category !== params.category) notFound();

  const data = await fetchAllPrices();
  const row = data.symbols.find((r) => r.slug === params.slug);
  if (!row || !row.market) notFound();

  const m = row.market;
  const isUp = m.change_24h_pct > 0;
  const isDn = m.change_24h_pct < 0;
  const colorClass = isUp ? "text-accent-green" : isDn ? "text-accent-red" : "text-text-muted";
  const label = CATEGORY_LABELS[row.category];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: row.name_ko,
    alternateName: row.name_en,
    url: `https://kr-stocks.com/${row.category}/${row.slug}`,
    description: `${row.name_ko} 24시간 실시간 시세 — Hyperliquid HIP-3 perp + 업비트 KRW/USDT 연동`,
    offers: {
      "@type": "Offer",
      price: m.mark_px_usd,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    ...(row.implied_valuation_usd && {
      additionalProperty: {
        "@type": "PropertyValue",
        name: "Implied Valuation",
        value: row.implied_valuation_usd,
        unitText: "USD",
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />

      <main className="max-w-4xl mx-auto px-5 pt-6 pb-12">
        <Link href="/" className="text-xs text-text-dim hover:text-text-muted">← 홈으로</Link>

        <section className="mt-4 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-1 rounded-md bg-bg-card border border-line text-text-muted">{label.emoji} {label.ko}</span>
            {row.is_private && <span className="text-xs px-2 py-1 rounded-md bg-accent-purple/15 text-accent-purple font-semibold">비상장 perp</span>}
            {row.is_index && <span className="text-xs px-2 py-1 rounded-md bg-accent-amber/15 text-accent-amber font-semibold">지수</span>}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{row.name_ko}</h1>
          <div className="text-sm text-text-muted mt-1">{row.name_en} · <span className="font-mono text-xs">{row.ticker}</span></div>
        </section>

        <section className="bg-bg-card border border-line rounded-2xl p-6 mb-6">
          <div className="text-xs text-text-dim mb-2">현재 시세 (24h perp)</div>
          {row.share_ratio != null && row.share_ratio !== 1.0 ? (
            <>
              <div className="text-4xl md:text-5xl font-bold tabular text-text mb-1">
                ₩{Math.round(m.per_share_krw ?? 0).toLocaleString("ko-KR")}
              </div>
              <div className="text-sm text-text-muted tabular">
                1주 환산 (HL contract = {(1/row.share_ratio).toFixed(1)}주 묶음 / ${m.per_share_usd?.toFixed(2)})
              </div>
            </>
          ) : row.is_private ? (
            <>
              <div className="text-4xl md:text-5xl font-bold tabular text-text mb-1">${m.mark_px_usd.toFixed(2)}</div>
              <div className="text-sm text-text-muted tabular">
                ₩{Math.round(m.krw_price).toLocaleString("ko-KR")} · 비상장 implied 가치 추적
              </div>
            </>
          ) : (
            <>
              <div className="text-4xl md:text-5xl font-bold tabular text-text mb-1">${m.mark_px_usd.toFixed(2)}</div>
              <div className="text-sm text-text-muted tabular">₩{Math.round(m.krw_price).toLocaleString("ko-KR")}</div>
            </>
          )}

          <div className={`mt-4 text-lg font-bold tabular ${colorClass}`}>
            {isUp ? "▲" : isDn ? "▼" : ""} {m.change_24h_pct.toFixed(2)}% (24h)
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="HL Mark Price" value={`$${m.mark_px_usd.toFixed(2)}`} />
          <Stat label="전일 종가" value={`$${m.prev_day_px_usd.toFixed(2)}`} />
          <Stat label="24h 거래대금" value={fmtVol(m.day_volume_usd)} />
          <Stat label="Open Interest" value={fmtNum(m.open_interest)} />
          <Stat label="Funding Rate" value={`${(m.funding * 100).toFixed(4)}%`} />
          {row.implied_valuation_usd && <Stat label="추정 valuation" value={fmtBig(row.implied_valuation_usd)} />}
          {row.regular_market && <Stat label="정규장" value={row.regular_market} />}
          {row.krx_code && <Stat label="KRX 종목코드" value={row.krx_code} />}
        </section>

        {row.note && (
          <section className="mb-6 p-4 rounded-xl bg-bg-card border border-line text-xs text-text-muted leading-6">
            <span className="font-semibold text-text-dim mr-2">📝 메모:</span>{row.note}
          </section>
        )}

        <section className="p-5 rounded-xl bg-accent-blue/5 border border-accent-blue/20 text-sm text-text-muted">
          <div className="font-semibold text-text mb-1">📊 데이터 출처</div>
          가격: Hyperliquid {row.dex} dex perp ({row.ticker}) · 환율: Upbit KRW/USDT · 업데이트 30초
        </section>
      </main>

      <Footer />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-card border border-line rounded-xl p-3">
      <div className="text-[10px] text-text-dim mb-1 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-semibold tabular text-text">{value}</div>
    </div>
  );
}

function fmtVol(n: number): string {
  if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtNum(n: number): string {
  if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n/1e3).toFixed(2)}K`;
  return n.toFixed(2);
}
function fmtBig(n: number): string {
  if (n >= 1e12) return `$${(n/1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n/1e9).toFixed(0)}B`;
  return `$${n.toFixed(0)}`;
}
