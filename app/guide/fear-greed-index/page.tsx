// 가이드 — CNN 공포탐욕지수 뜻과 보는 법 (2026-11-08)
// 네이버 월간 검색량(2026-11-08): CNN공포탐욕지수 16,530 · 공포탐욕지수 11,070 · 공포탐욕지수보는법 80
// 사실 근거: CNN 공식 페이지 https://edition.cnn.com/markets/fear-and-greed (2026-11-08 조회)
//   - 7개 지표, 각 지표 동일 가중, 0~100 (100 = 최대 탐욕, 0 = 최대 공포), 새 데이터가 나오는 대로 계산
// kr-stocks.com 은 이 지수 값을 제공하지 않음(외부 지수) — 값·구간 수치를 화면에 지어내지 않는다.

import type { Metadata } from "next";
import { GuideShell, GuideSection, getGuideFx, type GuideFaq } from "@/components/guide/GuideShell";

export const revalidate = 3600;

const URL = "https://kr-stocks.com/guide/fear-greed-index";
const CNN_URL = "https://edition.cnn.com/markets/fear-and-greed";
const TITLE = "CNN 공포탐욕지수 뜻과 보는 법";
const DESC =
  "CNN 공포탐욕지수(Fear & Greed Index)가 어떤 7가지 지표로 만들어지는지, 0~100 점수를 어떻게 읽는지, VIX지수와 무엇이 다른지 CNN 공식 설명을 바탕으로 정리했어요.";

export const metadata: Metadata = {
  title: `${TITLE} — 7가지 지표 정리`,
  description: DESC,
  keywords: ["공포탐욕지수", "CNN 공포탐욕지수", "공포탐욕지수 보는법", "Fear and Greed Index", "공포 탐욕 지수", "공포지수"],
  openGraph: { title: TITLE, description: DESC, url: URL, type: "article" },
  alternates: { canonical: URL },
};

// CNN 이 밝힌 7개 지표 (CNN 페이지 문구를 우리말로 풀어 씀 — 복사 아님)
const INDICATORS: { name: string; desc: string }[] = [
  { name: "시장 모멘텀", desc: "S&P 500 지수가 지난 125거래일 이동평균보다 위에 있는지 아래에 있는지" },
  { name: "주가 강도", desc: "뉴욕증권거래소(NYSE)에서 52주 신고가 종목 수와 신저가 종목 수의 차이" },
  { name: "주가 폭(시장 폭)", desc: "NYSE에서 오른 종목과 내린 종목의 거래량 비교 (McClellan Volume Summation Index)" },
  { name: "풋·콜 옵션", desc: "최근 5일 평균 풋/콜 비율 — 하락에 대비하는 풋옵션 비중이 커지면 공포 쪽" },
  { name: "정크본드 수요", desc: "위험이 큰 회사채와 우량 채권의 수익률 차이 — 차이가 좁아지면 위험을 감수하는 쪽(탐욕)" },
  { name: "시장 변동성", desc: "VIX지수가 50일 이동평균보다 높은지 — 변동성이 커지면 공포 쪽" },
  { name: "안전자산 수요", desc: "최근 20거래일 동안 주식과 미국 국채 수익률 차이 — 국채가 앞서면 공포 쪽" },
];

