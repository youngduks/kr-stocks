import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import type { Metadata } from "next";
import { ShoppingList, type DealMeta } from "./ShoppingList";
import { DealCard, isVerified, VERIFIED_MIN_PCT, type DealView } from "./DealCard";
import { PageTitle } from "@/components/ui/PageTitle";
import { MoreDetails } from "@/components/ui/MoreDetails";
import { AsOf } from "@/components/ui/AsOf";

// 백엔드(jubjub_shop_fetcher.py, launchd 2분 주기)가 아르카라이브에서 쿠팡 스토어
// 딜만 골라 deals.json으로 발행 → jubjub-shop.vercel.app에 정적 배포(30분 주기, 변경 시만).
// 이 페이지는 그 JSON을 그대로 읽어 kr-stocks.com 자체 스타일로 렌더링.
// JUBJUB_DEALS_URL: 로컬 검증용 오버라이드(미설정 시 운영 URL).
const DEALS_SOURCE = process.env.JUBJUB_DEALS_URL || "https://jubjub-shop.vercel.app/deals.json";
export const revalidate = 300;

type Deal = {
  id: string;
  cat: string;
  title: string;
  product: string;
  store: string;
  price: string;
  shipping: string;
  link: string;
  ts: number;
  comments?: number;
  views?: number;
  rec?: number;
  score?: number;
  market_price?: string;
  discount_pct?: number;
  price_ref?: "toss_original" | "danawa_avg" | null;
  affiliate_url?: string;
  chips?: string[];
  // 폴센트 '최근 2개월 최저가' 행(2026-09-29, 배포 스냅샷에서 merge_fallcent.py가 병합)
  source?: string;
  badge?: string;
  price_krw?: number;
  is_low60?: boolean;
  low60?: number | null;
  avg60?: number | null;
  hist?: [string, number][] | null;
  img?: string | null;
};

// updated: deals.json 발행 시각(epoch 초) — 상태 카드 'HH:MM 기준'에 사용
async function fetchDeals(): Promise<{ deals: Deal[]; updated: number | null }> {
  try {
    const res = await fetch(DEALS_SOURCE, { next: { revalidate } });
    if (!res.ok) return { deals: [], updated: null };
    const data = await res.json();
    const updated = typeof data.updated === "number" && data.updated > 0 ? data.updated : null;
    return { deals: (data.deals ?? []) as Deal[], updated };
  } catch {
    return { deals: [], updated: null };
  }
}

export const metadata: Metadata = {
  title: "쿠팡·토스쇼핑 핫딜 — 줍줍쇼핑",
  description:
    "쿠팡·토스쇼핑 핫딜만 골라서 시세 대비 할인율까지 자동 계산. 가격오류 의심 초특가는 별도 배지로 표시.",
  keywords: ["쿠팡 핫딜", "토스쇼핑 핫딜", "쿠팡 특가", "가격오류", "줍줍쇼핑", "쿠팡 최저가"],
  openGraph: {
    title: "쿠팡·토스쇼핑 핫딜 — 줍줍쇼핑",
    description: "쿠팡·토스쇼핑 핫딜만 골라서 시세 대비 할인율까지 자동 계산.",
    url: "https://kr-stocks.com/shopping",
    type: "website",
  },
  alternates: {
    canonical: "https://kr-stocks.com/shopping",
  },
};

