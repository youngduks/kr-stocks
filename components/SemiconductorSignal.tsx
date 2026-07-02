// 미장 반도체 야간 시그널 — 한 줄 바(bar) 형태.
// SOXL(반도체 3배 레버리지) 지난밤 움직임 → 삼성·하이닉스 내일 방향 선행 읽기.
// 색상 규칙: 상승 = accent-green, 하락 = accent-blue (사이트 공통 컨벤션).

import type { SemiSignal } from "@/lib/semiSignal";
import type { Locale } from "./HomeHero";

const I18N = {
  ko: {
    label: "🔌 반도체 야간",
    soxl: "SOXL",
    implied: "반도체지수",
    nvda: "NVDA",
    verdictPrefix: "내일 압력",
    live: "미국장 중",
    closed: "종가 기준",
    unavailable: "반도체 시세 로딩 실패",
    disclaimerFull:
      "SOXL은 미국 반도체 지수를 3배 추종. 미국 정규장(한국 야간)의 반도체 움직임은 다음 날 삼성전자·SK하이닉스 방향과 상관관계가 높지만, 환율·수급·개별 이슈로 달라질 수 있습니다. 참고용 지표이며 투자 조언이 아닙니다.",
    verdicts: {
      strong_up: "강한 상승",
      up: "상승",
      flat: "보합",
      down: "하락",
      strong_down: "강한 하락",
      unknown: "—",
    },
  },
  en: {
    label: "🔌 US Semis",
    soxl: "SOXL",
    implied: "Semi idx",
    nvda: "NVDA",
    verdictPrefix: "Tomorrow",
    live: "US live",
    closed: "Last close",
    unavailable: "Couldn't load semi prices",
    disclaimerFull:
      "SOXL tracks the US semiconductor index at 3x. Overnight US semi moves correlate with next-day Samsung/Hynix direction, but FX, flows, and idiosyncratic news can diverge. Reference only, not investment advice.",
    verdicts: {
      strong_up: "Strong up",
      up: "Up",
      flat: "Flat",
      down: "Down",
      strong_down: "Strong down",
      unknown: "—",
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
    <section className="mb-6 px-3.5 py-2 rounded-xl bg-bg-card/60 border border-line flex items-center gap-x-3 gap-y-1 flex-wrap text-xs sm:text-sm">
      <span className="inline-flex items-center gap-1.5 font-bold text-text shrink-0">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isLive ? "bg-accent-green animate-pulse-soft" : "bg-text-dim/50"
          }`}
          title={isLive ? t.live : t.closed}
        />
        {t.label}
      </span>

      {!soxl ? (
        <span className="text-text-dim">{t.unavailable}</span>
      ) : (
        <>
          <span className="text-text-dim">
            {t.soxl}{" "}
            <b className={`tabular ${pctColor(soxl.changePct)}`}>
              {arrow(soxl.changePct)} {fmtPct(soxl.changePct)}
            </b>
          </span>
          <span className="text-text-dim/30">·</span>
          <span className="text-text-dim">
            {t.implied}{" "}
            <b className={`tabular ${pctColor(impliedSemiPct)}`}>
              {arrow(impliedSemiPct)} {fmtPct(impliedSemiPct)}
            </b>
          </span>
          {nvda && (
            <>
              <span className="text-text-dim/30 hidden sm:inline">·</span>
              <span className="text-text-dim hidden sm:inline">
                {t.nvda}{" "}
                <b className={`tabular ${pctColor(nvda.changePct)}`}>
                  {arrow(nvda.changePct)} {fmtPct(nvda.changePct)}
                </b>
              </span>
            </>
          )}

          <span className="ml-auto inline-flex items-center gap-1.5 shrink-0">
            <span className="text-text-dim font-medium hidden sm:inline">{t.verdictPrefix}</span>
            <b className={verdictColor}>
              {verdictArrow} {t.verdicts[direction]}
            </b>
            <span className="text-text-dim/50 cursor-help" title={t.disclaimerFull}>
              ⓘ
            </span>
          </span>
        </>
      )}
    </section>
  );
}
