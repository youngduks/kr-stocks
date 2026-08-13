"use client";

import { useState } from "react";
import Link from "next/link";
import type { ConsensusData } from "@/lib/consensus";
import { useTheme } from "./ThemeProvider";

export type Locale = "ko" | "en";

const I18N = {
  ko: {
    title: "증권사 목표주가 분석",
    subtitle: "한국 증권사 애널리스트 목표주가 종합 — 네이버 금융 리서치 기준",
    avgTarget: "평균 목표가",
    currentPrice: "현재가",
    upside: "상승여력",
    upsideRef: "증권사 평균 대비",
    upsideArrow: "→",
    history: "평균 목표가 추이 (최근 4주)",
    source: "출처",
    naverResearch: "네이버 금융 리서치",
    updated: "최종 업데이트",
    krwSymbol: "₩",
    disclaimer:
      "본 정보는 단순 참고용이며 투자 권유·자문이 아닙니다. 목표가는 시점에 따라 변경될 수 있습니다.",
    seeStock: "종합 분석 보기",
    seeStockSub: "Binance 24h · 정규장 · 외인·기관 · funding · 차트",
    naverSnapshot: "네이버 컨센서스 종합 (실시간)",
    opinionScore: "투자의견 평점",
    high52w: "52주 최고",
    low52w: "52주 최저",
  },
  en: {
    title: "Korean Broker Consensus",
    subtitle:
      "Aggregated analyst price targets from major Korean brokers — based on Naver Finance Research",
    avgTarget: "Avg target",
    currentPrice: "Current",
    upside: "Upside",
    upsideRef: "vs avg broker target",
    upsideArrow: "→",
    history: "Avg target trend (last 4 weeks)",
    source: "Source",
    naverResearch: "Naver Finance Research",
    updated: "Last updated",
    krwSymbol: "₩",
    disclaimer:
      "For informational purposes only. Not investment advice. Targets may change over time.",
    seeStock: "Full analysis",
    seeStockSub: "Binance 24h · Regular · Foreign flow · funding · chart",
    naverSnapshot: "Naver Consensus Summary (live)",
    opinionScore: "Opinion score",
    high52w: "52w High",
    low52w: "52w Low",
  },
} as const;

function fmtKRW(n: number): string {
  return n.toLocaleString("ko-KR");
}

