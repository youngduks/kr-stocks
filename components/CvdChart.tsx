"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type LineData,
  type Time,
} from "lightweight-charts";
import type { CvdPoint, CvdSet } from "@/lib/cvd";
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
  purple: string;
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
 * 표시 구간 시작을 0으로 재기준.
 * lib/cvd의 누적은 fetch 윈도우(7일/30일) 시작 기준이라, 1D처럼 슬라이스한 구간은
 * 앞 6일치 누적이 오프셋으로 얹혀 0 기준선이 무의미해지고 Y축도 눌려버림.
 * 재기준 후에는 모든 구간에서 "0 위 = 구간 순매수, 0 아래 = 구간 순매도"로 읽힘.
 * 전체 윈도우(7D/1M)는 base가 정확히 0이라 원본 그대로 반환.
 */
function rebaseCvd(src: CvdPoint[]): CvdPoint[] {
  if (src.length === 0) return src;
  const base = src[0].cvd - (src[0].buyQuote - src[0].sellQuote);
  if (base === 0) return src;
  return src.map((b) => ({ ...b, cvd: b.cvd - base }));
}

/**
 * 지지선 탐지 — 스윙 로우(좌우 K개 봉보다 낮은 저점) 클러스터링.
 * 근접한 저점(0.6% 이내)을 하나로 묶고, 터치 횟수(강도) 내림차순으로 상위 N개 반환.
 * 정식 피봇/피보나치 분석이 아닌 단순 저점 빈도 기반 — 참고용.
 */
function findSupportLevels(bars: CvdPoint[], maxLevels = 2): number[] {
  const K = 2;
  if (bars.length < K * 2 + 3) return [];
  const swingLows: number[] = [];
  for (let i = K; i < bars.length - K; i++) {
    const p = bars[i].price;
    if (!Number.isFinite(p) || p <= 0) continue;
    let isLow = true;
    for (let j = i - K; j <= i + K; j++) {
      if (j !== i && bars[j].price < p) {
        isLow = false;
        break;
      }
    }
    if (isLow) swingLows.push(p);
  }
  if (swingLows.length === 0) return [];

  swingLows.sort((a, b) => a - b);
  const clusters: { level: number; count: number }[] = [];
  for (const p of swingLows) {
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(p - last.level) / last.level < 0.006) {
      last.level = (last.level * last.count + p) / (last.count + 1);
      last.count += 1;
    } else {
      clusters.push({ level: p, count: 1 });
    }
  }
  clusters.sort((a, b) => b.count - a.count || a.level - b.level);
  return clusters.slice(0, maxLevels).map((c) => c.level);
}

