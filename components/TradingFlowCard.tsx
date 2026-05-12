// 외국인·기관 매매 동향 카드 (한국주식 3종 한정)
// raoni·네이버 금융 페이지와 차별점 — kr-stocks 통합 뷰의 핵심 USP

import { type TradingFlowData, formatBigKRW } from "@/lib/tradingFlow";

export type Locale = "ko" | "en";

const I18N = {
  ko: {
    title: "외국인·기관 매매 동향",
    period: "최근 5거래일 누적",
    foreign: "외국인",
    institutional: "기관",
    retail: "개인",
    daily: "일별 추이",
    netBuy: "순매수",
    netSell: "순매도",
    source: "출처: KRX · 네이버 금융",
  },
  en: {
    title: "Foreign · Institutional Trading Flow",
    period: "Last 5 trading days cumulative",
    foreign: "Foreign",
    institutional: "Institution",
    retail: "Retail",
    daily: "Daily trend",
    netBuy: "Net buy",
    netSell: "Net sell",
    source: "Source: KRX · Naver Finance",
  },
} as const;

function FlowRow({
  label,
  won,
  locale,
}: {
  label: string;
  won: number;
  locale: Locale;
}) {
  const { display, sign } = formatBigKRW(won);
  const isBuy = won > 0;
  const isSell = won < 0;
  const color = isBuy
    ? "text-accent-green"
    : isSell
    ? "text-accent-blue"
    : "text-text-muted";
  const arrow = isBuy ? "▲" : isSell ? "▼" : "—";
  const tag = isBuy
    ? I18N[locale].netBuy
    : isSell
    ? I18N[locale].netSell
    : "";

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-text-muted shrink-0 w-16">{label}</span>
      <div className="flex items-center gap-2 flex-1 justify-end">
        <span className={`text-base sm:text-lg font-bold tabular ${color}`}>
          {arrow} {sign}₩{display}
        </span>
        <span className={`text-[10px] font-semibold ${color} shrink-0 w-12 text-right`}>
          {tag}
        </span>
      </div>
    </div>
  );
}

/** 일별 sparkline (간단 막대) — 외국인만 */
function DailySparkline({
  daily,
}: {
  daily: TradingFlowData["daily"];
}) {
  const vals = daily.map((d) => d.foreign_won);
  const maxAbs = Math.max(...vals.map((v) => Math.abs(v)), 1);
  return (
    <div className="flex items-end justify-between gap-1 h-8 mt-2">
      {daily.map((d, i) => {
        const pct = (Math.abs(d.foreign_won) / maxAbs) * 100;
        const isBuy = d.foreign_won > 0;
        const isSell = d.foreign_won < 0;
        const color = isBuy
          ? "bg-accent-green"
          : isSell
          ? "bg-accent-blue"
          : "bg-line";
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center justify-end h-full gap-0.5"
            title={`${d.date}: ${formatBigKRW(d.foreign_won).sign}${formatBigKRW(d.foreign_won).display}`}
          >
            <div
              className={`w-full ${color} rounded-sm transition-all`}
              style={{ height: `${Math.max(pct, 8)}%`, opacity: 0.55 }}
            />
            <span className="text-[8px] text-text-dim tabular">
              {d.date.slice(5).replace("-", "/")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function TradingFlowCard({
  data,
  locale = "ko",
}: {
  data: TradingFlowData;
  locale?: Locale;
}) {
  const t = I18N[locale];
  const c = data.cumulative_5d;

  return (
    <section className="mb-6 p-5 rounded-2xl bg-accent-green/5 border border-accent-green/20">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="text-xs text-text-dim">
          {t.title} · <span className="text-text-muted">{t.period}</span>
        </div>
        <div className="text-[10px] text-text-dim shrink-0">{t.source}</div>
      </div>

      {/* 3 line: 외국인 / 기관 / 개인 */}
      <div className="divide-y divide-line/30">
        <FlowRow label={`🌐 ${t.foreign}`} won={c.foreign_won} locale={locale} />
        <FlowRow
          label={`🏛️ ${t.institutional}`}
          won={c.institutional_won}
          locale={locale}
        />
        <FlowRow label={`👥 ${t.retail}`} won={c.retail_won} locale={locale} />
      </div>

      {/* 일별 sparkline (외국인 기준) */}
      <div className="mt-4 pt-3 border-t border-line/40">
        <div className="text-[10px] text-text-dim mb-1">
          {t.daily} ({t.foreign})
        </div>
        <DailySparkline daily={data.daily} />
      </div>
    </section>
  );
}
