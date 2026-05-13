import { fetchAllPrices } from "@/lib/fetchPrices";
import { fetchCandleSet } from "@/lib/fetchCandles";
import { bySlug, CATEGORY_LABELS } from "@/lib/universe";
import { getConsensus, hasConsensus, enrichWithCurrentPrice } from "@/lib/consensus";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ConsensusSection } from "@/components/ConsensusSection";
import { FundingBar } from "@/components/FundingBar";
import { TradingFlowCard } from "@/components/TradingFlowCard";
import { getTradingFlow, hasTradingFlow } from "@/lib/tradingFlow";
import nextDynamic from "next/dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

// lightweight-charts는 window 의존 → SSR 비활성 + 클라이언트만 렌더
const PriceChart = nextDynamic(() => import("@/components/PriceChart").then((m) => m.PriceChart), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl bg-bg-card border border-line p-6 text-center text-sm text-text-dim">
      차트 로딩 중…
    </div>
  ),
});

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
      `${name} 정규장 종가 대비`,
      `${name} 야간 premium`,
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

  // 가격 + 캔들 병렬 fetch (환율 종목은 차트 skip → 빈 set)
  const candlesPromise = meta.is_fx
    ? Promise.resolve({ bars1H: [], bars4H: [] })
    : fetchCandleSet(meta.ticker);
  const [data, candles] = await Promise.all([fetchAllPrices(), candlesPromise]);
  const row = data.symbols.find((r) => r.slug === params.slug);
  if (!row || !row.market) notFound();

  const m = row.market;
  const isUp = m.change_24h_pct > 0;
  const isDn = m.change_24h_pct < 0;
  const colorClass = isUp ? "text-accent-green" : isDn ? "text-accent-blue" : "text-text-muted";
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
          {/* 시간대 인지 라벨 — 장중이면 KRX/NYSE 장중, 그 외엔 HL 야간 */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-xs text-text-dim">
              {m.main_source === "regular_live"
                ? (row.category === "korea" ? "KRX 장중 거래가 (실시간)" : row.category === "us" ? "미국 정규장 거래가 (실시간)" : "정규장 거래가 (실시간)")
                : "HL 야간 perp 시세 (24h)"}
            </div>
            {m.main_source === "regular_live" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tabular text-accent-green shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-soft" />
                LIVE
              </span>
            )}
          </div>
          {row.category === "korea" ? (
            <>
              <div className="text-4xl md:text-5xl font-bold tabular text-text mb-1">
                ₩{Math.round(m.main_display_krw ?? m.per_share_krw ?? m.krw_price).toLocaleString("ko-KR")}
              </div>
              <div className="text-sm text-text-muted tabular">
                {m.main_source === "regular_live"
                  ? <>HL 야간 ≈ ₩{Math.round(m.per_share_krw ?? m.krw_price).toLocaleString("ko-KR")}</>
                  : <>≈ ${(m.per_share_usd ?? m.mark_px_usd).toFixed(2)}{row.share_ratio != null && row.share_ratio !== 1.0 ? ` · 1주 환산 (HL contract = ${(1/row.share_ratio).toFixed(1)}주 묶음)` : ""}</>}
              </div>
            </>
          ) : row.is_index ? (
            <>
              <div className="text-4xl md:text-5xl font-bold tabular text-text mb-1">
                {(m.main_display_usd ?? m.mark_px_usd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-text-muted tabular">
                {m.main_source === "regular_live" ? "정규장 지수 (포인트)" : "HL perp 지수 (포인트)"}
              </div>
            </>
          ) : row.is_private ? (
            <>
              <div className="text-4xl md:text-5xl font-bold tabular text-text mb-1">${m.mark_px_usd.toFixed(2)}</div>
              <div className="text-sm text-text-muted tabular">
                ≈ ₩{Math.round(m.krw_price).toLocaleString("ko-KR")} · 비상장 implied 가치 추적
              </div>
            </>
          ) : (
            <>
              <div className="text-4xl md:text-5xl font-bold tabular text-text mb-1">${(m.main_display_usd ?? m.mark_px_usd).toFixed(2)}</div>
              <div className="text-sm text-text-muted tabular">
                {m.main_source === "regular_live"
                  ? <>HL 야간 ≈ ${m.mark_px_usd.toFixed(2)}</>
                  : <>≈ ₩{Math.round(m.krw_price).toLocaleString("ko-KR")}</>}
              </div>
            </>
          )}

          <div className={`mt-4 text-lg font-bold tabular ${colorClass}`}>
            {isUp ? "▲" : isDn ? "▼" : ""} {m.change_24h_pct.toFixed(2)}% (HL 24h)
          </div>
        </section>

        {m.hl_premium_pct != null && m.regular_close_krw != null && (
          <section className="mb-6 p-5 rounded-2xl bg-accent-blue/5 border border-accent-blue/20">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-xs text-text-dim">
                {m.is_intraday_live ? "HL 야간 시세 vs 장중 프리미엄" : "정규장 종가 대비 프리미엄 (야간/주말 가격 압력)"}
              </div>
              {m.is_intraday_live ? (
                <span className="text-[10px] font-semibold tabular text-text-dim shrink-0">HL 24h</span>
              ) : (
                <span className="text-[10px] font-semibold tabular text-text-dim shrink-0">CLOSED</span>
              )}
            </div>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs text-text-dim mb-1">
                  {m.is_intraday_live ? "HL 야간 perp" : "정규장 종가"}
                </div>
                <div className="text-xl font-semibold tabular text-text">
                  {m.is_intraday_live ? (
                    // 장중 = 첫 박스가 정규장 장중가 메인 → 이 박스엔 HL 야간 가격
                    row.is_index ? (
                      <>
                        {m.mark_px_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-xs text-text-dim ml-2">(지수)</span>
                      </>
                    ) : row.category === "korea" ? (
                      <>
                        ₩{Math.round(m.per_share_krw ?? m.krw_price).toLocaleString("ko-KR")}
                        <span className="text-xs text-text-dim ml-2">(${(m.per_share_usd ?? m.mark_px_usd).toFixed(2)})</span>
                      </>
                    ) : (
                      <>
                        ${m.mark_px_usd.toFixed(2)}
                        <span className="text-xs text-text-dim ml-2">(₩{Math.round(m.krw_price).toLocaleString("ko-KR")})</span>
                      </>
                    )
                  ) : (
                    // 장 마감 후 = 첫 박스가 HL 메인 → 이 박스엔 정규장 종가
                    row.is_index ? (
                      <>
                        {(m.regular_close_usd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-xs text-text-dim ml-2">(지수)</span>
                      </>
                    ) : row.category === "korea" ? (
                      <>
                        ₩{Math.round(m.regular_close_krw).toLocaleString("ko-KR")}
                        {m.regular_close_usd && <span className="text-xs text-text-dim ml-2">(${m.regular_close_usd.toFixed(2)})</span>}
                      </>
                    ) : (
                      <>
                        ${m.regular_close_usd?.toFixed(2) ?? "—"}
                        <span className="text-xs text-text-dim ml-2">(₩{Math.round(m.regular_close_krw).toLocaleString("ko-KR")})</span>
                      </>
                    )
                  )}
                </div>
                {/* 장중일 때 — 첫 박스가 KRX 장중가 메인이라 둘째 박스엔 전일 종가가 의미 있음 (HL 야간 비교 reference 부족) */}
                {m.is_intraday_live && m.regular_prev_close_krw != null && (
                  <div className="text-[11px] text-text-dim tabular mt-1">
                    전일 종가{" "}
                    {row.category === "korea"
                      ? `₩${Math.round(m.regular_prev_close_krw).toLocaleString("ko-KR")}`
                      : `$${(m.regular_prev_close_usd ?? 0).toFixed(2)}`}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-text-dim mb-1">
                  프리미엄
                </div>
                <div className={`${row.category === "korea" ? "text-4xl md:text-5xl" : "text-3xl"} font-bold tabular ${m.hl_premium_pct > 0 ? "text-accent-green" : m.hl_premium_pct < 0 ? "text-accent-blue" : "text-text-muted"}`}>
                  {m.hl_premium_pct > 0 ? "▲ +" : m.hl_premium_pct < 0 ? "▼ " : ""}{m.hl_premium_pct.toFixed(2)}%
                </div>
                {(() => {
                  // 갭 절댓값 — 한국 ₩, 미국 $
                  let gap = 0;
                  let gapText: string | null = null;
                  if (row.category === "korea") {
                    gap = Math.round((m.per_share_krw ?? m.krw_price) - m.regular_close_krw);
                    gapText = `${gap > 0 ? "+" : gap < 0 ? "−" : ""}₩${Math.abs(gap).toLocaleString("ko-KR")}`;
                  } else if (row.category === "us" && m.regular_close_usd != null) {
                    gap = m.mark_px_usd - m.regular_close_usd;
                    gapText = `${gap > 0 ? "+" : gap < 0 ? "−" : ""}$${Math.abs(gap).toFixed(2)}`;
                  }
                  if (gapText == null) return null;
                  return (
                    <div className={`text-sm font-semibold tabular mt-1 ${gap > 0 ? "text-accent-green" : gap < 0 ? "text-accent-blue" : "text-text-muted"}`}>
                      {gapText}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="mt-3 text-[11px] text-text-dim leading-relaxed">
              {m.hl_premium_pct > 5 ? "야간에 매수세 강함 — 시초가 갭업 가능성" : m.hl_premium_pct < -5 ? "야간에 매도세 강함 — 시초가 갭다운 가능성" : "정규장 수준에 가까운 가격"}
              {" · "}
              {m.regular_source === "naver" ? "출처: 네이버 금융" : "출처: Yahoo Finance"}
            </div>
          </section>
        )}

        {/* 증권사 분석 — 한국주식 3종에만 (삼성/하이닉스/현대차) */}
        {hasConsensus(row.slug) && (() => {
          const raw = getConsensus(row.slug);
          if (!raw) return null;
          // 현재가 — 시간대 인지 메인 가격 (장중=KRX 실시간, 그 외=HL 야간 per_share_krw)
          const currentKrw = m.main_display_krw ?? m.regular_close_krw ?? m.per_share_krw ?? m.krw_price ?? null;
          const cdata = enrichWithCurrentPrice(raw, currentKrw);
          return <ConsensusSection data={cdata} locale="ko" />;
        })()}

        {/* 외국인·기관 매매 동향 — 한국주식 3종만 (samsung/hynix/hyundai) */}
        {hasTradingFlow(row.slug) && (() => {
          const flow = getTradingFlow(row.slug);
          if (!flow) return null;
          return <TradingFlowCard data={flow} locale="ko" />;
        })()}

        {/* HL 거래자 포지션 (funding rate 기반) — 환율 제외 모든 종목 */}
        {!row.is_fx && m.funding != null && (
          <FundingBar funding={m.funding} locale="ko" />
        )}

        {!row.is_fx && (candles.bars1H.length > 0 || candles.bars4H.length > 0) && (
          <section className="mb-6">
            <PriceChart
              bars1H={candles.bars1H}
              bars4H={candles.bars4H}
              regularCloseUsd={m.regular_close_usd}
              regularCloseKrw={m.regular_close_krw}
              avgTargetKrw={hasConsensus(row.slug) ? getConsensus(row.slug)?.consensus.avg_target_krw : null}
              fxRate={data.fx.krw_per_usdt}
              isKR={row.category === "korea"}
              name={row.name_ko || row.name_en || row.slug}
            />
          </section>
        )}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat
            label={row.is_index ? "HL Mark (지수)" : "HL Mark Price"}
            value={row.is_index
              ? m.mark_px_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : `$${m.mark_px_usd.toFixed(2)}`}
          />
          <Stat
            label="전일 종가"
            value={row.is_index
              ? m.prev_day_px_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : `$${m.prev_day_px_usd.toFixed(2)}`}
          />
          <Stat label="24h 거래대금" value={fmtVol(m.day_volume_usd)} />
          <Stat label="Open Interest" value={fmtNum(m.open_interest)} />
          <Stat label="Funding Rate" value={`${(m.funding * 100).toFixed(4)}%`} />
          {m.regular_close_krw != null && (
            <Stat
              label={m.is_intraday_live ? "정규장 (장중)" : "정규장 종가"}
              value={row.is_index
                ? (m.regular_close_usd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : row.category === "korea"
                  ? `₩${Math.round(m.regular_close_krw).toLocaleString("ko-KR")}`
                  : `$${m.regular_close_usd?.toFixed(2) ?? "—"}`}
            />
          )}
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
