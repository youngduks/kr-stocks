"use client";

import { useState } from "react";
import Link from "next/link";
import type { ConsensusData } from "@/lib/consensus";
import { useTheme } from "./ThemeProvider";
import { CHART_UPDOWN } from "@/lib/colors";
import { TargetRangeCard } from "./ui/TargetRangeCard";

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
      ? "text-up"
      : "text-down";
  const { theme } = useTheme();
  const isUpHist = histVals[histVals.length - 1] >= histVals[0];
  const histStrokeColor = isUpHist
    ? CHART_UPDOWN[theme === "light" ? "light" : "dark"].up
    : CHART_UPDOWN[theme === "light" ? "light" : "dark"].down;

  return (
    <div className="space-y-4">
      {/* 종목 토글 — 칩 */}
      <div className="flex gap-2 overflow-x-auto ds-chipnav -mx-4 px-4 py-2 -my-2" role="tablist">
        {all.map((cd) => {
          const isActive = cd.slug === activeSlug;
          const label = locale === "en" ? cd.name_en : cd.name_ko;
          return (
            <button
              key={cd.slug}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setActiveSlug(cd.slug)}
              className="ds-chip"
            >
              {label}
              <span className="ml-2 text-[12px] opacity-70 font-medium num">{cd.ticker}</span>
            </button>
          );
        })}
      </div>

      {/* 상태 카드 — 목표가까지 +N% · 52주 최저~지금~목표가 바 · 쉬운 해석 */}
      <TargetRangeCard data={active} locale={locale} />

      {/* 평균목표가 추이 — 네이버 스냅샷이 매 평일 쌓은 실측 시계열 */}
      <div className="ds-card">
        <div className="ds-eyebrow mb-3">{t.history}</div>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-16" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={`grad-${active.slug}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={histStrokeColor} stopOpacity="0.28" />
              <stop offset="100%" stopColor={histStrokeColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,${SVG_H} ${points} ${SVG_W},${SVG_H}`} fill={`url(#grad-${active.slug})`} />
          <polyline
            points={points}
            fill="none"
            stroke={histStrokeColor}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <div className="flex justify-between text-[12px] text-text-dim mt-2 num">
          <span>
            {active.history[0]?.date.slice(5)} · {t.krwSymbol}
            {fmtKRW(active.history[0]?.avg_target_krw ?? 0)}
          </span>
          <span className={`${histTrend} font-semibold`}>
            {t.krwSymbol}
            {fmtKRW(active.history[active.history.length - 1]?.avg_target_krw ?? 0)} ·{" "}
            {active.history[active.history.length - 1]?.date.slice(5)}
          </span>
        </div>
        <div className="ds-meta mt-2">
          {t.source}: {t.naverResearch} · {t.updated} {fmtUpdated(active.updated_at, locale)} KST
        </div>
      </div>

      {/* 종목 상세로 — 한 줄 링크 */}
      <Link
        href={`/korea/${active.slug}` as any}
        prefetch={false}
        className="ds-card flex items-center justify-between gap-3 hover:bg-bg-hover transition"
        style={{ paddingTop: 14, paddingBottom: 14 }}
      >
        <div className="min-w-0">
          <div className="text-[15px] font-bold text-text truncate">
            {displayName} {t.seeStock}
          </div>
          <div className="ds-meta truncate">{t.seeStockSub}</div>
        </div>
        <span className="text-[20px] text-text-dim shrink-0" aria-hidden="true">
          ›
        </span>
      </Link>

      <p className="ds-meta pt-1">{t.disclaimer}</p>
    </div>
  );
}
