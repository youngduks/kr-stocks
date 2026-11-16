// 분석 허브 (2026-11-16 정보 구조 재정비) — 홈에 있던 '한국주식 종합 분석'(HomeHero)을 옮겨 오고,
// 증권사 목표가·뉴스룸·자사주매입·리서치로 가는 입구를 모은 곳. 새 수집·Redis 없음.
import type { Metadata } from "next";
import { fetchAllPrices } from "@/lib/fetchPrices";
import { getAllConsensus } from "@/lib/consensus";
import { RESEARCH } from "@/lib/research";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HomeHero } from "@/components/HomeHero";
import { PageTitle } from "@/components/ui/PageTitle";
import { LinkRow } from "@/components/ui/LinkRow";

export const revalidate = 120; // 홈과 같은 주기 — 같은 fetch 캐시를 공유

const URL = "https://kr-stocks.com/analysis";
const TITLE = "분석 — 증권사 목표가·수급·뉴스·리서치";
const DESC =
  "삼성전자·SK하이닉스·현대차의 증권사 평균 목표가와 상승여력, 외국인·기관 5일 수급, 선물 베팅 쏠림을 한 화면에 요약하고, 목표가 상세·뉴스룸·자사주매입 현황·검증형 리서치로 이어져요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESC, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default async function AnalysisPage() {
  const data = await fetchAllPrices();
  const consensusCount = getAllConsensus().length;

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} asOf={data.fetched_at} />

      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-2 pb-12">
        <PageTitle eyebrow="목표가 · 수급 · 뉴스 · 검증형 리서치" title="분석" backHref="/" className="mb-4" />

        {/* ① 한국주식 종합 분석 — 홈에서 옮김 (컴포넌트 그대로) */}
        <HomeHero rows={data.symbols} locale="ko" />

        {/* ② 분석 페이지 입구 */}
        <section className="ds-card mb-4" style={{ padding: "8px 20px" }} aria-labelledby="an-more-h">
          <div className="pt-3 pb-1">
            <h2 id="an-more-h" className="text-[17px] font-extrabold">
              자세히 보기
            </h2>
          </div>
          <LinkRow
            href="/consensus"
            title="증권사 목표가"
            note={consensusCount > 0 ? `${consensusCount}종목` : undefined}
            desc="삼성전자·SK하이닉스·현대차 증권사 평균 목표가와 상승여력"
          />
          <LinkRow href="/news" title="뉴스룸" desc="국제정세·삼성전자·SK하이닉스·현대차 뉴스와 공시, 1시간마다 수집" />
          <LinkRow href="/korea/hynix/buyback" title="SK하이닉스 자사주매입" desc="일별 체결 추이와 취득 진행률" />
        </section>

        {/* ③ 리서치 글 — /research 목록과 같은 데이터(lib/research.ts) */}
        <section className="ds-card" style={{ padding: "8px 20px" }} aria-labelledby="an-research-h">
          <div className="flex items-center justify-between gap-3 pt-3 pb-1">
            <h2 id="an-research-h" className="text-[17px] font-extrabold">
              리서치
            </h2>
            <span className="ds-meta">숫자로 검증한 글</span>
          </div>
          {RESEARCH.map((r) => (
            <LinkRow key={r.slug} href={`/research/${r.slug}`} title={r.title} desc={`${r.summary} · ${r.date.replace(/-/g, ".")} 기준`} />
          ))}
          <LinkRow href="/research" title="리서치 전체 보기" />
        </section>

        <p className="ds-meta pt-4">정보 제공용이며 투자 권유·자문이 아닙니다. 목표가는 증권사 의견의 평균일 뿐 가격을 보장하지 않습니다.</p>
      </main>

      <Footer />
    </>
  );
}
