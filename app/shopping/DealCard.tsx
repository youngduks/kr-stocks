/**
 * 핫딜 카드 (Phase B) — 서버 컴포넌트. ShoppingList(클라이언트)에는 렌더된 노드만 슬롯으로 넘겨
 * 카드 마크업·Sparkline 코드가 클라이언트 JS 번들에 들어가지 않게 함.
 * mockups/shopping_deals.html 카드: 84px 고정 썸네일 · 2줄 상품명 · 큰 가격 · 가격 기준 줄 · 구매 버튼 1개 · 작은 '원문'.
 */
import { Sparkline } from "@/components/ui/Sparkline";

// 서버(page.tsx)에서 timeAgoStr·catGroup을 미리 계산 — SSR/CSR 시간차 hydration mismatch 회피.
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
  price_ref?: "toss_original" | "danawa_avg" | null;
  affiliate_url?: string;
  timeAgoStr: string;
  catGroup: string; // 가전/육아/식품/생활/뷰티/기타
  // 폴센트 '최근 2개월 최저가' 행 전용(page.tsx fallcentView에서 계산)
  lowest60?: boolean;
  badge?: string;
  img?: string;
  avg60?: number;
  avg60Str?: string;
  avgDropPct?: number;
  hist?: number[]; // 60일 일별 최저가(≤30점, 오래된→최신)
  histFrom?: string; // 첫 점 날짜 MM-DD
};

export const NOTIFY_SCORE_MIN = 4;
/** '평소 가격 수준' 경계 — 확인된 할인이 이보다 작으면 접어서 보여줌 */
export const VERIFIED_MIN_PCT = 5;

export function isVerified(d: DealView): boolean {
  return !!d.lowest60 || (d.discount_pct ?? 0) >= VERIFIED_MIN_PCT;
}

// 이미지 없는 카드의 중립 타일 — 카테고리 이모지(고정 크기, 네트워크 0)
const CAT_EMOJI: Record<string, string> = { 가전: "🔌", 육아: "🧸", 식품: "🍚", 생활: "🧴", 뷰티: "💄", 기타: "📦" };

export function DealCard({ d }: { d: DealView }) {
  const flat = !isVerified(d);
  const isHot = (d.score ?? 0) >= NOTIFY_SCORE_MIN;
  // 구매 링크는 /shopping/go 경유(클릭 집계) — 제휴링크 없는 딜만 원문으로
  const buyHref = d.affiliate_url
    ? `/shopping/go?url=${encodeURIComponent(d.affiliate_url)}&source=kr-stocks`
    : d.link;
  const rel = d.affiliate_url ? "noopener sponsored" : "noopener";
  const pct = d.lowest60 ? d.avgDropPct : d.discount_pct;
  // 원문(커뮤니티 게시글) — 폴센트 행은 원문이 없음(link=제휴링크)
  const showOrig = !!d.affiliate_url && !d.lowest60 && !!d.link && d.link !== d.affiliate_url;
  const ship = d.shipping === "무료" ? "무료배송" : d.shipping;

  // 가격 기준 줄 — 폴센트: 60일 평균(+스파크라인) / 다나와: 평균 시세 / 토스: 정가(시세 아님)
  let basis: React.ReactNode = null;
  if (d.lowest60 && (d.avg60Str || d.hist)) {
    basis = (
      <div className="ds-tile mt-3 flex items-center gap-3" style={{ padding: "10px 12px" }}>
        {d.hist && (
          <Sparkline
            values={d.hist}
            width={112}
            height={40}
            tone="up"
            refValue={d.avg60}
            endDot
            ariaLabel={`최근 60일 최저가 추이${d.histFrom ? ` (${d.histFrom}~)` : ""}`}
          />
        )}
        <div className="flex-1 min-w-0">
          {d.hist && <div className="text-[12px] font-bold text-text-muted">60일 가격 · 점선 = 평균</div>}
          <div className="text-[13px] leading-snug num">
            {d.avgDropPct != null ? (
              <>
                60일 평균 대비 <b className="text-up">-{d.avgDropPct}%</b>
              </>
            ) : (
              "최근 60일 중 가장 싼 가격"
            )}
          </div>
          {d.avg60Str && <div className="ds-meta num">60일 평균 {d.avg60Str}</div>}
        </div>
      </div>
    );
  } else if (d.market_price && d.price_ref) {
    basis = (
      <div className="ds-meta mt-2 num">
        {d.price_ref === "toss_original" ? `토스 정가 ${d.market_price} 대비` : `평균 시세 ${d.market_price} 대비 (다나와)`}
      </div>
    );
  }

  return (
    <article className="ds-card" style={{ padding: 16 }}>
      <a href={buyHref} target="_blank" rel={rel} className="flex gap-3 group" tabIndex={-1}>
        {/* 고정 84px 썸네일 — 이미지 없거나 실패해도 같은 자리(CLS 0) */}
        <div className="w-[84px] h-[84px] flex-none rounded-tile overflow-hidden bg-bg-hover grid place-items-center text-[30px]">
          {d.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={d.img}
              alt=""
              width={84}
              height={84}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <span aria-hidden="true">{CAT_EMOJI[d.catGroup] ?? "📦"}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {d.lowest60 && (
              <span className="text-[12px] font-extrabold rounded-lg px-2 py-0.5 bg-up text-white">
                {d.badge ?? "최근 2개월 최저가"}
              </span>
            )}
            {isHot && (
              <span className="ds-pill ds-pill-warn" style={{ padding: "2px 8px" }}>
                ⚠ 가격오류 의심
              </span>
            )}
            {flat && !d.lowest60 && (
              <span className="ds-pill ds-pill-flat" style={{ padding: "2px 8px" }}>
                평소 가격
              </span>
            )}
            <span className="ds-meta">{d.timeAgoStr}</span>
          </div>
          <div className="font-sys text-[15px] font-bold mt-1 leading-snug line-clamp-2 group-hover:underline decoration-text-dim/40">
            {d.product || d.title}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            {d.price && <span className="num text-[20px] font-extrabold">{d.price}</span>}
            {pct != null && pct > 0 && (
              <span className={`num text-[14px] font-extrabold ${flat ? "text-flat" : "text-up"}`}>−{pct}%</span>
            )}
          </div>
          <div className="ds-meta">
            {d.store}
            {ship ? ` · ${ship}` : ""} · {d.catGroup}
          </div>
        </div>
      </a>
      {basis}
      <a
        href={buyHref}
        target="_blank"
        rel={rel}
        className="mt-3 h-12 rounded-tile bg-ink text-on-ink font-extrabold text-[15px] flex items-center justify-center hover:opacity-90 transition"
      >
        {d.affiliate_url ? `${d.store}에서 보기` : "원문에서 보기"}
      </a>
      <div className="ds-meta mt-2 text-center">
        {d.affiliate_url ? "제휴 링크 · 구매 시 수수료를 받을 수 있어요" : "제휴 링크 아님"}
        {showOrig && (
          <>
            {" · "}
            <a href={d.link} target="_blank" rel="noopener" className="underline hover:text-text-muted">
              원문
            </a>
          </>
        )}
      </div>
    </article>
  );
}
