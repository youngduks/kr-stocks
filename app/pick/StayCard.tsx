/**
 * 숙소 카드 — 썸네일 + "번호. 이름" + 한 줄 소개. 훅 없음 → 서버(page.tsx)·클라이언트(StaySearch) 양쪽에서 사용.
 * 링크는 전부 /shopping/go 경유(화이트리스트 + pick별 클릭 집계), 제휴 링크라 rel=sponsored.
 */
import { stayGoHref, type Stay } from "@/lib/stays";
import type { StayPriceView } from "@/lib/stayPrices";

const REL = "noopener sponsored nofollow";

function Thumb({ stay, size }: { stay: Stay; size: number }) {
  return (
    <div
      className="flex-none rounded-tile overflow-hidden bg-bg-hover grid place-items-center text-[28px]"
      style={{ width: size, height: size }}
    >
      {stay.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={stay.thumb}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      ) : (
        <span aria-hidden="true">🏡</span>
      )}
    </div>
  );
}

function Title({ stay, className = "" }: { stay: Stay; className?: string }) {
  return (
    <div className={`font-sys font-bold leading-snug ${className}`}>
      <span className="num text-text-muted">{stay.no}.</span> {stay.name}
    </div>
  );
}

function intro(stay: Stay): string {
  return stay.summary || stay.hook_title || [stay.region, stay.type].filter(Boolean).join(" · ");
}

/** 쿠팡 가격 줄 — 조회일·"쿠팡" 출처를 늘 같이 표기. 오래된 기록이면 숫자 대신 "가격 업데이트 중" */
function PriceLine({ price }: { price: StayPriceView }) {
  if (price.stale) return <div className="ds-meta mt-2">가격 업데이트 중</div>;
  return (
    <div className="mt-2 text-[12.5px] leading-snug text-text-muted">
      {price.week && <div className="font-semibold text-text">{price.week}</div>}
      <div className={price.week ? "mt-0.5" : ""}>
        {price.low && <span className="num">{price.low}</span>}
        {price.low && " · "}
        <span className="text-text-dim">{price.checked}</span>
      </div>
    </div>
  );
}

/** TOP 7 가로 스크롤용 세로 카드 — 카드 전체가 첫 번째 예약 링크 */
export function StayMiniCard({ stay, rank, price }: { stay: Stay; rank: number; price?: StayPriceView }) {
  const first = stay.links[0];
  const body = (
    <>
      <div className="relative">
        <Thumb stay={stay} size={148} />
        <span className="absolute top-2 left-2 num text-[12px] font-extrabold rounded-lg px-2 py-0.5 bg-ink text-on-ink">
          {rank}
        </span>
      </div>
      <Title stay={stay} className="text-[14px] mt-2 line-clamp-2" />
      <div className="ds-meta mt-0.5 line-clamp-2">{intro(stay)}</div>
      {price && (price.stale || price.weekShort) && (
        <div className={`mt-1 text-[12px] leading-snug ${price.stale ? "text-text-dim" : "font-semibold text-text"}`}>
          {price.stale ? "가격 업데이트 중" : price.weekShort}
          {!price.stale && <span className="block font-normal text-text-dim">{price.checked}</span>}
        </div>
      )}
    </>
  );
  return (
    <li className="flex-none w-[148px] snap-start">
      {first ? (
        <a href={stayGoHref(stay.no, first.url)} target="_blank" rel={REL} className="block">
          {body}
        </a>
      ) : (
        body
      )}
    </li>
  );
}

/** 목록용 가로 카드 — 썸네일·제목 탭 = 첫 링크, 아래 플랫폼별 버튼 */
export function StayRow({ stay, rank, price }: { stay: Stay; rank?: number; price?: StayPriceView }) {
  const first = stay.links[0];
  const head = (
    <>
      <Thumb stay={stay} size={72} />
      <div className="flex-1 min-w-0">
        {rank != null && <div className="num text-[12px] font-extrabold text-up">TOP {rank}</div>}
        <Title stay={stay} className="text-[15px] line-clamp-2" />
        <div className="ds-meta mt-0.5 line-clamp-2">{intro(stay)}</div>
      </div>
    </>
  );
  return (
    <li className="ds-card" style={{ padding: 14 }} id={rank == null ? `stay-${stay.no}` : undefined}>
      {first ? (
        <a href={stayGoHref(stay.no, first.url)} target="_blank" rel={REL} className="flex gap-3" tabIndex={-1}>
          {head}
        </a>
      ) : (
        <div className="flex gap-3">{head}</div>
      )}
      {price && <PriceLine price={price} />}
      {stay.links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {stay.links.map((l, i) => (
            <a
              key={i}
              href={stayGoHref(stay.no, l.url)}
              target="_blank"
              rel={REL}
              className={`h-10 px-4 rounded-tile font-extrabold text-[14px] flex items-center hover:opacity-90 transition ${
                i === 0 ? "bg-ink text-on-ink" : "bg-bg-hover text-text"
              }`}
            >
              {l.platform ? `${l.platform}에서 보기` : "예약 보기"}
            </a>
          ))}
        </div>
      )}
    </li>
  );
}
