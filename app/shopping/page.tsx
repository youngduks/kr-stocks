import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import Link from "next/link";
import type { Metadata } from "next";
import { ShoppingList, type DealView } from "./ShoppingList";

// 백엔드(jubjub_shop_fetcher.py, launchd 2분 주기)가 아르카라이브에서 쿠팡 스토어
// 딜만 골라 deals.json으로 발행 → jubjub-shop.vercel.app에 정적 배포(30분 주기, 변경 시만).
// 이 페이지는 그 JSON을 그대로 읽어 kr-stocks.com 자체 스타일로 렌더링.
const DEALS_SOURCE = "https://jubjub-shop.vercel.app/deals.json";
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
  affiliate_url?: string;
  chips?: string[];
};

async function fetchDeals(): Promise<Deal[]> {
  try {
    const res = await fetch(DEALS_SOURCE, { next: { revalidate } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.deals ?? []) as Deal[];
  } catch {
    return [];
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

// 백엔드 cat을 표시 탭으로 매핑. 생활용품·화장품은 아르카 자체 카테고리에서
// 실제로 딜이 꾸준히 나와(2026-07-31 실측) '기타'에 묻히지 않게 별도 탭으로 분리.
function catGroup(cat: string): string {
  if (cat === "가전·컴퓨터") return "가전";
  if (cat === "육아용품") return "육아";
  if (cat === "식품") return "식품";
  if (cat === "전자·IT") return "전자제품";
  if (cat === "생활용품") return "생활용품";
  if (cat === "화장품") return "화장품";
  return "기타";
}

// 전체 탭에서 가전·전자제품을 상단으로 — 형님 지시(2026-08-01): 식품이 물량 대부분을
// 차지해 전자·IT/가전이 아래로 밀려나는데, 오디언스(주식·코인 트레이더) 정합도 높고
// 객단가도 훨씬 커서(TCL 모니터 ₩42만 등) 매출 기여가 큰 카테고리를 먼저 보여줘야 함
// (Fable 분석 P1-5와 동일 방향). 카테고리별 탭(전자제품 탭 등)은 이미 단일 카테고리라
// 이 우선순위와 무관 — '전체' 탭에서만 체감됨.
const PRIORITY_GROUPS = new Set(["전자제품", "가전"]);
// 우선순위 신선도 상한 — 형님 지적(2026-08-03): 상단 4칸을 6~12일 된 전자제품이
// 계속 점유해 "업데이트 안 된다"는 체감을 줌. 전자제품이라도 오래되면 일반 정렬로
// 내려가야 매번 같은 딜이 고정 노출되는 걸 막을 수 있음.
const PRIORITY_FRESH_DAYS = 3;

export default async function ShoppingPage() {
  const [data, deals] = await Promise.all([fetchAllPrices(), fetchDeals()]);
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
      affiliate_url: d.affiliate_url,
      timeAgoStr: timeAgo(d.ts),
      catGroup: catGroup(d.cat),
    }));

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />
      <main className="max-w-3xl mx-auto px-5 pt-6 pb-12">
        <Link href="/" className="text-xs text-text-dim hover:text-text-muted">
          ← 홈으로
        </Link>

        <article className="mt-4">
          {/* 카피는 이 사이트 오디언스(주식·코인 트레이더) 맥락에 맞춤 —
              "주식으로 받은 스트레스, 소비로 푼다 / 잃었으면 쌀먹이라도" 서사.
              단순 '핫딜 모음'이 아니라 여기 방문자가 공감할 이유를 만들어 유입 전환. */}
          <header className="mb-8">
            <div className="text-xs text-orange-400 font-semibold mb-2 tracking-wider">줍줍쇼핑</div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              🛒 오늘 물렸으면, 여기서 쌀먹
            </h1>
            <p className="text-text-muted text-base leading-relaxed">
              주식은 물타기 하면 안 되지만, 장바구니는 물타기 해도 됩니다.
              <br className="hidden sm:block" />
              시세보다 확실히 싼 쿠팡·토스쇼핑 딜만 골라 <span className="text-accent-green font-semibold">평균가 대비 할인율</span>을
              자동 계산합니다. 주식처럼 <span className="text-text font-semibold">저점에서 담으세요.</span>
            </p>
            <p className="text-text-dim text-xs mt-3 leading-relaxed">
              💡 30% 이상 싸면 <span className="text-accent-green font-semibold">📉 지금이 저점</span> 배지가,
              가격오류로 의심될 만큼 비정상적으로 싸면 <span className="text-red-400 font-semibold">🚨 가격오류의심</span> 배지가 붙습니다.
            </p>
          </header>

          {views.length === 0 ? (
            <div className="p-8 rounded-xl bg-bg-card border border-line text-center text-text-dim text-sm">
              아직 수집된 딜이 없어요. 잠시 후 다시 열어주세요.
            </div>
          ) : (
            <ShoppingList deals={views} />
          )}

          <p className="text-[10px] text-text-dim mt-6 leading-relaxed">
            ※ 딜 출처: 아르카라이브·퀘이사존 핫딜 채널(쿠팡), 토스쇼핑 쉐어링크. 가격·재고는 수시로 변동되니 구매 전 꼭 확인하세요.
            "이 가격에 구매하기" 링크는 쿠팡 파트너스 또는 토스쇼핑 쉐어링크 제휴 링크로, 이 링크로 구매 시
            해당 플랫폼으로부터 일정액의 수수료를 제공받습니다.
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
