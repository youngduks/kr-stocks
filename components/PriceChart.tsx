"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type AreaData,
  type Time,
} from "lightweight-charts";
import type { Candle } from "@/lib/fetchCandles";
import { useTheme } from "./ThemeProvider";

type Range = "1D" | "7D" | "1M";

export type PriceChartProps = {
  bars1H: Candle[];
  bars4H: Candle[];
  /** USD 단위 정규장 종가 (있으면 horizontal line overlay) */
  regularCloseUsd?: number | null;
  /** KRW 단위 정규장 종가 (한국 종목에서 KRW 차트일 때 사용) */
  regularCloseKrw?: number | null;
  /** 증권사 평균 목표가 (KRW) — 한국주식 3종만, purple horizontal line overlay */
  avgTargetKrw?: number | null;
  /** USDT/KRW 환율 — 한국 종목은 차트도 KRW 단위로 변환 */
  fxRate: number;
  /** 한국 종목 여부 — true면 KRW 차트 + KRW 종가 overlay */
  isKR: boolean;
  /** 표시 라벨 (예: "삼성전자") */
  name: string;
};

type ChartColors = {
  green: string; blue: string; amber: string; purple: string;
  textMuted: string; textDim: string; bg: string; bgCard: string;
  grid: string; crosshair: string; topGreen: string; topBlue: string;
};

const COLOR_DARK: ChartColors = {
  green: "#1FAE6F", blue: "#3182F6", amber: "#F4A623", purple: "#9D7DEC",
  textMuted: "#8B95A1", textDim: "#5C6370",
  bg: "#15181D", bgCard: "#1F232B",
  grid: "rgba(139, 149, 161, 0.05)",
  crosshair: "rgba(139, 149, 161, 0.35)",
  topGreen: "rgba(31, 174, 111, 0.28)",
  topBlue: "rgba(49, 130, 246, 0.28)",
};

const COLOR_LIGHT: ChartColors = {
  green: "#16A34A", blue: "#3182F6", amber: "#D97706", purple: "#7C3AED",
  textMuted: "#4E5968", textDim: "#8B95A1",
  bg: "#FFFFFF", bgCard: "#F7F8FA",
  grid: "rgba(78, 89, 104, 0.08)",
  crosshair: "rgba(78, 89, 104, 0.35)",
  topGreen: "rgba(22, 163, 74, 0.18)",
  topBlue: "rgba(49, 130, 246, 0.18)",
};

