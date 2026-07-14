"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import type { OiPoint, OiSet } from "@/lib/openInterest";
import { useTheme } from "./ThemeProvider";

type Range = "1D" | "7D" | "1M";

export type OiDataset = {
  symbol: string;
  label: string;
  set: OiSet;
};

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

const RANGE_LABEL: Record<Range, string> = { "1D": "24시간", "7D": "7일", "1M": "1개월" };

// 한 봉 안에서 이 이상 급락하면 "청산 캐스케이드" 후보로 간주 (1h/4h 봉 공용 임계치)
const CASCADE_DROP_THRESHOLD_PCT = -3;

function fmtOi(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(0)}K`;
  return `$${abs.toFixed(0)}`;
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

type CascadeEvent = { time: number; dropPct: number };

/**
 * 청산 캐스케이드 후보 탐지 — 한 봉 안에서 OI가 급락한 지점.
 * 레버리지 포지션이 대량 강제청산되면 미결제약정이 급격히 빠짐 → "레버리지가 터진" 흔적.
 * 하락폭 기준 상위 N개만 표시 (노이즈성 소폭 감소는 제외).
 */
function findCascades(bars: OiPoint[], maxEvents = 3): CascadeEvent[] {
  if (bars.length < 2) return [];
  const events: CascadeEvent[] = [];
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1].oiUsd;
    const cur = bars[i].oiUsd;
    if (!(prev > 0) || !Number.isFinite(cur)) continue;
    const changePct = ((cur - prev) / prev) * 100;
    if (changePct <= CASCADE_DROP_THRESHOLD_PCT) {
      events.push({ time: bars[i].time, dropPct: changePct });
    }
  }
  events.sort((a, b) => a.dropPct - b.dropPct);
  return events.slice(0, maxEvents);
}

/**
 * 레버리지 TVL(미결제약정) 차트 — 바이낸스 공개 openInterestHist로 직접 계산.
 * OI 상승 = 레버리지 쌓이는 중, OI 급락 = 청산 캐스케이드 발생(레버리지가 "터진" 직후).
 * 급락 직후는 매도/매수 압력이 소진된 구간이라 반등·눌림 후보로 보는 경우가 많음 — 차트에 마킹.
 */
export function OpenInterestChart({ datasets }: { datasets: OiDataset[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const oiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [range, setRange] = useState<Range>("7D");
  const { theme } = useTheme();
  const COLOR = useMemo(() => (theme === "light" ? COLOR_LIGHT : COLOR_DARK), [theme]);

  const safeIdx = Math.min(tickerIdx, Math.max(datasets.length - 1, 0));
  const active = datasets[safeIdx];
  const has1H = (active?.set.bars1H.length ?? 0) > 0;
  const has4H = (active?.set.bars4H.length ?? 0) > 0;
  const rangeAvailable: Record<Range, boolean> = { "1D": has1H, "7D": has1H, "1M": has4H };
  const shownRange: Range = rangeAvailable[range] ? range : has1H ? "7D" : "1M";

  const bars = useMemo(() => {
    if (!active) return [];
    if (shownRange === "1M") return active.set.bars4H;
    if (shownRange === "1D") return active.set.bars1H.slice(-24);
    return active.set.bars1H;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownRange, safeIdx, datasets]);

  const trend = useMemo(() => {
    if (bars.length < 2) return { isUp: true, color: COLOR.green, changePct: 0 };
    const first = bars[0].oiUsd;
    const last = bars[bars.length - 1].oiUsd;
    const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
    return { isUp: changePct >= 0, color: changePct >= 0 ? COLOR.green : COLOR.blue, changePct };
  }, [bars, COLOR]);

  const cascades = useMemo(() => findCascades(bars), [bars]);
  const currentOi = bars.length > 0 ? bars[bars.length - 1].oiUsd : null;

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
      leftPriceScale: { visible: true, borderVisible: false, scaleMargins: { top: 0.15, bottom: 0.15 } },
      crosshair: {
        mode: 1,
        vertLine: { color: COLOR.crosshair, width: 1, style: LineStyle.Dotted, labelBackgroundColor: COLOR.bgCard },
        horzLine: { visible: false, labelVisible: false },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      localization: {
        locale: "ko-KR",
        priceFormatter: (p: number) => fmtOi(p),
        timeFormatter: ((time: Time) => kstCrosshairFormatter(time as number)) as any,
      },
    });

    const oiSeries = chart.addLineSeries({
      color: trend.color,
      lineWidth: 2,
      priceScaleId: "right",
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBorderColor: trend.color,
      crosshairMarkerBackgroundColor: COLOR.bg,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: { type: "custom", formatter: (p: number) => fmtOi(p), minMove: 1 },
    });

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
    oiSeriesRef.current = oiSeries;
    priceSeriesRef.current = priceSeries;

    oiSeries.setData(bars.map((b) => ({ time: b.time as Time, value: b.oiUsd })) as LineData<Time>[]);
    priceSeries.setData(bars.map((b) => ({ time: b.time as Time, value: b.price })) as LineData<Time>[]);
    priceSeries.setMarkers(
      cascades.map(
        (c): SeriesMarker<Time> => ({
          time: c.time as Time,
          position: "aboveBar",
          color: COLOR.red,
          shape: "arrowDown",
          text: `청산 ${c.dropPct.toFixed(0)}%`,
        })
      )
    );

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
      oiSeriesRef.current = null;
      priceSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    const chart = chartRef.current;
    const oiSeries = oiSeriesRef.current;
    const priceSeries = priceSeriesRef.current;
    if (!chart || !oiSeries || !priceSeries) return;
    oiSeries.setData(bars.map((b) => ({ time: b.time as Time, value: b.oiUsd })) as LineData<Time>[]);
    oiSeries.applyOptions({ color: trend.color, crosshairMarkerBorderColor: trend.color });
    priceSeries.setData(bars.map((b) => ({ time: b.time as Time, value: b.price })) as LineData<Time>[]);
    priceSeries.setMarkers(
      cascades.map(
        (c): SeriesMarker<Time> => ({
          time: c.time as Time,
          position: "aboveBar",
          color: COLOR.red,
          shape: "arrowDown",
          text: `청산 ${c.dropPct.toFixed(0)}%`,
        })
      )
    );
    chart.timeScale().fitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, trend.color, cascades]);

  if (!active || datasets.length === 0) {
    return (
      <div className="rounded-2xl bg-bg-card border border-line/40 p-6 text-center">
        <div className="text-sm text-text-dim">레버리지 TVL 데이터를 불러올 수 없습니다.</div>
      </div>
    );
  }

  const trendColorClass = trend.isUp ? "text-accent-green" : "text-accent-blue";

  return (
    <div className="rounded-2xl bg-gradient-to-b from-bg-card to-bg-card/60 border border-line/40 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="inline-flex bg-bg-hover/60 rounded-full p-0.5 shrink-0">
          {datasets.map((d, i) => (
            <button
              key={d.symbol}
              onClick={() => setTickerIdx(i)}
              aria-pressed={safeIdx === i}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                safeIdx === i ? "bg-text text-bg shadow-sm" : "text-text-dim hover:text-text-muted"
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
              disabled={!rangeAvailable[r]}
              aria-pressed={shownRange === r}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                shownRange === r ? "bg-text text-bg shadow-sm" : "text-text-dim hover:text-text-muted"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap">
          <div className="text-[10px] text-text-dim font-semibold tracking-[0.12em] uppercase">
            {RANGE_LABEL[shownRange]} 레버리지 TVL(미결제약정)
          </div>
          <div className={`text-xs font-bold tabular ${trendColorClass}`}>
            {trend.changePct >= 0 ? "▲ +" : "▼ "}
            {Math.abs(trend.changePct).toFixed(1)}%
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-text-dim">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-[2px]" style={{ backgroundColor: COLOR.amber }} />
            가격(좌축)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className={`inline-block w-3 h-[2px] ${trend.isUp ? "bg-accent-green" : "bg-accent-blue"}`} />
            TVL(우축)
          </span>
        </div>
      </div>

      {currentOi != null && (
        <div className="text-xs text-text-muted mb-2">
          현재 레버리지 TVL <span className="font-bold text-text tabular">{fmtOi(currentOi)}</span>
        </div>
      )}

      <div ref={containerRef} className="w-full h-[220px] md:h-[300px]" />

      {cascades.length > 0 ? (
        <p className="mt-2 text-[10px] text-text-dim leading-relaxed">
          <span style={{ color: COLOR.red }} className="font-semibold">
            ▼ 청산 캐스케이드
          </span>{" "}
          — 미결제약정이 한 봉 안에 {Math.abs(CASCADE_DROP_THRESHOLD_PCT)}% 이상 급락한 지점. 레버리지 포지션이
          대량 강제청산됐다는 흔적으로, 직후 가격 움직임을 눈여겨보는 경우가 많습니다. 예측 신호가 아닌
          과거 이벤트 표시입니다.
        </p>
      ) : (
        <p className="mt-2 text-[10px] text-text-dim leading-relaxed">
          이 구간엔 뚜렷한 청산 캐스케이드가 감지되지 않았습니다 (한 봉 {Math.abs(CASCADE_DROP_THRESHOLD_PCT)}%
          이상 급락 기준).
        </p>
      )}
    </div>
  );
}
