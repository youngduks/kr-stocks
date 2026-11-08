// 가이드 — VIX지수(빅스지수) 뜻과 보는 법 (2026-11-08)
// 네이버 월간 검색량(2026-11-08 검색광고 API): VIX지수 62,610 · VIX 28,430 · 빅스지수 24,640 · 공포지수 11,230
// 사실 근거: CNN Fear & Greed 페이지의 VIX 설명(CBOE 산출, S&P 500 지수 옵션 기반 향후 30일 예상 변동성,
//           시장 급락 때 치솟고 상승 때 내리는 경우가 많음). 구간별 수치 기준(예: 20 이상=공포)은 출처 확인 불가라 쓰지 않음.

import type { Metadata } from "next";
import { GuideShell, GuideSection, getGuideFx, type GuideFaq } from "@/components/guide/GuideShell";

export const revalidate = 3600;

const URL = "https://kr-stocks.com/guide/vix-index";
const TITLE = "VIX지수(빅스지수) 뜻과 보는 법";
const DESC =
  "VIX지수(빅스지수, 공포지수)가 무엇을 재는 지표인지, 숫자를 어떻게 읽는지, CNN 공포탐욕지수와 무엇이 다른지 정리했어요. kr-stocks.com VIX 공포지수 페이지에서 바로 확인할 수 있어요.";

export const metadata: Metadata = {
  title: `${TITLE} — 공포지수 확인하기`,
  description: DESC,
  keywords: ["VIX지수", "VIX", "빅스지수", "공포지수", "VIX 보는 법", "VIX 뜻", "변동성 지수"],
  openGraph: { title: TITLE, description: DESC, url: URL, type: "article" },
  alternates: { canonical: URL },
};

const FAQ: GuideFaq[] = [
  {
    q: "VIX지수는 무엇인가요?",
    a: "미국 시카고옵션거래소(CBOE)가 계산하는 변동성 지수예요. S&P 500 지수 옵션 가격을 바탕으로 앞으로 30일 동안 시장이 얼마나 크게 움직일 것으로 예상되는지를 숫자 하나로 보여줘요.",
  },
  {
    q: "빅스지수, 공포지수, VIX는 같은 말인가요?",
    a: "네. VIX를 읽는 소리가 빅스이고, 시장이 불안할 때 크게 오르는 경우가 많아 흔히 공포지수라고도 불러요.",
  },
  {
    q: "VIX가 오르면 주가는 떨어지나요?",
    a: "주식이 크게 빠지는 날 VIX가 치솟고, 시장이 오르는 날 VIX가 내리는 경우가 많아요. 하지만 항상 반대로 움직이는 것은 아니고 앞으로의 주가를 알려주는 지표도 아니에요. 하루 값보다 시간에 따른 흐름을 보는 게 좋아요.",
  },
  {
    q: "CNN 공포탐욕지수와 VIX는 무엇이 다른가요?",
    a: "VIX는 옵션 가격으로 계산한 변동성 지수 하나예요. CNN 공포탐욕지수는 VIX를 포함해 7가지 시장 지표를 묶어 0~100 점수로 만든 지수예요. VIX는 그 7가지 중 하나로 쓰여요.",
  },
  {
    q: "kr-stocks.com에서 VIX는 어디서 보나요?",
    a: "VIX 공포지수 페이지(/global/vix)에서 볼 수 있어요. 야후 파이낸스의 VIX 정규장 값을 보여주고, 정규장이 닫힌 시간에는 마지막 종가를 보여줘요. 하이퍼리퀴드 VIX 무기한 선물에 거래가 생기면 그 가격도 함께 보여줘요.",
  },
];

export default async function GuideVix() {
  const fx = await getGuideFx();
  return (
    <GuideShell
      url={URL}
      title={TITLE}
      description={DESC}
      eyebrow="📖 가이드 · 미국 시장 분위기"
      intro={<>VIX지수(빅스지수)는 미국 주식시장이 앞으로 얼마나 출렁일 것으로 예상되는지 보여주는 숫자예요. 흔히 &lsquo;공포지수&rsquo;라고 불러요.</>}
      datePublished="2026-11-08"
      faq={FAQ}
      fx={fx}
      related={[
        { href: "/global/vix", label: "VIX 공포지수 지금 값 보기", desc: "야후 파이낸스 VIX 정규장 값 · 마지막 종가" },
        { href: "/guide/fear-greed-index", label: "CNN 공포탐욕지수 뜻과 보는 법", desc: "VIX를 포함한 7가지 지표로 만든 0~100 점수" },
        { href: "/global/sp500", label: "S&P500 24시간 시세", desc: "VIX가 바탕으로 삼는 미국 대표 지수" },
      ]}
    >
      <GuideSection id="vix-what" title="VIX지수는 무엇을 재나요">
        <p>
          VIX(CBOE Volatility Index)는 미국 시카고옵션거래소(CBOE)가 계산해요. S&amp;P 500 지수 옵션 가격을 바탕으로{" "}
          <b className="text-text">앞으로 30일 동안 예상되는 변동성</b>을 나타내요. 옵션을 사려는 사람이 많아지고 값이 비싸지면, 시장이
          크게 움직일 것으로 예상한다는 뜻이라 VIX가 올라가요.
        </p>
      </GuideSection>

      <GuideSection id="vix-read" title="숫자는 이렇게 읽어요">
        <ul className="list-disc ml-5 space-y-1">
          <li>숫자가 클수록 시장이 앞으로 크게 출렁일 것으로 예상된다는 뜻이에요.</li>
          <li>주식이 크게 빠지는 날 치솟고, 시장이 오르는 날 내리는 경우가 많아요.</li>
          <li>하루 값보다 흐름이 중요해요. 상승장에서는 낮게, 하락장에서는 높게 머무는 경향이 있어요.</li>
          <li>단위는 지수 포인트예요. 원화나 달러 가격이 아니에요.</li>
        </ul>
      </GuideSection>

      <GuideSection id="vix-vs-fg" title="CNN 공포탐욕지수와의 차이">
        <p>
          VIX는 옵션 가격 하나로 만든 지표이고, CNN 공포탐욕지수는 VIX를 포함한 7가지 시장 지표를 묶어 0~100 점수로 만든 지수예요. 이름이
          비슷해 헷갈리기 쉬우니 둘을 구분해서 보세요.
        </p>
      </GuideSection>

      <GuideSection id="vix-here" title="kr-stocks.com에서 보는 법">
        <ol className="list-decimal ml-5 space-y-1">
          <li>VIX 공포지수 페이지(/global/vix)를 열어요.</li>
          <li>미국 정규장 시간에는 야후 파이낸스의 VIX 정규장 값, 장이 닫힌 시간에는 마지막 종가가 보여요.</li>
          <li>하이퍼리퀴드 VIX 무기한 선물은 지금 거래가 거의 없어, 거래가 없을 때는 선물 가격 대신 정규장 종가를 보여줘요.</li>
        </ol>
      </GuideSection>
    </GuideShell>
  );
}
