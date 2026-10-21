import Link from "next/link";
import type { Metadata } from "next";
import { getStays, type Stay } from "@/lib/stays";
import { getPickRanks, type PickRank } from "@/lib/shoppingStats";
import { getStayPriceViews, type StayPriceView } from "@/lib/stayPrices";
import { StayMiniCard, StayRow, intro } from "./StayCard";
import { StaySearch } from "./StaySearch";

// 줍줍파파 인스타 프로필 링크 전용 랜딩 — 헤더 메뉴엔 넣지 않음, 광고(AdSlot) 없음.
// 숙소 데이터: data/stays.json(GitHub raw 런타임 fetch, lib/stays.ts).
// TOP 7/20: /shopping/go?pick=<no> 클릭 집계(lib/shoppingStats.ts).
// 카드 가격 줄: data/stay_prices.json(쿠팡트래블 조회 기록 요약, lib/stayPrices.ts).
// 2026-10-07: ISR(revalidate)과 Upstash의 no-store fetch가 충돌해 재생성이 매번 실패(STALE 고정)하던 문제 →
// 요청 시 렌더로 전환. Redis는 getPickRanks의 메모리 5분 캐시로 인스턴스당 5분에 2명령 수준, stays.json은 fetch 데이터 캐시 5분.
export const dynamic = "force-dynamic";

const PICK_URL = "https://kr-stocks.com/pick";
// TITLE = 화면 h1 문구 그대로(검색 결과 제목 = 페이지 제목). 사이트 접미사 "· KR Stocks"는 주식 브랜드라 붙이지 않음.
const TITLE = "아이랑 숙소 PICK — 줍줍스테이·줍줍파파";  // 10/21 대표님 B안: 인스타(줍줍스테이)·유튜브/블로그(줍줍파파) 함께
const LEAD = "직접 고른 아이랑 가기 좋은 숙소만 모았어요. 영상 번호로 찾아보세요.";
// 설명은 화면에 실제로 있는 것만: TOP 7/20 순위, 번호·이름 검색, 예약 버튼(쿠팡·트립닷컴), 버튼 아래 같은 날짜 가격 확인 줄
const DESC =
  "줍줍스테이·줍줍파파가 직접 고른 아이랑 가기 좋은 숙소 모음. 오늘·이번 주 가장 많이 본 숙소 순위, 번호·이름 검색, 숙소별 쿠팡·트립닷컴 예약 링크와 같은 날짜 가격 확인 기록을 한 페이지에서 볼 수 있어요.";
const DISCLOSURE = "이 페이지의 링크는 쿠팡 파트너스·트립닷컴 제휴 링크로, 예약 시 일정액의 수수료를 받을 수 있어요.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESC,
  keywords: ["줍줍스테이", "줍줍파파", "아이랑 숙소", "아이와 가볼만한 숙소", "키즈 펜션", "가족 여행 숙소", "숙소 추천"],
  // openGraph·twitter는 루트 값을 통째로 덮으므로 siteName·locale을 다시 적고, 트위터 카드도 주식 문구가 새지 않게 지정.
  // OG 이미지: public/og/pick.png(1200x630, 10/21 — 루트 주식 이미지 상속 안 함)
  openGraph: {
    title: TITLE,
    description: DESC,
    url: PICK_URL,
    type: "website",
    siteName: "KR Stocks",
    locale: "ko_KR",
    images: [{ url: "https://kr-stocks.com/og/pick.png", width: 1200, height: 630, alt: "아이랑 숙소 PICK — 키즈풀·조식·객실까지 확인한 숙소, 같은 날짜 쿠팡·트립닷컴 가격 비교" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    images: ["https://kr-stocks.com/og/pick.png"],
  },
  alternates: {
    canonical: PICK_URL,
  },
};

/**
 * 구조화 데이터 — 화면의 "📚 숙소 리스트"(번호 내림차순 전체)와 같은 순서·같은 문구만.
 * name = 카드 숙소 이름, description = 카드 한 줄 소개(intro), image = 카드 썸네일, url = 리스트 행 앵커(#stay-N).
 * 가격·평점·리뷰·주소는 넣지 않음(가격 줄은 조건·확인일이 숙소마다 달라 화면 문구와 1:1로 맞추기 어렵고, 평점·주소는 화면에 없음).
 * 제휴 링크도 넣지 않음. publisher/isPartOf 는 홈(app/page.tsx)에서 선언한 전역 @id 참조.
 */
function pickJsonLd(stays: Stay[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${PICK_URL}#page`,
    url: PICK_URL,
    name: TITLE,
    description: LEAD,
    inLanguage: "ko-KR",
    isPartOf: { "@id": "https://kr-stocks.com/#website" },
    publisher: { "@id": "https://kr-stocks.com/#organization" },
    mainEntity: {
      "@type": "ItemList",
      name: "숙소 리스트",
      numberOfItems: stays.length,
      itemListElement: stays.map((s, i) => {
        const description = intro(s);
        return {
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "LodgingBusiness",
            name: s.name,
            ...(description ? { description } : {}),
            ...(s.thumb ? { image: s.thumb } : {}),
            url: `${PICK_URL}#stay-${s.no}`,
          },
        };
      }),
    },
  };
}

