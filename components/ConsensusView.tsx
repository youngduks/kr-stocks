"use client";

import { useState } from "react";
import Link from "next/link";
import type { BrokerOpinion, ConsensusData } from "@/lib/consensus";
import { useTheme } from "./ThemeProvider";

export type Locale = "ko" | "en";

const I18N = {
  ko: {
    title: "증권사 목표주가 분석",
    subtitle: "한국 증권사 애널리스트 목표주가 종합 — 네이버 금융 리서치 기준",
    avgTarget: "평균 목표가",
    median: "중앙값",
    max: "최고",
    min: "최저",
    opinionCount: "의견 수",
    brokerCount: "증권사",
    currentPrice: "현재가",
    upside: "상승여력",
    upsideRef: "증권사 평균 대비",
    upsideArrow: "→",
    distribution: "투자의견 분포",
    latestReports: "증권사별 최신 분석",
    broker: "증권사",
    opinion: "투자의견",
    target: "목표가",
    date: "일자",
    history: "평균 목표가 추이 (최근 4주)",
    source: "출처",
    naverResearch: "네이버 금융 리서치",
    updated: "최종 업데이트",
    units: "건",
    krwSymbol: "₩",
    disclaimer:
      "본 정보는 단순 참고용이며 투자 권유·자문이 아닙니다. 목표가는 시점에 따라 변경될 수 있습니다.",
    noCurrentPrice: "—",
    seeStock: "종합 분석 보기",
    seeStockSub: "Binance 24h · 정규장 · 외인·기관 · funding · 차트",
  },
  en: {
    title: "Korean Broker Consensus",
    subtitle:
      "Aggregated analyst price targets from major Korean brokers — based on Naver Finance Research",
    avgTarget: "Avg target",
    median: "Median",
    max: "High",
    min: "Low",
    opinionCount: "Opinions",
    brokerCount: "Brokers",
    currentPrice: "Current",
    upside: "Upside",
    upsideRef: "vs avg broker target",
    upsideArrow: "→",
    distribution: "Opinion distribution",
    latestReports: "Latest broker reports",
    broker: "Broker",
    opinion: "Opinion",
    target: "Target",
    date: "Date",
    history: "Avg target trend (last 4 weeks)",
    source: "Source",
    naverResearch: "Naver Finance Research",
    updated: "Last updated",
    units: "",
    krwSymbol: "₩",
    disclaimer:
      "For informational purposes only. Not investment advice. Targets may change over time.",
    noCurrentPrice: "—",
    seeStock: "Full analysis",
    seeStockSub: "Binance 24h · Regular · Foreign flow · funding · chart",
  },
} as const;

const OPINION_META: Record<
  BrokerOpinion,
  { color: string; bg: string; en: string }
> = {
  강력매수: { color: "text-accent-purple", bg: "bg-accent-purple/15", en: "Strong Buy" },
  매수: { color: "text-accent-green", bg: "bg-accent-green/15", en: "Buy" },
  비중확대: { color: "text-accent-blue", bg: "bg-accent-blue/15", en: "Overweight" },
  중립: { color: "text-text-muted", bg: "bg-line/30", en: "Hold" },
  비중축소: { color: "text-accent-amber", bg: "bg-accent-amber/15", en: "Underweight" },
  매도: { color: "text-accent-red", bg: "bg-accent-red/15", en: "Sell" },
};

function fmtKRW(n: number): string {
  return n.toLocaleString("ko-KR");
}