function drawSupportLines(series: ISeriesApi<"Line">, levels: number[], color: string): IPriceLine[] {
  return levels.map((level) =>
    series.createPriceLine({
      price: level,
      color,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "지지선",
    })
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
  const supportLinesRef = useRef<IPriceLine[]>([]);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [range, setRange] = useState<Range>("7D");
  const { theme } = useTheme();
  const COLOR = useMemo(() => (theme === "light" ? COLOR_LIGHT : COLOR_DARK), [theme]);

  // datasets가 서버 재검증으로 줄어도 인덱스가 범위를 벗어나지 않게 clamp
  const safeIdx = Math.min(tickerIdx, Math.max(datasets.length - 1, 0));
  const active = datasets[safeIdx];
  const has1H = (active?.set.bars1H.length ?? 0) > 0;
  const has4H = (active?.set.bars4H.length ?? 0) > 0;
  const rangeAvailable: Record<Range, boolean> = { "1D": has1H, "7D": has1H, "1M": has4H };
  // 한쪽 interval fetch만 실패한 종목에서 빈 차트가 뜨지 않게 가용 구간으로 스냅
  const shownRange: Range = rangeAvailable[range] ? range : has1H ? "7D" : "1M";

  const bars = useMemo(() => {
    if (!active) return [];
    if (shownRange === "1M") return rebaseCvd(active.set.bars4H);
    if (shownRange === "1D") return rebaseCvd(active.set.bars1H.slice(-24));
    return rebaseCvd(active.set.bars1H);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownRange, safeIdx, datasets]);

  const trend = useMemo(() => {
    if (bars.length < 2) return { isUp: true, color: COLOR.green };
    const isUp = bars[bars.length - 1].cvd >= bars[0].cvd;
    return { isUp, color: isUp ? COLOR.green : COLOR.blue };
  }, [bars, COLOR]);

  // 빗썸식 상승/하락 비율 — 실제 체결된 매수·매도 금액(USDT) 비중. 예측이 아니라 실측 체결 비율.
  // 라벨은 한쪽만 반올림 후 나머지를 100에서 빼서 합이 항상 100%가 되게 함
  const ratio = useMemo(() => {
    let buy = 0;
    let sell = 0;
    for (const b of bars) {
      buy += b.buyQuote;
      sell += b.sellQuote;
    }
    const total = buy + sell;
    const upPct = total > 0 ? (buy / total) * 100 : 50;
    const upLabel = Math.round(upPct);
    return { upPct, downPct: 100 - upPct, upLabel, downLabel: 100 - upLabel };
  }, [bars]);

  // 렌더 시점에 계산 — ref 변이는 리렌더를 안 일으켜서 캡션 표시 여부를 ref로 판단하면 첫 렌더에 안 보임
  const supportLevels = useMemo(() => findSupportLevels(bars), [bars]);

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
      // 0 기준선이 항상 차트 영역 안에 보이게 Y축 자동 확장 (PriceChart의 refLine 패턴)
      autoscaleInfoProvider: (original: () => any) => {
        const res = original();
        if (!res?.priceRange) return res;
        return {
          ...res,
          priceRange: {
            minValue: Math.min(res.priceRange.minValue, 0),
            maxValue: Math.max(res.priceRange.maxValue, 0),
          },
        };
      },
    });

    // 0 기준선 — 구간 순매수/순매도 전환점. priceLine이라 range 전환과 무관하게 전체 폭 유지.
    series.createPriceLine({
      price: 0,
      color: COLOR.textMuted,
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
      title: "",
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

    series.setData(bars.map((b) => ({ time: b.time as Time, value: b.cvd })) as LineData<Time>[]);
    priceSeries.setData(bars.map((b) => ({ time: b.time as Time, value: b.price })) as LineData<Time>[]);
    supportLinesRef.current = drawSupportLines(priceSeries, supportLevels, COLOR.purple);

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceSeriesRef.current = null;
      supportLinesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    const priceSeries = priceSeriesRef.current;
    if (!chart || !series || !priceSeries) return;
    series.setData(bars.map((b) => ({ time: b.time as Time, value: b.cvd })) as LineData<Time>[]);
    series.applyOptions({ color: trend.color, crosshairMarkerBorderColor: trend.color });
    priceSeries.setData(bars.map((b) => ({ time: b.time as Time, value: b.price })) as LineData<Time>[]);

    for (const line of supportLinesRef.current) priceSeries.removePriceLine(line);
    supportLinesRef.current = drawSupportLines(priceSeries, supportLevels, COLOR.purple);

    chart.timeScale().fitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, trend.color]);

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
        <div className="flex items-baseline gap-2">
          <div className="text-[10px] text-text-dim font-semibold tracking-[0.12em] uppercase">
            {RANGE_LABEL[shownRange]} 체결강도 누적(CVD)
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

      {/* 빗썸식 상승/하락 비율 — 이 구간 실제 체결된 매수·매도 금액 비중 (예측이 아닌 실측) */}
      <div className="text-[9px] text-text-dim mb-1">
        {RANGE_LABEL[shownRange]} 매수·매도 체결 비중 (실측, 예측 아님)
      </div>
      <div className="flex items-center gap-2 mb-3 text-[11px] font-bold tabular">
        <span className="text-accent-green shrink-0">상승 {ratio.upLabel}%</span>
        <div className="relative flex-1 h-2 bg-line/40 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-accent-green transition-all"
            style={{ width: `${ratio.upPct}%` }}
          />
          <div
            className="absolute right-0 top-0 h-full bg-accent-blue transition-all"
            style={{ width: `${ratio.downPct}%` }}
          />
        </div>
        <span className="text-accent-blue shrink-0">하락 {ratio.downLabel}%</span>
      </div>

      <div ref={containerRef} className="w-full h-[220px] md:h-[300px]" />
      {supportLevels.length > 0 && (
        <p className="mt-2 text-[10px] text-text-dim leading-relaxed">
          <span style={{ color: COLOR.purple }} className="font-semibold">
            ┈┈ 지지선
          </span>{" "}
          — 최근 구간 저점이 반복적으로 나온 가격대 (단순 저점 빈도 기반, 매매 신호 아님)
        </p>
      )}
    </div>
  );
}
