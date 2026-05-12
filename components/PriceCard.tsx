import Link from "next/link";
import type { PriceRow } from "@/lib/fetchPrices";

function formatKRW(n: number | null | undefined): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString("ko-KR");
}

function formatUSD(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 10_000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function formatIndex(n: number | null | undefined): string {
  // 지수: $ 없이 숫자만, comma 포맷 (예: 7,387.60)
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type Locale = "ko" | "en";

const i18n = {
  ko: {
    badgePrivate: "비상장",
    badgeIndex: "지수",
    badgeEtf: "ETF",
    vsRegular: "정규장 대비",
  },
  en: {
    badgePrivate: "Private",
    badgeIndex: "Index",
    badgeEtf: "ETF",
    vsRegular: "vs Regular",
  },
} as const;

export function PriceCard({ row, locale = "ko" }: { row: PriceRow; locale?: Locale }) {
  const m = row.market;
  const chg = m?.change_24h_pct ?? 0;
  const isUp = chg > 0;
  const isDn = chg < 0;
  const cat = row.category;
  const t = i18n[locale];
  // 영어 페이지는 카드 클릭 시에도 영어 컨텍스트 유지 (현재 Phase 1: 종목 상세는 한국어만이라 /en 유지 시 lang 토글로 돌아갈 수 있음)
  const href = locale === "en" ? `/${cat}/${row.slug}` : `/${cat}/${row.slug}`;
  // 종목명: 영어 페이지면 name_en 우선
  const displayName = locale === "en"
    ? (row.name_en || row.name_ko || row.slug)
    : (row.name_ko || row.name_en || row.slug);

  // 표시 가격 결정
  const displayKRW = m?.per_share_krw ?? m?.krw_price ?? null;
  const displayUSD = m?.per_share_usd ?? m?.mark_px_usd ?? null;
  const showSharePrefix = m?.per_share_krw != null && row.share_ratio !== 1.0;

  // 메인 통화: 한국 주식만 KRW 메인, 지수는 단위 없는 숫자, 그 외 USD 메인
  const isKR = cat === "korea";
  const isIndex = row.is_index === true;
  const mainPrice = isIndex
    ? formatIndex(displayUSD) // 지수: 7,387.60 같이 단위 없는 숫자
    : isKR
      ? `₩${formatKRW(displayKRW)}`
      : `$${formatUSD(displayUSD)}`;
  // 보조: 환율·지수는 의미 없으므로 null
  const subPrice = (row.is_fx || isIndex)
    ? null
    : isKR
      ? (displayUSD != null ? `≈ $${formatUSD(displayUSD)}` : null)
      : (displayKRW != null ? `≈ ₩${formatKRW(displayKRW)}` : null);

  return (
    <Link href={href as any}>
      <div className="card-lift group bg-bg-card hover:bg-bg-hover border border-line hover:border-accent-blue/40 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="text-base font-semibold text-text truncate">{displayName}</div>
            <div className="text-xs text-text-dim font-medium tracking-wider">{row.ticker.split(":")[1]}</div>
          </div>
          {row.is_private && <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent-purple/15 text-accent-purple font-semibold">{t.badgePrivate}</span>}
          {row.is_index && <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent-amber/15 text-accent-amber font-semibold">{t.badgeIndex}</span>}
          {row.is_etf && <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent-blue/15 text-accent-blue font-semibold">{t.badgeEtf}</span>}
        </div>

        <div className="flex flex-col gap-0.5 mb-1.5">
          <div className="text-2xl font-bold tabular text-text">{mainPrice}</div>
          {subPrice && <div className="text-[11px] text-text-dim tabular">{subPrice}</div>}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className={`tabular font-semibold ${isUp ? "text-accent-green" : isDn ? "text-accent-blue" : "text-text-muted"}`}>
            {isUp ? "▲" : isDn ? "▼" : ""} {chg.toFixed(2)}%
          </span>
          <span className="text-[10px] text-text-dim tabular">24h</span>
        </div>

        {m?.hl_premium_pct != null && (() => {
          const isUS = cat === "us";
          // 갭 절댓값 — 한국주식은 ₩, 미국주식은 $
          let gapText: string | null = null;
          if (isKR && m.regular_close_krw != null) {
            const g = Math.round((m.per_share_krw ?? m.krw_price) - m.regular_close_krw);
            gapText = `${g > 0 ? "+" : g < 0 ? "−" : ""}₩${Math.abs(g).toLocaleString("ko-KR")}`;
          } else if (isUS && m.regular_close_usd != null) {
            const g = m.mark_px_usd - m.regular_close_usd;
            gapText = `${g > 0 ? "+" : g < 0 ? "−" : ""}$${Math.abs(g).toFixed(2)}`;
          }
          const premColor = m.hl_premium_pct > 0 ? "text-accent-green" : m.hl_premium_pct < 0 ? "text-accent-blue" : "text-text-muted";
          return (
            <div className={`mt-2 pt-2 border-t border-line/60 flex items-start justify-between gap-2 tabular ${isKR ? "text-sm" : "text-xs"}`}>
              <span className="text-text-dim pt-0.5 text-xs whitespace-nowrap shrink-0">
                {t.vsRegular}
              </span>
              <span className={`text-right ${isKR ? "text-base font-bold" : "font-semibold"} ${premColor}`}>
                {m.hl_premium_pct > 0 ? "▲ +" : m.hl_premium_pct < 0 ? "▼ " : ""}{m.hl_premium_pct.toFixed(2)}%
                {gapText && (
                  <span className="block text-[11px] font-normal mt-0.5 opacity-90">
                    {gapText}
                  </span>
                )}
              </span>
            </div>
          );
        })()}
      </div>
    </Link>
  );
}
