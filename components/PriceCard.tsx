import Link from "next/link";
import type { PriceRow } from "@/lib/fetchPrices";

function formatKRW(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 10_000).toFixed(0) + "만";
  if (n >= 100_000) return Math.round(n).toLocaleString("ko-KR");
  return Math.round(n).toLocaleString("ko-KR");
}

function formatUSD(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 10_000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

export function PriceCard({ row }: { row: PriceRow }) {
  const m = row.market;
  const chg = m?.change_24h_pct ?? 0;
  const isUp = chg > 0;
  const isDn = chg < 0;
  const cat = row.category;
  const href = `/${cat}/${row.slug}`;

  // 표시 가격 결정
  const displayKRW = m?.per_share_krw ?? m?.krw_price ?? null;
  const displayUSD = m?.per_share_usd ?? m?.mark_px_usd ?? null;
  const showSharePrefix = m?.per_share_krw != null && row.share_ratio !== 1.0;

  return (
    <Link href={href as any}>
      <div className="card-lift group bg-bg-card hover:bg-bg-hover border border-line hover:border-accent-blue/40 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="text-base font-semibold text-text truncate">{row.name_ko || row.name_en}</div>
            <div className="text-xs text-text-dim font-medium tracking-wider">{row.ticker.split(":")[1]}</div>
          </div>
          {row.is_private && <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent-purple/15 text-accent-purple font-semibold">비상장</span>}
          {row.is_index && <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent-amber/15 text-accent-amber font-semibold">지수</span>}
          {row.is_etf && <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent-blue/15 text-accent-blue font-semibold">ETF</span>}
        </div>

        <div className="flex items-baseline gap-2 mb-1.5">
          <div className="text-2xl font-bold tabular text-text">
            {row.is_index || row.is_etf || row.is_private || row.is_fx ? `$${formatUSD(displayUSD)}` : `₩${formatKRW(displayKRW)}`}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className={`tabular font-semibold ${isUp ? "text-accent-green" : isDn ? "text-accent-red" : "text-text-muted"}`}>
            {isUp ? "▲" : isDn ? "▼" : ""} {chg.toFixed(2)}%
          </span>
          <span className="text-xs text-text-dim tabular">
            {showSharePrefix ? `1주환산` : null}
          </span>
        </div>
      </div>
    </Link>
  );
}
