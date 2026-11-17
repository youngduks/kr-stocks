// 시장 신호 허브 (2026-11-16 정보 구조 재정비) — 홈에 있던 신호 섹션을 옮겨 온 곳:
//   반도체 야간 신호(실제 기록·채점표 포함) · 과거 사례 · 최근 급변 · 인물 지표(요약)
// + 청산맵·인간지표·야간 지표로 가는 입구. 문구·계산은 홈에 있던 그대로(components/signals/SignalCards.tsx).
// 투표 위젯은 여기에 두지 않는다 — scripts/update-poll.mjs 가 고치는 파일은 app/page.tsx 와 app/poll/page.tsx 둘뿐.
import type { Metadata } from "next";
import Link from "next/link";
import { fetchAllPrices } from "@/lib/fetchPrices";
import { fetchSemiSignal } from "@/lib/semiSignal";
import { getHumanIndicators } from "@/lib/humanIndicators";
import { getHistoryStats } from "@/lib/historyStats";
import { getSignalScore } from "@/lib/signalScore";
import { fetchSuddenMoves } from "@/lib/suddenMoves";
import { getSignalLog, summarizeSignalLog } from "@/lib/signalLog";
import { getPollHistory } from "@/lib/pollHistory";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { PageTitle } from "@/components/ui/PageTitle";
import { LinkRow } from "@/components/ui/LinkRow";
import { PersonCardCompact } from "@/components/PersonCard";
import { TomorrowStatusCard, HistoryCard, SuddenMovesCard } from "@/components/signals/SignalCards";

export const revalidate = 120; // 홈과 같은 주기 — 같은 fetch 캐시를 공유

const URL = "https://kr-stocks.com/signals";
const TITLE = "시장 신호 — 미국 반도체 야간 신호·급변·청산맵·인간지표";
const DESC =
  "밤사이 미국 반도체(SOXL) 신호와 그 신호의 실제 기록·채점표, 같은 구간이었던 날의 과거 사례, 최근 6시간 급변, 청산맵·체결강도, 개미 투표 인간지표를 한곳에 모았어요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESC, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default async function SignalsPage() {
  const [data, semiSignal, people, history, signalLog, sudden] = await Promise.all([
    fetchAllPrices(),
    fetchSemiSignal(),
    getHumanIndicators(),
    getHistoryStats(),
    getSignalLog(),
    fetchSuddenMoves().catch(() => null),
  ]);
  const poll = getPollHistory(); // data/polls/history.json (정적) — Redis 없음

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} asOf={data.fetched_at} />

      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-2 pb-12">
        <PageTitle eyebrow="밤사이 분위기 · 급변 · 수급 쏠림 · 군중 심리" title="시장 신호" backHref="/" className="mb-4" />

        {/* ① 미국 반도체 야간 신호 — 실제 기록 + 과거 채점표 포함 (홈 카드는 요약) */}
        <TomorrowStatusCard
          semi={semiSignal}
          fxRate={data.fx.krw_per_usdt}
          fxChange={data.fx.change_24h_pct}
          detail={{ score: getSignalScore(history), record: summarizeSignalLog(signalLog) }}
        />

        {/* ② 과거 사례 — 같은 구간이었던 날의 다음 한국 거래일 (실데이터, n<15 숨김) */}
        <HistoryCard stats={history} usPct={semiSignal.direction === "unknown" ? null : semiSignal.impliedSemiPct} />

        {/* ③ 최근 급변 — 바이낸스 5분봉, 상품별 변동성 기준 (lib/suddenMoves.ts) */}
        <SuddenMovesCard s={sudden} />

        {/* ④ 다른 신호 페이지 입구 */}
        <section className="ds-card mt-4" style={{ padding: "8px 20px" }} aria-labelledby="sig-more-h">
          <div className="pt-3 pb-1">
            <h2 id="sig-more-h" className="text-[17px] font-extrabold">
              다른 신호 보기
            </h2>
          </div>
          <LinkRow
            href="/liquidation"
            title="청산맵 · 체결강도"
            desc="삼성전자·SK하이닉스 선물 체결강도(CVD)와 레버리지 ETF 급락일"
          />
          <LinkRow
            href="/poll"
            title="인간지표"
            note={poll.hitRate !== null ? `군중 적중 ${poll.correctCount}/${poll.resolvedCount}` : undefined}
            desc="내일 오를까 내릴까 — 개미 투표와 실제 결과 비교"
          />
          <LinkRow href="/korea/kospi-night" title="코스피 야간 (EWY)" desc="코스피 야간선물 대신 보는 한국 ETF 24시간 시세" />
          <LinkRow href="/global/vix" title="VIX 공포지수" desc="미국 증시 변동성 지수 24시간 시세" />
        </section>

        {/* ⑤ 인물 지표(번외) — 얇은 카드, 상세는 /poll */}
        {people.length > 0 && (
          <section className="mt-6" aria-labelledby="people-h">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <h2 id="people-h" className="text-[17px] font-extrabold">
                인물 지표 <span className="ds-meta font-medium">역발상 참고용</span>
              </h2>
              <Link href="/poll" prefetch={false} className="inline-flex items-center min-h-[44px] text-[13px] font-bold text-text-muted hover:text-text shrink-0">
                더보기 →
              </Link>
            </div>
            <div className="space-y-2">
              {people.map((p) => (
                <PersonCardCompact key={p.id} person={p} />
              ))}
            </div>
          </section>
        )}

        {/* 광고 — 페이지 끝 섹션 경계, 첫 화면 밖, 페이지당 1개(11/18 대표님 결정판 d10). AdSense 는 홈 1자리만 → AdFit 만 */}
        <AdSlot
          adfitMobile={{ unit: "DAN-sRrDqAryVxJFyyGr", width: 320, height: 50 }}
          adfitDesktop={{ unit: "DAN-1gxi6c73rjhTXT18", width: 728, height: 90 }}
        />

        <p className="ds-meta pt-6">
          신호는 방향을 맞히는 예측이 아니라 지금까지의 숫자를 규칙대로 정리한 요약이에요. 과거에 그랬다고 이번에도 그렇다는 보장은
          없어요. 매매 권유가 아니에요.
        </p>
      </main>

      <Footer />
    </>
  );
}
