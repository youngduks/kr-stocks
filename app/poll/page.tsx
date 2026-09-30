import { fetchAllPrices } from "@/lib/fetchPrices";
import { getPollHistory, getCrowdPickGroups, type EnrichedPollHistory } from "@/lib/pollHistory";
import { HistoryDots } from "@/components/HistoryDots";
import { getHumanIndicators } from "@/lib/humanIndicators";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PollWidget } from "@/components/PollWidget";
import { PersonCard } from "@/components/PersonCard";
import type { Metadata } from "next";
import { PageTitle } from "@/components/ui/PageTitle";
import { StatusCard, StatTile } from "@/components/ui/StatusCard";
import { MoreDetails } from "@/components/ui/MoreDetails";

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

const RECENT_N = 5;

/** history.json 라벨의 앞머리 이모지(📈/📉 등) 제거 — 이모지 폰트 의존·시각 소음 줄이기 */
function cleanLabel(l: string): string {
  return l.replace(/^[^0-9A-Za-z\uAC00-\uD7A3]+/, "").trim() || l;
}

function HistoryCard({ p }: { p: EnrichedPollHistory }) {
  const yesL = cleanLabel(p.yesLabel);
  const noL = cleanLabel(p.noLabel);
  const crowdLabel = p.crowdPick === "up" ? yesL : p.crowdPick === "down" ? noL : "동률";
  return (
    <div className="ds-card" style={{ padding: 16 }}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[15px] font-extrabold text-text">{p.dateLabel}</div>
        {p.correct !== null ? (
          <span className={`ds-pill ${p.correct ? "bg-live/15 text-live" : "ds-pill-flat"}`}>
            {p.correct ? "적중" : "빗나감"}
          </span>
        ) : (
          <span className="ds-pill ds-pill-flat">판정 없음</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-3 text-[13px] font-bold num">
        <span className={`text-up ${p.crowdPick === "up" ? "" : "opacity-70"}`}>
          ▲ {yesL} {p.yesPct}%
        </span>
        <span className="ds-meta">{p.total}표</span>
        <span className={`text-down ${p.crowdPick === "down" ? "" : "opacity-70"}`}>
          ▼ {noL} {p.noPct}%
        </span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-flat-bg overflow-hidden flex" aria-hidden="true">
        {p.total > 0 && (
          <>
            <div className="h-full bg-up" style={{ width: `${p.yesPct}%` }} />
            <div className="h-full bg-down" style={{ width: `${p.noPct}%` }} />
          </>
        )}
      </div>
      <div className="text-[13px] text-text-muted mt-3">
        군중 예측 <b className="text-text">{crowdLabel}</b> · 실제 결과{" "}
        <b className={p.outcome === "up" ? "text-up" : p.outcome === "down" ? "text-down" : "text-text"}>
          {outcomeLabel(p.outcome)}
        </b>
      </div>
      <div className="ds-meta mt-1">{p.outcomeDetail}</div>
    </div>
  );
}

export default async function PollPage() {
  const [prices, people] = await Promise.all([fetchAllPrices(), getHumanIndicators()]);
  const { polls, resolvedCount, correctCount, hitRate } = getPollHistory();

  // 실데이터(data/polls/history.json)에서만 계산
  const judged = polls.filter((p) => p.correct !== null);
  const recent = judged.slice(0, 10);
  const recentHits = recent.filter((p) => p.correct).length;
  const avgVotes = polls.length > 0 ? Math.round(polls.reduce((n, p) => n + p.total, 0) / polls.length) : null;
  const crowdGroups = getCrowdPickGroups(30);
  const head = polls.slice(0, RECENT_N);
  const rest = polls.slice(RECENT_N);

  return (
    <>
      <Header fxRate={prices.fx.krw_per_usdt} fxChange={prices.fx.change_24h_pct} />

      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-2 pb-12">
        <PageTitle eyebrow="재미로 보는 군중 예측 · 인물 지표" title="인간지표" backHref="/" className="mb-4" />

        {/* ① 오늘의 투표 — ⚠ pollId / question 은 scripts/update-poll.mjs 가 정규식으로 매일 교체 — 속성 형태 유지 */}
        <PollWidget
          pollId="market-updown-2026-09-30"
          title="인간지표 — 내일 상승 vs 하락"
          question="9/30(수) 한국 증시, 오를까요 내릴까요?"
          yesLabel="▲ 오른다"
          noLabel="▼ 내린다"
        />

        {/* ② 군중 적중률 상태 카드 — history.json 집계만 */}
        {hitRate !== null && (
          <StatusCard
            className="mb-6"
            eyebrow="그래서 군중은 잘 맞혔을까?"
            pill={{
              tone: hitRate > 50 ? "up" : hitRate < 50 ? "down" : "flat",
              label: hitRate > 50 ? "반 넘게 맞힘" : hitRate < 50 ? "반도 못 맞힘" : "딱 반",
            }}
            headline={
              <>
                지금까지 {resolvedCount}번 중
                <br />
                <span className="ds-hl">{correctCount}번 맞혔어요</span>
              </>
            }
            explain={
              <>
                다수가 고른 방향이 실제 다음 날 결과와 같았던 비율이에요. 동전 던지기(50%)와 비교해 보세요.
              </>
            }
            more={{
              summary: "조금 더 — 어떻게 채점하나요?",
              content: (
                <>
                  투표는 NXT 프리장 오픈(08:00) 전에 마감되고, 삼성전자·SK하이닉스·현대차 세 종목의 정규장 종가
                  등락(전날 종가 대비)을 평균 내 상승·하락을 판정해요(평균 ±0.1% 이내는 보합). 표가 같거나(동률)
                  보합으로 끝난 날은 채점에서 빼요({polls.length - resolvedCount}번). 재미로 보는 지표예요.
                </>
              ),
            }}
          >
            <div className="grid grid-cols-3 gap-2 mt-4">
              <StatTile label="적중률" value={`${hitRate}%`} sub={`${correctCount}/${resolvedCount}`} />
              <StatTile
                label={`최근 ${recent.length}번`}
                value={`${recentHits}번`}
                sub="맞힘"
              />
              <StatTile label="평균 참여" value={avgVotes != null ? `${avgVotes}명` : "—"} sub="투표당" />
            </div>
            {recent.length > 0 && (
              <div className="mt-4">
                <div className="text-[13px] font-bold text-text-muted">최근 {recent.length}번 (왼쪽이 최신)</div>
                <div className="mt-2 flex flex-wrap gap-[6px]" aria-label={`최근 ${recent.length}번 중 ${recentHits}번 적중`}>
                  {recent.map((p) => (
                    <span
                      key={p.pollId}
                      title={`${p.dateLabel} ${p.correct ? "적중" : "빗나감"}`}
                      className={`w-[18px] h-[18px] rounded-full ${p.correct ? "bg-ink" : "bg-flat-bg border border-line"}`}
                    />
                  ))}
                </div>
                <div className="ds-meta mt-2">검은 점 = 맞힘 · 빈 점 = 빗나감</div>
              </div>
            )}
            {crowdGroups.some((g) => g.n >= 15) && (
              <div className="mt-5">
                <h3 className="text-[15px] font-extrabold">군중이 고른 쪽별 — 실제로 오른 날은?</h3>
                <p className="ds-meta mt-1 mb-2">
                  점 = 최근 {Math.max(...crowdGroups.map((g) => g.recent.length))}번 ·{" "}
                  <span className="text-up font-bold">●</span> 오름 · <span className="text-down font-bold">●</span> 내림 ·
                  회색 보합 · 평균 = 3종목 평균 등락 · 15번 미만 표본은 숨겨요
                </p>
                <HistoryDots rows={crowdGroups} minN={15} />
                <p className="ds-meta mt-2">
                  ‘전체’와 비슷하다면 군중 예측보다 그 기간 시장 흐름(대부분 상승) 덕분일 수 있어요. 매매 지시가 아니에요.
                </p>
              </div>
            )}
          </StatusCard>
        )}

        {/* ③ 인물 지표 */}
        {people.length > 0 && (
          <section className="mb-8" aria-labelledby="people-h">
            <h2 id="people-h" className="ds-h2">
              인물 지표 <span className="ds-meta font-medium">번외 · 역발상 참고용</span>
            </h2>
            <p className="ds-meta mt-1 mb-3">
              특정 인물의 시장 발언을 역발상 참고용으로 기록해요. 실제로 있는 별명·평판을 근거로 소개하며, 조롱이 목적은 아니에요.
            </p>
            <div className="space-y-3">
              {people.map((p) => (
                <PersonCard key={p.id} person={p} />
              ))}
            </div>
          </section>
        )}

        {/* ④ 지난 결과 — 최신 5개 + 더 보기 */}
        <section aria-labelledby="history-h">
          <h2 id="history-h" className="ds-h2 mb-3">
            지난 결과
          </h2>
          {polls.length === 0 ? (
            <div className="ds-card ds-explain">아직 마감된 투표가 없어요. 첫 결과를 기다리는 중이에요.</div>
          ) : (
            <>
              <div className="space-y-3">
                {head.map((p) => (
                  <HistoryCard key={p.pollId} p={p} />
                ))}
              </div>
              {rest.length > 0 && (
                <MoreDetails summary={`지난 결과 ${rest.length}개 더 보기`} className="mt-4">
                  <div className="space-y-3 pt-1">
                    {rest.map((p) => (
                      <HistoryCard key={p.pollId} p={p} />
                    ))}
                  </div>
                </MoreDetails>
              )}
            </>
          )}
        </section>

        <div className="ds-card mt-8 ds-explain" style={{ fontSize: 14 }}>
          <b className="text-text">인간지표란?</b> 개미 투자자들이 다음 거래일 상승·하락을 미리 투표한 집단예측이에요.
          투표는 NXT 프리장 오픈(08:00) 전 마감되고, 정규장 종가로 실제 결과를 판정해요. 재미로 보는 지표예요.
        </div>
      </main>

      <Footer />
    </>
  );
}
