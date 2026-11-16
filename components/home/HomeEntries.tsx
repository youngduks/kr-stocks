/**
 * 홈 카테고리 입구 (2026-11-16 정보 구조 재정비) — 1줄 = 1카테고리.
 * 홈에서 빠진 섹션이 어디로 갔는지 안내하고, 이미 받은 데이터로 "지금" 한 줄 요약을 붙인다.
 * 서버 컴포넌트. 새 fetch·Redis 없음. 링크는 전부 내부 페이지.
 */
import Link from "next/link";
import type { PriceRow } from "@/lib/fetchPrices";
import type { SemiSignal } from "@/lib/semiSignal";
import type { DealPreview } from "@/lib/dealsPreview";
import { getConsensus } from "@/lib/consensus";
import { changeTextClass, formatPct } from "@/lib/colors";
import { CATEGORIES, type CategoryKey } from "@/lib/nav";
import { GUIDES } from "@/lib/guides";
import { SIGNAL_COPY } from "@/components/signals/SignalCards";
import { ShareButton } from "@/components/ShareButton";

function rowName(r: PriceRow): string {
  return r.name_ko || r.name_en || r.slug;
}

/** 시세: 한국 외 종목 중 지금 등락이 가장 큰 1종목 */
function marketsLine(restRows: PriceRow[]): React.ReactNode {
  let top: { row: PriceRow; chg: number } | null = null;
  for (const row of restRows) {
    if (row.is_index) continue;
    const chg = row.market?.main_change_pct ?? row.market?.change_24h_pct;
    if (chg == null || !Number.isFinite(chg)) continue;
    if (!top || Math.abs(chg) > Math.abs(top.chg)) top = { row, chg };
  }
  if (!top) return "한국·미국·비상장·글로벌 지수 24시간 시세";
  return (
    <>
      지금 가장 많이 움직인 종목 · {rowName(top.row)}{" "}
      <b className={`num ${changeTextClass(top.chg)}`}>{formatPct(top.chg)}</b>
    </>
  );
}

/** 신호: 반도체 야간 신호 방향 (상태 카드와 같은 문구) */
function signalsLine(semi: SemiSignal): React.ReactNode {
  const c = SIGNAL_COPY[semi.direction];
  const cls = c.tone === "up" ? "text-up" : c.tone === "down" ? "text-down" : "text-text-muted";
  return (
    <>
      반도체 야간 <b className={cls}>{c.pill}</b> · 급변 · 청산맵 · 인간지표
    </>
  );
}

/** 분석: 삼성전자 증권사 평균 목표가 대비 여력 (data/consensus + 정규장 종가) */
function analysisLine(rows: PriceRow[]): React.ReactNode {
  const fallback = "증권사 목표가 · 뉴스 · 자사주매입 · 리서치";
  const c = getConsensus("samsung");
  const m = rows.find((r) => r.slug === "samsung")?.market;
  const cur = m?.regular_close_krw ?? m?.per_share_krw ?? m?.main_display_krw ?? null;
  const target = c?.consensus?.avg_target_krw;
  if (!target || !cur || !(cur > 0)) return fallback;
  const upside = ((target - cur) / cur) * 100;
  return (
    <>
      삼성전자 증권사 평균 목표가까지 <b className={`num ${changeTextClass(upside)}`}>{formatPct(upside)}</b> · 뉴스 · 리서치
    </>
  );
}

function dealsLine(deal: DealPreview | null): React.ReactNode {
  if (!deal) return "쿠팡·토스쇼핑 핫딜 · 커뮤니티";
  return (
    <>
      {deal.product}
      {deal.discountPct != null && deal.discountPct > 0 && <b className="num text-up"> −{deal.discountPct}%</b>}
    </>
  );
}

export function HomeEntries({
  rows,
  restRows,
  semi,
  deal,
}: {
  rows: PriceRow[];
  restRows: PriceRow[];
  semi: SemiSignal;
  deal: DealPreview | null;
}) {
  const live: Record<Exclude<CategoryKey, "home">, { note: string; line: React.ReactNode }> = {
    markets: { note: `${restRows.length + rows.filter((r) => r.category === "korea" && !r.is_fx).length}종목`, line: marketsLine(restRows) },
    signals: { note: "밤사이 분위기", line: signalsLine(semi) },
    analysis: { note: "목표가 · 뉴스", line: analysisLine(rows) },
    deals: { note: "줍줍쇼핑", line: dealsLine(deal) },
    guide: { note: `${GUIDES.length}편`, line: "야간 시세 · 청산맵 · VIX · 공포탐욕지수 읽는 법" },
  };
  const cats = CATEGORIES.filter((c) => c.key !== "home");

  return (
    <section className="ds-card" style={{ padding: "8px 20px" }} aria-labelledby="entries-h">
      <div className="flex items-center justify-between gap-3 pt-3 pb-1">
        <h2 id="entries-h" className="text-[17px] font-extrabold">
          더 자세히 보기
        </h2>
        {/* 사이트 공유 버튼 — 예전엔 홈 '한국주식 종합 분석' 카드 안에 있었음(그 카드는 /analysis 로 이동) */}
        <ShareButton
          url="https://kr-stocks.com"
          title="kr-stocks.com — 24시간 한국·글로벌 주식 시세"
          text="정규장 + NXT 시간외 + 야간 24시간. 증권사 컨센 + 외인기관 + 비상장 빅테크."
          variant="compact"
        />
      </div>
      {cats.map((c) => {
        const l = live[c.key as Exclude<CategoryKey, "home">];
        return (
          <Link key={c.key} href={c.href} prefetch={false} className="ds-row hover:bg-bg-hover/60 -mx-2 px-2 rounded-xl transition">
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-bold text-text">
                {c.ko} <span className="ds-meta font-medium">{l.note}</span>
              </div>
              <div className="text-[13px] truncate mt-[2px] text-text-muted">{l.line}</div>
            </div>
            <span className="shrink-0 text-text-dim" aria-hidden="true">
              →
            </span>
          </Link>
        );
      })}
    </section>
  );
}
