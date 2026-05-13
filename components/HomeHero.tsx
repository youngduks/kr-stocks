// 홈 페이지 Hero box — 한국주식 3종 미리보기 + 종목 상세 직접 CTA
// USP 발견율 ↑: user가 카드 grid 보기 전에 "탭하면 더 깊이 있다" 인지

import Link from "next/link";
import { getAllConsensus } from "@/lib/consensus";
import { getTradingFlow } from "@/lib/tradingFlow";
import type { PriceRow } from "@/lib/fetchPrices";

export type Locale = "ko" | "en";

const I18N = {
  ko: {
    title: "🔥 한국주식 종합 분석",
    sub: "탭하면 한 화면에 다 있음",
    upside: "상승여력",
    upsideRef: "(컨센 기준)", // 첫 방문자가 "뭘 기준?" 헷갈리지 않게 sub 라벨
    sentLong: "상승",
    sentShort: "하락",
    current: "현재",
    avgTarget: "평균목표",
    foreign: "외인",
    institutional: "기관",
    netBuy: "순매수",
    netSell: "순매도",
    live: "정규장",
    nxt: "NXT",
    hyperliq: "Hyperliquid",
    footer: "각 종목 탭 = HL 24h + 정규장 + 증권사 분석 + 외인·기관 + 시장 sentiment + 차트 한 화면",
  },
  en: {
    title: "🔥 Korean Stocks Deep Dive",
    sub: "Tap any ticker for full analysis",
    upside: "Upside",
    upsideRef: "(vs avg target)",
    sentLong: "Bull",
    sentShort: "Bear",
    current: "Now",
    avgTarget: "Avg Target",
    foreign: "Foreign",
    institutional: "Institution",
    netBuy: "Net Buy",
    netSell: "Net Sell",
    live: "Regular",
    nxt: "NXT",
    hyperliq: "Hyperliquid",
    footer: "Each ticker = HL 24h + Regular close + Broker consensus + Foreign/Institutional flow + Market sentiment + chart on one screen",
  },
} as const;

