// 미장 반도체 야간 시그널 카드 — 홈 최상단 배치.
// SOXL(반도체 3배 레버리지) 지난밤 움직임 → 삼성·하이닉스 내일 방향 선행 읽기.
// 색상 규칙: 상승 = accent-green, 하락 = accent-blue (사이트 공통 컨벤션).

import Link from "next/link";
import type { SemiSignal } from "@/lib/semiSignal";
import type { Locale } from "./HomeHero";

const I18N = {
  ko: {
    title: "🔌 미장 반도체 야간 시그널",
    sub: "SOXL(반도체 3배 레버리지)로 미리 보는 내일 삼성·하이닉스",
    soxl: "SOXL 3x",
    impliedLabel: "미국 반도체 지수 추정",
    impliedHint: "(SOXL ÷ 3)",
    nvda: "엔비디아",
    verdictPrefix: "삼성·하이닉스 내일",
    live: "미국장 실시간",
    closed: "지난 미국장 종가 기준",
    unavailable: "반도체 시세를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.",
    disclaimer:
      "SOXL은 미국 반도체 지수를 3배 추종. 미국 정규장(한국 야간)의 반도체 움직임은 다음 날 삼성전자·SK하이닉스 방향과 상관관계가 높지만, 환율·수급·개별 이슈로 달라질 수 있습니다.",
    verdicts: {
      strong_up: "강한 상승 압력",
      up: "상승 압력",
      flat: "보합 — 뚜렷한 방향 없음",
      down: "하락 압력",
      strong_down: "강한 하락 압력",
      unknown: "데이터 부족",
    },
  },
  en: {
    title: "🔌 US Semiconductor Overnight Signal",
    sub: "SOXL (3x semis) as a preview of tomorrow's Samsung & Hynix",
    soxl: "SOXL 3x",
    impliedLabel: "Implied semi index",
    impliedHint: "(SOXL ÷ 3)",
    nvda: "NVIDIA",
    verdictPrefix: "Samsung & Hynix tomorrow:",
    live: "US market live",
    closed: "Last US close",
    unavailable: "Couldn't load semiconductor prices. Please check back shortly.",
    disclaimer:
      "SOXL tracks the US semiconductor index at 3x. Overnight US semi moves correlate with next-day Samsung/Hynix direction, but FX, flows, and idiosyncratic news can diverge.",
    verdicts: {
      strong_up: "Strong upward pressure",
      up: "Upward pressure",
      flat: "Flat — no clear direction",
      down: "Downward pressure",
      strong_down: "Strong downward pressure",
      unknown: "Insufficient data",
    },
  },
} as const;

function pctColor(v: number | null | undefined): string {
  if (v == null || Math.abs(v) < 0.01) return "text-text-muted";
  return v > 0 ? "text-accent-green" : "text-accent-blue";
}

function arrow(v: number | null | undefined): string {
  if (v == null || Math.abs(v) < 0.01) return "";
  return v > 0 ? "▲" : "▼";
}

