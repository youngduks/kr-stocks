import { fetchAllPrices } from "@/lib/fetchPrices";
import { fetchCandleSet } from "@/lib/fetchCandles";
import { bySlug, CATEGORY_LABELS } from "@/lib/universe";
import { getConsensus, hasConsensus, enrichWithCurrentPrice } from "@/lib/consensus";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ConsensusSection } from "@/components/ConsensusSection";
// FundingBar 재도입 (2026-05-13) — retail 친화 "24시간 시장 sentiment" 라벨로 변환,
// 코인 metric (펀딩%, APR) 제거하고 상승/하락 베팅 비율만 가시화
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

  // 가격 + 캔들 병렬 fetch (환율 종목은 차트 skip)
  const candlesPromise = meta.is_fx
    ? Promise.resolve({ bars1H: [], bars4H: [] })
    : fetchCandleSet(meta.ticker);
  const [data, candles] = await Promise.all([
    fetchAllPrices(),
    candlesPromise,
  ]);
  const row = data.symbols.find((r) => r.slug === params.slug);
  if (!row || !row.market) notFound();

  const m = row.market;
  // phase 인지 변동률 — live/nxt: 전일 대비 / closed: HL 24h
  const mainChg = m.main_change_pct ?? m.change_24h_pct;
  const mainChgLabel = m.main_change_label ?? "HL 24h";
  const isUp = mainChg > 0;
  const isDn = mainChg < 0;
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
          {/* 3-phase 라벨 + pill (LIVE 🟢 / NXT 🟠 / Hyperliq 🔵) — 시장 시간 자동 인지 */}
          {(() => {
            const phase = m.market_phase;
            const phaseMeta =
              phase === "live"
                ? {
                    label:
                      row.category === "korea"
                        ? "KRX 장중 거래가 (실시간)"
                        : row.category === "us"
                        ? "미국 정규장 거래가 (실시간)"
                        : "정규장 거래가 (실시간)",
                    pill: "정규장",
                    pillColor: "text-accent-green",
                    dotColor: "bg-accent-green",
                    pulse: true,
                  }
                : phase === "nxt"
                ? {
                    label: "NXT 시간외 거래가 (15:30~20:00 KST)",
                    pill: "NXT",
                    pillColor: "text-accent-amber",
                    dotColor: "bg-accent-amber",
                    pulse: true,
                  }
                : {
                    label: "Hyperliquid HIP-3 perp (24h)",
                    pill: "Hyperliquid",
                    pillColor: "text-accent-blue",
                    dotColor: "bg-accent-blue",
                    pulse: false,
                  };
            return (
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-xs text-text-dim">{phaseMeta.label}</div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold tabular ${phaseMeta.pillColor} shrink-0`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${phaseMeta.dotColor} ${phaseMeta.pulse ? "animate-pulse-soft" : ""}`} />
                  {phaseMeta.pill}
                </span>
              </div>
            );
          })()}
          {row.category === "korea" ? (
            <>
              <div className="text-4xl md:text-5xl font-bold tabular text-text mb-1">
                ₩{Math.round(m.main_display_krw ?? m.per_share_krw ?? m.krw_price).toLocaleString("ko-KR")}
              </div>
              {/* 한국주식 = 원화만 (한국 retail 직격, 달러 환산 X) */}
              {/* phase 별 보조 줄 — 종가 (작게, 항상) + HL 24h reference (closed phase 아닐 때) */}
              <div className="mt-1 space-y-0.5">
                {/* 정규장 종가 — phase별 동적 라벨 :
                    - live  → "전일 종가" (메인 = KRX 장중, 전일 reference)
                    - nxt   → "KRX 종가" (메인 = NXT, 당일 KRX 15:30 마감 가격) ★ NEW
                    - closed → "KRX 종가" (마지막 거래일 종가) */}
                {m.market_phase === "nxt" && m.regular_close_krw != null ? (
                  <div className="text-[12px] text-text-dim tabular">
                    KRX 종가 ₩{Math.round(m.regular_close_krw).toLocaleString("ko-KR")}
                  </div>
                ) : m.market_phase === "closed" && m.regular_close_krw != null ? (
                  <div className="text-[12px] text-text-dim tabular">
                    KRX 종가 ₩{Math.round(m.regular_close_krw).toLocaleString("ko-KR")}
                  </div>
                ) : m.regular_prev_close_krw != null ? (
                  <div className="text-[12px] text-text-dim tabular">
                    전일 종가 ₩{Math.round(m.regular_prev_close_krw).toLocaleString("ko-KR")}
                  </div>
                ) : null}
                {/* HL 24h reference — live/nxt phase 일 때 (closed 모드엔 메인이 HL이라 중복 회피) */}
                {m.market_phase !== "closed" && (
                  <div className="text-sm text-text-muted tabular">
                    HL 24h ≈ ₩{Math.round(m.per_share_krw ?? m.krw_price).toLocaleString("ko-KR")}
                  </div>
                )}
                {/* Hyperliquid phase 한국주식 — 메인 ₩ 옆에 작게 달러 보조 (형님 5/13 요청)
                    + share_ratio 정보 (ratio ≠ 1.0 인 경우만 추가 표기) */}
                {m.market_phase === "closed" && (() => {
                  const usd = m.main_display_usd ?? m.per_share_usd ?? m.mark_px_usd;
                  if (usd == null) return null;
                  const usdText = usd >= 10000
                    ? usd.toLocaleString("en-US", { maximumFractionDigits: 0 })
                    : usd >= 1
                      ? usd.toFixed(2)
                      : usd.toFixed(4);
                  const ratioInfo = row.share_ratio != null && row.share_ratio !== 1.0
                    ? ` · HL contract = ${(1/row.share_ratio).toFixed(1)}주 묶음`
                    : "";
                  return (
                    <div className="text-sm text-text-muted tabular">
                      ≈ ${usdText}{ratioInfo}
                    </div>
                  );
                })()}
              </div>
            </>
          ) : row.is_index ? (
            <>
              <div className="text-4xl md:text-5xl font-bold tabular text-text mb-1">
                {(m.main_display_usd ?? m.mark_px_usd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-text-muted tabular">
                {m.main_source === "regular_live" ? "정규장 지수 (포인트)" : "HL 24h 지수 (포인트)"}
              </div>
              {/* 지수 종가 줄 — phase별 분기 (closed 도 표시되도록 누락 fix) */}
              {m.market_phase === "closed"
                ? m.regular_close_usd != null && (
                    <div className="text-[12px] text-text-dim tabular mt-1">
                      정규장 종가 {m.regular_close_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )
                : m.regular_prev_close_usd != null && (
                    <div className="text-[12px] text-text-dim tabular mt-1">
                      전일 종가 {m.regular_prev_close_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
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
                  ? <>HL 24h ≈ ${m.mark_px_usd.toFixed(2)}</>
                  : <>≈ ₩{Math.round(m.krw_price).toLocaleString("ko-KR")}</>}
              </div>
              {/* 미국주식 종가 한 줄 (작게) */}
              {m.market_phase === "closed"
                ? m.regular_close_usd != null && (
                    <div className="text-[12px] text-text-dim tabular mt-1">
                      정규장 종가 ${m.regular_close_usd.toFixed(2)}
                    </div>
                  )
                : m.regular_prev_close_usd != null && (
                    <div className="text-[12px] text-text-dim tabular mt-1">
                      전일 종가 ${m.regular_prev_close_usd.toFixed(2)}
                    </div>
                  )}
            </>
          )}

          <div className={`mt-4 text-lg font-bold tabular ${colorClass}`}>
            {isUp ? "▲" : isDn ? "▼" : ""} {Math.abs(mainChg).toFixed(2)}% ({mainChgLabel})
          </div>
        </section>

        {m.hl_premium_pct != null && m.regular_close_krw != null && (() => {
          // 박스 2 phase 3-way 분기 :
          //   live  → "HL 24h 시세 vs 장중 프리미엄" + HL 가격 표시
          //   nxt   → "HL 24h 시세 vs NXT 프리미엄" + HL 가격 표시
          //   closed → "정규장 종가 대비 프리미엄 (야간/주말 가격 압력)" + 정규장 종가 표시
          const phase = m.market_phase;
          const showHL = phase === "live" || phase === "nxt";
          const headerLabel =
            phase === "live" ? "HL 24h 시세 vs 장중 프리미엄"
            : phase === "nxt" ? "HL 24h 시세 vs NXT 프리미엄"
            : "정규장 종가 대비 프리미엄 (야간/주말 가격 압력)";
          const rightTag =
            phase === "live" ? "HL 24h"
            : phase === "nxt" ? "HL 24h"
            : "CLOSED";
          const priceLabel = showHL ? "HL 24h" : "정규장 종가";
          return (
          <section className="mb-6 p-5 rounded-2xl bg-accent-blue/5 border border-accent-blue/20">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-xs text-text-dim">{headerLabel}</div>
              <span className="text-[10px] font-semibold tabular text-text-dim shrink-0">{rightTag}</span>
            </div>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs text-text-dim mb-1">{priceLabel}</div>
                <div className="text-xl font-semibold tabular text-text">
                  {showHL ? (
                    // live/nxt = 첫 박스가 KRX 장중 또는 NXT 메인 → 이 박스엔 HL 24h 가격
                    row.is_index ? (
                      <>
                        {m.mark_px_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-xs text-text-dim ml-2">(지수)</span>
                      </>
                    ) : row.category === "korea" ? (
                      <>₩{Math.round(m.per_share_krw ?? m.krw_price).toLocaleString("ko-KR")}</>
                    ) : (
                      <>
                        ${m.mark_px_usd.toFixed(2)}
                        <span className="text-xs text-text-dim ml-2">(₩{Math.round(m.krw_price).toLocaleString("ko-KR")})</span>
                      </>
                    )
                  ) : (
                    // closed = 첫 박스가 HL 메인 → 이 박스엔 정규장 종가
                    row.is_index ? (
                      <>
                        {(m.regular_close_usd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-xs text-text-dim ml-2">(지수)</span>
                      </>
                    ) : row.category === "korea" ? (
                      <>₩{Math.round(m.regular_close_krw!).toLocaleString("ko-KR")}</>
                    ) : (
                      <>
                        ${m.regular_close_usd?.toFixed(2) ?? "—"}
                        <span className="text-xs text-text-dim ml-2">(₩{Math.round(m.regular_close_krw!).toLocaleString("ko-KR")})</span>
                      </>
                    )
                  )}
                </div>
                {/* 전일 종가 줄 — live/nxt phase 일 때 표시 (closed 는 박스 1 에 KRX 종가 이미 노출) */}
                {showHL && m.regular_prev_close_krw != null && (
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
                {(() => {
                  // phase 인지 premium — 박스 2 가격 (HL or KRX 종가) vs 박스 1 메인 가격 비교
                  //   live  : 박스 2 HL, 박스 1 메인 KRX 장중 → (HL - KRX 장중) / KRX 장중
                  //   nxt   : 박스 2 HL, 박스 1 메인 NXT → (HL - NXT) / NXT
                  //   closed: 박스 2 KRX 종가, 박스 1 메인 HL → (HL - KRX 종가) / KRX 종가
                  // 통일 : 기준 (denominator) = closed 면 regular_close, 그 외엔 main_display
                  const refKrw = m.market_phase === "closed"
                    ? m.regular_close_krw
                    : (m.main_display_krw ?? m.regular_close_krw);
                  const refUsd = m.market_phase === "closed"
                    ? m.regular_close_usd
                    : (m.main_display_usd ?? m.regular_close_usd);
                  let pct = m.hl_premium_pct;
                  let gap = 0;
                  let gapText: string | null = null;
                  if (row.category === "korea" && refKrw != null && refKrw > 0) {
                    gap = Math.round((m.per_share_krw ?? m.krw_price) - refKrw);
                    pct = (((m.per_share_krw ?? m.krw_price) - refKrw) / refKrw) * 100;
                    gapText = `${gap > 0 ? "+" : gap < 0 ? "−" : ""}₩${Math.abs(gap).toLocaleString("ko-KR")}`;
                  } else if (row.category === "us" && refUsd != null && refUsd > 0) {
                    gap = m.mark_px_usd - refUsd;
                    pct = ((m.mark_px_usd - refUsd) / refUsd) * 100;
                    gapText = `${gap > 0 ? "+" : gap < 0 ? "−" : ""}$${Math.abs(gap).toFixed(2)}`;
                  }
                  const pctColor = pct > 0 ? "text-accent-green" : pct < 0 ? "text-accent-blue" : "text-text-muted";
                  return (
                    <>
                      <div className={`${row.category === "korea" ? "text-4xl md:text-5xl" : "text-3xl"} font-bold tabular ${pctColor}`}>
                        {pct > 0 ? "▲ +" : pct < 0 ? "▼ " : ""}{Math.abs(pct).toFixed(2)}%
                      </div>
                      {gapText && (
                        <div className={`text-sm font-semibold tabular mt-1 ${gap > 0 ? "text-accent-green" : gap < 0 ? "text-accent-blue" : "text-text-muted"}`}>
                          {gapText}
                        </div>
                      )}
                    </>
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
          );
        })()}

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

        {/* 24시간 시장 sentiment — HL 거래자 포지션 기반 (코인 metric 숨김, 상승/하락 베팅 비율만 표시) */}
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
          {/* Funding Rate tile 제거 (2026-05-13) — 주식 retail 타겟에 코인 metric 잡음 */}
          {m.regular_close_krw != null && (
            <Stat
              label={m.market_phase === "live" ? "정규장 (장중)" : m.market_phase === "nxt" ? "NXT 시간외" : "정규장 종가"}
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