function fmtKRW(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 10000).toFixed(0)}만`;
  }
  return n.toLocaleString("ko-KR");
}

function fmtFlowKRW(won: number, locale: Locale): string {
  const abs = Math.abs(won);
  const eok = abs / 100_000_000;
  if (eok >= 10000) return `${(eok / 10000).toFixed(1)}조`;
  if (eok >= 1) return `${eok.toFixed(0)}억`;
  return `${(abs / 10000).toFixed(0)}만`;
}

const KOREA_SLUGS = ["samsung", "hynix", "hyundai"] as const;

// HL funding rate → 상승 베팅 % (FundingBar 와 동일 heuristic, 단순 텍스트만 노출)
// 음수 funding = 숏 우세 / 양수 funding = 롱 우세
function fundingToLongPct(funding: number): number {
  const raw = 50 + funding * 10000;
  return Math.max(5, Math.min(95, raw));
}

export function HomeHero({
  rows,
  locale = "ko",
}: {
  rows: PriceRow[]; // fetchAllPrices() 결과
  locale?: Locale;
}) {
  const t = I18N[locale];
  const allConsensus = getAllConsensus();

  // 한국주식 3종 enrich
  const items = KOREA_SLUGS.map((slug) => {
    const row = rows.find((r) => r.slug === slug);
    if (!row || !row.market) return null;

    const consensus = allConsensus.find((c) => c.slug === slug);
    const flow = getTradingFlow(slug);

    // 시간대 인지 메인 가격 — 장중이면 KRX 장중가, 그 외엔 HL 야간가
    const currentKrw =
      row.market.main_display_krw ??
      row.market.regular_close_krw ??
      row.market.per_share_krw ??
      row.market.krw_price ??
      null;

    let upsidePct: number | null = null;
    if (consensus && currentKrw && currentKrw > 0) {
      upsidePct =
        ((consensus.consensus.avg_target_krw - currentKrw) / currentKrw) * 100;
    }

    // 시장 sentiment — HL funding rate 기반 (코인 metric 노출 X, 상승/하락 베팅 비율만)
    const funding = row.market.funding ?? null;
    const longPct =
      funding != null && !isNaN(funding) ? fundingToLongPct(funding) : null;

    return {
      slug,
      name_ko: row.name_ko ?? slug,
      name_en: row.name_en ?? slug,
      currentKrw,
      avgTargetKrw: consensus?.consensus.avg_target_krw ?? null,
      upsidePct,
      foreignWon: flow?.cumulative_5d.foreign_won ?? null,
      institutionalWon: flow?.cumulative_5d.institutional_won ?? null,
      isLive: row.market.is_intraday_live === true,
      phase: row.market.market_phase ?? "closed",
      longPct,
    };
  }).filter((x): x is NonNullable<typeof x> => x != null);

  if (items.length === 0) return null;

  return (
    <section className="mb-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-accent-blue/8 via-accent-purple/5 to-accent-green/8 border border-line">
      <div className="flex items-baseline justify-between mb-4 gap-2">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-text">
          {t.title}
        </h2>
        <span className="text-[10px] sm:text-[11px] text-text-dim">{t.sub}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {items.map((item) => {
          const name = locale === "en" ? item.name_en : item.name_ko;
          const isUp = (item.upsidePct ?? 0) > 0;
          const isDn = (item.upsidePct ?? 0) < 0;
          const upsideColor = isUp
            ? "text-accent-green"
            : isDn
            ? "text-accent-blue"
            : "text-text-muted";

          const foreignBuy = (item.foreignWon ?? 0) > 0;
          const foreignSell = (item.foreignWon ?? 0) < 0;
          const foreignColor = foreignBuy
            ? "text-accent-green"
            : foreignSell
            ? "text-accent-blue"
            : "text-text-dim";
          const foreignArrow = foreignBuy ? "▲" : foreignSell ? "▼" : "—";

          return (
            <Link
              key={item.slug}
              href={`/korea/${item.slug}` as any}
              className="block group"
            >
              <div className="flex sm:flex-col items-center sm:items-stretch justify-between sm:justify-start gap-3 p-3 sm:p-4 rounded-xl bg-bg-card/70 hover:bg-bg-card border border-line/60 hover:border-accent-blue/40 transition-all">
                {/* 좌측 (모바일) / 상단 (데스크탑): 종목명 + 현재가 → 목표가 */}
                <div className="flex-1 sm:flex-none min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="text-sm sm:text-base font-bold text-text truncate group-hover:text-accent-blue transition">
                      {name}
                    </div>
                    {(() => {
                      // 3-phase pill — LIVE 🟢 / NXT 🟠 / Hyperliq 🔵
                      const phaseCfg =
                        item.phase === "live"
                          ? { text: t.live, color: "text-accent-green", dot: "bg-accent-green", pulse: true, title: locale === "en" ? "KRX market open" : "한국 정규장 거래중" }
                          : item.phase === "nxt"
                          ? { text: t.nxt, color: "text-accent-amber", dot: "bg-accent-amber", pulse: true, title: locale === "en" ? "NXT after-hours" : "NXT 시간외 거래중" }
                          : { text: t.hyperliq, color: "text-accent-blue", dot: "bg-accent-blue", pulse: false, title: locale === "en" ? "Hyperliquid 24h" : "Hyperliquid 24h 기준" };
                      return (
                        <span
                          className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold tabular ${phaseCfg.color} shrink-0`}
                          title={phaseCfg.title}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${phaseCfg.dot} ${phaseCfg.pulse ? "animate-pulse-soft" : ""}`} />
                          {phaseCfg.text}
                        </span>
                      );
                    })()}
                  </div>
                  {item.currentKrw != null && item.avgTargetKrw != null && (
                    <div className="text-[10px] sm:text-[11px] text-text-dim tabular mt-0.5 leading-tight">
                      ₩{fmtKRW(Math.round(item.currentKrw))} → ₩{fmtKRW(item.avgTargetKrw)}
                    </div>
                  )}
                  {item.foreignWon != null && (
                    <div className={`text-[10px] text-text-dim tabular mt-1 leading-tight`}>
                      🌐{" "}
                      <span className={foreignColor}>
                        {foreignArrow}{" "}
                        {item.foreignWon > 0 ? "+" : item.foreignWon < 0 ? "−" : ""}₩
                        {fmtFlowKRW(item.foreignWon, locale)}
                      </span>{" "}
                      <span className="text-text-dim/70">
                        ({foreignBuy ? t.netBuy : foreignSell ? t.netSell : ""})
                      </span>
                    </div>
                  )}
                  {/* 시장 sentiment — HL 거래자 포지션 기반 상승/하락 베팅 비율 (간략 한 줄) */}
                  {item.longPct != null && (() => {
                    const shortPct = 100 - item.longPct;
                    const isBull = item.longPct > 52;
                    const isBear = item.longPct < 48;
                    return (
                      <div className="text-[10px] text-text-dim tabular mt-1 leading-tight">
                        📊{" "}
                        <span className={isBull ? "text-accent-green" : "text-text-dim"}>
                          ↑{t.sentLong} {item.longPct.toFixed(0)}%
                        </span>
                        <span className="text-text-dim/60"> / </span>
                        <span className={isBear ? "text-accent-blue" : "text-text-dim"}>
                          ↓{t.sentShort} {shortPct.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* 우측 (모바일) / 하단 (데스크탑): 상승여력 + (컨센 기준) sub 라벨 */}
                {item.upsidePct != null && (
                  <div className="text-right sm:text-left shrink-0">
                    <div className="text-[9px] sm:text-[10px] text-text-dim leading-tight">
                      {t.upside}
                    </div>
                    <div className={`text-lg sm:text-2xl font-bold tabular ${upsideColor} leading-tight`}>
                      {isUp ? "▲ +" : isDn ? "▼ " : ""}
                      {Math.abs(item.upsidePct).toFixed(1)}%
                    </div>
                    <div className="text-[9px] text-text-dim/80 leading-tight mt-0.5">
                      {t.upsideRef}
                    </div>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <p className="mt-4 text-[10px] sm:text-[11px] text-text-dim leading-relaxed">
        {t.footer}
      </p>
    </section>
  );
}