const FAQ: GuideFaq[] = [
  {
    q: "공포탐욕지수는 무엇인가요?",
    a: "미국 CNN이 발표하는 투자 심리 지수예요. 지금 미국 주식시장을 움직이는 감정이 공포 쪽인지 탐욕 쪽인지를 0부터 100까지의 점수로 보여줘요.",
  },
  {
    q: "공포탐욕지수는 몇 가지 지표로 만드나요?",
    a: "CNN 설명 기준 7가지예요. 시장 모멘텀, 주가 강도, 주가 폭, 풋·콜 옵션, 정크본드 수요, 시장 변동성(VIX), 안전자산 수요를 같은 비중으로 합쳐 점수를 매겨요.",
  },
  {
    q: "0과 100은 각각 무슨 뜻인가요?",
    a: "100에 가까울수록 탐욕이 크고, 0에 가까울수록 공포가 크다는 뜻이에요. CNN 페이지에서는 점수와 함께 극단적 공포부터 극단적 탐욕까지의 단계 이름도 보여줘요.",
  },
  {
    q: "공포탐욕지수와 VIX지수는 같은 건가요?",
    a: "아니요. VIX지수는 옵션 가격으로 계산한 변동성 지수 하나이고, 공포탐욕지수는 VIX를 포함한 7가지 지표를 합친 점수예요.",
  },
  {
    q: "공포탐욕지수는 어디서 보나요?",
    a: "CNN 공식 페이지(edition.cnn.com/markets/fear-and-greed)에서 볼 수 있어요. kr-stocks.com은 공포탐욕지수 값을 직접 제공하지 않고, 구성 지표 중 하나인 VIX지수를 VIX 공포지수 페이지에서 보여줘요.",
  },
  {
    q: "공포탐욕지수로 매매 시점을 알 수 있나요?",
    a: "아니요. 시장 분위기를 가늠하는 참고 지표일 뿐 앞으로의 가격을 알려주지 않아요. CNN도 기업 실적 같은 다른 분석 도구와 함께 쓰라고 설명해요.",
  },
];

export default async function GuideFearGreed() {
  const fx = await getGuideFx();
  return (
    <GuideShell
      url={URL}
      title={TITLE}
      description={DESC}
      eyebrow="📖 가이드 · 미국 시장 심리"
      intro={<>CNN 공포탐욕지수는 미국 주식시장의 분위기를 0(극단적 공포)부터 100(극단적 탐욕)까지 점수 하나로 보여주는 지수예요.</>}
      datePublished="2026-11-08"
      faq={FAQ}
      fx={fx}
      related={[
        { href: CNN_URL, label: "CNN 공포탐욕지수 공식 페이지", desc: "지금 점수와 7가지 지표 그래프 (외부 사이트)", external: true },
        { href: "/global/vix", label: "VIX 공포지수 지금 값 보기", desc: "공포탐욕지수 구성 지표 중 하나" },
        { href: "/guide/vix-index", label: "VIX지수(빅스지수) 뜻과 보는 법" },
      ]}
    >
      <GuideSection id="fg-what" title="공포탐욕지수는 어떻게 만드나요">
        <p>
          CNN 설명에 따르면 아래 7가지 지표가 평소보다 얼마나 벗어났는지를 재고, 각 지표에 <b className="text-text">같은 비중</b>을 줘서 0~100
          점수를 만들어요. 새 데이터가 나오는 대로 다시 계산해요.
        </p>
        <ol className="list-decimal ml-5 space-y-1">
          {INDICATORS.map((i) => (
            <li key={i.name}>
              <b className="text-text">{i.name}</b> — {i.desc}
            </li>
          ))}
        </ol>
      </GuideSection>

      <GuideSection id="fg-read" title="점수는 이렇게 읽어요">
        <ul className="list-disc ml-5 space-y-1">
          <li>100에 가까울수록 탐욕(위험을 감수하려는 분위기), 0에 가까울수록 공포(피하려는 분위기)예요.</li>
          <li>CNN 페이지에서 하루 전·1주 전·1달 전·1년 전 점수와 비교할 수 있어요. 하루 값보다 변화 방향을 보세요.</li>
          <li>미국 시장 기준 지표라 한국 주식 점수가 아니에요.</li>
        </ul>
      </GuideSection>

      <GuideSection id="fg-here" title="kr-stocks.com과 함께 보는 법">
        <p>
          kr-stocks.com은 공포탐욕지수 값을 직접 보여주지 않아요. 대신 구성 지표 중 하나인 VIX지수를 VIX 공포지수 페이지에서, 미국 대표 지수인
          S&amp;P500을 24시간 시세 페이지에서 볼 수 있어요.
        </p>
      </GuideSection>
    </GuideShell>
  );
}
