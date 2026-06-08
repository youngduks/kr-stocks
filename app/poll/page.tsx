import { fetchAllPrices } from "@/lib/fetchPrices";
import { getPollHistory, type EnrichedPollHistory } from "@/lib/pollHistory";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PollWidget } from "@/components/PollWidget";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "인간지표 — 개미 투표 vs 실제 결과 | kr-stocks.com",
  description:
    "개미들의 내일 상승/하락 집단예측과 실제 시장 결과를 비교. 군중은 시장을 맞힐까? 지난 투표 적중률과 결과를 확인하세요.",
  alternates: { canonical: "https://kr-stocks.com/poll" },
  openGraph: {
    title: "인간지표 — 개미 투표 vs 실제 결과",
    description: "개미들의 집단예측 vs 실제 시장 결과. 지난 투표 적중률 공개.",
    url: "https://kr-stocks.com/poll",
    type: "website",
  },
};

function outcomeLabel(o: EnrichedPollHistory["outcome"]): string {
  return o === "up" ? "상승" : o === "down" ? "하락" : "보합";
}

function HistoryCard({ p }: { p: EnrichedPollHistory }) {
  const crowdLabel =
    p.crowdPick === "up"
      ? p.yesLabel
      : p.crowdPick === "down"
        ? p.noLabel
        : "동률";

  return (
    <div className="rounded-xl bg-bg-card border border-line p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
        <div className="text-base font-bold text-text">{p.dateLabel}</div>
        {p.correct !== null && (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              p.correct
                ? "bg-green-500/15 text-green-500"
                : "bg-red-500/15 text-red-500"
            }`}
          >
            {p.correct ? "✅ 적중" : "❌ 빗나감"}
          </span>
        )}
      </div>
      <div className="text-sm text-text-muted mb-3">{p.question}</div>

      <div className="space-y-2 mb-3">
        <div>
          <div className="flex items-center justify-between text-xs text-text-muted mb-1">
            <span className={p.crowdPick === "up" ? "font-bold text-text" : ""}>
              {p.yesLabel}
            </span>
            <span>
              {p.yesPct}% · {p.yes}표
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-bg overflow-hidden">
            <div
              className="h-full bg-green-500"
              style={{ width: `${p.yesPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs text-text-muted mb-1">
            <span className={p.crowdPick === "down" ? "font-bold text-text" : ""}>
              {p.noLabel}
            </span>
            <span>
              {p.noPct}% · {p.no}표
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-bg overflow-hidden">
            <div
              className="h-full bg-red-500"
              style={{ width: `${p.noPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-dim border-t border-line pt-2">
        <span>
          군중 예측 <span className="text-text-muted font-semibold">{crowdLabel}</span>
        </span>
        <span>
          실제 결과{" "}
          <span
            className={`font-semibold ${
              p.outcome === "up"
                ? "text-green-500"
                : p.outcome === "down"
                  ? "text-red-500"
                  : "text-text-muted"
            }`}
          >
            {outcomeLabel(p.outcome)}
          </span>
        </span>
        <span className="text-text-dim/80">· {p.outcomeDetail}</span>
      </div>
    </div>
  );
}

export default async function PollPage() {
  const prices = await fetchAllPrices();
  const { polls, resolvedCount, correctCount, hitRate } = getPollHistory();

  return (
    <>
      <Header fxRate={prices.fx.krw_per_usdt} fxChange={prices.fx.change_24h_pct} />

      <main className="max-w-3xl mx-auto px-5 pt-6 pb-12">
        <section className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            🗳️ 인간지표
          </h1>
          <div className="text-sm text-text-muted leading-relaxed">
            <div>개미들의 내일 상승/하락 집단예측 vs 실제 시장 결과.</div>
            <div>군중은 과연 시장을 맞힐까?</div>
          </div>
        </section>

        {hitRate !== null && (
          <div className="mb-6 rounded-xl bg-bg-card border border-line p-4 flex items-center justify-between gap-3">
            <div className="text-sm text-text-muted">
              지금까지 군중 <span className="font-semibold text-text">적중률</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tabular text-text">{hitRate}%</div>
              <div className="text-[11px] text-text-dim">
                {correctCount}/{resolvedCount} 적중
              </div>
            </div>
          </div>
        )}

        <h2 className="text-lg font-bold text-text mb-3">지금 투표하기</h2>
        <PollWidget
          pollId="market-updown-2026-06-09"
          title="인간지표 — 내일 상승 vs 하락"
          question="6/9(화) 한국 증시, 오를까요 내릴까요?"
          yesLabel="📈 상승"
          noLabel="📉 하락"
        />

        <h2 className="text-lg font-bold text-text mb-3 mt-2">지난 결과</h2>
        {polls.length === 0 ? (
          <div className="rounded-xl bg-bg-card border border-line p-4 text-sm text-text-dim">
            아직 마감된 투표가 없어요. 첫 결과를 기다리는 중 👀
          </div>
        ) : (
          <div className="space-y-3">
            {polls.map((p) => (
              <HistoryCard key={p.pollId} p={p} />
            ))}
          </div>
        )}

        <div className="mt-8 p-4 rounded-xl bg-bg-card border border-line text-xs text-text-dim leading-relaxed">
          <span className="font-semibold text-text-muted">인간지표란?</span> 개미
          투자자들이 다음 거래일 상승/하락을 미리 투표한 집단예측입니다. 투표는 NXT
          프리장 오픈(08:00) 전 마감되고, 정규장 종가로 실제 결과를 판정합니다. 재미로
          보는 지표예요 ㅎ
        </div>
      </main>

      <Footer />
    </>
  );
}