function fmtDate(s: string, locale: Locale = "ko"): string {
  // "2026-05-06" → "26-05-06" 또는 "May 06"
  const d = new Date(s);
  if (locale === "en")
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  return s.slice(2); // "26-05-06"
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

      {/* 메인 카드 5개 grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-bg-card border border-line rounded-xl p-4">
          <div className="text-[10px] text-text-dim">{t.avgTarget}</div>
          <div className="text-xl sm:text-2xl font-bold tabular text-accent-purple mt-1">
            {t.krwSymbol}
            {fmtKRW(c.avg_target_krw)}
          </div>
        </div>
        <div className="bg-bg-card border border-line rounded-xl p-4">
          <div className="text-[10px] text-text-dim">{t.median}</div>
          <div className="text-xl sm:text-2xl font-bold tabular text-text mt-1">
            {t.krwSymbol}
            {fmtKRW(c.median_target_krw)}
          </div>
        </div>
        <div className="bg-bg-card border border-line rounded-xl p-4">
          <div className="text-[10px] text-text-dim">{t.max}</div>
          <div className="text-lg sm:text-xl font-bold tabular text-accent-green mt-1">
            {t.krwSymbol}
            {fmtKRW(c.max_target_krw)}
          </div>
          <div className="text-[10px] text-text-dim mt-0.5 truncate">
            {c.max_broker}
          </div>
        </div>
        <div className="bg-bg-card border border-line rounded-xl p-4">
          <div className="text-[10px] text-text-dim">{t.min}</div>
          <div className="text-lg sm:text-xl font-bold tabular text-accent-blue mt-1">
            {t.krwSymbol}
            {fmtKRW(c.min_target_krw)}
          </div>
          <div className="text-[10px] text-text-dim mt-0.5 truncate">
            {c.min_broker}
          </div>
        </div>
        <div className="bg-bg-card border border-line rounded-xl p-4">
          <div className="text-[10px] text-text-dim">
            {t.opinionCount} · {t.brokerCount}
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular text-text mt-1">
            {c.opinion_count}
            <span className="text-[10px] text-text-dim font-normal ml-0.5">
              {t.units}
            </span>
          </div>
          <div className="text-[10px] text-text-dim mt-0.5">
            {c.broker_count} {t.brokerCount}
          </div>
        </div>
      </div>

      {/* Cross-link: 종목 상세 페이지로 (USP 발견율 ↑) */}
      <Link
        href={`/korea/${active.slug}` as any}
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

      {/* 추이 + 분포 — 2 column */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 평균목표가 sparkline */}
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

        {/* 의견 분포 bar */}
        <div className="bg-bg-card border border-line rounded-xl p-5">
          <div className="text-xs text-text-dim mb-3">{t.distribution}</div>
          <div className="space-y-2">
            {(Object.keys(active.opinion_distribution) as BrokerOpinion[])
              .filter((op) => active.opinion_distribution[op] > 0)
              .map((op) => {
                const v = active.opinion_distribution[op];
                const total =
                  Object.values(active.opinion_distribution).reduce(
                    (s, x) => s + x,
                    0
                  ) || 1;
                const pct = (v / total) * 100;
                const m = OPINION_META[op];
                return (
                  <div
                    key={op}
                    className="flex items-center gap-3 text-xs tabular"
                  >
                    <span
                      className={`w-20 sm:w-24 font-semibold ${m.color} shrink-0`}
                    >
                      {locale === "en" ? m.en : op}
                    </span>
                    <div className="flex-1 h-2 bg-line/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${m.bg.replace("/15", "")}`}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: "currentColor",
                          opacity: 0.55,
                          color: m.color
                            .replace("text-", "")
                            .startsWith("accent")
                            ? undefined
                            : undefined,
                        }}
                      />
                    </div>
                    <span className={`${m.color} font-bold w-10 text-right`}>
                      {v}
                    </span>
                    <span className="text-text-dim w-10 text-right">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* 증권사별 테이블 */}
      <div className="bg-bg-card border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-line text-xs text-text-dim">
          {t.latestReports} ({active.brokers.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-text-dim border-b border-line/60">
                <th className="text-left px-5 py-2 font-medium">{t.broker}</th>
                <th className="text-left px-3 py-2 font-medium">{t.opinion}</th>
                <th className="text-right px-3 py-2 font-medium">{t.target}</th>
                <th className="text-right px-5 py-2 font-medium">{t.date}</th>
              </tr>
            </thead>
            <tbody>
              {active.brokers.map((b, idx) => {
                const m = OPINION_META[b.opinion];
                const brokerName =
                  locale === "en" && b.broker_en ? b.broker_en : b.broker;
                return (
                  <tr
                    key={`${b.broker}-${idx}`}
                    className="border-b border-line/30 last:border-0 hover:bg-bg-hover/40 transition"
                  >
                    <td className="px-5 py-3 font-medium text-text">
                      {brokerName}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md ${m.bg} ${m.color} font-semibold`}
                      >
                        {locale === "en" ? m.en : b.opinion}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular font-semibold text-text">
                      {t.krwSymbol}
                      {fmtKRW(b.target_krw)}
                    </td>
                    <td className="px-5 py-3 text-right tabular text-text-dim text-xs">
                      {fmtDate(b.report_date, locale)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-text-dim leading-relaxed pt-2">
        {t.disclaimer}
      </p>
    </div>
  );
}
