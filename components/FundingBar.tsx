// HL Funding Rate 기반 LONG/SHORT 포지션 시각화
// raoni·네이버·Yahoo 어디에도 없는 차별점 — HL 전용 데이터

export type Locale = "ko" | "en";

const I18N = {
  ko: {
    title: "HL 거래자 포지션",
    long: "LONG",
    short: "SHORT",
    funding: "1H 펀딩",
    aprLabel: "연환산 APR",
    source: "Hyperliquid 1H funding 기준 (HL은 매시간 정산)",
    neutralLabel: "균형",
    longHeavy: "롱 우세",
    shortHeavy: "숏 우세",
  },
  en: {
    title: "HL Trader Positioning",
    long: "LONG",
    short: "SHORT",
    funding: "1H funding",
    aprLabel: "Annualized APR",
    source: "Based on Hyperliquid 1H funding rate (settled hourly)",
    neutralLabel: "Balanced",
    longHeavy: "Long heavy",
    shortHeavy: "Short heavy",
  },
} as const;

/**
 * funding rate → LONG 비율 변환 (heuristic)
 * - funding 8h annualized: typical ±0.01% per 8h = ±10% per year
 * - retail 직관 위해: funding × 10,000 + 50 = LONG %
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

  // funding rate 표시 — HL은 1H 정산 (매시간) → APR = 1H rate × 24 × 365 × 100
  const fundingPctText = (funding * 100).toFixed(4);
  const fundingSign = funding > 0 ? "+" : "";
  const aprPct = funding * 24 * 365 * 100; // 연환산
  const aprSign = aprPct > 0 ? "+" : "";
  const aprText = Math.abs(aprPct) >= 100
    ? aprPct.toFixed(0)
    : aprPct.toFixed(2);
  // 라오니와 다른 형님식 강조 — APR 큰 글씨로 trader 직격
  const aprColor = aprPct > 0 ? "text-accent-green" : aprPct < 0 ? "text-accent-blue" : "text-text-muted";

  return (
    <section className="mb-6 p-4 rounded-2xl bg-bg-card border border-line">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="text-xs text-text-dim">{t.title}</div>
        <div className={`text-xs font-semibold ${labelColor}`}>
          {labelText}
        </div>
      </div>

      {/* 가로 바: LONG (green) | SHORT (blue) */}
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

      {/* 라벨 — 양 끝 */}
      <div className="flex items-center justify-between text-[11px] tabular">
        <div className="text-accent-green font-semibold">
          {t.long} {longPct.toFixed(0)}%
        </div>
        <div className="text-text-dim">
          {t.funding} {fundingSign}
          {fundingPctText}%
        </div>
        <div className="text-accent-blue font-semibold">
          {shortPct.toFixed(0)}% {t.short}
        </div>
      </div>

      {/* APR 환산 — 라오니와 다른 형님식 별도 줄 강조 (trader 직격) */}
      <div className="mt-3 pt-3 border-t border-line/40 flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-text-dim">{t.aprLabel}</span>
        <span className={`text-base font-bold tabular ${aprColor}`}>
          {aprSign}{aprText}%
        </span>
      </div>

      <p className="mt-2 text-[10px] text-text-dim leading-relaxed">
        {t.source}
      </p>
    </section>
  );
}
