import { fetchAllPrices } from "@/lib/fetchPrices";
import { CATEGORY_LABELS, type SymbolMeta } from "@/lib/universe";
import { PriceCard } from "@/components/PriceCard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HomeHero } from "@/components/HomeHero";
import { SemiconductorSignal } from "@/components/SemiconductorSignal";
import { PollWidget } from "@/components/PollWidget";
import AffiliateStrip from "@/components/AffiliateStrip";
import { fetchSemiSignal } from "@/lib/semiSignal";
import { KakaoAdFit } from "@/components/KakaoAdFit";

export const revalidate = 120; // ISR 캐시 30s → 120s (Free tier 최적화, 5/25)

export default async function Home() {
  const [data, semiSignal] = await Promise.all([fetchAllPrices(), fetchSemiSignal()]);

  // 카테고리 순서 (형님 명시): 한국주식 → 비상장 → 미국주식 → ETF(테마) → 글로벌 지수
  const order: SymbolMeta["category"][] = ["korea", "private", "us", "themes", "global"];
  const grouped = order.map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    // is_fx(원화 환율)는 헤더 환율 위젯과 소스가 달라(HL perp vs 업비트) 숫자가 어긋나 보임 → 홈 그리드 제외
    rows: data.symbols.filter((r) => r.category === cat && !r.is_fx),
  }));

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />

      <main className="max-w-6xl mx-auto px-5 pt-6 pb-12">
        <section className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2">24시간 글로벌 자산 시세</h1>
          <div className="text-sm text-text-muted leading-relaxed">
            <div>한국 정규장 휴장에도 끊기지 않는 실시간 가격.</div>
            <div>비상장 빅테크 포함. (SpaceX·OpenAI·Anthropic)</div>
          </div>
        </section>

        {/* 미장 반도체 야간 시그널 — 최상단. 한국 개장 전 SOXL(3x)로 삼성·하이닉스 내일 방향 미리보기 */}
        <SemiconductorSignal signal={semiSignal} locale="ko" />

        {/* 인간지표 — 내일 상승/하락 투표 (NXT 프리장 오픈 전 마감). 지난 결과 → /poll */}
        <PollWidget
          pollId="market-updown-2026-07-21"
          title="인간지표 — 내일 상승 vs 하락"
          question="7/21(화) 한국 증시, 오를까요 내릴까요?"
          yesLabel="📈 상승"
          noLabel="📉 하락"
          historyHref="/poll"
        />

        {/* 카카오 AdFit 배너 — 같은 자리에서 모바일/PC 유닛 반응형 전환 */}
        <KakaoAdFit unit="DAN-sRrDqAryVxJFyyGr" width={320} height={50} className="flex md:hidden" />
        <KakaoAdFit unit="DAN-1gxi6c73rjhTXT18" width={728} height={90} className="hidden md:flex" />

        {grouped.map(({ cat, label, rows }) => (
          <div key={cat}>
            <section className="mb-10">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-lg font-bold text-text">
                  <span className="mr-2">{label.emoji}</span>{label.ko}
                  <span className="ml-2 text-xs text-text-dim font-medium">{rows.length}종목</span>
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {rows.map((row) => (
                  <PriceCard key={row.slug} row={row} />
                ))}
              </div>
            </section>

            {/* 한국주식 종합 분석 — '한국 주식' 섹션 바로 밑 (형님 지시 7/2) */}
            {cat === "korea" && <HomeHero rows={data.symbols} locale="ko" />}
          </div>
        ))}

        <div className="mt-8 p-4 rounded-xl bg-bg-card border border-line text-xs text-text-dim">
          <span className="font-semibold text-text-muted">⏱ 마지막 업데이트:</span> {new Date(data.fetched_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
          <span className="ml-3 text-text-dim">(30초마다 자동 갱신)</span>
        </div>

        <AffiliateStrip />
      </main>

      <Footer />
    </>
  );
}
