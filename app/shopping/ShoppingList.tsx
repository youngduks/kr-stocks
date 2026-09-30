"use client";

import { useRef, useState } from "react";
import { AdSlot } from "@/components/AdSlot";
import { MoreDetails } from "@/components/ui/MoreDetails";

/** 필터/섹션 분류에 필요한 최소 필드 — 카드 자체는 서버에서 렌더(DealCard.tsx)해 cards 슬롯으로 받음 */
export type DealMeta = {
  id: string;
  store: string;
  catGroup: string; // 가전/육아/식품/생활/뷰티/기타
  lowest60: boolean;
  /** 폴센트 최저가 or 확인된 할인 ≥ VERIFIED_MIN_PCT */
  verified: boolean;
};

// 2026-09 리디자인 B: 전체/📉 최저가/육아/식품/생활/가전/뷰티(+기타) — 한 줄 가로 스크롤 칩.
// '📉 최저가'는 폴센트 60일 최저가 딜만(카테고리와 같은 축의 단일 선택).
const FILTERS = ["전체", "📉 최저가", "육아", "식품", "생활", "가전", "뷰티", "기타"] as const;
// 8/20: 토스쇼핑 딜이 20%+ → 스토어 축 필터(토글: 다시 누르면 해제)
const STORES = ["쿠팡", "토스쇼핑"] as const;

const AD_PROPS = {
  adsenseSlot: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME,
  adfitMobile: { unit: "DAN-sRrDqAryVxJFyyGr", width: 320, height: 50 },
  adfitDesktop: { unit: "DAN-1gxi6c73rjhTXT18", width: 728, height: 90 },
};

const CHIP = "ds-chip !h-11 !px-3 !text-[14px] hover:text-text transition aria-pressed:!bg-ink aria-pressed:!text-on-ink";

export function ShoppingList({
  deals,
  cards,
  flatMinPct,
}: {
  deals: DealMeta[];
  cards: Record<string, React.ReactNode>;
  flatMinPct: number;
}) {
  const [filter, setFilter] = useState<string>("전체");
  const [store, setStore] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // barRef = sticky 바 앞의 빈 앵커(바 자체는 붙어 있으면 위치가 고정돼 기준이 안 됨).
  // 깊이 스크롤한 상태에서 필터를 바꾸면 목록 맨 위로(sticky 바 자리 기준) — 빈 화면 방지
  const toTop = () => {
    const el = barRef.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 56 + 16; // 앵커는 sticky 바 직전(mt-4) 자리
    if (window.scrollY > y + 1) window.scrollTo({ top: y });
  };

  // 칩 개수는 현재 스토어 선택 기준
  const byStore = store ? deals.filter((d) => d.store === store) : deals;
  const counts: Record<string, number> = { 전체: byStore.length, "📉 최저가": 0 };
  for (const d of byStore) {
    counts[d.catGroup] = (counts[d.catGroup] ?? 0) + 1;
    if (d.lowest60) counts["📉 최저가"] += 1;
  }
  const storeCounts: Record<string, number> = {};
  for (const d of deals) storeCounts[d.store] = (storeCounts[d.store] ?? 0) + 1;

  const shown = byStore.filter((d) =>
    filter === "전체" ? true : filter === "📉 최저가" ? d.lowest60 : d.catGroup === filter,
  );
  const lows = shown.filter((d) => d.lowest60);
  const others = shown.filter((d) => !d.lowest60 && d.verified);
  const flat = shown.filter((d) => !d.verified);
  const isDefault = filter === "전체" && store == null;

  // 광고: 섹션 경계에만(카드 사이 금지), 첫 화면 금지(위에 카드 3장+ 있을 때만), 최대 2개.
  const adAfterLows = isDefault && lows.length >= 3 && others.length > 0;
  const adAfterOthers = lows.length + others.length >= 6 && flat.length > 0;
  const list = (items: DealMeta[]) => (
    <div className="mt-3 space-y-3">
      {items.map((d) => (
        <div key={d.id}>{cards[d.id]}</div>
      ))}
    </div>
  );

  return (
    <>
      {/* sticky 필터 — 헤더 칩 네비(56px) 바로 아래에 붙음 */}
      <div ref={barRef} aria-hidden="true" />
      <div className="sticky top-[56px] z-20 -mx-4 px-4 sm:-mx-5 sm:px-5 mt-4 bg-bg/90 backdrop-blur-md">
        <nav aria-label="딜 필터" className="ds-chipnav ds-fade-right flex gap-2 overflow-x-auto py-2">
          {FILTERS.map((f) => {
            const n = counts[f] ?? 0;
            if (f !== "전체" && n === 0 && filter !== f) return null;
            const on = filter === f;
            return (
              <button key={f} type="button" onClick={() => {
                  setFilter(f);
                  toTop();
                }} aria-pressed={on} className={CHIP}>
                {f}
                <span className={`ml-1 num text-[12px] ${on ? "opacity-70" : "text-text-dim"}`}>{n}</span>
              </button>
            );
          })}
          <span className="flex-none w-px my-1.5 bg-line" aria-hidden="true" />
          {STORES.map((s) => {
            const on = store === s;
            return (
              <button key={s} type="button" onClick={() => {
                  setStore(on ? null : s);
                  toTop();
                }} aria-pressed={on} className={CHIP}>
                {s}
                <span className={`ml-1 num text-[12px] ${on ? "opacity-70" : "text-text-dim"}`}>{storeCounts[s] ?? 0}</span>
              </button>
            );
          })}
          <span className="flex-none w-4" aria-hidden="true" />
        </nav>
      </div>

      {shown.length === 0 ? (
        <div className="ds-card mt-3 text-center ds-explain">이 조건엔 아직 딜이 없어요.</div>
      ) : (
        <>
          {lows.length > 0 && (
            <section className="mt-3" aria-labelledby="sec-low">
              <h2 id="sec-low" className="ds-h2">
                📉 최근 2개월 최저가
              </h2>
              <p className="ds-meta mt-0.5">쿠팡 60일 가격 기록에서 지금이 가장 싼 딜</p>
              {list(lows)}
            </section>
          )}

          {adAfterLows && <AdSlot key="ad-1" {...AD_PROPS} />}

          {others.length > 0 && (
            <section className={adAfterLows ? "" : lows.length > 0 ? "mt-8" : "mt-3"} aria-labelledby="sec-deal">
              <h2 id="sec-deal" className="ds-h2">
                {lows.length > 0 ? "할인 확인된 딜" : "오늘의 딜"}
              </h2>
              <p className="ds-meta mt-0.5">평균 시세 또는 토스 정가와 비교해 할인이 확인된 딜</p>
              {list(others)}
            </section>
          )}

          {adAfterOthers && <AdSlot key="ad-2" {...AD_PROPS} />}

          {flat.length > 0 && (
            <section
              className={`ds-card ${adAfterOthers ? "" : lows.length + others.length > 0 ? "mt-8" : "mt-3"}`}
              style={{ paddingTop: 4, paddingBottom: 4 }}
            >
              <MoreDetails summary={`평소 가격 수준·비교 시세 없는 딜 ${flat.length}개`} className="!border-t-0 !mt-0">
                <p className="ds-meta -mt-1">
                  싸 보이지만 시세와 비교해 확인된 할인이 없거나 {flatMinPct}% 미만인 딜이에요.
                </p>
                <div className="pb-1">{list(flat)}</div>
              </MoreDetails>
            </section>
          )}
        </>
      )}
    </>
  );
}
