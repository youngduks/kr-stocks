"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type HistogramData,
  type LineData,
  type Time,
} from "lightweight-charts";
import type { BuybackDaily } from "@/lib/buyback";
import { useTheme } from "./ThemeProvider";

type ChartColors = {
  green: string;
  amber: string;
  textMuted: string;
  grid: string;
  crosshair: string;
  bg: string;
  bgCard: string;
};

const COLOR_DARK: ChartColors = {
  green: "#1FAE6F",
  amber: "#F4A623",
  textMuted: "#8B95A1",
  grid: "rgba(139, 149, 161, 0.05)",
  crosshair: "rgba(139, 149, 161, 0.35)",
  bg: "#15181D",
  bgCard: "#1F232B",
};

const COLOR_LIGHT: ChartColors = {
  green: "#16A34A",
  amber: "#D97706",
  textMuted: "#4E5968",
  grid: "rgba(78, 89, 104, 0.08)",
  crosshair: "rgba(78, 89, 104, 0.35)",
  bg: "#FFFFFF",
  bgCard: "#F7F8FA",
};

function toEpoch(dateStr: string): number {
  return Math.floor(new Date(dateStr + "T00:00:00+09:00").getTime() / 1000);
}

function fmtQty(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 10_000) return `${(abs / 10_000).toFixed(0)}만주`;
  return `${abs.toLocaleString("ko-KR")}주`;
}

function kstDateFormatter(time: number): string {
  const d = new Date(time * 1000);
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit" }).format(d);
}

/**
 * 일별 체결량(막대, 우축) + 누적 체결량(초록 실선, 좌축) + 일정대로 갔을 때의 선형 페이스
 * (점선, 좌축) 비교 차트. 점선보다 실선이 위에 있으면 일정보다 빠른 페이스.
 */
export function BuybackChart({
  daily,
  periodStart,
  periodEnd,
  plannedQty,
}: {
  daily: BuybackDaily[];
  periodStart: string;
  periodEnd: string;
  plannedQty: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const barSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const cumSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const paceSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const { theme } = useTheme();
  const COLOR = useMemo(() => (theme === "light" ? COLOR_LIGHT : COLOR_DARK), [theme]);

  const rows = useMemo(() => {
    const startEpoch = toEpoch(periodStart);
    const endEpoch = toEpoch(periodEnd);
    const totalSpan = Math.max(endEpoch - startEpoch, 1);
    let cum = 0;
    return daily.map((d) => {
      cum += d.executed_qty;
      const t = toEpoch(d.date);
      const elapsed = Math.min(Math.max(t - startEpoch, 0), totalSpan);
      const pace = (elapsed / totalSpan) * plannedQty;
      return { time: t, executed: d.executed_qty, cum, pace };
    });
  }, [daily, periodStart, periodEnd, plannedQty]);

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
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.7, bottom: 0 } },
      leftPriceScale: { visible: true, borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.1 } },
      crosshair: {
        mode: 1,
        vertLine: { color: COLOR.crosshair, width: 1, style: LineStyle.Dotted, labelBackgroundColor: COLOR.bgCard },
        horzLine: { visible: false, labelVisible: false },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      localization: { locale: "ko-KR", timeFormatter: ((time: Time) => kstDateFormatter(time as number)) as any },
    });

    const barSeries = chart.addHistogramSeries({
      color: COLOR.amber + "77",
      priceScaleId: "right",
      priceFormat: { type: "custom", formatter: (p: number) => fmtQty(p), minMove: 1 },
    });

    const paceSeries = chart.addLineSeries({
      color: COLOR.textMuted,
      lineWidth: 2,
      priceScaleId: "left",
      lineStyle: LineStyle.Dashed,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: "custom", formatter: (p: number) => fmtQty(p), minMove: 1 },
    });

    const cumSeries = chart.addLineSeries({
      color: COLOR.green,
      lineWidth: 2,
      priceScaleId: "left",
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: COLOR.green,
      crosshairMarkerBackgroundColor: COLOR.bg,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: { type: "custom", formatter: (p: number) => fmtQty(p), minMove: 1 },
    });

    chartRef.current = chart;
    barSeriesRef.current = barSeries;
    cumSeriesRef.current = cumSeries;
    paceSeriesRef.current = paceSeries;

    barSeries.setData(rows.map((r) => ({ time: r.time as Time, value: r.executed, color: COLOR.amber + "77" })) as HistogramData<Time>[]);
    cumSeries.setData(rows.map((r) => ({ time: r.time as Time, value: r.cum })) as LineData<Time>[]);
    paceSeries.setData(rows.map((r) => ({ time: r.time as Time, value: r.pace })) as LineData<Time>[]);

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
      barSeriesRef.current = null;
      cumSeriesRef.current = null;
      paceSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    const chart = chartRef.current;
    const barSeries = barSeriesRef.current;
    const cumSeries = cumSeriesRef.current;
    const paceSeries = paceSeriesRef.current;
    if (!chart || !barSeries || !cumSeries || !paceSeries) return;
    barSeries.setData(rows.map((r) => ({ time: r.time as Time, value: r.executed, color: COLOR.amber + "77" })) as HistogramData<Time>[]);
    cumSeries.setData(rows.map((r) => ({ time: r.time as Time, value: r.cum })) as LineData<Time>[]);
    paceSeries.setData(rows.map((r) => ({ time: r.time as Time, value: r.pace })) as LineData<Time>[]);
    chart.timeScale().fitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  if (daily.length === 0) {
    return (
      <div className="rounded-2xl bg-bg-card border border-line/40 p-6 text-center">
        <div className="text-sm text-text-dim">바이백 데이터를 불러올 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-b from-bg-card to-bg-card/60 border border-line/40 p-4 md:p-5">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="text-[10px] text-text-dim font-semibold tracking-[0.12em] uppercase">
          일별 체결량 &amp; 누적
        </div>
        <div className="flex items-center gap-3 text-[10px] text-text-dim">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: COLOR.amber + "aa" }} />
            일별 체결(우축)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-[2px]" style={{ backgroundColor: COLOR.green }} />
            누적 체결(좌축)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-0" style={{ borderTop: `2px dashed ${COLOR.textMuted}` }} />
            일정대로면(좌축)
          </span>
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[220px] md:h-[280px]" />
      <p className="mt-2 text-[10px] text-text-dim leading-relaxed">
        점선(일정 페이스)보다 초록 실선(실제 누적)이 위에 있으면 일정보다 빠르게 진행 중이라는 뜻입니다.
      </p>
    </div>
  );
}
