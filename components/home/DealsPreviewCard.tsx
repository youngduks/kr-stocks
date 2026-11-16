/**
 * 홈 '오늘의 핫딜' — 2026-11-16 재정비 때 입구 카드 한 줄로 줄였다가 대표님 결정으로 예전 그대로 되돌림.
 * 실데이터(/shopping 과 같은 소스 · lib/dealsPreview.ts). 항목은 /shopping 으로만 이동(외부·제휴 링크 X) —
 * 구매 클릭 집계(/shopping/go)는 예전과 같이 /shopping 안에서 일어난다.
 * 서버 컴포넌트. 새 fetch·Redis 없음(호출부가 받은 데이터를 넘김).
 */
import Link from "next/link";
import type { DealPreview } from "@/lib/dealsPreview";

export function DealsPreviewCard({ deals, className = "mt-4" }: { deals: DealPreview[]; className?: string }) {
  if (deals.length === 0) return null;
  return (
    <section className={`ds-card ${className}`} style={{ padding: "8px 20px" }} aria-labelledby="deals-h">
      <div className="flex items-center justify-between pt-3 pb-1">
        <h2 id="deals-h" className="text-[17px] font-extrabold">
          오늘의 핫딜
        </h2>
        <span className="ds-meta">줍줍쇼핑</span>
      </div>
      {deals.map((d) => (
        <Link key={d.id} href="/shopping" prefetch={false} className="ds-row hover:bg-bg-hover/60 -mx-2 px-2 rounded-xl transition">
          <div className="flex-1 min-w-0">
            <div className="font-sys text-[15px] font-semibold truncate text-text">{d.product}</div>
            <div className="text-[12px] truncate mt-[2px] text-text-dim">
              {d.lowest60 ? <span className="font-bold text-up">최근 2개월 최저가 · </span> : null}
              {d.store}
            </div>
          </div>
          <div className="text-right flex-none max-w-[45%]">
            <div className="num text-[15px] font-bold text-text truncate">{d.price}</div>
            {d.discountPct != null && d.discountPct > 0 && (
              <div className="num text-[13px] font-bold text-up">−{d.discountPct}%</div>
            )}
          </div>
        </Link>
      ))}
      <Link
        href="/shopping"
        prefetch={false}
        className="flex items-center justify-center min-h-[48px] text-[15px] font-bold text-down border-t border-line"
      >
        핫딜 전체 보기 →
      </Link>
    </section>
  );
}
