/**
 * 시세 목록 카드 — 2026-11-16 정보 구조 재정비 때 app/page.tsx 에서 옮김.
 *   - KoreaStocksCard : 한국 주식 1줄 = 1종목 (홈 · /markets 공용)
 *   - CategoryStockCards : 비상장·미국·ETF·글로벌 (홈에서 /markets 로 이동)
 * 서버 컴포넌트. 새 fetch·Redis 없음.
 */
import Link from "next/link";
import type { PriceRow } from "@/lib/fetchPrices";
import { CATEGORY_LABELS, type SymbolMeta } from "@/lib/universe";
import { StockRow } from "@/components/home/StockRow";
import { getTradingFlow, formatBigKRW } from "@/lib/tradingFlow";
import { changeTextClass } from "@/lib/colors";

/** 한국 주식 행 보조 설명 — 실데이터만: ADR 괴리율 / 외국인 5일 순매수(data/trading_flow) / 시장 상태 */
function koreaSub(row: PriceRow): React.ReactNode {
  const m = row.market;
  if (row.is_adr && m?.adr_premium_pct != null) {
    const p = m.adr_premium_pct;
    return (
      <>
        <span className={`font-bold ${Math.abs(p) >= 5 ? "text-warn" : "text-flat"}`}>
          본주 대비 {p > 0 ? "+" : p < 0 ? "−" : ""}
          {Math.abs(p).toFixed(1)}%
        </span>
        <span> · 미국 ADR</span>
      </>
    );
  }
  const phase = m?.market_phase === "live" ? "정규장" : m?.market_phase === "nxt" ? "NXT 시간외" : "24시간 참조가";
  const flow = getTradingFlow(row.slug);
  if (flow) {
    const w = flow.cumulative_5d.foreign_won;
    const { display, sign } = formatBigKRW(w);
    return (
      <>
        <span className={`font-bold ${changeTextClass(w)}`}>
          외국인 5일 {sign}
          {display}
        </span>
        <span> · {phase}</span>
      </>
    );
  }
  return phase;
}

/** 한국 주식 카드 — 스파크라인(최근 24시간)은 호출부가 fetchSparkCloses 로 받아 넘긴다(같은 fetch 캐시 공유). */
export function KoreaStocksCard({
  rows,
  sparks,
  className = "mt-4",
  footer,
}: {
  rows: PriceRow[];
  sparks: number[][];
  className?: string;
  /** 카드 맨 아래 링크 줄 (홈: 전체 시세 보기) */
  footer?: React.ReactNode;
}) {
  if (rows.length === 0) return null;
  return (
    <section id="korea" className={`ds-card scroll-mt-20 ${className}`} style={{ padding: "8px 20px" }} aria-labelledby="kr-stocks-h">
      <div className="flex items-center justify-between gap-3 pt-3 pb-1">
        <h2 id="kr-stocks-h" className="text-[17px] font-extrabold">
          한국 주식
        </h2>
        <span className="ds-meta truncate">선 = 최근 24시간</span>
      </div>
      <div>
        {rows.map((row, i) => (
          <StockRow key={row.slug} row={row} sub={koreaSub(row)} spark={sparks[i]} />
        ))}
      </div>
      <Link
        href="/korea/kospi-night"
        prefetch={false}
        className="flex items-center justify-between gap-3 min-h-[48px] text-[14px] font-semibold text-text-muted hover:text-text border-t border-line"
      >
        <span className="truncate">코스피 야간선물 대신 보는 한국 ETF(EWY) 24시간 시세</span>
        <span className="shrink-0">→</span>
      </Link>
      {footer}
    </section>
  );
}

/** 한국 외 카테고리 순서 (대표님 지정): 비상장 → 미국주식 → ETF(테마) → 글로벌 지수 */
export const REST_ORDER: SymbolMeta["category"][] = ["private", "us", "themes", "global"];

export function groupRest(symbols: PriceRow[]) {
  return (
    REST_ORDER.map((cat) => ({
      cat,
      label: CATEGORY_LABELS[cat],
      // is_fx(원화 환율)는 헤더 환율 위젯과 소스가 달라(HL perp vs 업비트) 숫자가 어긋나 보임 → 리스트 제외
      rows: symbols.filter((r) => r.category === cat && !r.is_fx),
    }))
      // 카테고리 전멸 시 빈 섹션 방지
      .filter((g) => g.rows.length > 0)
  );
}

/** 비상장·미국·ETF·글로벌 — 1줄 = 1종목. 각 카드 id = 카테고리명(#private · #us · #global) → /private 등 짧은 주소가 여기로 온다. */
export function CategoryStockCards({ groups }: { groups: ReturnType<typeof groupRest> }) {
  return (
    <>
      {groups.map(({ cat, label, rows }) => (
        <section key={cat} id={cat} className="ds-card mb-4 scroll-mt-20" style={{ padding: "8px 20px" }} aria-labelledby={`cat-${cat}`}>
          <div className="flex items-center justify-between pt-3 pb-1">
            <h2 id={`cat-${cat}`} className="text-[17px] font-extrabold">
              {label.ko}
            </h2>
            <span className="ds-meta">{rows.length}종목</span>
          </div>
          {rows.map((row) => (
            <StockRow key={row.slug} row={row} />
          ))}
        </section>
      ))}
    </>
  );
}
