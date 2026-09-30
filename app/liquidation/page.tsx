import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import { fetchCvdSet } from "@/lib/cvd";
import { CvdChart, type CvdDataset } from "@/components/CvdChart";
import { fetchLeverageEtfHistory, fetchUnderlyingHistory, LEVERAGE_ETF_NAME_KO, UNDERLYING_NAME_KO } from "@/lib/leverageEtf";
import { LeverageEtfChart } from "@/components/LeverageEtfChart";
import Link from "next/link";
import { summarizeCvd, cvdSide, fmtUsdCompact, type CvdSummary } from "@/lib/cvdSummary";
import { StatusCard, type StatusTone } from "@/components/ui/StatusCard";
import { QuadGrid, type QuadCell } from "@/components/ui/QuadGrid";
import { PageTitle } from "@/components/ui/PageTitle";
import { MoreDetails } from "@/components/ui/MoreDetails";
import { AsOf } from "@/components/ui/AsOf";
import { AdSlot } from "@/components/AdSlot";
import { changeTextClass, formatPct } from "@/lib/colors";
import type { Metadata } from "next";

export const revalidate = 3600;

// CVD 계산 가능 종목 — 바이낸스 상장(taker buy/sell 분해 데이터 존재)
const CVD_TICKERS = [
  { symbol: "SAMSUNGUSDT", label: "삼성전자" },
  { symbol: "SKHYNIXUSDT", label: "SK하이닉스" },
  { symbol: "HYUNDAIUSDT", label: "현대차" },
] as const;

const COINGLASS_BASE = "https://www.coinglass.com/pro/futures/LiquidationHeatMap";

type LiqTicker = {
  name: string;
  ticker: string;
  note: string;
  coinglassCoin: string;
  /** 우리 사이트에서 이미 추적 중인 종목이면 상세 페이지 경로 */
  internalHref?: string;
};

const TICKERS: LiqTicker[] = [
  { name: "삼성전자", ticker: "SMSN", note: "메모리 반도체 대장주", coinglassCoin: "SMSN", internalHref: "/korea/samsung" },
  { name: "SK하이닉스", ticker: "SKHX", note: "HBM·D램 공급사", coinglassCoin: "SKHX", internalHref: "/korea/hynix" },
  { name: "NVIDIA", ticker: "NVDA", note: "AI 반도체 대장주", coinglassCoin: "NVDA", internalHref: "/us/nvidia" },
  { name: "DRAM", ticker: "DRAM", note: "메모리 반도체 지수", coinglassCoin: "DRAM" },
  { name: "S&P500", ticker: "SPX", note: "미국 대표 지수", coinglassCoin: "SPX" },
  { name: "KORU", ticker: "KORU", note: "코스피 3배 레버리지 ETF", coinglassCoin: "KORU" },
];

export const metadata: Metadata = {
  title: "청산맵 — 삼성전자·SK하이닉스·NVIDIA 청산 지도 · 레버리지 ETF",
  description:
    "거래소들이 토큰화 주식을 상장하면서 청산맵(리퀴데이션 히트맵)도 주식 티커까지 지원. 삼성전자·SK하이닉스·NVIDIA·DRAM·S&P500·KORU 청산 지도 바로가기 + 삼전·닉스·현대차 CVD(체결강도 누적) 실측 차트 + 코스피 SK하이닉스 레버리지 ETF 패닉셀 캐스케이드 자동 탐지.",
  keywords: [
    "청산맵",
    "청산 지도",
    "리퀴데이션 히트맵",
    "liquidation heatmap",
    "CVD",
    "체결강도",
    "SK하이닉스 레버리지",
    "KODEX SK하이닉스레버리지",
    "레버리지 ETF",
    "패닉셀 캐스케이드",
    "삼성전자 청산가",
    "SK하이닉스 청산가",
    "NVIDIA 청산맵",
    "코인글래스",
    "coinglass",
    "토큰화 주식",
    "KORU 청산",
  ],
  openGraph: {
    title: "청산맵 — 주식러분들 꿀팁",
    description: "토큰화 주식 청산맵으로 보는 내일의 변곡점. 삼성전자·SK하이닉스·NVIDIA 등.",
    url: "https://kr-stocks.com/liquidation",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "청산맵 — 주식러분들 꿀팁",
    description: "토큰화 주식 청산맵으로 보는 내일의 변곡점.",
  },
  alternates: {
    canonical: "https://kr-stocks.com/liquidation",
  },
};