function timeAgo(ts: number): string {
  const diffMin = Math.max(0, Math.floor((Date.now() / 1000 - ts) / 60));
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}시간 전`;
  return `${Math.floor(diffH / 24)}일 전`;
}

// 백엔드 cat → 표시 칩 그룹(2026-09 리디자인 B: 전체/📉 최저가/육아/식품/생활/가전/뷰티(+기타)).
// 예전 '전자제품'(전자·IT)·'가전'(가전·컴퓨터) 두 탭은 '가전' 하나로 합침.
function catGroup(cat: string): string {
  if (cat === "가전·컴퓨터" || cat === "전자·IT") return "가전";
  if (cat === "육아용품") return "육아";
  if (cat === "식품") return "식품";
  if (cat === "생활용품") return "생활";
  if (cat === "화장품") return "뷰티";
  return "기타";
}

// 전체 탭에서 가전(전자·IT 포함)을 상단으로 — 형님 지시(2026-08-01): 식품이 물량 대부분을
// 차지해 전자·IT/가전이 아래로 밀려나는데, 오디언스(주식·코인 트레이더) 정합도 높고
// 객단가도 훨씬 커서 매출 기여가 큰 카테고리를 먼저 보여줘야 함.
const PRIORITY_GROUPS = new Set(["가전"]);
// 우선순위 신선도 상한 — 형님 지적(2026-08-03): 오래된 전자제품이 상단 고정 노출되는 것 방지.
const PRIORITY_FRESH_DAYS = 3;

// 폴센트 행 → 표시용 필드. 평균 대비 하락률은 avg60이 현재가보다 높을 때만(0% 이하는 숨김).
function fallcentView(d: Deal): Partial<DealView> {
  const price = d.price_krw ?? 0;
  const avg = d.avg60 ?? 0;
  const hist = Array.isArray(d.hist)
    ? d.hist.filter((p) => Array.isArray(p) && typeof p[1] === "number" && p[1] > 0)
    : [];
  return {
    lowest60: true,
    badge: d.badge || "최근 2개월 최저가",
    img: d.img && d.img.startsWith("https://") ? d.img : undefined,
    avg60: avg > 0 ? avg : undefined,
    avg60Str: avg > 0 ? `${avg.toLocaleString("ko-KR")}원` : undefined,
    avgDropPct: avg > 0 && price > 0 && avg > price ? Math.round(((avg - price) / avg) * 100) : undefined,
    hist: hist.length >= 2 ? hist.map((p) => p[1]) : undefined,
    histFrom: hist.length >= 2 ? hist[0][0] : undefined,
  };
}

function hhmmKst(sec: number): string {
  return new Date(sec * 1000).toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function ShoppingPage() {
  const [data, { deals, updated }] = await Promise.all([fetchAllPrices(), fetchDeals()]);
  const nowSec = Date.now() / 1000;
  const isFresh = (ts: number) => nowSec - ts <= PRIORITY_FRESH_DAYS * 86400;
  const views: DealView[] = [...deals]
    .sort((a, b) => {
      const aPri = PRIORITY_GROUPS.has(catGroup(a.cat)) && isFresh(a.ts) ? 1 : 0;
      const bPri = PRIORITY_GROUPS.has(catGroup(b.cat)) && isFresh(b.ts) ? 1 : 0;
      if (aPri !== bPri) return bPri - aPri;
      return (b.score ?? 0) - (a.score ?? 0) || b.ts - a.ts;
    })
    .map((d) => ({
      id: d.id,
      title: d.title,
      product: d.product,
      store: d.store,
      price: d.price,
      shipping: d.shipping,
      link: d.link,
      score: d.score,
      market_price: d.market_price,
      discount_pct: d.discount_pct,
      price_ref: d.price_ref,
      affiliate_url: d.affiliate_url,
      timeAgoStr: timeAgo(d.ts),
      catGroup: catGroup(d.cat),
      ...(d.source === "fallcent" ? fallcentView(d) : {}),
    }));

  const lowCount = views.filter((v) => v.lowest60).length;
  const babyCount = views.filter((v) => v.catGroup === "육아").length;
  const asOfSec = updated ?? (deals.length ? Math.max(...deals.map((d) => d.ts || 0)) : null);

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />
      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-4 pb-12">
        {/* 카피는 이 사이트 오디언스(주식·코인 트레이더) 맥락 — "오늘 물렸으면, 여기서 쌀먹" 서사 유지 */}
        <PageTitle eyebrow="줍줍쇼핑 · 오늘 물렸으면, 여기서 쌀먹 🛒" title="오늘 싸게 담을 것" backHref="/">
          {asOfSec && <AsOf at={asOfSec * 1000} note="약 30분마다 갱신" />}
        </PageTitle>

        {/* 제휴 고지 — 공정위 추천·보증 심사지침: 게시물 첫 부분에 눈에 띄게(작은 회색 각주 X) */}
        <p className="mt-3 ds-tile text-[13px] leading-relaxed text-text-muted" style={{ padding: "10px 14px" }} role="note">
          <b className="text-text">제휴 고지</b> · 이 페이지는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를
          제공받습니다(토스쇼핑 쉐어링크 포함).
        </p>

        {/* 상태 카드 — 실제 집계 숫자만 */}
        <section className="ds-card mt-3">
          <div className="ds-eyebrow">그래서 오늘은?</div>
          <h2 className="ds-status mt-1" style={{ fontSize: 21 }}>
            {lowCount > 0 ? (
              <>
                최근 2개월 최저가가 <span className="ds-hl">{lowCount}개</span> 떴어요
              </>
            ) : views.length > 0 ? (
              <>
                오늘은 아직 <span className="ds-hl">최저가 확인 딜이 없어요</span>
              </>
            ) : (
              <>아직 수집된 딜이 없어요</>
            )}
          </h2>
          <p className="ds-meta mt-1 num">
            오늘 확인된 최저가 {lowCount}개 · 육아 {babyCount}개{asOfSec ? ` · ${hhmmKst(asOfSec)} 기준` : ""}
          </p>
          <p className="ds-explain mt-2" style={{ fontSize: 14 }}>
            정가 대비 할인율 대신, 쿠팡 60일 가격 기록에서 지금이 가장 싼 딜에만 빨간 배지를 달아요.
          </p>
        </section>

        {views.length === 0 ? (
          <div className="ds-card mt-4 text-center ds-explain">아직 수집된 딜이 없어요. 잠시 후 다시 열어주세요.</div>
        ) : (
          <ShoppingList
            deals={views.map(
              (v): DealMeta => ({ id: v.id, store: v.store, catGroup: v.catGroup, lowest60: !!v.lowest60, verified: isVerified(v) }),
            )}
            cards={Object.fromEntries(views.map((v) => [v.id, <DealCard key={v.id} d={v} />]))}
            flatMinPct={VERIFIED_MIN_PCT}
          />
        )}

        <section className="ds-card mt-6" style={{ paddingTop: 4, paddingBottom: 4 }} aria-label="배지·출처 설명">
          <MoreDetails summary="배지는 어떻게 붙나요?" className="!border-t-0 !mt-0">
            <p>
              <b className="text-up">최근 2개월 최저가</b>: 폴센트가 기록한 쿠팡 60일 가격 중 지금이 가장 쌀 때. 점선은 60일 평균이에요.
            </p>
            <p className="mt-2">
              <b>평균 시세</b>: 다나와 평균가와 비교한 할인율. <b>토스 정가</b>: 토스쇼핑이 표시한 정가 대비 할인율로, 실제 거래 시세가 아니에요.
            </p>
            <p className="mt-2">
              <b className="text-warn">⚠ 가격오류 의심</b>: 평소보다 비정상적으로 싸서 주문이 취소될 수도 있는 딜.
            </p>
          </MoreDetails>
        </section>

        <p className="ds-meta mt-4">
          ※ 딜 출처: 아르카라이브·퀘이사존 핫딜 채널(쿠팡), 토스쇼핑 쉐어링크. 최근 2개월 최저가: 폴센트 60일 가격이력 기준.
          가격·재고는 수시로 변동되니 구매 전 꼭 확인하세요. 구매 버튼은 쿠팡 파트너스 또는 토스쇼핑 쉐어링크 제휴 링크로,
          이 링크로 구매 시 해당 플랫폼으로부터 일정액의 수수료를 제공받습니다.
        </p>
      </main>
      <Footer />
    </>
  );
}
