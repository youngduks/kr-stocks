import Link from "next/link";
import { fetchAllPrices } from "@/lib/fetchPrices";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PollWidget } from "@/components/PollWidget";
import AffiliateStrip from "@/components/AffiliateStrip";
import { fetchSemiSignal } from "@/lib/semiSignal";
import { AdSlot } from "@/components/AdSlot";
import { fetchSparkCloses } from "@/lib/fetchCandles";
import { fetchDealsPreview } from "@/lib/dealsPreview";
import { TodayBrief } from "@/components/home/TodayBrief";
import { HomeEntries } from "@/components/home/HomeEntries";
import { getUpcomingEvents } from "@/lib/events";
import { TomorrowStatusCard, SIGNAL_METHOD_A } from "@/components/signals/SignalCards";
import { KoreaStocksCard, groupRest } from "@/components/markets/MarketLists";

export const revalidate = 120; // ISR 캐시 30s → 120s (Free tier 최적화, 5/25)

// ── 2026-11-16 정보 구조 재정비 ──
// 홈 = "지금 상태 요약 + 카테고리 입구". 예전에 홈에 쌓여 있던 섹션은 지우지 않고 카테고리 허브로 옮김:
//   최근 급변 · 신호 실제 기록 · 채점표 · 과거 사례 · 인물 지표 → /signals (components/signals/SignalCards.tsx)
//   한국주식 종합 분석(HomeHero)                               → /analysis
//   비상장·미국·ETF·글로벌 종목 목록                            → /markets (components/markets/MarketLists.tsx)
//   핫딜 미리보기 3줄                                          → 입구 카드 한 줄(전체는 /shopping)
// 카테고리 정의는 lib/nav.ts.

// 홈 구조화 데이터 — WebSite·Organization + 화면에 실제로 있는 문답 1건(FAQPage). 정적 값만.
// 홈 구조화 데이터 — WebSite·Organization + 화면에 실제로 있는 문답 1건(FAQPage). 정적 값만.
const HOME_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://kr-stocks.com/#website", // 다른 페이지 JSON-LD(isPartOf)가 이 @id를 참조 — 바꾸지 말 것
    name: "KR Stocks",
    alternateName: "kr-stocks.com",
    url: "https://kr-stocks.com",
    inLanguage: "ko-KR",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://kr-stocks.com/#organization", // 다른 페이지 JSON-LD(publisher)가 이 @id를 참조 — 바꾸지 말 것
    name: "KR Stocks",
    url: "https://kr-stocks.com",
    email: "contact@kr-stocks.com",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "이 신호는 어떻게 만드나요?",
        acceptedAnswer: { "@type": "Answer", text: SIGNAL_METHOD_A },
      },
    ],
  },
];

export default async function Home() {
  const [data, semiSignal, deals] = await Promise.all([fetchAllPrices(), fetchSemiSignal(), fetchDealsPreview(1)]);

  // is_fx(원화 환율)는 헤더 환율 위젯과 소스가 달라(HL perp vs 업비트) 숫자가 어긋나 보임 → 리스트 제외
  const koreaRows = data.symbols.filter((r) => r.category === "korea" && !r.is_fx);
  const sparks = await Promise.all(koreaRows.map((r) => fetchSparkCloses(r)));
  const restRows = groupRest(data.symbols).flatMap((g) => g.rows);

  return (
    <>
      {HOME_JSON_LD.map((ld) => (
        <script key={ld["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} asOf={data.fetched_at} />

      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-2 pb-12">
        <h1 className="ds-meta mb-3">
          24시간 글로벌 자산 시세 · 한국 정규장 휴장에도 끊기지 않는 실시간 가격 · 비상장 빅테크(SpaceX·OpenAI·Anthropic) 포함
        </h1>

        {/* ① 오늘 한눈에 — 받은 실데이터를 규칙 문장 3줄로 + 다가오는 일정 D-day (새 fetch·Redis 없음) */}
        <TodayBrief
          semi={semiSignal}
          fxRate={data.fx.krw_per_usdt}
          fxChange={data.fx.change_24h_pct}
          events={getUpcomingEvents()}
        />

        {/* ② 상태 카드(요약) — 미장 반도체 야간 신호 + 환율. 실제 기록·채점표·과거 사례·최근 급변은 /signals */}
        <TomorrowStatusCard
          semi={semiSignal}
          fxRate={data.fx.krw_per_usdt}
          fxChange={data.fx.change_24h_pct}
          moreHref="/signals"
        />

        {/* ③ 한국 주식 — 1줄 = 1종목. 나머지 종목은 /markets */}
        <KoreaStocksCard
          rows={koreaRows}
          sparks={sparks}
          footer={
            <Link
              href="/markets"
              prefetch={false}
              className="flex items-center justify-center min-h-[48px] text-[15px] font-bold text-down border-t border-line"
            >
              미국·비상장·지수 {restRows.length}종목 전체 시세 보기 →
            </Link>
          }
        />

        {/* ④ 인간지표 — 내일 상승/하락 투표 (NXT 프리장 오픈 전 마감). 지난 결과 → /poll
            ⚠ pollId / question 은 scripts/update-poll.mjs 가 정규식으로 매일 교체 — 이 파일(app/page.tsx)·속성 형태 유지 */}
        <div className="mt-4">
          <PollWidget
            pollId="market-updown-2026-11-16"
            title="인간지표 · 재미로 보는 군중 예측"
            question="11/16(월) 한국 증시, 오를까요 내릴까요?"
            yesLabel="▲ 오른다"
            noLabel="▼ 내린다"
            historyHref="/poll"
          />
        </div>

        {/* ⑤ 카테고리 입구 — 홈에서 빠진 섹션이 있는 곳으로 안내 (이미 받은 데이터로 한 줄 요약, 새 fetch 없음) */}
        <HomeEntries rows={data.symbols} restRows={restRows} semi={semiSignal} deal={deals[0] ?? null} />

        {/* ⑥ 광고 — 페이지 끝 섹션 경계, 첫 화면 밖. 투표 버튼과는 입구 카드 블록(300px+)만큼 떨어져 있음.
            모바일 페이지당 1개. AdFit 유닛 ID 유지 */}
        <AdSlot
          adsenseSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME}
          adfitMobile={{ unit: "DAN-sRrDqAryVxJFyyGr", width: 320, height: 50 }}
          adfitDesktop={{ unit: "DAN-1gxi6c73rjhTXT18", width: 728, height: 90 }}
        />

        <AffiliateStrip />
      </main>

      <Footer />
    </>
  );
}
