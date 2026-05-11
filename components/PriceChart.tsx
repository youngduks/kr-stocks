"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, type IChartApi, type ISeriesApi, type CandlestickData, type Time, LineStyle } from "lightweight-charts";
import type { Candle } from "@/lib/fetchCandles";

type Range = "1D" | "7D" | "1M";

export type PriceChartProps = {
  bars1H: Candle[];
  bars4H: Candle[];
  /** USD 단위 정규장 종가 (있으면 horizontal line overlay) */
  regularCloseUsd?: number | null;
  /** KRW 단위 정규장 종가 (한국 종목에서 KRW 차트일 때 사용) */
  regularCloseKrw?: number | null;
  /** USDT/KRW 환율 — 한국 종목은 차트도 KRW 단위로 변환 */
  fxRate: number;
  /** 한국 종목 여부 — true면 KRW 차트 + KRW 종가 overlay */
  isKR: boolean;
  /** 표시 라벨 (예: "삼성전자") */
  name: string;
};

function applyFx(bars: Candle[], fx: number): Candle[] {
  return bars.map((b) => ({
    time: b.time,
    open: b.open * fx,
    high: b.high * fx,
    low: b.low * fx,
    close: b.close * fx,
  }));
}

function formatPrice(n: number, isKR: boolean): string {
  if (isKR) return "₩" + Math.round(n).toLocaleString("ko-KR");
  if (n >= 100) return "$" + n.toFixed(2);
  if (n >= 1) return "$" + n.toFixed(3);
  return "$" + n.toFixed(4);
}

export function PriceChart({ bars1H, bars4H, regularCloseUsd, regularCloseKrw, fxRate, isKR, name }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [range, setRange] = useState<Range>("7D");

  // KRW 차트로 변환 (한국 종목만)
  const display1H = isKR ? applyFx(bars1H, fxRate) : bars1H;
  const display4H = isKR ? applyFx(bars4H, fxRate) : bars4H;

  // 토글별 데이터 slice
  const getDisplayBars = (r: Range): Candle[] => {
    if (r === "1M") return display4H;
    if (r === "1D") return display1H.slice(-24); // 마지막 24개 (1시간 봉)
    return display1H; // 7D
  };

  // 정규장 종가 overlay 값
  const regularClose = isKR ? regularCloseKrw : regularCloseUsd;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.06)" },
        horzLines: { color: "rgba(148, 163, 184, 0.06)" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(148, 163, 184, 0.15)",
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.15)",
      },
      crosshair: {
        mode: 1, // Magnet
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      localization: {
        priceFormatter: (p: number) => formatPrice(p, isKR),
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#10b981",      // accent-green (상승)
      downColor: "#3b82f6",    // accent-blue (하락)
      wickUpColor: "#10b981",
      wickDownColor: "#3b82f6",
      borderUpColor: "#10b981",
      borderDownColor: "#3b82f6",
      priceFormat: {
        type: "custom",
        formatter: (p: number) => formatPrice(p, isKR),
        minMove: isKR ? 1 : 0.01,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const initial = getDisplayBars(range);
    series.setData(initial as CandlestickData<Time>[]);

    // 정규장 종가 horizontal line overlay
    if (regularClose != null && regularClose > 0) {
      series.createPriceLine({
        price: regularClose,
        color: "#f59e0b", // amber (한국 retail에게 익숙한 "기준선" 색)
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: isKR ? "정규장 종가" : "정규장",
      });
    }

    chart.timeScale().fitContent();

    const onResize = () => chart.applyOptions({ autoSize: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // range 변경 시 데이터만 교체 (차트 재생성 X)
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    seriesRef.current.setData(getDisplayBars(range) as CandlestickData<Time>[]);
    chartRef.current.timeScale().fitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // 데이터 자체가 비어있는 경우 fallback
  const hasData = bars1H.length > 0 || bars4H.length > 0;
  if (!hasData) {
    return (
      <div className="rounded-2xl bg-bg-card border border-line p-6 text-center">
        <div className="text-sm text-text-dim">차트 데이터를 불러올 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-bg-card border border-line p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-text-muted">{name} · 가격 차트</div>
        <div className="flex gap-1 text-xs">
          {(["1D", "7D", "1M"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                range === r
                  ? "bg-accent-blue/15 text-accent-blue"
                  : "bg-bg-hover/50 text-text-dim hover:text-text-muted"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[240px] md:h-[320px]" />
      {regularClose != null && (
        <div className="mt-2 text-[11px] text-text-dim leading-relaxed">
          <span className="inline-block w-3 h-[2px] bg-accent-amber mr-1.5 align-middle" /> 점선 = {isKR ? "한국" : "미국"} 정규장 종가 (
          {formatPrice(regularClose, isKR)})
        </div>
      )}
    </div>
  );
}
