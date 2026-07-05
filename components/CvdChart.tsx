"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type Time,
} from "lightweight-charts";
import type { CvdSet } from "@/lib/cvd";
import { useTheme } from "./ThemeProvider";

type Range = "1D" | "7D" | "1M";

export type CvdDataset = {
  symbol: string;
  label: string;
  set: CvdSet;
};

type ChartColors = {
  green: string;
  blue: string;
  amber: string;
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
  textMuted: "#4E5968",
  grid: "rgba(78, 89, 104, 0.08)",
  crosshair: "rgba(78, 89, 104, 0.35)",
  bg: "#FFFFFF",
  bgCard: "#F7F8FA",
};

const RANGE_LABEL: Record<Range, string> = { "1D": "24시간", "7D": "7일", "1M": "1개월" };

function fmtCvd(n: number): string {
  const abs = Math.abs(n);
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtPrice(n: number): string {
  if (n >= 100) return `$${n.toFixed(2)}`;
  if (n >= 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(4)}`;
}

function kstTickFormatter(time: number, tickMarkType: number): string {
  const d = new Date(time * 1000);
  const f = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour12: false, ...opts }).format(d);
  if (tickMarkType === 0) return f({ year: "numeric" });
  if (tickMarkType === 1) return f({ month: "short" });
  if (tickMarkType === 2) return f({ month: "numeric", day: "numeric" });
  if (tickMarkType === 3) return f({ hour: "2-digit", minute: "2-digit" });
  if (tickMarkType === 4) return f({ hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return f({ month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function kstCrosshairFormatter(time: number): string {
  const d = new Date(time * 1000);
  return (
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d) + " KST"
  );
}

/**
 * CVD(체결강도 누적) 차트 — 바이낸스 공개 klines의 taker buy/sell 분해로 직접 계산.
 * 청산맵(리퀴데이션 히트맵)은 유료 API 없이 재현 불가하지만, CVD는 무료로 정확히 계산 가능해
 * 청산맵의 대체 지표로 제공. 우상향 = 매수 체결 우세, 우하향 = 매도 체결 우세.
 */
export function CvdChart({ datasets }: { datasets: CvdDataset[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [range, setRange] = useState<Range>("7D");
  const { theme } = useTheme();
  const COLOR = useMemo(() => (theme === "light" ? COLOR_LIGHT : COLOR_DARK), [theme]);

  const active = datasets[tickerIdx];

  const getBars = (r: Range) => {
    if (!active) return [];
    if (r === "1M") return active.set.bars4H;
    if (r === "1D") return active.set.bars1H.slice(-24);
    return active.set.bars1H;
  };

  const trend = useMemo(() => {
    const bars = getBars(range);
    if (bars.length < 2) return { isUp: true, color: COLOR.green };
    const isUp = bars[bars.length - 1].cvd >= bars[0].cvd;
    return { isUp, color: isUp ? COLOR.green : COLOR.blue };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, tickerIdx, active, COLOR]);

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
        timeVisible: true,
        secondsVisible: false,
        borderVisible: false,
        tickMarkFormatter: ((time: Time, t: number) => kstTickFormatter(time as number, t)) as any,
      },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.15, bottom: 0.15 } },
      leftPriceScale: {
        visible: true,
        borderVisible: false,
        scaleMargins: { top: 0.15, bottom: 0.15 },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: COLOR.crosshair, width: 1, style: LineStyle.Dotted, labelBackgroundColor: COLOR.bgCard },
        horzLine: { visible: false, labelVisible: false },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      localization: {
        locale: "ko-KR",
        priceFormatter: (p: number) => fmtCvd(p),
        timeFormatter: ((time: Time) => kstCrosshairFormatter(time as number)) as any,
      },
    });

    // 0 기준선 — CVD 방향 전환 기준점
    const zeroLine = chart.addLineSeries({
      color: COLOR.textMuted,
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });

    const series = chart.addLineSeries({
      color: trend.color,
      lineWidth: 2,
      priceScaleId: "right",
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBorderColor: trend.color,
      crosshairMarkerBackgroundColor: COLOR.bg,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: { type: "custom", formatter: (p: number) => fmtCvd(p), minMove: 1 },
    });

    // 가격 오버레이 — 좌측 별도 축. CVD와 같이 봐야 다이버전스/컨펌이 눈에 보임.
    const priceSeries = chart.addLineSeries({
      color: COLOR.amber,
      lineWidth: 1,
      priceScaleId: "left",
      lineStyle: LineStyle.Solid,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: COLOR.amber,
      crosshairMarkerBackgroundColor: COLOR.bg,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: { type: "custom", formatter: (p: number) => fmtPrice(p), minMove: 0.01 },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    priceSeriesRef.current = priceSeries;

    const bars = getBars(range);
    series.setData(bars.map((b) => ({ time: b.time as Time, value: b.cvd })) as LineData<Time>[]);
    priceSeries.setData(bars.map((b) => ({ time: b.time as Time, value: b.price })) as LineData<Time>[]);
    if (bars.length > 0) {
      zeroLine.setData([
        { time: bars[0].time as Time, value: 0 },
        { time: bars[bars.length - 1].time as Time, value: 0 },
      ] as LineData<Time>[]);
    }

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !priceSeriesRef.current) return;
    const bars = getBars(range);
    seriesRef.current.setData(bars.map((b) => ({ time: b.time as Time, value: b.cvd })) as LineData<Time>[]);
    seriesRef.current.applyOptions({ color: trend.color, crosshairMarkerBorderColor: trend.color });
    priceSeriesRef.current.setData(bars.map((b) => ({ time: b.time as Time, value: b.price })) as LineData<Time>[]);
    chartRef.current.timeScale().fitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, tickerIdx, trend.color]);

  if (!active || datasets.length === 0) {
    return (
      <div className="rounded-2xl bg-bg-card border border-line/40 p-6 text-center">
        <div className="text-sm text-text-dim">CVD 데이터를 불러올 수 없습니다.</div>
      </div>
    );
  }

  const trendColorClass = trend.isUp ? "text-accent-green" : "text-accent-blue";
  const trendArrow = trend.isUp ? "▲ 매수 우세" : "▼ 매도 우세";

  return (
    <div className="rounded-2xl bg-gradient-to-b from-bg-card to-bg-card/60 border border-line/40 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="inline-flex bg-bg-hover/60 rounded-full p-0.5 shrink-0">
          {datasets.map((d, i) => (
            <button
              key={d.symbol}
              onClick={() => setTickerIdx(i)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                tickerIdx === i ? "bg-text text-bg shadow-sm" : "text-text-dim hover:text-text-muted"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="inline-flex bg-bg-hover/60 rounded-full p-0.5 shrink-0">
          {(["1D", "7D", "1M"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                range === r ? "bg-text text-bg shadow-sm" : "text-text-dim hover:text-text-muted"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-baseline gap-2">
          <div className="text-[10px] text-text-dim font-semibold tracking-[0.12em] uppercase">
            {RANGE_LABEL[range]} 체결강도 누적(CVD)
          </div>
          <div className={`text-xs font-bold tabular ${trendColorClass}`}>{trendArrow}</div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-text-dim">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-[2px]" style={{ backgroundColor: COLOR.amber }} />
            가격(좌축)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className={`inline-block w-3 h-[2px] ${trend.isUp ? "bg-accent-green" : "bg-accent-blue"}`} />
            CVD(우축)
          </span>
        </div>
      </div>

      <div ref={containerRef} className="w-full h-[220px] md:h-[300px]" />
    </div>
  );
}
