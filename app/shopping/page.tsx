import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import Link from "next/link";
import type { Metadata } from "next";

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

const NOTIFY_SCORE_MIN = 4;

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
  title: "쿠팡 핫딜 — 줍줍쇼핑",
  description:
    "쿠팡 핫딜만 골라서 시세 대비 할인율까지 자동 계산. 가격오류 의심 초특가는 별도 배지로 표시.",
  keywords: ["쿠팡 핫딜", "쿠팡 특가", "가격오류", "줍줍쇼핑", "쿠팡 최저가"],
  openGraph: {
    title: "쿠팡 핫딜 — 줍줍쇼핑",
    description: "쿠팡 핫딜만 골라서 시세 대비 할인율까지 자동 계산.",
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

export default async function ShoppingPage() {
  const [data, deals] = await Promise.all([fetchAllPrices(), fetchDeals()]);
  const sorted = [...deals].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.ts - a.ts);

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />
      <main className="max-w-3xl mx-auto px-5 pt-6 pb-12">
        <Link href="/" className="text-xs text-text-dim hover:text-text-muted">
          ← 홈으로
        </Link>

        <article className="mt-4">
          <header className="mb-8">
            <div className="text-xs text-orange-400 font-semibold mb-2 tracking-wider">줍줍쇼핑</div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">🛒 쿠팡 핫딜</h1>
            <p className="text-text-muted text-base leading-relaxed">
              쿠팡 딜만 골라서 네이버 쇼핑 시세 대비 할인율을 자동 계산합니다. 할인율·긴급 키워드·댓글
              증가속도가 겹치면 <span className="text-text font-semibold">🚨 가격오류의심</span> 배지가 붙습니다.
            </p>
          </header>

          {sorted.length === 0 ? (
            <div className="p-8 rounded-xl bg-bg-card border border-line text-center text-text-dim text-sm">
              아직 수집된 딜이 없어요. 잠시 후 다시 열어주세요.
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((d) => {
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
                        <span className="ml-auto text-text-dim">{timeAgo(d.ts)}</span>
                      </div>
                      {d.market_price && d.discount_pct != null && (
                        <div className="mt-2 text-xs text-text-dim">
                          시세 {d.market_price} → <span className="text-accent-amber font-bold">딜가 {d.price} ({d.discount_pct}%↓)</span>
                        </div>
                      )}
                    </a>
                    {d.affiliate_url && (
                      <a
                        href={d.affiliate_url}
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

          <p className="text-[10px] text-text-dim mt-6 leading-relaxed">
            ※ 딜 출처: 아르카라이브 핫딜 채널(쿠팡 스토어만). 가격·재고는 수시로 변동되니 구매 전 꼭 확인하세요.
            "이 가격에 구매하기" 링크는 쿠팡파트너스 제휴 링크로, 이 링크로 구매 시 쿠팡으로부터 일정액의
            수수료를 제공받을 수 있습니다.
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
