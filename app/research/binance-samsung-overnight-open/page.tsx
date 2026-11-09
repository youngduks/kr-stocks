// 리서치 #1 — 바이낸스 삼성전자 야간선물(무기한 선물) 밤사이 등락 vs 다음 날 KRX 시가 (2026-11-09)
// 네이버 월간 검색량(2026-11-09): 삼성전자야간선물 12,630 · 바이낸스삼성전자 3,710 · 삼성전자시가 1,680
// 수치는 data/research/overnight-gap.json (scripts/research-overnight-gap.mjs 계산 결과 스냅샷) 그대로.
// 결과 해석은 과장 금지 — 표본 수·기간·기준선·한계를 같이 적음.

import type { Metadata } from "next";
import data from "@/data/research/overnight-gap.json";
import { GuideShell, GuideSection, getGuideFx, type GuideFaq } from "@/components/guide/GuideShell";

export const revalidate = 3600;

const URL = "https://kr-stocks.com/research/binance-samsung-overnight-open";
const TITLE = "바이낸스 삼성전자 야간선물, 다음 날 시가 방향을 맞혔나";

type Sig = { direction: { n: number; hits: number; hitRatePct: number | null }; bigSignal: { n: number; hits: number; hitRatePct: number | null }; size: { corr: number | null; slope: number | null; maePct: number | null } };
type Stock = Sig & {
  slug: string;
  name: string;
  binanceSymbol: string;
  n: number;
  periodStart: string;
  periodEnd: string;
  early: Sig;
  baseline: { samePeriodUpPct: number; majorityGuessPct: number; fiveYearUpPct: number; fiveYearN: number; fiveYearFrom: string };
  rows: { day: string; sigKrw: number; sigKrwEarly: number; gap: number }[];
};
const D = data as unknown as { computedAt: string; stocks: Stock[] };
const S = D.stocks.find((s) => s.slug === "samsung")!;
const H = D.stocks.find((s) => s.slug === "hynix")!;
const ymd = (s: string) => s.replace(/-/g, ".");
const computed = D.computedAt.slice(0, 10);
const pct = (x: number | null) => (x == null ? "—" : `${x}%`);
const sp = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toFixed(1)}%`;

const DESC = `바이낸스 삼성전자 무기한 선물(흔히 '삼성전자 야간선물')의 밤사이 등락이 다음 날 KRX 시가 방향과 같았는지 ${S.n}거래일(${ymd(S.periodStart)}~${ymd(S.periodEnd)})로 검증했어요. 프리마켓 전(07:55)까지 방향 일치 ${S.early.direction.hitRatePct}%, 같은 기간 시가가 오른 날 ${S.baseline.samePeriodUpPct}%. 수익 가능성을 뜻하지 않아요.`;

export const metadata: Metadata = {
  title: `${TITLE} — ${S.n}거래일 검증`,
  description: DESC,
  keywords: ["삼성전자 야간선물", "바이낸스 삼성전자", "삼성전자 시가", "삼성전자 야간 시세", "삼성전자 시가 예측", "SK하이닉스 야간"],
  openGraph: { title: TITLE, description: DESC, url: URL, type: "article" },
  alternates: { canonical: URL },
};

const FAQ: GuideFaq[] = [
  {
    q: "바이낸스 삼성전자 야간선물이 오르면 다음 날 삼성전자 시가도 오르나요?",
    a: `${ymd(S.periodStart)}~${ymd(S.periodEnd)} ${S.n}거래일 동안 NXT 프리마켓이 열리기 전(07:55)까지의 밤사이 등락 방향은 다음 날 시가 방향과 ${S.early.direction.hitRatePct}% 같았어요(${S.early.direction.n}일 중 ${S.early.direction.hits}일). 개장 5분 전(08:55)까지로 보면 ${S.direction.hitRatePct}%지만, 이 값에는 장 시작 전 예상 가격이 이미 들어 있어요. 약 5개월 표본이고 앞으로도 같다는 보장은 없어요.`,
  },
  {
    q: "그냥 '오른다'고 찍는 것보다 나은가요?",
    a: `같은 기간 삼성전자 시가가 전날 종가보다 높게 시작한 날은 ${S.baseline.samePeriodUpPct}%였고, 더 자주 나온 방향을 늘 찍었다면 ${S.baseline.majorityGuessPct}% 맞혔어요. 프리마켓 전(07:55) 밤사이 등락 방향(${S.early.direction.hitRatePct}%)도 이 기준선보다 높았어요. 다만 방향이 맞는 것과 돈을 버는 것은 다른 이야기예요.`,
  },
  {
    q: "08:55 값에는 장 시작 전 정보가 이미 들어 있지 않나요?",
    a: `네. 08:00부터 NXT 프리마켓이 열리고 08:30부터 KRX 장전 동시호가 예상 체결가가 공개돼 08:55 값에 반영됐을 수 있어요. 그래서 프리마켓 시작 전인 07:55까지의 등락도 따로 계산했고, 이때 방향 적중은 삼성전자 ${S.early.direction.hitRatePct}%, SK하이닉스 ${H.early.direction.hitRatePct}%였어요.`,
  },
  {
    q: "크기도 맞나요?",
    a: `방향보다는 덜 정확해요. 08:55 기준 신호와 실제 시가 등락의 차이는 평균 삼성전자 ${S.size.maePct}%포인트, SK하이닉스 ${H.size.maePct}%포인트였어요.`,
  },
  {
    q: "이 결과로 매매해도 되나요?",
    a: "권하지 않아요. 08:55 바이낸스 가격은 이미 시가 쪽으로 움직인 뒤라, 그때 사서 시가에 파는 식으로는 이 적중률이 수익이 되지 않아요. 짧은 기간의 과거 결과이고 수수료·호가 차이도 반영하지 않았어요. 정보 제공용이에요.",
  },
];

function SigRows({ label, a, b }: { label: string; a: Sig; b: Sig }) {
  return (
    <>
      <tr className="border-t border-line">
        <td className="py-2 pr-2 text-text font-semibold" colSpan={3}>
          {label}
        </td>
      </tr>
      <tr>
        <td className="py-1 pr-2">방향 적중</td>
        <td className="py-1 text-right tabular">
          {pct(a.direction.hitRatePct)} <span className="ds-meta">({a.direction.hits}/{a.direction.n})</span>
        </td>
        <td className="py-1 text-right tabular">
          {pct(b.direction.hitRatePct)} <span className="ds-meta">({b.direction.hits}/{b.direction.n})</span>
        </td>
      </tr>
      <tr>
        <td className="py-1 pr-2">신호 ±1% 이상인 날만</td>
        <td className="py-1 text-right tabular">
          {pct(a.bigSignal.hitRatePct)} <span className="ds-meta">({a.bigSignal.hits}/{a.bigSignal.n})</span>
        </td>
        <td className="py-1 text-right tabular">
          {pct(b.bigSignal.hitRatePct)} <span className="ds-meta">({b.bigSignal.hits}/{b.bigSignal.n})</span>
        </td>
      </tr>
      <tr>
        <td className="py-1 pr-2">상관계수 · 기울기</td>
        <td className="py-1 text-right tabular">
          {a.size.corr} · {a.size.slope}
        </td>
        <td className="py-1 text-right tabular">
          {b.size.corr} · {b.size.slope}
        </td>
      </tr>
      <tr>
        <td className="py-1 pr-2">평균 오차(%p)</td>
        <td className="py-1 text-right tabular">{a.size.maePct}</td>
        <td className="py-1 text-right tabular">{b.size.maePct}</td>
      </tr>
    </>
  );
}

export default async function ResearchOvernightOpen() {
  const fx = await getGuideFx();
  const recent = S.rows.slice(-10).reverse();
  return (
    <GuideShell
      url={URL}
      title={TITLE}
      description={DESC}
      eyebrow={`🔬 리서치 · ${ymd(computed)} 기준`}
      intro={
        <>
          상장 후 {S.n}거래일({ymd(S.periodStart)}~{ymd(S.periodEnd)}) 동안 바이낸스 삼성전자 무기한 선물의 밤사이 등락 방향은 NXT 프리마켓 전(07:55)
          기준 <b className="text-text">{S.early.direction.hitRatePct}%</b>, 개장 5분 전(08:55) 기준 {S.direction.hitRatePct}% 다음 날 KRX 시가 방향과
          같았어요. 같은 기간 시가가 오른 날은 {S.baseline.samePeriodUpPct}%였어요. 표본은 약 5개월로 짧아요.
        </>
      }
      datePublished={computed}
      faq={FAQ}
      fx={fx}
      disclaimer="본 글은 정보 제공만을 목적으로 하며 투자 권유·자문이 아닙니다. 과거 결과가 앞으로도 같다는 보장은 없습니다."
      related={[
        { href: "/korea/samsung", label: "삼성전자 24시간 시세 (바이낸스 선물 원화 환산)" },
        { href: "/korea/hynix", label: "SK하이닉스 24시간 시세" },
        { href: "/research", label: "리서치 글 목록" },
      ]}
    >
      <GuideSection id="r-read" title="먼저 읽어 주세요 — 이 숫자가 뜻하지 않는 것">
        <p>
          08:55 바이낸스 가격에는 08:00에 열리는 NXT 프리마켓 거래와 08:30부터 공개되는 KRX 장전 동시호가 예상 체결가가 이미 반영돼 있어요.
          그래서 08:55 기준 {S.direction.hitRatePct}%는 다음 날 시가를 &lsquo;예측&rsquo;했다기보다 곧 정해질 시가를{" "}
          <b className="text-text">미리 비춰 보여주는 거울</b>에 가까워요. 이 적중률로 돈을 벌 수 있다는 뜻이 아니에요. 그 시각에 바이낸스에서
          사서 시가에 판다면 가격은 이미 움직인 뒤예요.
        </p>
        <p>
          밤사이 정보만으로 얼마나 맞았는지 보려면 프리마켓이 열리기 전인 <b className="text-text">07:55 구간</b>(삼성전자{" "}
          {S.early.direction.hitRatePct}%, SK하이닉스 {H.early.direction.hitRatePct}%)이 더 의미 있는 비교예요. 다만 이 값에도 전날
          15:30~20:00 NXT 애프터마켓의 실제 주식 거래가 들어 있고, 역시 수익을 보장하지 않아요.
        </p>
      </GuideSection>

      <GuideSection id="r-result" title="결과 한눈에">
        <table className="w-full text-sm">
          <thead>
            <tr className="ds-meta text-left">
              <th className="py-1 font-medium"> </th>
              <th className="py-1 font-medium text-right">삼성전자</th>
              <th className="py-1 font-medium text-right">SK하이닉스</th>
            </tr>
          </thead>
          <tbody className="text-text-muted">
            <tr>
              <td className="py-1 pr-2">표본 (거래일)</td>
              <td className="py-1 text-right tabular">{S.n}</td>
              <td className="py-1 text-right tabular">{H.n}</td>
            </tr>
            <SigRows label="밤사이 신호: 전날 15:30 → 당일 07:55 (NXT 프리마켓 전, 더 의미 있는 비교)" a={S.early} b={H.early} />
            <SigRows label="개장 직전 신호: 전날 15:30 → 당일 08:55 (프리마켓·장전 예상가 반영 — 거울에 가까움)" a={S} b={H} />
            <tr className="border-t border-line">
              <td className="py-2 pr-2 text-text font-semibold" colSpan={3}>
                기준선 (&lsquo;아무 날&rsquo;)
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-2">같은 기간 시가가 오른 날</td>
              <td className="py-1 text-right tabular">{pct(S.baseline.samePeriodUpPct)}</td>
              <td className="py-1 text-right tabular">{pct(H.baseline.samePeriodUpPct)}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2">더 자주 나온 방향을 늘 찍기</td>
              <td className="py-1 text-right tabular">{pct(S.baseline.majorityGuessPct)}</td>
              <td className="py-1 text-right tabular">{pct(H.baseline.majorityGuessPct)}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2">약 5년 전체 시가가 오른 날</td>
              <td className="py-1 text-right tabular">
                {pct(S.baseline.fiveYearUpPct)} <span className="ds-meta">({S.baseline.fiveYearN}일)</span>
              </td>
              <td className="py-1 text-right tabular">
                {pct(H.baseline.fiveYearUpPct)} <span className="ds-meta">({H.baseline.fiveYearN}일)</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="ds-meta">
          기간 {ymd(S.periodStart)}~{ymd(S.periodEnd)} · 계산 {ymd(computed)} · 시가 보합(0%)인 날은 방향 채점에서 뺐어요 · 기울기 1이면 신호 1%당 시가도 평균 1% 움직였다는 뜻
        </p>
      </GuideSection>

      <GuideSection id="r-method" title="어떻게 쟀나요">
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <b className="text-text">밤사이 신호</b>: 전 거래일 15:30(KRX 종가가 정해지는 시각)부터 당일 08:55까지 바이낸스 {S.binanceSymbol}·{H.binanceSymbol}{" "}
            무기한 선물 가격 변화예요. 5분봉 종가를 썼고, 같은 시각 업비트 USDT 원화 시세를 곱해 원화로 바꿨어요.
          </li>
          <li>
            <b className="text-text">결과</b>: 당일 KRX 시가가 전 거래일 KRX 종가보다 몇 % 높거나 낮게 시작했는지예요. 네이버 금융 일봉(거래소 공식 시가·종가)을 썼어요.
          </li>
          <li>
            <b className="text-text">미래 정보 없음</b>: 신호는 09:00 개장 전에 끝나는 값만 썼어요.
          </li>
          <li>
            <b className="text-text">개장 직전 정보</b>: 08:00 NXT 프리마켓과 08:30 KRX 장전 동시호가 예상 체결가가 08:55 값에 섞였을 수 있어, 07:55까지의 등락도 따로 계산했어요.
          </li>
          <li>
            <b className="text-text">재현</b>: 저장소 scripts/research-overnight-gap.mjs 를 실행하면 같은 공개 데이터(바이낸스·업비트·네이버)로 다시 계산돼요.
          </li>
        </ul>
      </GuideSection>

      <GuideSection id="r-limits" title="조심해서 읽을 점">
        <ul className="list-disc ml-5 space-y-1">
          <li>바이낸스 상장(2026년 6월 2일) 이후 약 5개월, {S.n}거래일뿐이에요. 큰 하락이 있던 기간도 포함돼 있어 시기가 바뀌면 결과가 달라질 수 있어요.</li>
          <li>15:30~20:00에는 실제 주식이 NXT 애프터마켓에서 거래돼요. 밤사이 선물 등락에는 이 실제 거래가 이미 반영돼 있어요.</li>
          <li>방향은 자주 맞았지만 크기 차이는 평균 1~2%포인트였어요. 07:55 기준은 08:55 기준보다 덜 맞았어요.</li>
          <li>시가에 실제로 사고팔 수 있다는 뜻이 아니에요. 수수료·호가 차이·환율 비용은 반영하지 않았어요.</li>
        </ul>
      </GuideSection>

      <GuideSection id="r-recent" title="최근 10거래일 (삼성전자)">
        <table className="w-full text-sm">
          <thead>
            <tr className="ds-meta text-left">
              <th className="py-1 font-medium">날짜</th>
              <th className="py-1 font-medium text-right">~07:55</th>
              <th className="py-1 font-medium text-right">~08:55</th>
              <th className="py-1 font-medium text-right">실제 시가</th>
            </tr>
          </thead>
          <tbody className="tabular text-text-muted">
            {recent.map((r) => (
              <tr key={r.day} className="border-t border-line">
                <td className="py-1.5 text-text">{r.day.slice(5).replace("-", "/")}</td>
                <td className="py-1.5 text-right">{sp(r.sigKrwEarly)}</td>
                <td className="py-1.5 text-right">{sp(r.sigKrw)}</td>
                <td className={`py-1.5 text-right font-semibold ${r.gap > 0 ? "text-up" : r.gap < 0 ? "text-down" : ""}`}>{sp(r.gap)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="ds-meta">밤사이 신호 = 전날 15:30 대비 바이낸스 선물 원화 환산 등락 · 실제 시가 = 전날 종가 대비</p>
      </GuideSection>
    </GuideShell>
  );
}
