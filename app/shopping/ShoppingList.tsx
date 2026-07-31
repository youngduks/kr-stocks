"use client";

import { useState } from "react";

// 서버(page.tsx)에서 timeAgoStr·catGroup을 미리 계산해 넘겨줌 — 클라이언트에서
// Date.now()를 다시 부르면 SSR/CSR 시간차로 hydration mismatch가 나므로 회피.
export type DealView = {
  id: string;
  title: string;
  product: string;
  store: string;
  price: string;
  shipping: string;
  link: string;
  score?: number;
  market_price?: string;
  discount_pct?: number;
  affiliate_url?: string;
  timeAgoStr: string;
  catGroup: string; // 가전/육아/식품/전자제품/기타
};

const NOTIFY_SCORE_MIN = 4;

// 형님 지시(2026-07-30): 가전/육아/식품/전자제품/기타 고정 유지.
// + 생활용품·화장품 추가(2026-07-31) — 아르카 카테고리별 수집으로 실제 딜이
//   꾸준히 들어와, '기타'에 뭉뚱그리면 찾기 어려워짐.
const TABS = ["전체", "식품", "생활용품", "화장품", "전자제품", "가전", "육아", "기타"] as const;

export function ShoppingList({ deals }: { deals: DealView[] }) {
  const [active, setActive] = useState<string>("전체");

  const counts: Record<string, number> = { 전체: deals.length };
  for (const t of TABS) if (t !== "전체") counts[t] = 0;
  for (const d of deals) counts[d.catGroup] = (counts[d.catGroup] ?? 0) + 1;

  const shown = active === "전체" ? deals : deals.filter((d) => d.catGroup === active);

  return (
    <>
      {/* 카테고리 탭 */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {TABS.map((t) => {
          const isActive = active === t;
          const n = counts[t] ?? 0;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setActive(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                isActive
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-bg-card text-text-dim border-line hover:text-text hover:border-text-dim"
              }`}
            >
              {t}
              <span className={`ml-1 ${isActive ? "text-white/70" : "text-text-dim/60"}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="p-8 rounded-xl bg-bg-card border border-line text-center text-text-dim text-sm">
          이 카테고리엔 아직 딜이 없어요.
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((d) => {
            const isHot = (d.score ?? 0) >= NOTIFY_SCORE_MIN;
            return (
              <div key={d.id} className="rounded-xl border border-line bg-bg-card overflow-hidden">
                <a
                  href={d.link}
                  target="_blank"
                  rel="noopener"
                  className="block p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold text-text-dim bg-bg px-1.5 py-0.5 rounded">
                      {d.catGroup}
                    </span>
                    {isHot && (
                      <span className="text-[11px] font-bold text-red-400 bg-red-950/40 px-2 py-0.5 rounded-full animate-pulse">
                        🚨 가격오류의심 {d.score}
                      </span>
                    )}
                    {d.discount_pct != null && (
                      <span className="text-[11px] font-bold text-bg bg-accent-amber px-2 py-0.5 rounded-full ml-auto">
                        ▼{d.discount_pct}%
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-text leading-snug">{d.product || d.title}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-text-dim">{d.store}</span>
                    {d.price && <span className="text-accent-amber font-bold">{d.price}</span>}
                    {d.shipping && (
                      <span className="text-text-dim bg-bg px-1.5 py-0.5 rounded">{d.shipping}</span>
                    )}
                    <span className="ml-auto text-text-dim">{d.timeAgoStr}</span>
                  </div>
                  {d.market_price && d.discount_pct != null && (
                    <div className="mt-2 text-xs text-text-dim">
                      시세 {d.market_price} → <span className="text-accent-amber font-bold">딜가 {d.price} ({d.discount_pct}%↓)</span>
                    </div>
                  )}
                </a>
                {d.affiliate_url && (
                  <a
                    href={`/shopping/go?url=${encodeURIComponent(d.affiliate_url)}`}
                    target="_blank"
                    rel="noopener sponsored"
                    className="block text-center py-2.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-400 transition-colors"
                  >
                    💰 이 가격에 구매하기
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