/** 클릭 순위 → 숙소. 집계가 모자라면(또는 없으면) 번호 내림차순으로 채움. */
function rankWithFallback(ranks: PickRank[], stays: Stay[], n: number): Stay[] {
  const byNo = new Map(stays.map((s) => [s.no, s]));
  const out: Stay[] = [];
  for (const r of ranks) {
    const s = byNo.get(r.no);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= n) return out;
  }
  for (const s of stays) {
    if (out.length >= n) break;
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

function SectionTitle({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="mt-8 flex items-baseline justify-between gap-3">
      <h2 className="ds-h2">{children}</h2>
      {note && <span className="ds-meta flex-none">{note}</span>}
    </div>
  );
}

export default async function PickPage() {
  const stays = await getStays();
  const [ranks, prices] = stays.length
    ? await Promise.all([getPickRanks(), getStayPriceViews()])
    : [{ today: [] as PickRank[], week: [] as PickRank[] }, {} as Record<number, StayPriceView>];
  const top7 = rankWithFallback(ranks.today, stays, 7);
  const top20 = rankWithFallback(ranks.week, stays, 20);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-5 pb-12">
      <h1 className="text-[24px] font-extrabold tracking-tight leading-tight">
        아이랑 숙소 PICK
        <span className="block text-[17px] font-bold text-text-muted mt-1">— 줍줍스테이·줍줍파파</span>
      </h1>
      <p className="ds-explain mt-1">{LEAD}</p>
      {stays.length > 0 && (
        <script
          type="application/ld+json"
          // 숙소 이름·소개에 "<"가 들어가도 script 태그가 닫히지 않게 이스케이프
          dangerouslySetInnerHTML={{ __html: JSON.stringify(pickJsonLd(stays)).replace(/</g, "\\u003c") }}
        />
      )}

      {/* 제휴 고지 — 공정위 추천·보증 심사지침: 게시물 첫 부분에 눈에 띄게 */}
      <p className="mt-3 ds-tile text-[13px] leading-relaxed text-text-muted" style={{ padding: "10px 14px" }} role="note">
        <b className="text-text">제휴 고지</b> · {DISCLOSURE}
      </p>

      {stays.length === 0 ? (
        <div className="ds-card mt-6 text-center py-10">
          <div className="text-[40px]" aria-hidden="true">🏡</div>
          <div className="ds-h2 mt-2">곧 첫 숙소가 올라와요</div>
          <p className="ds-explain mt-1">아이랑 가기 좋은 숙소를 열심히 고르는 중이에요.</p>
        </div>
      ) : (
        <>
          <SectionTitle note={ranks.today.length ? "오늘 클릭 기준" : undefined}>🔥 오늘 가장 많이 본 숙소 TOP 7</SectionTitle>
          <ul className="mt-3 -mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 ds-chipnav pb-1">
            {top7.map((s, i) => (
              <StayMiniCard key={s.no} stay={s} rank={i + 1} price={prices[s.no]} />
            ))}
          </ul>

          <SectionTitle note={ranks.week.length ? "최근 7일 클릭 기준" : undefined}>📅 주간 인기 숙소 TOP 20</SectionTitle>
          <ul className="mt-3 space-y-3">
            {top20.map((s, i) => (
              <StayRow key={s.no} stay={s} rank={i + 1} price={prices[s.no]} />
            ))}
          </ul>

          <SectionTitle note={`총 ${stays.length}곳`}>📚 숙소 리스트</SectionTitle>
          <StaySearch stays={stays} prices={prices} />
        </>
      )}

      <footer className="mt-10 pt-4 border-t border-line">
        <p className="ds-meta">※ {DISCLOSURE} 가격·객실 상황은 수시로 바뀌니 예약 전 꼭 확인하세요.</p>
        <p className="ds-meta mt-2">
          ※ 카드의 가격은 쿠팡트래블에서 조회일에 확인한 성인 2명·객실 1개·1박(체크인 날짜 기준, 세금·봉사료 포함 표기) 금액이에요.
          다른 곳이 더 쌀 수 있고, 지금 가격과 다를 수 있어요.
        </p>
        <p className="ds-meta mt-2">
          ※ 예약 버튼 아래 금액은 주 1회 같은 체크인 날짜·성인 2명·객실 1개·1박 조건으로 쿠팡과 트립닷컴에서 확인일에 본 가장 싼 객실
          금액이에요. ‘이 날짜 더 저렴’은 두 곳 모두 세금 포함 금액으로 확인됐을 때 그 날짜에만 해당해요.
        </p>
        <p className="ds-meta mt-2">
          <Link href="/" prefetch={false} className="underline">
            kr-stocks.com
          </Link>
          {" · "}
          <Link href="/privacy" prefetch={false} className="underline">
            개인정보처리방침
          </Link>
        </p>
      </footer>
    </main>
  );
}
