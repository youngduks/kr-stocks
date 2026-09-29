/**
 * 홈 1줄 = 1종목 행 (서버 컴포넌트). 줄 전체가 하나의 링크(중복 링크 없음).
 * 좌: 종목명 + 보조 설명(시장 상태/수급/ADR 괴리 등 — 실제 데이터만) · 중: 스파크라인(있을 때) · 우: 가격 + 등락률
 */
import Link from "next/link";
import type { PriceRow } from "@/lib/fetchPrices";
import { changeTextClass, direction, formatPct } from "@/lib/colors";
import { Sparkline } from "@/components/ui/Sparkline";

function fmtKRW(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}
function fmtUSD(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 10_000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

export function rowPrice(row: PriceRow): { main: string; chg: number | null } {
  const m = row.market;
  if (!m) return { main: "—", chg: null };
  const krw = m.main_display_krw ?? m.per_share_krw ?? m.krw_price ?? null;
  const usd = m.main_display_usd ?? m.per_share_usd ?? m.mark_px_usd ?? null;
  const isKR = row.category === "korea" && row.is_adr !== true;
  const main = row.is_index
    ? usd != null
      ? usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "—"
    : isKR
      ? `₩${fmtKRW(krw)}`
      : `$${fmtUSD(usd)}`;
  return { main, chg: m.main_change_pct ?? m.change_24h_pct ?? null };
}

export function phaseLabel(row: PriceRow): string {
  const p = row.market?.market_phase;
  if (row.is_private) return "비상장 · 24시간";
  if (p === "live") return "정규장";
  if (p === "nxt") return "NXT 시간외";
  return "24시간 참조가";
}

export function StockRow({
  row,
  sub,
  spark,
}: {
  row: PriceRow;
  /** 보조 설명 (ReactNode) — 없으면 시장 상태 라벨 */
  sub?: React.ReactNode;
  /** 스파크라인 값 (undefined = 영역 생략, [] = 같은 크기 빈 칸 → 열 정렬 유지). 색은 등락률 방향과 일치 */
  spark?: number[];
}) {
  const name = row.name_ko || row.name_en || row.slug;
  const { main, chg } = rowPrice(row);
  return (
    <Link href={`/${row.category}/${row.slug}` as any} prefetch={false} className="ds-row hover:bg-bg-hover/60 -mx-2 px-2 rounded-xl transition">
      <div className="flex-1 min-w-0">
        <div className="text-[16px] font-bold truncate text-text">{name}</div>
        <div className="text-[12px] truncate mt-[2px] text-text-dim">{sub ?? phaseLabel(row)}</div>
      </div>
      {spark && (
        <Sparkline values={spark} width={52} height={26} tone={direction(chg)} ariaLabel={spark.length >= 2 ? `${name} 최근 24시간 흐름` : undefined} />
      )}
      <div className="text-right w-[104px] flex-none">
        <div className="num text-[16px] font-bold text-text truncate">{main}</div>
        <div className={`num text-[13px] font-bold ${changeTextClass(chg)}`}>{formatPct(chg)}</div>
      </div>
    </Link>
  );
}
