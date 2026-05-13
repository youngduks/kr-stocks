// 🐋 최근 고래 활동 박스 — 종목 상세 페이지 server component
// Stateless 방식 (KV/Cron 없음, HL recentTrades 단일 호출 sample 기반)
// 형님 5/13 Path B 결정

import type { WhaleFlow } from "@/lib/hlWhale";
import { fmtSpanLabel, fmtUsdShort } from "@/lib/hlWhale";

export type Locale = "ko" | "en";

const I18N = {
  ko: {
    title: "🐋 최근 고래 활동",
    sub: "최근",
    samples: "건 거래 분석",
    threshold: "고래 기준",
    plus: "이상 단일 fill",
    whaleCount: "고래 fill",
    items: "건",
    longLabel: "상승 베팅",
    shortLabel: "하락 베팅",
    net: "순매수",
    netNeg: "순매도",
    maxFill: "최대 단일",
    buy: "매수",
    sell: "매도",
    sourceLine: "Hyperliquid 최근 거래 sample 기반 (30초 갱신)",
    noWhales: "최근 sample에 고래 거래가 없습니다",
    noWhalesSub: "거래량이 적은 종목일 수 있습니다",
    bullDominant: "상승 베팅 우세",
    bearDominant: "하락 베팅 우세",
    balanced: "균형",
    fxHide: "(환율 종목 — 미적용)",
  },
  en: {
    title: "🐋 Recent Whale Activity",
    sub: "Last",
    samples: " fills analyzed",
    threshold: "Whale threshold",
    plus: " single fill",
    whaleCount: "Whale fills",
    items: "",
    longLabel: "Bullish",
    shortLabel: "Bearish",
    net: "Net buy",
    netNeg: "Net sell",
    maxFill: "Largest fill",
    buy: "buy",
    sell: "sell",
    sourceLine: "Based on Hyperliquid recent trades sample (30s refresh)",
    noWhales: "No whale activity in recent sample",
    noWhalesSub: "Low-volume ticker — try a more active stock",
    bullDominant: "Bullish bets dominant",
    bearDominant: "Bearish bets dominant",
    balanced: "Balanced",
    fxHide: "(FX ticker — not applied)",
  },
} as const;

function shortenWallet(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WhaleFlowBox({
  flow,
  locale = "ko",
}: {
  flow: WhaleFlow | null;
  locale?: Locale;
}) {
  const t = I18N[locale];

  // 데이터 없음 또는 sample fetch 실패
  if (!flow) return null;

  // sample 내 whale fill 0건 — 저거래 종목
  if (flow.whale_count === 0) {
    return (
      <section className="mb-6 p-4 rounded-2xl bg-bg-card border border-line">
        <div className="text-xs text-text-dim mb-1">{t.title}</div>
        <div className="text-sm text-text-muted">
          {t.noWhales}
        </div>
        <p className="mt-1 text-[10px] text-text-dim leading-relaxed">
          {t.noWhalesSub} · ${flow.threshold_usd.toLocaleString("en-US")}+ {locale === "ko" ? "단일 fill 기준" : "single fill threshold"}
        </p>
      </section>
    );
  }

  const longPct = flow.long_pct;
  const shortPct = 100 - longPct;
  const isBull = longPct > 52;
  const isBear = longPct < 48;
  const dominanceLabel = isBull ? t.bullDominant : isBear ? t.bearDominant : t.balanced;
  const dominanceColor = isBull
    ? "text-accent-green"
    : isBear
    ? "text-accent-blue"
    : "text-text-muted";

  const netLabel = flow.net_usd >= 0 ? t.net : t.netNeg;
  const netColor = flow.net_usd > 0
    ? "text-accent-green"
    : flow.net_usd < 0
    ? "text-accent-blue"
    : "text-text-muted";
  const netSign = flow.net_usd > 0 ? "+" : flow.net_usd < 0 ? "−" : "";

  const maxFillSideLabel = flow.max_fill_side === "B" ? t.buy : t.sell;
  const maxFillColor = flow.max_fill_side === "B" ? "text-accent-green" : "text-accent-blue";

  // 색 강도: long_pct 편차에 비례 (50%에서 멀수록 진하게)
  const intensity = Math.min(1, Math.abs(longPct - 50) / 30);
  const opacity = 0.4 + intensity * 0.5;

  return (
    <section className="mb-6 p-4 rounded-2xl bg-bg-card border border-line">
      {/* 헤더 — 제목 + dominance 라벨 */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="text-xs text-text-dim">{t.title}</div>
        <div className={`text-xs font-semibold ${dominanceColor}`}>
          {dominanceLabel}
        </div>
      </div>

      {/* 가로 막대 — 상승 (green) / 하락 (blue) */}
      <div className="relative h-2.5 bg-line/40 rounded-full overflow-hidden mb-2">
        <div
          className="absolute left-0 top-0 h-full bg-accent-green transition-all"
          style={{ width: `${longPct}%`, opacity }}
        />
        <div
          className="absolute right-0 top-0 h-full bg-accent-blue transition-all"
          style={{ width: `${shortPct}%`, opacity }}
        />
      </div>

      {/* 라벨 — 양 끝: USD value + % */}
      <div className="flex items-center justify-between text-[11px] tabular mb-2">
        <div className="text-accent-green font-semibold">
          {t.longLabel} {fmtUsdShort(flow.whale_buy_usd)} ({longPct.toFixed(0)}%)
        </div>
        <div className="text-accent-blue font-semibold">
          ({shortPct.toFixed(0)}%) {fmtUsdShort(flow.whale_sell_usd)} {t.shortLabel}
        </div>
      </div>

      {/* net + 최대 단일 fill */}
      <div className="mt-3 pt-3 border-t border-line/40 flex items-center justify-between gap-3 text-[11px] tabular flex-wrap">
        <div>
          <span className="text-text-dim">{netLabel}: </span>
          <span className={`font-bold ${netColor}`}>
            {netSign}{fmtUsdShort(Math.abs(flow.net_usd))}
          </span>
        </div>
        <div className="text-right">
          <span className="text-text-dim">{t.maxFill}: </span>
          <span className={`font-bold ${maxFillColor}`}>
            {fmtUsdShort(flow.max_fill_usd)}
          </span>
          <span className="text-text-dim"> ({maxFillSideLabel})</span>
          {flow.max_fill_wallet && (
            <span className="ml-1 text-text-dim/70 font-mono text-[10px]">
              {shortenWallet(flow.max_fill_wallet)}
            </span>
          )}
        </div>
      </div>

      {/* 메타 정보 — 정직 라벨 (24h 약속 안 함) */}
      <p className="mt-3 text-[10px] text-text-dim leading-relaxed">
        {t.sub} {flow.total_trades}{t.samples}
        {flow.span_minutes > 0 && ` · ${fmtSpanLabel(flow.span_minutes)}`}
        {` · ${t.threshold} $${flow.threshold_usd.toLocaleString("en-US")}${t.plus}`}
        {` · ${t.whaleCount} ${flow.whale_count}${t.items}`}
      </p>
      <p className="mt-1 text-[10px] text-text-dim/70 leading-relaxed">
        {t.sourceLine}
      </p>
    </section>
  );
}
