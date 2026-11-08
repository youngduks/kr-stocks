import { fetchAllPrices, type PriceRow } from "@/lib/fetchPrices";
import { fetchCandleSet } from "@/lib/fetchCandles";
import { bySlug, CATEGORY_LABELS, SYMBOLS, type SymbolMeta } from "@/lib/universe";
import { getConsensus, hasConsensus, enrichWithCurrentPrice, type ConsensusData } from "@/lib/consensus";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TargetRangeCard } from "@/components/ui/TargetRangeCard";
// FundingBar 재도입 (2026-05-13) — retail 친화 "24시간 시장 sentiment" 라벨로 변환,
// 코인 metric (펀딩%, APR) 제거하고 상승/하락 베팅 비율만 가시화
import { FundingBar } from "@/components/FundingBar";
import { TradingFlowCard } from "@/components/TradingFlowCard";
import { ShareButton } from "@/components/ShareButton";
import { getTradingFlow, hasTradingFlow, formatBigKRW, type TradingFlowData } from "@/lib/tradingFlow";
import type { Candle } from "@/lib/fetchCandles";
import { PageTitle } from "@/components/ui/PageTitle";
import { QuadGrid, type QuadCell } from "@/components/ui/QuadGrid";
import { MoreDetails } from "@/components/ui/MoreDetails";
import { getBuyback, hasBuyback } from "@/lib/buyback";
import nextDynamic from "next/dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

// lightweight-charts는 window 의존 → SSR 비활성 + 클라이언트만 렌더
const PriceChart = nextDynamic(() => import("@/components/PriceChart").then((m) => m.PriceChart), {
  ssr: false,
  loading: () => (
    <div className="ds-card text-center text-sm text-text-dim">
      차트 로딩 중…
    </div>
  ),
});

// ISR (2026-11-08) — force-dynamic 이면 루트 loading.tsx 폴백("가격 정보 불러오는 중…")이 먼저 나가고
// 본문은 <div hidden id="S:0"> 스트리밍 영역에 들어가 JS 미실행 수집기엔 안 보였음.
// ISR 은 완성된 HTML을 캐시해 그대로 내보냄 → 요약·FAQ가 HTML에 바로 보임.
export const revalidate = 30;
// universe_map 에 있는 (category, slug) 만 생성 — 없는 주소는 진짜 404 (이전엔 스트리밍 중 notFound → 200 soft-404)
export const dynamicParams = false;

export function generateStaticParams() {
  return SYMBOLS.map((s) => ({ category: s.category, slug: s.slug }));
}

