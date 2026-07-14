"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type HistogramData,
  type LineData,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import type { LeverageBar } from "@/lib/leverageEtf";
import { useTheme } from "./ThemeProvider";

type Range = "1M" | "3M";

type UnderlyingBar = { time: number; price: number };

type ChartColors = {
  green: string;
  blue: string;
  amber: string;
  purple: string;
  red: string;
  textMuted: string;
  grid: string;
  crosshair: string;
  bg: string;
  bgCard: string;
};

const COLOR_DARK: ChartColors = {
  green: "#1FAE6F",
  blue: "#3182F6",
  amber: "#F4A623",
  purple: "#9D7DEC",
  red: "#F45C5C",
  textMuted: "#8B95A1",
  grid: "rgba(139, 149, 161, 0.05)",
  crosshair: "rgba(139, 149, 161, 0.35)",
  bg: "#15181D",
  bgCard: "#1F232B",
};

const COLOR_LIGHT: ChartColors = {
  green: "#16A34A",
  blue: "#3182F6",
  amber: "#D97706",
  purple: "#7C3AED",
  red: "#DC2626",
  textMuted: "#4E5968",
  grid: "rgba(78, 89, 104, 0.08)",
  crosshair: "rgba(78, 89, 104, 0.35)",
  bg: "#FFFFFF",
  bgCard: "#F7F8FA",
};

const RANGE_DAYS: Record<Range, number> = { "1M": 22, "3M": 90 };

// 하루 만에 이 이상 급락하면 "패닉셀 캐스케이드" 후보 — 2배 레버리지 상품 기준 임계치
// (일반 주식보다 변동성이 커서 크립토 perp OI 임계치(-3%)보다 훨씬 높게 설정)
const CASCADE_DROP_THRESHOLD_PCT = -15;

function fmtKrw(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) return `₩${(abs / 1_000_000_000_000).toFixed(1)}조`;
  if (abs >= 100_000_000) return `₩${(abs / 100_000_000).toFixed(0)}억`;
  if (abs >= 10_000) return `₩${(abs / 10_000).toFixed(0)}만`;
  return `₩${Math.round(abs).toLocaleString("ko-KR")}`;
}

function fmtPrice(n: number): string {
  return `₩${Math.round(n).toLocaleString("ko-KR")}`;
}