function fmtPct(v: number | null | undefined, digits = 2): string {
  if (v == null) return "—";
  const s = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${s}${Math.abs(v).toFixed(digits)}%`;
}

export function SemiconductorSignal({
  signal,
  locale = "ko",
}: {
  signal: SemiSignal;
  locale?: Locale;
}) {
  const t = I18N[locale];
  const { soxl, nvda, impliedSemiPct, direction, isLive } = signal;

  const verdictColor =
    direction === "strong_up" || direction === "up"
      ? "text-accent-green"
      : direction === "strong_down" || direction === "down"
      ? "text-accent-blue"
      : "text-text-muted";

  const verdictArrow =
    direction === "strong_up" || direction === "up"
      ? "▲"
      : direction === "strong_down" || direction === "down"
      ? "▼"
      : "—";

  return (
    <section className="mb-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-accent-blue/10 via-accent-purple/5 to-accent-green/10 border border-line">
      <div className="flex items-start justify-between gap-2 flex-wrap mb-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-text">{t.title}</h2>
          <div className="text-[10px] sm:text-[11px] text-text-dim mt-0.5">{t.sub}</div>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold shrink-0 ${
            isLive ? "text-accent-green" : "text-text-dim"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLive ? "bg-accent-green animate-pulse-soft" : "bg-text-dim/50"
            }`}
          />
          {isLive ? t.live : t.closed}
        </span>
      </div>

      {!soxl ? (
        <p className="text-sm text-text-dim">{t.unavailable}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* SOXL 3x — 메인 */}
            <div className="p-3 sm:p-4 rounded-xl bg-bg-card/70 border border-line/60">
              <div className="text-[10px] sm:text-[11px] text-text-dim font-semibold">{t.soxl}</div>
              <div className={`text-xl sm:text-3xl font-bold tabular mt-1 ${pctColor(soxl.changePct)}`}>
                {arrow(soxl.changePct)} {fmtPct(soxl.changePct)}
              </div>
              <div className="text-[10px] sm:text-[11px] text-text-dim tabular mt-1">
                ${soxl.price.toFixed(2)}
              </div>
            </div>

            {/* 미국 반도체 지수 추정 (SOXL ÷ 3) */}
            <div className="p-3 sm:p-4 rounded-xl bg-bg-card/70 border border-line/60">
              <div className="text-[10px] sm:text-[11px] text-text-dim font-semibold">
                {t.impliedLabel} <span className="text-text-dim/60">{t.impliedHint}</span>
              </div>
              <div className={`text-xl sm:text-3xl font-bold tabular mt-1 ${pctColor(impliedSemiPct)}`}>
                {arrow(impliedSemiPct)} {fmtPct(impliedSemiPct)}
              </div>
              <div className="text-[10px] sm:text-[11px] text-text-dim mt-1">
                {t.impliedLabel === "Implied semi index" ? "actual sector move" : "실제 섹터 등락"}
              </div>
            </div>

            {/* NVDA 대장주 context */}
            <div className="p-3 sm:p-4 rounded-xl bg-bg-card/70 border border-line/60 col-span-2 sm:col-span-1">
              <div className="text-[10px] sm:text-[11px] text-text-dim font-semibold">{t.nvda}</div>
              <div className={`text-xl sm:text-3xl font-bold tabular mt-1 ${pctColor(nvda?.changePct)}`}>
                {nvda ? (
                  <>
                    {arrow(nvda.changePct)} {fmtPct(nvda.changePct)}
                  </>
                ) : (
                  "—"
                )}
              </div>
              {nvda && (
                <div className="text-[10px] sm:text-[11px] text-text-dim tabular mt-1">
                  ${nvda.price.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* 판정 라인 — 삼성·하이닉스 내일 압력 */}
          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap p-3 rounded-xl bg-bg-card/40 border border-line/50">
            <div className="text-sm sm:text-base">
              <span className="text-text-muted">{t.verdictPrefix} </span>
              <span className={`font-bold ${verdictColor}`}>
                {verdictArrow} {t.verdicts[direction]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] sm:text-xs">
              <Link
                href={"/korea/samsung" as any}
                className="px-2.5 py-1 rounded-md bg-bg-card border border-line text-text-dim hover:text-text hover:border-accent-blue/40 transition font-semibold whitespace-nowrap"
              >
                삼성전자 →
              </Link>
              <Link
                href={"/korea/hynix" as any}
                className="px-2.5 py-1 rounded-md bg-bg-card border border-line text-text-dim hover:text-text hover:border-accent-blue/40 transition font-semibold whitespace-nowrap"
              >
                SK하이닉스 →
              </Link>
            </div>
          </div>
        </>
      )}

      <p className="mt-4 text-[10px] sm:text-[11px] text-text-dim leading-relaxed">{t.disclaimer}</p>
    </section>
  );
}
