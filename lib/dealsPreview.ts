// 홈 '핫딜' 미리보기 — /shopping 과 같은 소스(deals.json)·같은 revalidate 로 fetch → Next 데이터 캐시 공유.
const DEALS_SOURCE = process.env.JUBJUB_DEALS_URL || "https://jubjub-shop.vercel.app/deals.json";

export type DealPreview = {
  id: string;
  product: string;
  price: string;
  store: string;
  discountPct: number | null;
  lowest60: boolean;
};

export async function fetchDealsPreview(limit = 3): Promise<DealPreview[]> {
  try {
    const res = await fetch(DEALS_SOURCE, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    const deals: any[] = Array.isArray(data?.deals) ? data.deals : [];
    const nowSec = Date.now() / 1000;
    return deals
      .filter((d) => d && typeof d.id === "string" && (d.product || d.title) && d.price)
      // 최근 3일 이내 딜만 (오래된 딜 고정 노출 방지 — /shopping 우선순위 규칙과 동일한 신선도 기준)
      .filter((d) => typeof d.ts !== "number" || nowSec - d.ts <= 3 * 86400 || d.source === "fallcent")
      .map((d) => {
        const disc =
          typeof d.discount_pct === "number"
            ? d.discount_pct
            : d.source === "fallcent" && d.avg60 > 0 && d.price_krw > 0 && d.avg60 > d.price_krw
              ? Math.round(((d.avg60 - d.price_krw) / d.avg60) * 100)
              : null;
        return {
          id: d.id as string,
          product: String(d.product || d.title),
          price: String(d.price),
          store: String(d.store || ""),
          discountPct: disc,
          lowest60: d.source === "fallcent",
          _score: typeof d.score === "number" ? d.score : 0,
        };
      })
      .sort((a, b) => (b.discountPct ?? -1) - (a.discountPct ?? -1) || b._score - a._score)
      .slice(0, limit)
      .map(({ _score, ...rest }) => rest);
  } catch {
    return [];
  }
}