// 좌축을 등락률(%)로 통일 — ETF(만원대)와 본주(백만원대)는 절대가로 겹치면 한쪽이 안 보임
function fmtPct(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(1)}%`;
}

function kstDateFormatter(time: number): string {
  const d = new Date(time * 1000);
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit" }).format(d);
}

type CascadeEvent = { time: number; changePct: number };

function findCascades(bars: LeverageBar[], maxEvents = 3): CascadeEvent[] {
  const events = bars
    .filter((b) => b.changePct <= CASCADE_DROP_THRESHOLD_PCT)
    .map((b) => ({ time: b.time, changePct: b.changePct }));
  events.sort((a, b) => a.changePct - b.changePct);
  return events.slice(0, maxEvents);
}

type MergedBar = {
  time: number;
  etfPct: number;
  underlyingPct: number | null;
  tradingValueKrw: number;
};

/**
 * SK하이닉스 레버리지 ETF(KODEX, 코스피 실상장 2배 상품) + 본주(000660) 등락률 비교 차트.
 * 절대가는 스케일이 100배 이상 차이나 겹치면 한쪽이 안 보이므로, 구간 시작 대비 등락률(%)로
 * 통일해 같은 좌축에 표시 — "레버리지가 본주 대비 얼마나 증폭됐는지"를 바로 비교 가능.
 * 거래대금(우축, 히스토그램)은 ETF 기준. 하루 급락(-15%↓)한 날은 반대매매·패닉셀이
 * 몰렸을 실물 증거로 보고 빨간 마커로 표시.
 */
export function LeverageEtfChart({
  bars: allBars,
  underlyingBars: allUnderlyingBars,
  label,
  underlyingLabel,
}: {
  bars: LeverageBar[];
  underlyingBars: UnderlyingBar[];
  label: string;
  underlyingLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const etfSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const underlyingSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [range, setRange] = useState<Range>("1M");
  const { theme } = useTheme();
  const COLOR = useMemo(() => (theme === "light" ? COLOR_LIGHT : COLOR_DARK), [theme]);

  const bars = useMemo(() => allBars.slice(-RANGE_DAYS[range]), [allBars, range]);
  const cascades = useMemo(() => findCascades(bars), [bars]);

  const latest = bars.length > 0 ? bars[bars.length - 1] : null;
  const latestUnderlying = allUnderlyingBars.length > 0 ? allUnderlyingBars[allUnderlyingBars.length - 1] : null;
  const periodChangePct = useMemo(() => {
    if (bars.length < 2) return 0;
    const first = bars[0].price;
    const last = bars[bars.length - 1].price;
    return first > 0 ? ((last - first) / first) * 100 : 0;
  }, [bars]);

  // 등락률 재기준 — ETF·본주 둘 다 "이 구간 시작 대비 %"로 변환해 같은 좌축에 겹쳐 그림
  const merged: MergedBar[] = useMemo(() => {
    const uMap = new Map(allUnderlyingBars.map((u) => [u.time, u.price]));
    const etfBase = bars[0]?.price ?? 0;
    let underlyingBase: number | null = null;
    for (const b of bars) {
      const up = uMap.get(b.time);
      if (up != null) {
        underlyingBase = up;
        break;
      }
    }
    return bars.map((b) => {
      const up = uMap.get(b.time) ?? null;
      return {
        time: b.time,
        etfPct: etfBase > 0 ? ((b.price - etfBase) / etfBase) * 100 : 0,
        underlyingPct: up != null && underlyingBase && underlyingBase > 0 ? ((up - underlyingBase) / underlyingBase) * 100 : null,
        tradingValueKrw: b.tradingValueKrw,
      };
    });
  }, [bars, allUnderlyingBars]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: COLOR.textMuted,
        fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 11,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: COLOR.grid } },
      timeScale: {
        timeVisible: false,
        borderVisible: false,
        tickMarkFormatter: ((time: Time) => kstDateFormatter(time as number)) as any,
      },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.65, bottom: 0 } },
      leftPriceScale: { visible: true, borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.25 } },
      crosshair: {
        mode: 1,
        vertLine: { color: COLOR.crosshair, width: 1, style: LineStyle.Dotted, labelBackgroundColor: COLOR.bgCard },
        horzLine: { visible: false, labelVisible: false },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      // localization.priceFormatter는 좌·우축 모두에 전역 적용돼 히스토그램(거래대금) 축까지
      // %로 깨트림 — 지정하지 않고 각 시리즈 자체 priceFormat(fmtPct/fmtKrw)에만 맡김
      localization: {
        locale: "ko-KR",
        timeFormatter: ((time: Time) => kstDateFormatter(time as number)) as any,
      },
    });

    const volSeries = chart.addHistogramSeries({
      color: COLOR.blue + "55",
      priceScaleId: "right",
      priceFormat: { type: "custom", formatter: (p: number) => fmtKrw(p), minMove: 1 },
    });

    const underlyingSeries = chart.addLineSeries({
      color: COLOR.purple,
      lineWidth: 2,
      priceScaleId: "left",
      lineStyle: LineStyle.Dashed,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: COLOR.purple,
      crosshairMarkerBackgroundColor: COLOR.bg,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: { type: "custom", formatter: (p: number) => fmtPct(p), minMove: 0.01 },
    });

    const etfSeries = chart.addLineSeries({
      color: COLOR.amber,
      lineWidth: 2,
      priceScaleId: "left",
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: COLOR.amber,
      crosshairMarkerBackgroundColor: COLOR.bg,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: { type: "custom", formatter: (p: number) => fmtPct(p), minMove: 0.01 },
      // 0% 기준선이 항상 보이게 Y축 자동 확장
      autoscaleInfoProvider: (original: () => any) => {
        const res = original();
        if (!res?.priceRange) return res;
        return {
          ...res,
          priceRange: { minValue: Math.min(res.priceRange.minValue, 0), maxValue: Math.max(res.priceRange.maxValue, 0) },
        };
      },
    });

    etfSeries.createPriceLine({
      price: 0,
      color: COLOR.textMuted,
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
      title: "",
    });

    chartRef.current = chart;
    etfSeriesRef.current = etfSeries;
    underlyingSeriesRef.current = underlyingSeries;
    volSeriesRef.current = volSeries;

    etfSeries.setData(merged.map((m) => ({ time: m.time as Time, value: m.etfPct })) as LineData<Time>[]);
    underlyingSeries.setData(
      merged.filter((m) => m.underlyingPct != null).map((m) => ({ time: m.time as Time, value: m.underlyingPct! })) as LineData<Time>[]
    );
    volSeries.setData(
      bars.map((b) => ({
        time: b.time as Time,
        value: b.tradingValueKrw,
        color: b.changePct >= 0 ? COLOR.green + "55" : COLOR.blue + "55",
      })) as HistogramData<Time>[]
    );
    etfSeries.setMarkers(
      cascades.map(
        (c): SeriesMarker<Time> => ({
          time: c.time as Time,
          position: "aboveBar",
          color: COLOR.red,
          shape: "arrowDown",
          text: `${c.changePct.toFixed(0)}%`,
        })
      )
    );

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
      etfSeriesRef.current = null;
      underlyingSeriesRef.current = null;
      volSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    const chart = chartRef.current;
    const etfSeries = etfSeriesRef.current;
    const underlyingSeries = underlyingSeriesRef.current;
    const volSeries = volSeriesRef.current;
    if (!chart || !etfSeries || !underlyingSeries || !volSeries) return;
    etfSeries.setData(merged.map((m) => ({ time: m.time as Time, value: m.etfPct })) as LineData<Time>[]);
    underlyingSeries.setData(
      merged.filter((m) => m.underlyingPct != null).map((m) => ({ time: m.time as Time, value: m.underlyingPct! })) as LineData<Time>[]
    );
    volSeries.setData(
      bars.map((b) => ({
        time: b.time as Time,
        value: b.tradingValueKrw,
        color: b.changePct >= 0 ? COLOR.green + "55" : COLOR.blue + "55",
      })) as HistogramData<Time>[]
    );
    etfSeries.setMarkers(
      cascades.map(
        (c): SeriesMarker<Time> => ({
          time: c.time as Time,
          position: "aboveBar",
          color: COLOR.red,
          shape: "arrowDown",
          text: `${c.changePct.toFixed(0)}%`,
        })
      )
    );
    chart.timeScale().fitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merged, bars, cascades]);

  if (allBars.length === 0) {
    return (
      <div className="rounded-2xl bg-bg-card border border-line/40 p-6 text-center">
        <div className="text-sm text-text-dim">{label} 데이터를 불러올 수 없습니다.</div>
      </div>
    );
  }

  const periodColorClass = periodChangePct >= 0 ? "text-accent-green" : "text-accent-blue";

  return (
    <div className="rounded-2xl bg-gradient-to-b from-bg-card to-bg-card/60 border border-line/40 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-bold text-text truncate">{label}</div>
          <div className="text-[10px] text-text-dim">코스피 · 2배 레버리지</div>
        </div>
        <div className="inline-flex bg-bg-hover/60 rounded-full p-0.5 shrink-0">
          {(["1M", "3M"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                range === r ? "bg-text text-bg shadow-sm" : "text-text-dim hover:text-text-muted"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-bold tabular text-text">{latest && fmtPrice(latest.price)}</span>
            <span className={`text-xs font-bold tabular ${periodColorClass}`}>
              {periodChangePct >= 0 ? "▲ +" : "▼ "}
              {Math.abs(periodChangePct).toFixed(1)}%
              <span className="text-text-dim font-normal ml-1">({range})</span>
            </span>
          </div>
          {latestUnderlying && (
            <div className="text-[10px] text-text-dim mt-0.5">
              {underlyingLabel} {fmtPrice(latestUnderlying.price)}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 text-[10px] text-text-dim shrink-0">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-[2px]" style={{ backgroundColor: COLOR.amber }} />
            {label}(등락률)
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block w-3 h-0"
              style={{ borderTop: `2px dashed ${COLOR.purple}` }}
            />
            {underlyingLabel}(등락률)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: COLOR.blue + "aa" }} />
            거래대금
          </span>
        </div>
      </div>

      <div ref={containerRef} className="w-full h-[220px] md:h-[300px]" />

      {cascades.length > 0 ? (
        <p className="mt-2 text-[10px] text-text-dim leading-relaxed">
          <span style={{ color: COLOR.red }} className="font-semibold">
            ▼ 패닉셀 캐스케이드
          </span>{" "}
          — 하루 만에 {Math.abs(CASCADE_DROP_THRESHOLD_PCT)}% 이상 급락한 날. 2배 레버리지 상품 특성상
          반대매매·손절이 몰렸을 가능성이 높은 실물 증거입니다. 점선(본주)과 실선(ETF)의 등락률 차이가
          레버리지 증폭·괴리 정도입니다. 예측 신호가 아닌 과거 이벤트 표시입니다.
        </p>
      ) : (
        <p className="mt-2 text-[10px] text-text-dim leading-relaxed">
          이 구간엔 하루 {Math.abs(CASCADE_DROP_THRESHOLD_PCT)}% 이상 급락한 날이 없습니다.
        </p>
      )}
    </div>
  );
}
