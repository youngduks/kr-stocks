// 시세 허브 (2026-11-16 정보 구조 재정비) — 홈에 있던 종목 목록(한국·비상장·미국·ETF·글로벌)을 한곳에.
// 짧은 주소 /private · /korea · /us · /global 은 next.config.mjs 리디렉트로 이 페이지의 해당 카드(#id)로 온다.
import type { Metadata } from "next";
import { fetchAllPrices } from "@/lib/fetchPrices";
import { fetchSparkCloses } from "@/lib/fetchCandles";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { PageTitle } from "@/components/ui/PageTitle";
import { LinkRow } from "@/components/ui/LinkRow";
import AffiliateStrip from "@/components/AffiliateStrip";
import { KoreaStocksCard, CategoryStockCards, groupRest } from "@/components/markets/MarketLists";

export const revalidate = 120; // 홈과 같은 주기 — 같은 fetch 캐시를 공유

const URL = "https://kr-stocks.com/markets";
const TITLE = "24시간 시세 — 한국·미국·비상장·글로벌 지수";
const DESC =
  "삼성전자·SK하이닉스·현대차, 미국 주식(SpaceX·Anthropic 포함), 비상장 빅테크(OpenAI), 글로벌 지수 시세를 한 화면에서. 한국 정규장이 닫힌 밤·주말에도 24시간 참조가로 이어서 볼 수 있어요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESC, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default async function MarketsPage() {
  const data = await fetchAllPrices();
  const koreaRows = data.symbols.filter((r) => r.category === "korea" && !r.is_fx);
  const sparks = await Promise.all(koreaRows.map((r) => fetchSparkCloses(r)));
  const groups = groupRest(data.symbols);
  const jumps = [
    ...(koreaRows.length > 0 ? [{ id: "korea", label: "한국", n: koreaRows.length }] : []),
    ...groups.map((g) => ({ id: g.cat as string, label: g.label.ko.replace(/ (주식|회사|지수)$/, ""), n: g.rows.length })),
  ];

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} asOf={data.fetched_at} />

      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-2 pb-12">
        <PageTitle eyebrow="한국 정규장이 닫혀도 끊기지 않는 24시간 참조가" title="시세" backHref="/" />

        {/* 카드 바로가기 — 페이지 안 이동만 (종목 수가 많은 미국 주식까지 한 번에) */}
        <nav aria-label="시세 구역 바로가기" className="flex flex-wrap gap-2 mt-3">
          {jumps.map((j) => (
            <a
              key={j.id}
              href={`#${j.id}`}
              className="inline-flex items-center min-h-[44px] px-3 rounded-tile bg-bg-hover text-[14px] font-bold text-text-muted hover:text-text transition"
            >
              {j.label} <span className="ds-meta ml-1 num">{j.n}</span>
            </a>
          ))}
        </nav>

        <KoreaStocksCard rows={koreaRows} sparks={sparks} className="mt-4 mb-4" />

        <section className="ds-card mb-4" style={{ padding: "8px 20px" }} aria-labelledby="kr-etf-h">
          <div className="pt-3 pb-1">
            <h2 id="kr-etf-h" className="text-[17px] font-extrabold">
              한국 지수 대신 보는 미국 상장 ETF
            </h2>
          </div>
          <LinkRow href="/korea/kospi-night" title="코스피 야간 (EWY)" desc="코스피 야간선물 대신 보는 한국 ETF 24시간 시세" />
          <LinkRow href="/korea/koru" title="KORU" note="3배 레버리지" desc="한국 지수 3배 ETF 24시간 시세와 구조" />
        </section>

        <CategoryStockCards groups={groups} />

        {/* 광고 — 페이지 끝 섹션 경계, 첫 화면 밖, 페이지당 1개(11/18 대표님 결정판 d10). AdSense 는 홈 1자리만 → AdFit 만 */}
        <AdSlot
          adfitMobile={{ unit: "DAN-sRrDqAryVxJFyyGr", width: 320, height: 50 }}
          adfitDesktop={{ unit: "DAN-1gxi6c73rjhTXT18", width: 728, height: 90 }}
        />

        <AffiliateStrip />

        <p className="ds-meta pt-2">
          정규장이 닫힌 시간의 가격은 무기한 선물(perp) 시세라 거래소 정규장 가격과 다를 수 있어요. 비상장 회사 가격은 추정치예요.
          매매 권유가 아니에요.
        </p>
      </main>

      <Footer />
    </>
  );
}
