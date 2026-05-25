// 홈 페이지 Hero box — 한국주식 3종 미리보기 + 종목 상세 직접 CTA
// USP 발견율 ↑: user가 카드 grid 보기 전에 "탭하면 더 깊이 있다" 인지

import Link from "next/link";
import { getAllConsensus } from "@/lib/consensus";
import { getTradingFlow } from "@/lib/tradingFlow";
import type { PriceRow } from "@/lib/fetchPrices";
import { ShareButton } from "./ShareButton";

export type Locale = "ko" | "en";

const I18N = {
  ko: {
    title: "🔥 한국주식 종합 분석",
    sub: "탭하면 한 화면에 다 있음",
    upside: "상승여력",
    upsideShort: "단기",
    upsideShortRef: "(HL 24h)",
    upsideLong: "중장기",
    upsideLongRef: "(컨센)",
    avgRef: "(HL 24h)", // 화살표 우측 = HL 24h KRW 가격
    sentLong: "상승",
    sentShort: "하락",
    fundingLabel: "펀딩",
    // 형님 5/13 지적: "롱포지션 유리" = 수익 함의 (모순) / "상승 베팅 우세" = 베팅 비율 (정확)
    // FundingBar(종목 상세) + PriceCard(카드 grid) 와 라벨 통일 — 3-screen 일관성 확보
    longFavor: "상승 베팅 우세",
    shortFavor: "하락 베팅 우세",
    balanced: "균형",
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
    upsideShort: "Short-term",
    upsideShortRef: "(HL 24h)",
    upsideLong: "Long-term",
    upsideLongRef: "(consensus)",
    avgRef: "(HL 24h)",
    sentLong: "Bull",
    sentShort: "Bear",
    fundingLabel: "Funding",
    longFavor: "Bullish bets dominant",
    shortFavor: "Bearish bets dominant",
    balanced: "Balanced",
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

// 가격 (목표가/현재가) — 한국어: "X만", 영어: "X.XK" 단위
function fmtKRW(n: number, locale: Locale = "ko"): string {
  if (locale === "en") {
    // 영어 — comma-grouped raw KRW (예: ₩338,462). 자릿수 많아도 retail 친숙
    if (n >= 1_000_000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
    return n.toLocaleString("en-US");
  }
  if (n >= 1_000_000) {
    return `${(n / 10000).toFixed(0)}만`;
  }
  return n.toLocaleString("ko-KR");
}

// 외인·기관 매매 누적 — 한국어: 조/억/만, 영어: T/B/M won
function fmtFlowKRW(won: number, locale: Locale): string {
  const abs = Math.abs(won);
  if (locale === "en") {
    if (abs >= 1_000_000_000_000) return `${(abs / 1_000_000_000_000).toFixed(1)}T won`;
    if (abs >= 1_000_000_000) return `${(abs / 1_000_000_000).toFixed(0)}B won`;
    if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(0)}M won`;
    return `${abs.toLocaleString("en-US")} won`;
  }
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

    // 좌측(화살표 시작) = 정규장 종가
    const currentKrw =
      row.market.regular_close_krw ??
      row.market.per_share_krw ??
      row.market.main_display_krw ??
      row.market.krw_price ??
      null;

    // 우측(화살표 끝) = HL 24h KRW
    const hlPriceKrw =
      row.market.krw_price ??
      row.market.main_display_krw ??
      null;

    // 단기 상승여력 = HL premium % (HL 24h vs 정규장 종가) — 형님 5/25 (이미지)
    const upsideShortPct: number | null = row.market.hl_premium_pct ?? null;

    // 중장기 상승여력 = 컨센서스 평균목표 vs 정규장 종가
    let upsideLongPct: number | null = null;
    if (consensus && currentKrw && currentKrw > 0) {
      upsideLongPct =
        ((consensus.consensus.avg_target_krw - currentKrw) / currentKrw) * 100;
    }

    // 시장 sentiment — HL funding rate 기반 (코인 metric 일부 노출: 펀딩비 % + 유리 라벨)
    // 형님 5/13 요청: 펀딩비 + '롱포지션 유리/숏포지션 유리' 라벨 추가
    const funding = row.market.funding ?? null;
    const longPct =
      funding != null && !isNaN(funding) ? fundingToLongPct(funding) : null;

    // 한국주식 Hyperliquid phase 달러 보조 — 형님 5/13 요청: HL로 표현할 때 작게 달러도 표시
    const currentUsd =
      row.market.main_display_usd ??
      row.market.per_share_usd ??
      row.market.mark_px_usd ??
      null;

    return {
      slug,
      name_ko: row.name_ko ?? slug,
      name_en: row.name_en ?? slug,
      currentKrw,
      currentUsd,
      avgTargetKrw: hlPriceKrw, // 화살표 우측 = HL 24h KRW
      upsideShortPct, // 단기 = HL premium %
      upsideLongPct,  // 중장기 = 컨센 vs 정규장
      foreignWon: flow?.cumulative_5d.foreign_won ?? null,
      institutionalWon: flow?.cumulative_5d.institutional_won ?? null,
      isLive: row.market.is_intraday_live === true,
      phase: row.market.market_phase ?? "closed",
      longPct,
      funding, // raw 펀딩비 (% 표시 + favor 분기용)
    };
  }).filter((x): x is NonNullable<typeof x> => x != null);

  if (items.length === 0) return null;

  return (
    <section className="mb-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-accent-blue/8 via-accent-purple/5 to-accent-green/8 border border-line">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-text">
            {t.title}
          </h2>
          <div className="text-[10px] sm:text-[11px] text-text-dim mt-0.5">{t.sub}</div>
        </div>
        {/* 사이트 자체 공유 버튼 (5/14 형님 지적: 종목 상세에만 있어서 못 찾음) */}
        <ShareButton
          url={locale === "en" ? "https://kr-stocks.com/en" : "https://kr-stocks.com"}
          title={locale === "en"
            ? "kr-stocks.com — 24h Korean & Global Stocks"
            : "kr-stocks.com — 24시간 한국·글로벌 주식 시세"}
          text={locale === "en"
            ? "Regular hours + NXT + Hyperliquid 24/7. Korean broker consensus, foreign flow, private big tech."
            : "정규장 + NXT 시간외 + 야간 24시간. 증권사 컨센 + 외인기관 + 비상장 빅테크."}
          locale={locale}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {items.map((item) => {
          const name = locale === "en" ? item.name_en : item.name_ko;
          // 단기 (HL prem %) 색상
          const shortIsUp = (item.upsideShortPct ?? 0) > 0;
          const shortIsDn = (item.upsideShortPct ?? 0) < 0;
          const shortColor = shortIsUp
            ? "text-accent-green"
            : shortIsDn
            ? "text-accent-blue"
            : "text-text-muted";
          // 중장기 (컨센 vs 정규장) 색상
          const longIsUp = (item.upsideLongPct ?? 0) > 0;
          const longIsDn = (item.upsideLongPct ?? 0) < 0;
          const longColor = longIsUp
            ? "text-accent-green"
            : longIsDn
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
                      ₩{fmtKRW(Math.round(item.currentKrw), locale)}
                      {/* Hyperliquid phase 일 때 달러 보조 inline — 형님 5/13 요청 */}
                      {item.phase === "closed" && item.currentUsd != null && (
                        <span className="text-text-dim/70"> (≈${item.currentUsd.toFixed(2)})</span>
                      )}
                      {" "}→ ₩{fmtKRW(item.avgTargetKrw, locale)}{" "}
                      <span className="text-text-dim/70">{t.avgRef}</span>
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
                  {/* 시장 sentiment — HL 거래자 포지션 기반 (5/13 형님 요청)
                      줄 1: ↑상승 X% / ↓하락 Y% (베팅 비율)
                      줄 2: 펀딩 +0.0X% · 롱포지션 유리 / 숏포지션 유리 (펀딩비 + 유리 라벨) */}
                  {item.longPct != null && item.funding != null && (() => {
                    const shortPct = 100 - item.longPct;
                    const isBull = item.funding > 0.00001;
                    const isBear = item.funding < -0.00001;
                    const fundingPctText = (item.funding * 100).toFixed(4);
                    const fundingSign = item.funding > 0 ? "+" : "";
                    const favorLabel = isBull
                      ? t.longFavor
                      : isBear
                      ? t.shortFavor
                      : t.balanced;
                    const favorColor = isBull
                      ? "text-accent-green"
                      : isBear
                      ? "text-accent-blue"
                      : "text-text-muted";
                    return (
                      <>
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
                        <div className="text-[10px] text-text-dim tabular mt-0.5 leading-tight">
                          {t.fundingLabel} {fundingSign}{fundingPctText}%{" "}
                          <span className={`font-semibold ${favorColor}`}>
                            · {favorLabel}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* 우측 (모바일) / 하단 (데스크탑): 상승여력 단기(HL) + 중장기(컨센) 동시 표시 */}
                {(item.upsideShortPct != null || item.upsideLongPct != null) && (
                  <div className="text-right sm:text-left shrink-0">
                    {/* 공통 헤더: 상승여력 (형님 5/25 지시: 단어 자체가 빠져있어서 추가) */}
                    <div className="text-[10px] sm:text-[11px] font-semibold text-text-muted leading-tight mb-1.5">
                      📈 {t.upside}
                    </div>
                    {/* 단기 = HL premium % (정규장 종가 대비 HL 24h) */}
                    {item.upsideShortPct != null && (
                      <div className="leading-tight">
                        <div className="text-[9px] sm:text-[10px] text-text-dim">
                          {t.upsideShort} <span className="text-text-dim/70">{t.upsideShortRef}</span>
                        </div>
                        <div className={`text-base sm:text-xl font-bold tabular ${shortColor}`}>
                          {shortIsUp ? "▲ +" : shortIsDn ? "▼ " : ""}{Math.abs(item.upsideShortPct).toFixed(2)}%
                        </div>
                      </div>
                    )}
                    {/* 중장기 = 컨센 평균목표 vs 정규장 종가 */}
                    {item.upsideLongPct != null && (
                      <div className="leading-tight mt-1.5">
                        <div className="text-[9px] sm:text-[10px] text-text-dim">
                          {t.upsideLong} <span className="text-text-dim/70">{t.upsideLongRef}</span>
                        </div>
                        <div className={`text-sm sm:text-lg font-bold tabular ${longColor}`}>
                          {longIsUp ? "▲ +" : longIsDn ? "▼ " : ""}{Math.abs(item.upsideLongPct).toFixed(1)}%
                        </div>
                      </div>
                    )}
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