// 빌드(prerender) 중 외부 API 실패로 빌드가 깨지지 않게 — 빌드 때만 안내 페이지로 렌더.
// 런타임 재생성 중 실패는 throw → ISR 이 직전 정상 페이지를 계속 서빙(안내 페이지로 덮어쓰지 않음).
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";

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

  // 가격 + 캔들 병렬 fetch (환율·ADR 종목은 차트 skip — perp 캔들 소스 없음)
  const candlesPromise =
    meta.is_fx || meta.source === "adr"
      ? Promise.resolve({ bars1H: [], bars4H: [] })
      : fetchCandleSet(meta.ticker, {
          source: meta.source === "binance" ? "binance" : "hl",
          binanceSymbol: meta.binance_symbol,
        });
  let data: Awaited<ReturnType<typeof fetchAllPrices>>;
  let candles: Awaited<typeof candlesPromise>;
  try {
    [data, candles] = await Promise.all([fetchAllPrices(), candlesPromise]);
  } catch (e) {
    if (!IS_BUILD) throw e;
    console.error(`[symbol page] 빌드 중 시세 실패 → 안내 페이지 (${params.slug}):`, e);
    return <PriceUnavailable meta={meta} />;
  }
  const found = data.symbols.find((r) => r.slug === params.slug);
  if (!found || !found.market) {
    if (!IS_BUILD) throw new Error(`시세 없음: ${params.slug} — 직전 정상 페이지 유지`);
    return <PriceUnavailable meta={meta} fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />;
  }
  const row = found as PriceRow & { market: MarketData };
  const buyback = hasBuyback(row.slug) ? await getBuyback(row.slug) : null;

  const m = row.market;
  const isBn = row.source === "binance"; // 한국주식 3종 = Binance 선물 소스 (그 외 = Hyperliquid)
  // 한국 카테고리라도 정규장 종가 소스가 Yahoo면 KRX가 아니라 해외 상장 ADR (예: 하이닉스 ADR)
  const isAdr = row.category === "korea" && m.regular_source === "yahoo";
  // phase 인지 변동률 — live/nxt: 전일 대비 / closed: 24h
  const mainChg = m.main_change_pct ?? m.change_24h_pct;
  const mainChgLabel = m.main_change_label ?? (isBn ? "Binance 24h" : "HL 24h");
  // 24h 기준(HL/Binance perp 24시간 전 가격 대비)인지 — 이때 화면의 '종가' 줄과 기준이 다름
  const is24hBasis = mainChgLabel === "HL 24h" || mainChgLabel === "Binance 24h";
  const refVsClose: { label: string; pct: number } | null = (() => {
    if (row.is_private || row.is_fx) return null;
    const closed = m.market_phase === "closed";
    const nxt = m.market_phase === "nxt";
    if (row.category === "korea") {
      const price = m.main_display_krw ?? m.per_share_krw ?? m.krw_price;
      const ref = closed || nxt ? m.regular_close_krw : m.regular_prev_close_krw;
      const lbl = closed || nxt ? (isAdr ? "ADR 종가" : "KRX 종가") : "전일 종가";
      return price && ref ? { label: lbl, pct: (price / ref - 1) * 100 } : null;
    }
    const price = m.main_display_usd ?? m.mark_px_usd;
    const ref = closed ? m.regular_close_usd : m.regular_prev_close_usd;
    return price && ref ? { label: closed ? "정규장 종가" : "전일 종가", pct: (price / ref - 1) * 100 } : null;
  })();
  const isUp = mainChg > 0;
  const isDn = mainChg < 0;
  const colorClass = isUp ? "text-up" : isDn ? "text-down" : "text-text-muted";
  const label = CATEGORY_LABELS[row.category];

  // 외국인 수급(한국 3종) + 같은 5거래일 가격 변화(선물 4H 캔들) → 2×2
  const flow: TradingFlowData | null = hasTradingFlow(row.slug) ? getTradingFlow(row.slug) : null;
  const quad = flow ? buildQuad(flow, candles.bars4H, row.source === "binance" ? "바이낸스 선물" : "하이퍼리퀴드") : null;

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

  // BreadcrumbList Schema — Google rich snippet (5/14)
  // 2026-11-08: 2단계 /{category} 주소(/korea·/us·/global·/private·/themes)는 페이지가 없어 404 → 홈 → 종목 2단계로.
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "kr-stocks.com",
        item: "https://kr-stocks.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: row.name_ko ?? row.name_en ?? row.slug,
        item: `https://kr-stocks.com/${row.category}/${row.slug}`,
      },
    ],
  };

  // 한국 종목(삼성/하이닉스/현대차 + 하이닉스 ADR) — 서버 HTML 요약 문장 + 화면에 보이는 FAQ (2026-11-08)
  // 이미 받은 데이터(가격·KRX 종가·data/consensus)만 사용. 화면 FAQ와 FAQPage JSON-LD는 같은 배열.
  const isKoreaStock = row.category === "korea" && !row.is_fx;
  const consensusRaw = isKoreaStock && hasConsensus(row.slug) ? getConsensus(row.slug) : null;
  const summaryText = isKoreaStock ? buildKoreaSummary(row, m, refVsClose, consensusRaw, data.fetched_at, isAdr) : null;
  const koreaFaq = isKoreaStock ? buildKoreaFaq(row, consensusRaw, isAdr) : null;

  // FAQPage Schema — 종목별 retail Q&A (5/14). 한국 종목은 화면 FAQ(koreaFaq)와 동일 문구로 대체.
  const faqLd = koreaFaq
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: koreaFaq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `${row.name_ko} 야간 가격은 어떻게 확인하나요?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${row.name_ko}는 KRX 정규장 (09:00~15:30 KST) 마감 후 NXT 시간외 (15:30~20:00 KST) + Hyperliquid HIP-3 perp (20:00~익일 08:00) 로 24시간 가격 추적이 가능합니다. kr-stocks.com 은 세 phase 를 자동 전환해서 메인 가격으로 표시합니다.`,
        },
      },
      {
        "@type": "Question",
        name: `${row.name_ko} 실시간 시세는 정확한가요?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `정규장·NXT 시간외 가격은 네이버 금융 (KRX 공식 데이터) 기준이며 30초마다 갱신됩니다. 야간 Hyperliquid 가격은 글로벌 perp 시장 가격으로 정규장 시초가와 차이날 수 있으며 참고용입니다.`,
        },
      },
      ...(row.category === "korea"
        ? [
            {
              "@type": "Question",
              name: `${row.name_ko} 증권사 평균 목표주가는 얼마인가요?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `kr-stocks.com 에서 ${row.name_ko} 종목 상세 페이지를 보면 한국 증권사 평균 목표주가 + 상승여력 + 외국인·기관 5일 누적 매매 동향을 한 화면에서 확인할 수 있습니다. 출처: 네이버 금융 리서치.`,
              },
            },
          ]
        : []),
      ...(row.is_private
        ? [
            {
              "@type": "Question",
              name: `${row.name_ko} 비상장 주가는 어떻게 추정되나요?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `${row.name_ko}는 비상장 회사로 implied valuation 기반의 추정 가격입니다. Hyperliquid HIP-3 perp 가격을 share 단위로 환산한 값이며, 정식 거래 가격이 아닌 참고용입니다.`,
              },
            },
          ]
        : []),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />

      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-4 pb-12">
        <div className="flex items-start justify-between gap-3">
          <PageTitle
            className="min-w-0"
            backHref="/"
            eyebrow={
              <>
                {label.emoji} {label.ko} · <span className="num">{row.krx_code ?? row.ticker}</span>
                {row.is_private && " · 비상장 perp"}
                {row.is_index && " · 지수"}
              </>
            }
            title={row.name_ko}
          />
          {/* Share 버튼 — viral 마찰 0 (Web Share API + clipboard fallback, 5/14) */}
          <div className="pt-3 shrink-0">
            <ShareButton
              url={`https://kr-stocks.com/${row.category}/${row.slug}`}
              title={`${row.name_ko} 24시간 시세 — kr-stocks.com`}
              text={`${row.name_ko} 24시간 가격 추적 — 정규장 + NXT + Hyperliquid 통합`}
              locale="ko"
            />
          </div>
        </div>

        {/* 서버 HTML 요약 문장 — 기준 시각 + 가격 + KRX 종가 대비 + 목표가 (한국 종목만) */}
        {summaryText && <p className="ds-explain mt-3">{summaryText}</p>}

        {/* ① 상태 카드 (Phase B) — 지금 가격이 어느 쪽으로 움직이는지 + 실측 수급 해석 */}
        <section className="ds-card mt-4 mb-4">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="ds-eyebrow">지금 {row.name_ko}{hasJong(row.name_ko ?? "") ? "은" : "는"}</div>
            <span className={`ds-pill ${isUp ? "ds-pill-up" : isDn ? "ds-pill-down" : "ds-pill-flat"} shrink-0`}>
              {isUp ? "▲" : isDn ? "▼" : "–"} {Math.abs(mainChg).toFixed(2)}%
            </span>
          </div>
          <h2 className="ds-status mb-3" style={{ fontSize: 22 }}>
            {isUp ? (
              <>
                <span className="ds-hl">오르고 있어요</span>
              </>
            ) : isDn ? (
              <>
                <span className="ds-hl">내리고 있어요</span>
              </>
            ) : (
              <>거의 움직임이 없어요</>
            )}
          </h2>
          {/* 3-phase 라벨 + pill (LIVE 🟢 / NXT 🟠 / Hyperliq 🔵) — 시장 시간 자동 인지 */}
          {(() => {
            const phase = m.market_phase;
            const phaseMeta =
              phase === "live"
                ? {
                    label: isAdr
                      ? "나스닥 ADR 정규장 거래가 (실시간)"
                      : row.category === "korea"
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
                : isAdr
                ? {
                    label: "나스닥 정규장 마감 — 마지막 종가",
                    pill: "나스닥 마감",
                    pillColor: "text-text-dim",
                    dotColor: "bg-text-dim",
                    pulse: false,
                  }
                : {
                    label: isBn ? "Binance 선물 24시간 시세 (야간·휴장 활성)" : "Hyperliquid 24시간 시세 (야간·휴장 활성)",
                    pill: isBn ? "Binance" : "Hyperliquid",
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
          {isAdr ? (
            <>
              {/* ADR — 미국 상장·USD가 본질. 달러 메인 + 원화 환산 보조 */}
              <div className="text-4xl md:text-5xl font-bold tabular text-text mb-1">
                ${(m.main_display_usd ?? m.mark_px_usd).toFixed(2)}
              </div>
              <div className="text-sm text-text-muted tabular">
                ≈ ₩{Math.round(m.main_display_krw ?? m.krw_price).toLocaleString("ko-KR")} · 나스닥 ADR
              </div>
              {m.regular_prev_close_usd != null && (
                <div className="text-[12px] text-text-dim tabular mt-1">
                  전일 종가 ${m.regular_prev_close_usd.toFixed(2)}
                </div>
              )}
            </>
          ) : row.category === "korea" ? (
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
                    {isAdr ? "ADR 종가" : "KRX 종가"} ₩{Math.round(m.regular_close_krw).toLocaleString("ko-KR")}
                  </div>
                ) : m.regular_prev_close_krw != null ? (
                  <div className="text-[12px] text-text-dim tabular">
                    전일 종가 ₩{Math.round(m.regular_prev_close_krw).toLocaleString("ko-KR")}
                  </div>
                ) : null}
                {/* HL 24h reference — live/nxt phase 일 때 (closed 모드엔 메인이 HL이라 중복 회피) */}
                {m.market_phase !== "closed" && (
                  <div className="text-sm text-text-muted tabular">
                    {isBn ? "Binance 24h" : "HL 24h"} ≈ ₩{Math.round(m.per_share_krw ?? m.krw_price).toLocaleString("ko-KR")}
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

          <div className={`mt-3 text-[17px] font-extrabold num ${colorClass}`}>
            {isUp ? "▲" : isDn ? "▼" : ""} {Math.abs(mainChg).toFixed(2)}%{" "}
            <span className="ds-meta font-normal">
              ({mainChgLabel}
              {is24hBasis ? " · 24시간 전 가격 대비" : ""})
            </span>
          </div>
          {/* 24h 기준 변동률 옆에 '전일 종가'가 같이 보이면 기준이 섞여 보임(예: 가격 > 전일 종가인데 ▼) →
              같은 화면의 종가 기준 변동률을 명시 (Phase C, AAPL 사례) */}
          {is24hBasis && refVsClose && (
            <div className="ds-meta mt-1 num">
              {refVsClose.label} 대비{" "}
              <b className={refVsClose.pct > 0 ? "text-up" : refVsClose.pct < 0 ? "text-down" : ""}>
                {refVsClose.pct > 0 ? "+" : refVsClose.pct < 0 ? "−" : ""}
                {Math.abs(refVsClose.pct).toFixed(2)}%
              </b>
            </div>
          )}
          {flow && (
            <>
              <p className="ds-explain mt-3">
                최근 5거래일({fmtMD(flow.daily[0]?.date)}~{fmtMD(flow.daily[flow.daily.length - 1]?.date)}) 외국인은{" "}
                <b className={flow.cumulative_5d.foreign_won >= 0 ? "text-up" : "text-down"}>
                  {bigKRW(flow.cumulative_5d.foreign_won)}
                </b>{" "}
                {flow.cumulative_5d.foreign_won >= 0 ? "순매수" : "순매도"}, 기관은{" "}
                <b className={flow.cumulative_5d.institutional_won >= 0 ? "text-up" : "text-down"}>
                  {bigKRW(flow.cumulative_5d.institutional_won)}
                </b>
                {flow.cumulative_5d.institutional_won >= 0 ? " 순매수" : " 순매도"}했어요.
              </p>
              <MoreDetails summary="조금 더 — 5일 누적 외국인·기관·개인">
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(
                    [
                      ["외국인", flow.cumulative_5d.foreign_won],
                      ["기관", flow.cumulative_5d.institutional_won],
                      ["개인", flow.cumulative_5d.retail_won],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="ds-tile" style={{ padding: 10 }}>
                      <div className="ds-meta">{k}</div>
                      <div className={`num font-extrabold ${v > 0 ? "text-up" : v < 0 ? "text-down" : "text-text-muted"}`}>{bigKRW(v)}</div>
                    </div>
                  ))}
                </div>
                <p className="pt-3" style={{ fontSize: 14 }}>
                  네이버 금융 외국인·기관 순매매량 × 종가로 추정한 금액(±5%)이에요. 개인 = −(외국인+기관)으로 계산했어요.
                </p>
              </MoreDetails>
            </>
          )}
        </section>

        {/* ② 가격 × 외국인 2×2 — 같은 5거래일 창, 둘 다 실측일 때만 */}
        {flow && quad && <QuadGrid className="mb-4" {...quad} />}

        {isAdr && m.adr_premium_pct != null && (() => {
          const ratio = row.adr_ratio ?? 1;
          const pct = m.adr_premium_pct;
          const premColor = pct > 0 ? "text-up" : pct < 0 ? "text-down" : "text-text-muted";
          return (
            <section className="ds-card mb-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-xs text-text-dim">
                  ADR {ratio}주 = 보통주 1주 환산 대비 국내(KRX) 프리미엄
                </div>
                <span className="text-[10px] font-semibold tabular text-text-dim shrink-0">SEC 공식비율</span>
              </div>
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs text-text-dim mb-1">ADR 환산가 ({ratio}주 기준)</div>
                  <div className="text-xl font-semibold tabular text-text">
                    ₩{Math.round(m.adr_implied_krw ?? 0).toLocaleString("ko-KR")}
                  </div>
                  {m.adr_ref_krw != null && (
                    <div className="text-[11px] text-text-dim tabular mt-1">
                      국내(KRX) 종가 ₩{Math.round(m.adr_ref_krw).toLocaleString("ko-KR")}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-text-dim mb-1">프리미엄</div>
                  <span className={`text-xl font-bold tabular ${premColor}`}>
                    {pct > 0 ? "▲ +" : pct < 0 ? "▼ " : ""}{Math.abs(pct).toFixed(2)}%
                  </span>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-text-dim leading-relaxed">
                ADR가(USD) × {ratio} × 환율 = 보통주 1주 환산가. 국내 KRX 종가 대비 괴리율입니다.
                환율·시차·유동성 차이로 상시 괴리가 존재할 수 있으며 참고용입니다.
              </p>
            </section>
          );
        })()}

        {m.hl_premium_pct != null && m.regular_close_krw != null && (() => {
          // 박스 2 phase 3-way 분기 :
          //   live  → "HL 24h 시세 vs 장중 프리미엄" + HL 가격 표시
          //   nxt   → "HL 24h 시세 vs NXT 프리미엄" + HL 가격 표시
          //   closed → "정규장 종가 대비 프리미엄 (야간/주말 가격 압력)" + 정규장 종가 표시
          const phase = m.market_phase;
          const showHL = phase === "live" || phase === "nxt";
          const srcTag = isBn ? "Binance 24h" : "HL 24h";
          const headerLabel =
            phase === "live" ? `${srcTag} 시세 vs 장중 프리미엄`
            : phase === "nxt" ? `${srcTag} 시세 vs NXT 프리미엄`
            : "정규장 종가 대비 프리미엄 (야간/주말 가격 압력)";
          const rightTag =
            phase === "live" ? srcTag
            : phase === "nxt" ? srcTag
            : "CLOSED";
          const priceLabel = showHL ? srcTag : "정규장 종가";
          return (
          <section className="ds-card mb-4">
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
                  const pctColor = pct > 0 ? "text-up" : pct < 0 ? "text-down" : "text-text-muted";
                  return (
                    <>
                      <div className={`${row.category === "korea" ? "text-4xl md:text-5xl" : "text-3xl"} font-bold tabular ${pctColor}`}>
                        {pct > 0 ? "▲ +" : pct < 0 ? "▼ " : ""}{Math.abs(pct).toFixed(2)}%
                      </div>
                      {gapText && (
                        <div className={`text-sm font-semibold tabular mt-1 ${gap > 0 ? "text-up" : gap < 0 ? "text-down" : "text-text-muted"}`}>
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
          return (
            <div className="mb-4">
              <TargetRangeCard data={cdata} locale="ko" showName={false} />
              <Link href="/consensus" prefetch={false} className="inline-block ds-meta mt-2 ml-1 hover:text-text-muted underline">
                증권사 목표가 전체 보기 →
              </Link>
            </div>
          );
        })()}

        {/* 외국인·기관 매매 동향 — 한국주식 3종만 (samsung/hynix/hyundai) */}
        {flow && <TradingFlowCard data={flow} locale="ko" />}

        {/* 자사주 매입(바이백) 진행 현황 — 현재 하이닉스만 진행 중 */}
        {buyback && (
          <Link
            href={`/korea/${row.slug}/buyback`}
            className="ds-card mb-4 flex items-center justify-between gap-3 hover:bg-bg-hover transition"
          >
            <div>
              <div className="text-xs text-text-dim mb-0.5">자사주 매입 진행률</div>
              <div className="text-lg font-bold tabular text-text">
                {buyback.progress.progress_pct.toFixed(1)}%
              </div>
            </div>
            <span className="text-xs font-semibold text-text-muted shrink-0">바이백 현황 자세히 →</span>
          </Link>
        )}

        {/* 24시간 시장 sentiment — HL 거래자 포지션 기반 (코인 metric 숨김, 상승/하락 베팅 비율만 표시) */}
        {/* ADR은 perp 없어 funding 무의미 → sentiment hide */}
        {!row.is_fx && !isAdr && m.funding != null && (
          <FundingBar funding={m.funding} locale="ko" source={row.source === "binance" ? "binance" : "hl"} />
        )}

        {!row.is_fx && (candles.bars1H.length > 0 || candles.bars4H.length > 0) && (
          <section className="mb-4">
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

        <section className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <Stat
            label={row.is_index ? "24h 시세 (지수)" : isBn ? "24h 시세 (Binance)" : "24h 시세 (HL)"}
            value={row.is_index
              ? m.mark_px_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : `$${m.mark_px_usd.toFixed(2)}`}
          />
          <Stat
            label={isBn ? "Binance 전일 종가" : "HL 전일 종가"}
            value={row.is_index
              ? m.prev_day_px_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : `$${m.prev_day_px_usd.toFixed(2)}`}
          />
          <Stat label={isBn ? "Binance 24h 거래대금" : "HL 24h 거래대금"} value={fmtVol(m.day_volume_usd)} />
          <Stat label={isBn ? "Binance 미결제 약정" : "HL 미결제 약정"} value={fmtNum(m.open_interest)} />
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
          <section className="ds-card mb-4 text-xs text-text-muted leading-6">
            <span className="font-semibold text-text-dim mr-2">📝 메모:</span>{row.note}
          </section>
        )}

        {/* 거래 방법 CTA — 한국주식 3종 (휴장에도 24h 거래 가능: 바이낸스 + HL) */}
        {row.category === "korea" && (
          <section className="ds-card mb-4">
            <div className="font-semibold text-text mb-1 text-sm">💱 {row.name_ko} 24시간 거래하는 법</div>
            <p className="text-xs text-text-muted leading-relaxed mb-3">
              KRX 휴장 시간에도 {row.name_ko}를 long/short 거래할 수 있습니다. 가입부터 진입까지 단계별 안내:
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/guide/binance-korea-stocks"
                className="inline-block px-4 py-2 rounded-lg bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20 text-sm font-semibold transition"
              >
                바이낸스로 거래하는 법 →
              </Link>
              <Link
                href="/guide/hyperliquid-onramp"
                className="inline-block px-4 py-2 rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 text-sm font-semibold transition"
              >
                하이퍼리퀴드로 거래하는 법 →
              </Link>
            </div>
          </section>
        )}

        {/* 자주 묻는 질문 — 한국 종목만, FAQPage JSON-LD 와 같은 문구 */}
        {koreaFaq && (
          <section className="ds-card mb-4" aria-labelledby="stock-faq">
            <h2 id="stock-faq" className="text-[17px] font-extrabold mb-3">
              자주 묻는 질문
            </h2>
            <div className="space-y-4">
              {koreaFaq.map((f) => (
                <div key={f.q}>
                  <h3 className="font-semibold text-text mb-1 text-[15px]">Q. {f.q}</h3>
                  <p className="ds-explain">{f.a}</p>
                </div>
              ))}
            </div>
            <Link
              href="/korea/kospi-night"
              prefetch={false}
              className="inline-block mt-4 text-sm font-semibold text-accent-blue hover:underline"
            >
              코스피 야간선물 대신 보는 한국 ETF(EWY) 24시간 시세 →
            </Link>
          </section>
        )}

        <section className="ds-card text-sm text-text-muted">
          <div className="font-semibold text-text mb-1">📊 데이터 출처</div>
          가격: {row.source === "binance" ? "Binance USDT-M 선물" : "Hyperliquid"} 24시간 시세 ({row.ticker}) · 환율: Upbit KRW/USDT · 업데이트 30초
        </section>
      </main>

      <Footer />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ds-card" style={{ padding: 12 }}>
      <div className="ds-meta mb-1">{label}</div>
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

/** 받침 있는 이름이면 true (은/는 선택) — 한글 음절 아니면 false */
function hasJong(name: string): boolean {
  const c = name.trim().charCodeAt(name.trim().length - 1);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}

function fmtMD(date?: string): string {
  if (!date) return "";
  const [, mm, dd] = date.split("-");
  return `${Number(mm)}/${Number(dd)}`;
}

function bigKRW(won: number): string {
  const f = formatBigKRW(won);
  return `${f.sign}${f.display}`;
}

/**
 * 가격 × 외국인 2×2 (같은 5거래일 창). 가격 = 선물 4H 캔들에서 창 시작 직전 종가 → 창 마지막 날 15:30 KST 직전 종가.
 * 창이 캔들 범위 밖이거나 값이 없으면 null (지어낸 숫자 없음).
 */
function buildQuad(flow: TradingFlowData, bars: Candle[], srcLabel: string) {
  if (!flow.daily.length || bars.length < 2) return null;
  const first = flow.daily[0].date;
  const last = flow.daily[flow.daily.length - 1].date;
  const fromSec = Date.parse(`${first}T09:00:00+09:00`) / 1000;
  const toSec = Date.parse(`${last}T15:30:00+09:00`) / 1000;
  if (!Number.isFinite(fromSec) || !Number.isFinite(toSec)) return null;
  const before = bars.filter((b) => b.time + 4 * 3600 <= fromSec);
  const upto = bars.filter((b) => b.time + 4 * 3600 <= toSec);
  if (!before.length || !upto.length) return null;
  const p0 = before[before.length - 1].close;
  const p1 = upto[upto.length - 1].close;
  if (!(p0 > 0) || upto[upto.length - 1] === before[before.length - 1]) return null;
  const pricePct = ((p1 - p0) / p0) * 100;
  const fw = flow.cumulative_5d.foreign_won;
  const pUp = pricePct >= 0;
  const fBuy = fw >= 0;
  const idx = pUp ? (fBuy ? 0 : 1) : fBuy ? 2 : 3;
  const titles = ["힘 있는 상승", "개인이 끌어올림", "외국인이 줍는 중", "같이 빠지는 중"];
  const cells: [QuadCell, QuadCell, QuadCell, QuadCell] = [
    { axis: "가격 ▲ · 외국인 삼", title: titles[0], desc: "큰손이 같이 사요", tone: "up" },
    { axis: "가격 ▲ · 외국인 팖", title: titles[1], desc: "오래 못 가는 경우가 잦아요", tone: "warn" },
    { axis: "가격 ▼ · 외국인 삼", title: titles[2], desc: "바닥 신호일 때가 있어요", tone: "down" },
    { axis: "가격 ▼ · 외국인 팖", title: titles[3], desc: "조심할 구간이에요", tone: "down" },
  ];
  cells[idx] = { ...cells[idx], active: true };
  const sign = pricePct > 0 ? "+" : pricePct < 0 ? "−" : "";
  return {
    eyebrow: "가격과 외국인, 같이 보면",
    headline: (
      <>
        지금은 <span className="ds-hl">‘{titles[idx]}’</span> 칸이에요
      </>
    ),
    cells,
    footnote: `${fmtMD(first)}~${fmtMD(last)} 5거래일 · 가격 ${sign}${Math.abs(pricePct).toFixed(1)}% (${srcLabel} 4시간봉) · 외국인 ${bigKRW(fw)} (네이버 금융 추정) · 매매 권유 아님`,
  };
}

/** 시세를 못 받았을 때(빌드 prerender 중 외부 API 실패 등) 안내 페이지 — 다음 ISR 재생성에서 정상 페이지로 교체됨 */
function PriceUnavailable({ meta, fxRate = 0, fxChange = 0 }: { meta: SymbolMeta; fxRate?: number; fxChange?: number }) {
  const name = meta.name_ko || meta.name_en || meta.slug;
  const label = CATEGORY_LABELS[meta.category];
  return (
    <>
      <Header fxRate={fxRate} fxChange={fxChange} />
      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-4 pb-12">
        <PageTitle
          backHref="/"
          eyebrow={
            <>
              {label.emoji} {label.ko} · <span className="num">{meta.krx_code ?? meta.ticker}</span>
            </>
          }
          title={name}
        />
        <section className="ds-card mt-4 mb-4">
          <p className="ds-explain">
            지금 {name} 시세를 불러오지 못했어요. 잠시 후 다시 확인해 주세요. (자료 출처 일시 오류)
          </p>
          <Link href="/" prefetch={false} className="inline-block mt-3 text-sm font-semibold text-accent-blue hover:underline">
            홈에서 다른 종목 보기 →
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}

// ── 한국 종목 요약 문장 / FAQ (2026-11-08) ─────────────────────────────────────
type MarketData = NonNullable<PriceRow["market"]>;

/** 문장용 원화 표기 — "210,500원" (조사가 항상 받침 있는 '원' 뒤에 붙도록) */
function won(n: number): string {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

function signedPct(n: number): string {
  const s = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${s}${Math.abs(n).toFixed(2)}%`;
}

/** epoch ms → "11월 8일 19:20" (KST) */
function fmtKstMin(ms: number): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("month")}월 ${get("day")}일 ${get("hour")}:${get("minute")}`;
}

/** ISO → "11월 6일" (KST) */
function fmtKstDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const parts = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" }).formatToParts(new Date(t));
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "";
  return `${get("month")}월 ${get("day")}일`;
}

function consensusLine(c: ConsensusData | null): { avg: number; date: string | null } | null {
  if (!c || !(c.consensus.avg_target_krw > 0)) return null;
  return { avg: c.consensus.avg_target_krw, date: fmtKstDate(c.naver_snapshot?.fetched_at ?? c.updated_at) };
}

function buildKoreaSummary(
  row: PriceRow,
  m: MarketData,
  refVsClose: { label: string; pct: number } | null,
  consensus: ConsensusData | null,
  fetchedAt: number,
  isAdr: boolean,
): string {
  const t = fmtKstMin(fetchedAt);
  const name = row.name_ko ?? row.slug;
  if (isAdr) {
    const tk = row.ticker.split(":").pop();
    const priceUsd = m.main_display_usd ?? m.mark_px_usd;
    const priceKrw = m.main_display_krw ?? m.krw_price;
    const what = m.market_phase === "live" ? "나스닥 장중가는" : "나스닥 마지막 종가는";
    let s = `${t} 기준 ${name}(나스닥 ${tk}) ${what} $${priceUsd.toFixed(2)}(약 ${won(priceKrw)})로 전일 종가 대비 ${signedPct(m.main_change_pct)}예요.`;
    if (m.adr_premium_pct != null) {
      s += ` ADR ${row.adr_ratio ?? 1}주를 보통주 1주로 환산하면 국내 KRX 종가 대비 ${signedPct(m.adr_premium_pct)}예요.`;
    }
    return s;
  }
  const main = m.main_display_krw ?? m.per_share_krw ?? m.krw_price;
  const perp = m.per_share_krw ?? m.krw_price;
  const what =
    m.market_phase === "live"
      ? "KRX 장중가는"
      : m.market_phase === "nxt"
        ? "NXT 시간외 가격은"
        : "24시간 시세(바이낸스 선물, 원화 환산)는";
  let s = `${t} 기준 ${name} ${what} ${won(main)}`;
  s += refVsClose ? `으로 ${refVsClose.label} 대비 ${signedPct(refVsClose.pct)}예요.` : `이에요.`;
  if (m.market_phase !== "closed") s += ` 바이낸스 선물 24시간 시세는 원화로 환산하면 약 ${won(perp)}이에요.`;
  const c = consensusLine(consensus);
  if (c) {
    // TargetRangeCard 와 같은 현재가 기준 (main_display_krw 우선)
    const cur = m.main_display_krw ?? m.regular_close_krw ?? m.per_share_krw ?? m.krw_price;
    const up = cur > 0 ? ((c.avg - cur) / cur) * 100 : null;
    s += ` 증권사 평균 목표주가는 ${won(c.avg)}(네이버 금융 종합${c.date ? `, ${c.date} 갱신` : ""})`;
    s += up != null ? `으로 지금 가격보다 ${Math.abs(up).toFixed(1)}% ${up >= 0 ? "높아요" : "낮아요"}.` : `이에요.`;
  }
  return s;
}

const KOSPI_NIGHT_FAQ = {
  q: "코스피 야간선물 시세도 볼 수 있나요?",
  a: "KRX 코스피200 야간선물 시세 자체는 제공하지 않아요. 대신 24시간 거래되는 한국 ETF(EWY) 무기한 선물의 등락률을 kr-stocks.com 코스피 야간선물 페이지(/korea/kospi-night)에서 대용 지표로 볼 수 있어요.",
};

function buildKoreaFaq(row: PriceRow, consensus: ConsensusData | null, isAdr: boolean): { q: string; a: string }[] {
  const name = row.name_ko ?? row.slug;
  if (isAdr) {
    const base = row.adr_ref_slug ? bySlug(row.adr_ref_slug)?.name_ko ?? "국내 보통주" : "국내 보통주";
    const ratio = row.adr_ratio ?? 1;
    return [
      {
        q: `${name} 가격은 언제 움직이나요?`,
        a: `나스닥 정규장(뉴욕 시간 오전 9시 30분~오후 4시, 한국 시간으로 서머타임 기간 밤 10시 30분~오전 5시, 그 밖의 기간 밤 11시 30분~오전 6시)에 거래돼요. 이 페이지는 장중에는 거래가를, 장이 닫히면 마지막 종가를 보여줘요.`,
      },
      {
        q: `${name} 1주는 ${base} 몇 주인가요?`,
        a: `ADR ${ratio}주가 ${base} 보통주 1주예요(SEC 제출 서류의 공식 비율). 이 페이지의 프리미엄은 ADR 가격 × ${ratio} × 환율로 환산한 값을 국내 KRX 종가와 비교한 거예요.`,
      },
      {
        q: `주말에도 ${name} 가격이 움직이나요?`,
        a: `아니요. 나스닥이 쉬는 주말과 미국 휴일에는 마지막 종가가 그대로 보여요. 주말에도 움직이는 가격은 ${base} 24시간 시세 페이지(바이낸스 선물 기준)에서 볼 수 있어요.`,
      },
      KOSPI_NIGHT_FAQ,
    ];
  }
  const sym = row.binance_symbol ?? row.ticker;
  const out: { q: string; a: string }[] = [
    {
      q: `${name} 야간 시세는 어디서 보나요?`,
      a: `kr-stocks.com ${name} 페이지에서 24시간 볼 수 있어요. KRX 정규장(09:00~15:30)에는 장중가, NXT 시간외 거래 시간(프리마켓 08:00~08:50, 애프터마켓 15:30~20:00)에는 NXT 가격, 그 밖의 밤·새벽·주말에는 바이낸스 ${sym} 무기한 선물 가격을 원화로 환산해 보여줘요. 시간대에 맞춰 자동으로 바뀌어요.`,
    },
    {
      q: `주말에도 ${name} 가격이 움직이나요?`,
      a: `KRX와 NXT는 주말에 쉬지만 바이낸스 ${sym} 무기한 선물은 주말에도 거래돼 가격이 움직여요. 실제 주식이 아니라 주가를 따라가는 선물 계약이고 거래가 적을 때가 있어, 월요일 KRX 시초가와 차이가 날 수 있어요.`,
    },
  ];
  const c = consensusLine(consensus);
  if (c) {
    out.push({
      q: `${name} 목표주가는 얼마인가요?`,
      a: `네이버 금융 종합 기준 증권사 평균 목표주가는 ${won(c.avg)}이에요${c.date ? `(${c.date} 갱신)` : ""}. 목표주가는 증권사 전망치일 뿐 앞으로의 가격을 보장하지 않아요.`,
    });
  }
  out.push(
    {
      q: `${name} 실시간 시세는 정확한가요?`,
      a: `정규장·NXT 가격은 네이버 금융 시세, 야간·주말 가격은 바이낸스 선물 시세를 업비트 USDT 원화 시세로 환산한 값이에요. 선물 가격은 KRX 시초가와 다를 수 있어 참고용으로 봐 주세요. 페이지는 약 30초마다 새로 불러와요.`,
    },
    KOSPI_NIGHT_FAQ,
  );
  return out;
}
