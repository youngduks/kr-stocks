// 24시간 시장 sentiment (Hyperliquid HIP-3 거래자 포지션 기반)
// 페르소나: 한국 주식 retail — 코인 metric(펀딩 %, APR) 노출 X, 베팅 비율(sentiment)만 표시
// 데이터 source: HL funding rate (음수=숏 우세, 양수=롱 우세)
// 라오니 / 네이버 / Yahoo 어디에도 없는 차별점 — HL HIP-3 데이터로 시장 sentiment 가시화

export type Locale = "ko" | "en";

const I18N = {
  ko: {
    title: "24시간 시장 sentiment",
    long: "상승 예상",
    short: "하락 예상",
    source: "Hyperliquid 24h 거래자 포지션 기반",
    neutralLabel: "균형",
    longHeavy: "상승 베팅 우세",
    shortHeavy: "하락 베팅 우세",
  },
  en: {
    title: "24h Market Sentiment",
    long: "Bullish",
    short: "Bearish",
    source: "Based on Hyperliquid 24h trader positioning",
    neutralLabel: "Balanced",
    longHeavy: "Bullish bets dominant",
    shortHeavy: "Bearish bets dominant",
  },
} as const;

/**
 * funding rate → LONG 비율 변환 (heuristic)
 * - HL funding 1H rate: 음수=숏 우세 (펀딩 받음), 양수=롱 우세 (펀딩 지불)
 * - retail 직관 위해: funding × 10,000 + 50 = 상승 예상 %
 * - clamp 5~95 (극단 회피)
 */
function fundingToLongPct(funding: number): number {
  const raw = 50 + funding * 10000;
  return Math.max(5, Math.min(95, raw));
}

export function FundingBar({
  funding,
  locale = "ko",
}: {
  funding: number | null | undefined;
  locale?: Locale;
}) {
  if (funding == null || isNaN(funding)) return null;
  const t = I18N[locale];
  const longPct = fundingToLongPct(funding);
  const shortPct = 100 - longPct;

  // 색 강도: funding 절댓값이 클수록 진하게
  const intensity = Math.min(1, Math.abs(funding) * 1000); // 0~1
  const isLongHeavy = funding > 0.00001;
  const isShortHeavy = funding < -0.00001;
  const labelText = isLongHeavy
    ? t.longHeavy
    : isShortHeavy
    ? t.shortHeavy
    : t.neutralLabel;
  const labelColor = isLongHeavy
    ? "text-accent-green"
    : isShortHeavy
    ? "text-accent-blue"
    : "text-text-muted";

  return (
    <section className="mb-6 p-4 rounded-2xl bg-bg-card border border-line">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="text-xs text-text-dim">{t.title}</div>
        <div className={`text-xs font-semibold ${labelColor}`}>
          {labelText}
        </div>
      </div>

      {/* 가로 바: 상승 예상 (green) | 하락 예상 (blue) */}
      <div className="relative h-2.5 bg-line/40 rounded-full overflow-hidden mb-2">
        <div
          className="absolute left-0 top-0 h-full bg-accent-green transition-all"
          style={{ width: `${longPct}%`, opacity: 0.4 + intensity * 0.5 }}
        />
        <div
          className="absolute right-0 top-0 h-full bg-accent-blue transition-all"
          style={{ width: `${shortPct}%`, opacity: 0.4 + intensity * 0.5 }}
        />
      </div>

      {/* 라벨 — 양 끝 (퍼센트만, 코인 metric은 hide) */}
      <div className="flex items-center justify-between text-[11px] tabular">
        <div className="text-accent-green font-semibold">
          {t.long} {longPct.toFixed(0)}%
        </div>
        <div className="text-accent-blue font-semibold">
          {shortPct.toFixed(0)}% {t.short}
        </div>
      </div>

      <p className="mt-3 text-[10px] text-text-dim leading-relaxed">
        {t.source}
      </p>
    </section>
  );
}