const RANGE_LABEL: Record<Range, string> = {
  "1D": "24시간",
  "7D": "7일",
  "1M": "1개월",
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

/** unix seconds → KST 시간축 라벨. tickMarkType: 0=Year, 1=Month, 2=DayOfMonth, 3=Time, 4=TimeWithSeconds */
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

export function PriceChart({ bars1H, bars4H, regularCloseUsd, regularCloseKrw, avgTargetKrw, fxRate, isKR, name }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const [range, setRange] = useState<Range>("7D");
  const { theme } = useTheme();
  const COLOR: ChartColors = useMemo(
    () => (theme === "light" ? COLOR_LIGHT : COLOR_DARK),
    [theme]
  );

  const display1H = useMemo(() => (isKR ? applyFx(bars1H, fxRate) : bars1H), [bars1H, isKR, fxRate]);
  const display4H = useMemo(() => (isKR ? applyFx(bars4H, fxRate) : bars4H), [bars4H, isKR, fxRate]);

  const getDisplayBars = (r: Range): Candle[] => {
    if (r === "1M") return display4H;
    if (r === "1D") return display1H.slice(-24);
    return display1H;
  };

  // range 기간 추세 (시작 close → 끝 close)
  const periodMeta = useMemo(() => {
    const bars = getDisplayBars(range);
    if (bars.length < 2) {
      return { changePct: 0, isUp: true, lineColor: COLOR.green, topColor: COLOR.topGreen };
    }
    const start = bars[0].close;
    const end = bars[bars.length - 1].close;
    const changePct = start > 0 ? ((end - start) / start) * 100 : 0;
    const isUp = changePct >= 0;
    return {
      changePct,
      isUp,
      lineColor: isUp ? COLOR.green : COLOR.blue,
      topColor: isUp ? COLOR.topGreen : COLOR.topBlue,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, display1H, display4H, COLOR]);

  const regularClose = isKR ? regularCloseKrw : regularCloseUsd;

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
      grid: {
        vertLines: { visible: false },
        horzLines: { color: COLOR.grid },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderVisible: false,
        // KST (UTC+9) — 한국 retail 직관 일치
        tickMarkFormatter: ((time: Time, tickMarkType: number) =>
          kstTickFormatter(time as number, tickMarkType)) as any,
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.15, bottom: 0.08 },
      },
      crosshair: {
        mode: 1, // Magnet — 마우스 위치 가까운 봉으로 snap
        vertLine: {
          color: COLOR.crosshair,
          width: 1,
          style: LineStyle.Dotted,
          labelBackgroundColor: COLOR.bgCard,
        },
        horzLine: {
          visible: false,
          labelVisible: false,
        },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      localization: {
        locale: "ko-KR",
        priceFormatter: (p: number) => formatPrice(p, isKR),
        timeFormatter: ((time: Time) => kstCrosshairFormatter(time as number)) as any,
      },
    });

    // priceLine 값들 수집 — autoscale에 포함시켜 차트 영역 안에 보이게 함
    const refLinePrices: number[] = [];
    if (regularClose != null && regularClose > 0) refLinePrices.push(regularClose);
    if (isKR && avgTargetKrw != null && avgTargetKrw > 0) refLinePrices.push(avgTargetKrw);

    const series = chart.addAreaSeries({
      lineColor: periodMeta.lineColor,
      topColor: periodMeta.topColor,
      bottomColor: periodMeta.lineColor + "00", // 투명
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBorderColor: periodMeta.lineColor,
      crosshairMarkerBackgroundColor: COLOR.bg,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: {
        type: "custom",
        formatter: (p: number) => formatPrice(p, isKR),
        minMove: isKR ? 1 : 0.01,
      },
      // 정규장 종가 + 평균목표가가 항상 차트 영역 안에 보이게 Y축 자동 확장
      autoscaleInfoProvider: (original: () => any) => {
        const res = original();
        if (!res || refLinePrices.length === 0) return res;
        const minRef = Math.min(...refLinePrices);
        const maxRef = Math.max(...refLinePrices);
        if (!res.priceRange) {
          return { ...res, priceRange: { minValue: minRef, maxValue: maxRef } };
        }
        return {
          ...res,
          priceRange: {
            minValue: Math.min(res.priceRange.minValue, minRef),
            maxValue: Math.max(res.priceRange.maxValue, maxRef),
          },
        };
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const bars = getDisplayBars(range);
    series.setData(
      bars.map((b) => ({ time: b.time as Time, value: b.close })) as AreaData<Time>[]
    );

    // 정규장 종가 horizontal line (amber 점선) — 사이트 USP
    if (regularClose != null && regularClose > 0) {
      series.createPriceLine({
        price: regularClose,
        color: COLOR.amber,
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "정규장",
      });
    }

    // 평균 목표가 horizontal line (purple 점선) — 한국주식 3종만
    // raoni/네이버/Yahoo 어디에도 없는 3in1 합성: 가격 + 정규장 + 평균목표가
    if (isKR && avgTargetKrw != null && avgTargetKrw > 0) {
      series.createPriceLine({
        price: avgTargetKrw,
        color: COLOR.purple,
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "평균목표",
      });
    }

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // theme 변경 시 chart 재생성 (lightweight-charts 색상은 한 번 set 후 변경 한계가 있어 단순 재생성)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // range 변경 시 데이터 + 색상 동시 교체 (추세 따라 line/area 색 자동 전환)
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    const bars = getDisplayBars(range);
    seriesRef.current.setData(
      bars.map((b) => ({ time: b.time as Time, value: b.close })) as AreaData<Time>[]
    );
    seriesRef.current.applyOptions({
      lineColor: periodMeta.lineColor,
      topColor: periodMeta.topColor,
      bottomColor: periodMeta.lineColor + "00",
      crosshairMarkerBorderColor: periodMeta.lineColor,
    });
    chartRef.current.timeScale().fitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, periodMeta.lineColor, periodMeta.topColor]);

  const hasData = bars1H.length > 0 || bars4H.length > 0;
  if (!hasData) {
    return (
      <div className="rounded-3xl bg-bg-card border border-line/40 p-6 text-center">
        <div className="text-sm text-text-dim">차트 데이터를 불러올 수 없습니다.</div>
      </div>
    );
  }

  const trendColorClass = periodMeta.isUp ? "text-accent-green" : "text-accent-blue";
  const trendArrow = periodMeta.isUp ? "▲" : "▼";

  return (
    <div className="rounded-3xl bg-gradient-to-b from-bg-card to-bg-card/60 border border-line/40 p-5 md:p-6">
      {/* 헤더: 기간 추세 + pill 토글 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-2 min-w-0">
          <div className="text-[10px] text-text-dim font-semibold tracking-[0.12em] uppercase">
            {RANGE_LABEL[range]} 추세
          </div>
          <div className={`text-sm font-bold tabular ${trendColorClass}`}>
            {trendArrow} {periodMeta.isUp ? "+" : ""}
            {periodMeta.changePct.toFixed(2)}%
          </div>
        </div>
        <div className="inline-flex bg-bg-hover/60 rounded-full p-0.5 shrink-0">
          {(["1D", "7D", "1M"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                range === r
                  ? "bg-text text-bg shadow-sm"
                  : "text-text-dim hover:text-text-muted"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 본체 */}
      <div ref={containerRef} className="w-full h-[260px] md:h-[340px]" />

      {/* 범례 (정규장 종가 + 평균 목표가) */}
      {(regularClose != null || (isKR && avgTargetKrw != null)) && (
        <div className="mt-3 flex flex-col gap-1.5 text-[11px] text-text-dim">
          {regularClose != null && (
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-[2px] bg-accent-amber" style={{ borderTop: "2px dashed" }} />
              <span>
                {isKR ? "한국" : "미국"} 정규장 종가 · {formatPrice(regularClose, isKR)}
              </span>
            </div>
          )}
          {isKR && avgTargetKrw != null && avgTargetKrw > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-[2px] bg-accent-purple" style={{ borderTop: "2px dashed" }} />
              <span>
                증권사 평균 목표가 · {formatPrice(avgTargetKrw, true)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