function fmtUpdated(iso: string, locale: Locale = "ko"): string {
  const d = new Date(iso);
  if (locale === "en") {
    return d.toLocaleString("en-US", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function ConsensusView({
  all,
  locale = "ko",
  defaultSlug,
}: {
  all: ConsensusData[];
  locale?: Locale;
  defaultSlug?: string;
}) {
  const [activeSlug, setActiveSlug] = useState(defaultSlug ?? all[0]?.slug);
  const active = all.find((c) => c.slug === activeSlug) ?? all[0];
  const t = I18N[locale];

  if (!active) return null;

  const c = active.consensus;
  const displayName = locale === "en" ? active.name_en : active.name_ko;

  // 추이 차트 — minmax normalize → SVG sparkline
  const histVals = active.history.map((h) => h.avg_target_krw);
  const minH = Math.min(...histVals);
  const maxH = Math.max(...histVals);
  const rangeH = maxH - minH || 1;
  const SVG_W = 320;
  const SVG_H = 60;
  const points = active.history
    .map((h, i) => {
      const x = (i / (active.history.length - 1 || 1)) * SVG_W;
      const y = SVG_H - ((h.avg_target_krw - minH) / rangeH) * SVG_H * 0.85 - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const histTrend =
    histVals[histVals.length - 1] >= histVals[0]
      ? "text-accent-green"
      : "text-accent-blue";
  const { theme } = useTheme();
  const isUpHist = histVals[histVals.length - 1] >= histVals[0];
  const histStrokeColor = isUpHist
    ? (theme === "light" ? "#16A34A" : "#1FAE6F")
    : "#3182F6";

  return (
    <div className="space-y-6">
      {/* 종목 토글 */}
      <div className="flex flex-wrap gap-2">
        {all.map((cd) => {
          const isActive = cd.slug === activeSlug;
          const label = locale === "en" ? cd.name_en : cd.name_ko;
          return (
            <button
              key={cd.slug}
              onClick={() => setActiveSlug(cd.slug)}
              className={`px-4 py-2 rounded-xl border transition text-sm font-semibold ${
                isActive
                  ? "bg-text text-bg border-text"
                  : "bg-bg-card text-text-muted border-line hover:border-accent-blue/40 hover:text-text"
              }`}
            >
              {label}
              <span className="ml-2 text-[10px] opacity-70 font-medium tabular">
                {cd.ticker}
              </span>
            </button>
          );
        })}
      </div>

      {/* 메타 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text tracking-tight">
            {displayName}
          </h2>
          <p className="text-xs text-text-dim mt-1">
            {t.source}: {t.naverResearch} · {t.updated} {fmtUpdated(active.updated_at, locale)} KST
          </p>
        </div>
        {c.upside_pct != null && c.current_price_krw != null && (
          <div className="text-right">
            {/* 라벨 — "상승여력 (증권사 평균 대비)" reference 명시 (종목 상세 ConsensusSection 과 통일, 5/13) */}
            <div className="text-[11px] text-text-dim">
              {t.upside}
              <span className="ml-1 text-[10px] opacity-80">({t.upsideRef})</span>
            </div>
            <div
              className={`text-2xl sm:text-3xl font-bold tabular ${
                c.upside_pct > 0
                  ? "text-accent-green"
                  : c.upside_pct < 0
                  ? "text-accent-blue"
                  : "text-text-muted"
              }`}
            >
              {c.upside_pct > 0 ? "▲ +" : c.upside_pct < 0 ? "▼ " : ""}
              {Math.abs(c.upside_pct).toFixed(2)}%
            </div>
            {/* breakdown — "현재 ₩X → 평균 ₩Y" 양쪽 가격 노출 (계산 과정 가시화) */}
            <div className="text-[10px] text-text-dim tabular mt-0.5 whitespace-nowrap">
              {t.currentPrice} {t.krwSymbol}{fmtKRW(c.current_price_krw)}
              {" "}{t.upsideArrow}{" "}
              {t.krwSymbol}{fmtKRW(c.avg_target_krw)}
            </div>
          </div>
        )}
      </div>

      {/* 네이버 종합 컨센서스 — 매일 자동 갱신 (brokers 배열과 별도 출처) */}
      {active.naver_snapshot && (
        <div className="bg-bg-card border border-accent-purple/30 rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <div className="text-[11px] font-bold text-accent-purple tracking-wide uppercase">
              {t.naverSnapshot}
            </div>
            <div className="text-[10px] text-text-dim tabular">
              {fmtUpdated(active.naver_snapshot.fetched_at, locale)} KST
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <div className="text-[10px] text-text-dim">{t.avgTarget}</div>
              <div className="text-lg sm:text-xl font-bold tabular text-accent-purple mt-1">
                {t.krwSymbol}{fmtKRW(active.naver_snapshot.avg_target_krw)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-text-dim">{t.opinionScore}</div>
              <div className="text-lg sm:text-xl font-bold tabular text-accent-green mt-1">
                {active.naver_snapshot.opinion_score.toFixed(2)}
                <span className="ml-2 text-xs font-semibold text-text-muted">
                  {active.naver_snapshot.opinion_label}
                </span>
              </div>
            </div>
            {active.naver_snapshot.high_52w_krw != null && (
              <div>
                <div className="text-[10px] text-text-dim">{t.high52w}</div>
                <div className="text-lg sm:text-xl font-bold tabular text-text mt-1">
                  {t.krwSymbol}{fmtKRW(active.naver_snapshot.high_52w_krw)}
                </div>
              </div>
            )}
            {active.naver_snapshot.low_52w_krw != null && (
              <div>
                <div className="text-[10px] text-text-dim">{t.low52w}</div>
                <div className="text-lg sm:text-xl font-bold tabular text-text mt-1">
                  {t.krwSymbol}{fmtKRW(active.naver_snapshot.low_52w_krw)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cross-link: 종목 상세 페이지로 (USP 발견율 ↑) */}
      <Link
        href={`/korea/${active.slug}` as any}
        prefetch={false}
        className="group block p-4 rounded-2xl bg-gradient-to-r from-accent-blue/8 via-accent-purple/8 to-accent-green/8 border border-accent-blue/20 hover:border-accent-blue/50 transition-all"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm sm:text-base font-bold text-text group-hover:text-accent-blue transition truncate">
              ▶ {displayName} {t.seeStock}
            </div>
            <div className="text-[10px] sm:text-[11px] text-text-dim mt-1 leading-relaxed">
              {t.seeStockSub}
            </div>
          </div>
          <div className="text-accent-blue text-2xl group-hover:translate-x-1 transition-transform shrink-0">
            →
          </div>
        </div>
      </Link>

      {/* 평균목표가 추이 — 네이버 스냅샷이 매 평일 쌓은 실측 시계열 */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-bg-card border border-line rounded-xl p-5">
          <div className="text-xs text-text-dim mb-3">{t.history}</div>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full h-16"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`grad-${active.slug}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={histStrokeColor} stopOpacity="0.28" />
                <stop offset="100%" stopColor={histStrokeColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon
              points={`0,${SVG_H} ${points} ${SVG_W},${SVG_H}`}
              fill={`url(#grad-${active.slug})`}
            />
            <polyline
              points={points}
              fill="none"
              stroke={histStrokeColor}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <div className="flex justify-between text-[10px] text-text-dim mt-2 tabular">
            <span>
              {active.history[0]?.date.slice(5)} → {t.krwSymbol}
              {fmtKRW(active.history[0]?.avg_target_krw ?? 0)}
            </span>
            <span className={`${histTrend} font-semibold`}>
              {t.krwSymbol}
              {fmtKRW(
                active.history[active.history.length - 1]?.avg_target_krw ?? 0
              )}{" "}
              ({active.history[active.history.length - 1]?.date.slice(5)})
            </span>
          </div>
        </div>

      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-text-dim leading-relaxed pt-2">
        {t.disclaimer}
      </p>
    </div>
  );
}