type Summ = { label: string; s: CvdSummary };

const SIDE_COPY: Record<ReturnType<typeof cvdSide>, { tone: StatusTone; pill: string; hl: string }> = {
  buy: { tone: "up", pill: "▲ 매수 우세", hl: "매수 우세예요" },
  sell: { tone: "down", pill: "▼ 매도 우세", hl: "매도 우세예요" },
  balanced: { tone: "flat", pill: "― 팽팽", hl: "팽팽해요" },
};

function CvdStatusCard({ items }: { items: Summ[] }) {
  const main = items[0];
  const side = cvdSide(main.s);
  const c = SIDE_COPY[side];
  const buyPct = (main.s.buyShare * 100).toFixed(1);
  const sameDir =
    main.s.price7dPct != null && main.s.price7dPct !== 0 && Math.sign(main.s.price7dPct) === Math.sign(main.s.cvd7d);
  return (
    <StatusCard
      eyebrow={`${main.label} · 바이낸스 선물 최근 7일`}
      pill={{ tone: c.tone, label: c.pill }}
      headline={
        <>
          지금 7일 체결강도는
          <br />
          <span className="ds-hl">{c.hl}</span>
        </>
      }
      explain={
        <>
          최근 7일 바이낸스 {main.label} 선물에서 시장가로 산 금액이 전체 체결의{" "}
          <b className="text-text">{buyPct}%</b>였어요
          {main.s.price7dPct != null && (
            <>
              . 같은 기간 가격은 <b className={changeTextClass(main.s.price7dPct)}>{formatPct(main.s.price7dPct)}</b>
              {side === "balanced" ? " 움직였어요." : sameDir ? "로, 체결과 가격이 같은 방향이에요." : "로, 체결과 가격이 엇갈려요."}
            </>
          )}
          {main.s.price7dPct == null && "."}
        </>
      }
      more={{
        summary: "조금 더 — 체결강도(CVD)가 뭔가요?",
        content: (
          <>
            CVD는 <b className="text-text">누적 매수 체결 − 누적 매도 체결</b>이에요. 시장가로 사려는 사람이 더 많으면
            올라가고, 팔려는 사람이 더 많으면 내려가요. 바이낸스 공개 캔들의 매수·매도 체결 분해로 저희가 직접
            계산해요(1시간 봉 {main.s.bars}개). 매수 비중이 50% ± 0.5% 안이면 &lsquo;팽팽&rsquo;으로 표시해요. 방향을
            맞히는 예측이 아니라 지난 7일 체결 요약이에요.
          </>
        ),
      }}
    >
      <div className={`grid gap-2 mt-4 ${items.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {items.map(({ label, s }) => (
          <div key={label} className="ds-tile min-w-0" style={{ padding: 12 }}>
            <div className="text-[13px] font-bold text-text-muted truncate">{label}</div>
            <div className={`num text-[19px] sm:text-[24px] leading-tight font-extrabold mt-1 whitespace-nowrap ${changeTextClass(s.cvd7d)}`}>
              {fmtUsdCompact(s.cvd7d)}
            </div>
            <div className="ds-meta mt-1 whitespace-nowrap">
              가격 <b className={changeTextClass(s.price7dPct)}>{formatPct(s.price7dPct, 1)}</b>
            </div>
          </div>
        ))}
      </div>
      <div className="ds-meta mt-2">숫자 = 7일 순매수 체결액(USDT) · 빨강 = 매수 우세 · 파랑 = 매도 우세</div>
    </StatusCard>
  );
}

function cvdQuadCells(items: Summ[]): [QuadCell, QuadCell, QuadCell, QuadCell] {
  const at = (pUp: boolean, cUp: boolean) =>
    items
      .filter(({ s }) => s.price7dPct != null && (s.price7dPct >= 0) === pUp && (s.cvd7d >= 0) === cUp)
      .map((x) => x.label);
  return [
    { axis: "가격 ▲ · CVD ▲", title: "힘 있는 상승", desc: "실제 매수 체결이 받쳐줘요", tone: "up", tags: at(true, true) },
    { axis: "가격 ▲ · CVD ▼", title: "힘 빠진 상승", desc: "사는 힘은 약한데 가격만 올라서 꺾일 수 있어요", tone: "warn", tags: at(true, false) },
    { axis: "가격 ▼ · CVD ▲", title: "매수가 버티는 하락", desc: "파는 힘이 줄고 있어 반등을 살펴볼 때예요", tone: "warn", tags: at(false, true) },
    { axis: "가격 ▼ · CVD ▼", title: "같이 빠지는 중", desc: "체결도 매도 우세라 조심할 구간이에요", tone: "down", tags: at(false, false) },
  ];
}

const CELL_NAME = ["힘 있는 상승", "힘 빠진 상승", "매수가 버티는 하락", "같이 빠지는 중"];

export default async function LiquidationPage() {
  const [data, cvdSets, leverageBars, underlyingBars] = await Promise.all([
    fetchAllPrices(),
    Promise.all(CVD_TICKERS.map((t) => fetchCvdSet(t.symbol))),
    fetchLeverageEtfHistory(90),
    fetchUnderlyingHistory(90),
  ]);

  const cvdDatasets: CvdDataset[] = CVD_TICKERS.map((t, i) => ({
    symbol: t.symbol,
    label: t.label,
    set: cvdSets[i],
  })).filter((d) => d.set.bars1H.length > 0 || d.set.bars4H.length > 0);

  const summaries: Summ[] = CVD_TICKERS.map((t, i) => ({ label: t.label as string, s: summarizeCvd(cvdSets[i]) }))
    .filter((x): x is Summ => x.s != null);
  const quad = summaries.length > 0 ? cvdQuadCells(summaries) : null;
  const mainIdx = quad ? quad.findIndex((c) => c.tags?.includes(summaries[0].label)) : -1;
  // 마지막 1H 봉 시작 + 1h = 데이터 기준 시각
  const asOfSec = summaries.length > 0 ? Math.max(...summaries.map((x) => x.s.lastTime)) + 3600 : null;

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />
      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-2 pb-12">
        <PageTitle eyebrow="주식러분들 꿀팁 · 바이낸스 선물 체결 실측" title="청산맵 · 체결강도" backHref="/">
          {asOfSec && <AsOf at={Math.min(asOfSec * 1000, data.fetched_at)} note="1시간 봉 · 약 1시간마다 갱신" />}
        </PageTitle>

        <article className="mt-4 space-y-4">
          {/* ① 상태 카드 — 7일 CVD (실측) */}
          {summaries.length > 0 ? (
            <CvdStatusCard items={summaries} />
          ) : (
            <section className="ds-card">
              <div className="ds-eyebrow">지금 체결강도는?</div>
              <h2 className="ds-status mt-2">체결 데이터를 아직 못 받았어요</h2>
              <p className="ds-explain mt-2">바이낸스 시세를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</p>
            </section>
          )}

          {/* ② 가격 × CVD 2×2 해석 */}
          {quad && (
            <QuadGrid
              eyebrow="가격과 체결강도, 같이 보면 (최근 7일)"
              headline={
                mainIdx >= 0 ? (
                  <>
                    {summaries[0].label}는 지금 <span className="ds-hl">&lsquo;{CELL_NAME[mainIdx]}&rsquo;</span> 칸이에요
                  </>
                ) : (
                  <>가격과 체결이 같은 방향인지 보세요</>
                )
              }
              cells={quad}
              footnote="CVD ▲ = 7일 매수 체결 우세 · 가격 ▲ = 7일 전보다 올랐음. 단독 매매 신호가 아니라 참고용이에요."
            />
          )}

          {/* ③ CVD 차트 */}
          {cvdDatasets.length > 0 && (
            <section aria-labelledby="cvd-h">
              <h2 id="cvd-h" className="ds-h2 mb-1 mt-6">
                체결강도 누적(CVD) 차트
              </h2>
              <p className="ds-meta mb-3">
                0 위 = 구간 순매수, 0 아래 = 구간 순매도 · 주황 = 가격(좌축) · 바이낸스 상장 종목만 계산 가능
              </p>
              <CvdChart datasets={cvdDatasets} />
            </section>
          )}

          {/* ④ 레버리지 ETF */}
          {leverageBars.length > 0 && (
            <section aria-labelledby="lev-h">
              <h2 id="lev-h" className="ds-h2 mb-1 mt-6">
                SK하이닉스 2배 ETF — 급락한 날 표시
              </h2>
              <p className="ds-meta mb-3">
                코스피 상장 {LEVERAGE_ETF_NAME_KO} 실데이터 · 점선 = 본주 등락 · ▼ = 하루 급락(반대매매·손절이 몰렸을 가능성)
              </p>
              <LeverageEtfChart
                bars={leverageBars}
                underlyingBars={underlyingBars}
                label={LEVERAGE_ETF_NAME_KO}
                underlyingLabel={UNDERLYING_NAME_KO}
              />
            </section>
          )}

          {/* 광고 — 섹션 경계(레버리지 차트 하단 텍스트 ↔ 설명 제목 사이). 첫 화면 밖, 버튼·링크 그리드와 비인접. 페이지당 1개 */}
          <AdSlot
            adsenseSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME}
            adfitMobile={{ unit: "DAN-sRrDqAryVxJFyyGr", width: 320, height: 50 }}
            adfitDesktop={{ unit: "DAN-1gxi6c73rjhTXT18", width: 728, height: 90 }}
          />

          {/* ⑤ 긴 설명 — 접어서 */}
          <h2 className="ds-h2 mt-6">자세히 알아보기</h2>
          <section className="ds-card" style={{ paddingTop: 4, paddingBottom: 4 }} aria-label="자세한 설명">
            <MoreDetails summary="청산맵은 왜 보나요?" className="!mt-0 !border-t-0">
              청산맵(리퀴데이션 히트맵)은 레버리지 포지션이 강제 청산되는 가격대를 보여줘요.{" "}
              <b className="text-text">많은 사람이 고통받는 자리(청산가)는 변곡점이 되기 쉬워요.</b> 가격이 그 구간에
              다가가면 청산 물량이 연쇄로 터지며 반대로 튕기거나, 뚫고 나가면 가속이 붙는 경우가 많아요. 최근 거래소들이
              토큰화 주식을 상장하면서 삼전·닉스, DRAM, 엔비디아, S&amp;P500, KORU 같은 주식 티커도 볼 수 있게 됐어요.
            </MoreDetails>
            {cvdDatasets.length > 0 && (
              <>
                <MoreDetails summary="CVD 읽는 법 — 기본 원리" className="!mt-0">
                  CVD는 <b className="text-text">누적 매수체결 − 누적 매도체결</b>이에요. 선이{" "}
                  <b className="text-up">우상향</b>하면 시장가로 사려는 힘이 강하다는 뜻, <b className="text-down">우하향</b>
                  하면 팔려는 힘이 강하다는 뜻이에요. 점선(0 기준선)을 위아래로 넘는 지점이 매수·매도 우세가 바뀌는
                  전환점이에요. 청산맵 자체는 유료 API 없이는 재현할 수 없지만, CVD는 바이낸스 공개 캔들로 직접 계산해
                  무료로 보여드려요. (NVDA·DRAM·S&amp;P500·KORU는 아래 청산맵 링크 참고)
                </MoreDetails>
                <MoreDetails summary="다이버전스 — 가장 많이 쓰는 신호" className="!mt-0">
                  <b className="text-text">가격 ▲ + CVD ▼ (약세 다이버전스)</b>: 실제 매수 체결은 약해지는데 가격만 오른
                  것 — 숏 커버링이나 소수 매수로 밀어올렸을 수 있어요. 상승이 힘없이 꺾일 수 있다는 경고로 봐요.
                  <br />
                  <b className="text-text">가격 ▼ + CVD ▲ (강세 다이버전스)</b>: 매도 압력은 줄어드는데 가격만 눌린 것 —
                  팔자 힘이 소진되고 있다는 뜻이라 반등 가능성을 살펴볼 때 참고해요.
                  <br />
                  <b className="text-text">둘이 같은 방향</b>이면 진짜 체결이 받쳐주는 추세로 봐요.
                </MoreDetails>
                <MoreDetails summary="레버리지 ETF 차트는 뭔가요?" className="!mt-0">
                  바이낸스 합성 상품이 아니라 <b className="text-text">코스피에 실제 상장된 2배 레버리지 ETF</b>(
                  {LEVERAGE_ETF_NAME_KO}, 같은 상품군 중 거래대금 최다) 실데이터예요. 본주(SK하이닉스 000660) 등락률을 점선으로
                  같이 그려 레버리지가 얼마나 증폭됐는지 비교할 수 있어요. 하루 급락한 날은 반대매매·손절이 몰렸을 가능성이
                  높은 실물 증거로 보고 ▼로 자동 표시해요.
                </MoreDetails>
                <MoreDetails summary="주의할 점" className="!mt-0">
                  CVD는 절대값보다 <b className="text-text">기울기와 방향 전환</b>이 중요해요. 단독 매매 신호가 아니라
                  가격 차트·뉴스·수급과 함께 보는 보조 지표예요. 참고용이며 투자 조언이 아니에요.
                </MoreDetails>
              </>
            )}
          </section>

          <section aria-labelledby="liq-links-h">
            <h2 id="liq-links-h" className="ds-h2 mb-1">
              종목별 청산맵 바로가기
            </h2>
            <p className="ds-meta mb-3">CoinGlass(외부 사이트)로 이동해요</p>
            <div className="ds-card" style={{ padding: "4px 20px" }}>
              {TICKERS.map((t) => (
                <div key={t.ticker} className="ds-row">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[15px] text-text">{t.name}</span>
                      <span className="ds-meta num">{t.ticker}</span>
                    </div>
                    <div className="text-[13px] text-text-muted truncate">{t.note}</div>
                  </div>
                  {t.internalHref && (
                    <Link
                      href={t.internalHref}
                      prefetch={false}
                      className="flex-none text-[13px] font-bold text-text-muted hover:text-text px-2 min-h-[44px] inline-flex items-center"
                    >
                      시세
                    </Link>
                  )}
                  <a
                    href={`${COINGLASS_BASE}?coin=${t.coinglassCoin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-none inline-flex items-center min-h-[40px] px-4 rounded-full bg-ink text-on-ink text-[14px] font-bold"
                  >
                    청산맵 →
                  </a>
                </div>
              ))}
            </div>
            <p className="ds-meta mt-3">
              ※ 청산맵 데이터는{" "}
              <a href="https://www.coinglass.com" target="_blank" rel="noopener noreferrer" className="underline">
                CoinGlass
              </a>
              에서 제공해요. 참고용 지표이며 투자 조언이 아니에요.
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
