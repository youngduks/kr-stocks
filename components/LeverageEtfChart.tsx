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

type ChartColors = {
  green: string;
  blue: string;
  amber: string;
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

/**
 * SK하이닉스 레버리지 ETF(KODEX, 코스피 실상장 2배 상품) 차트.
 * 가격(좌축) + 거래대금(우축, 히스토그램)을 같이 표시. 하루 급락(-15%↓)한 날은
 * 반대매매·패닉셀이 몰렸을 실물 증거로 보고 빨간 마커로 표시 — 다음날 반등 여부를
 * 눈으로 직접 확인하는 용도.
 */
export function LeverageEtfChart({ bars: allBars, label }: { bars: LeverageBar[]; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [range, setRange] = useState<Range>("1M");
  const { theme } = useTheme();
  const COLOR = useMemo(() => (theme === "light" ? COLOR_LIGHT : COLOR_DARK), [theme]);

  const bars = useMemo(() => allBars.slice(-RANGE_DAYS[range]), [allBars, range]);
  const cascades = useMemo(() => findCascades(bars), [bars]);

  const latest = bars.length > 0 ? bars[bars.length - 1] : null;
  const periodChangePct = useMemo(() => {
    if (bars.length < 2) return 0;
    const first = bars[0].price;
    const last = bars[bars.length - 1].price;
    return first > 0 ? ((last - first) / first) * 100 : 0;
  }, [bars]);

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
      localization: {
        locale: "ko-KR",
        priceFormatter: (p: number) => fmtPrice(p),
        timeFormatter: ((time: Time) => kstDateFormatter(time as number)) as any,
      },
    });

    const volSeries = chart.addHistogramSeries({
      color: COLOR.blue + "55",
      priceScaleId: "right",
      priceFormat: { type: "custom", formatter: (p: number) => fmtKrw(p), minMove: 1 },
    });

    const priceSeries = chart.addLineSeries({
      color: COLOR.amber,
      lineWidth: 2,
      priceScaleId: "left",
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: COLOR.amber,
      crosshairMarkerBackgroundColor: COLOR.bg,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: { type: "custom", formatter: (p: number) => fmtPrice(p), minMove: 1 },
    });

    chartRef.current = chart;
    priceSeriesRef.current = priceSeries;
    volSeriesRef.current = volSeries;

    priceSeries.setData(bars.map((b) => ({ time: b.time as Time, value: b.price })) as LineData<Time>[]);
    volSeries.setData(
      bars.map((b) => ({
        time: b.time as Time,
        value: b.tradingValueKrw,
        color: b.changePct >= 0 ? COLOR.green + "55" : COLOR.blue + "55",
      })) as HistogramData<Time>[]
    );
    priceSeries.setMarkers(
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
      priceSeriesRef.current = null;
      volSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    const chart = chartRef.current;
    const priceSeries = priceSeriesRef.current;
    const volSeries = volSeriesRef.current;
    if (!chart || !priceSeries || !volSeries) return;
    priceSeries.setData(bars.map((b) => ({ time: b.time as Time, value: b.price })) as LineData<Time>[]);
    volSeries.setData(
      bars.map((b) => ({
        time: b.time as Time,
        value: b.tradingValueKrw,
        color: b.changePct >= 0 ? COLOR.green + "55" : COLOR.blue + "55",
      })) as HistogramData<Time>[]
    );
    priceSeries.setMarkers(
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
  }, [bars, cascades]);

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

      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-baseline gap-2">
          {latest && (
            <span className="text-lg font-bold tabular text-text">{fmtPrice(latest.price)}</span>
          )}
          <span className={`text-xs font-bold tabular ${periodColorClass}`}>
            {periodChangePct >= 0 ? "▲ +" : "▼ "}
            {Math.abs(periodChangePct).toFixed(1)}%
            <span className="text-text-dim font-normal ml-1">({range})</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-text-dim">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-[2px]" style={{ backgroundColor: COLOR.amber }} />
            가격(좌축)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: COLOR.blue + "aa" }} />
            거래대금(우축)
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
          반대매매·손절이 몰렸을 가능성이 높은 실물 증거입니다. 표시 지점 직후 가격 움직임을 눈여겨보세요.
          예측 신호가 아닌 과거 이벤트 표시입니다.
        </p>
      ) : (
        <p className="mt-2 text-[10px] text-text-dim leading-relaxed">
          이 구간엔 하루 {Math.abs(CASCADE_DROP_THRESHOLD_PCT)}% 이상 급락한 날이 없습니다.
        </p>
      )}
    </div>
  );
}
