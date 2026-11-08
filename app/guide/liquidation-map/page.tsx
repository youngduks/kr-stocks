// 가이드 — 청산맵 보는 법 (2026-11-08)
// 네이버 월간 검색량(2026-11-08): 청산맵 3,320 · 청산맵보는법 15
// 설명 범위: kr-stocks.com /liquidation 에 실제로 있는 것만 — CoinGlass 청산 지도 바로가기 6종,
//   바이낸스 공개 캔들로 계산한 CVD(삼성전자·SK하이닉스·현대차), KODEX SK하이닉스레버리지 일별 차트.

import type { Metadata } from "next";
import { GuideShell, GuideSection, getGuideFx, type GuideFaq } from "@/components/guide/GuideShell";

export const revalidate = 3600;

const URL = "https://kr-stocks.com/guide/liquidation-map";
const TITLE = "청산맵 보는 법 — 주식 청산맵(리퀴데이션 히트맵) 뜻과 활용";
const DESC =
  "청산맵(리퀴데이션 히트맵)이 무엇을 보여주는지, 밝은 구간을 어떻게 읽는지, 삼성전자·SK하이닉스 같은 주식 청산맵은 어디서 보는지 정리했어요. kr-stocks.com 청산맵 페이지의 CVD 차트 읽는 법도 함께.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: ["청산맵", "청산맵 보는법", "청산 지도", "리퀴데이션 히트맵", "liquidation heatmap", "삼성전자 청산맵", "CVD"],
  openGraph: { title: TITLE, description: DESC, url: URL, type: "article" },
  alternates: { canonical: URL },
};

const FAQ: GuideFaq[] = [
  {
    q: "청산맵은 무엇인가요?",
    a: "레버리지(빌린 돈)로 선물 포지션을 잡은 사람들이 강제 청산될 것으로 추정되는 가격대를 색으로 칠한 지도예요. 리퀴데이션 히트맵이라고도 불러요.",
  },
  {
    q: "청산맵의 밝은 구간은 무슨 뜻인가요?",
    a: "그 가격대에 청산될 것으로 추정되는 포지션이 많이 몰려 있다는 뜻이에요. 실제 주문이 걸려 있는 것이 아니라 거래 데이터로 추정한 값이라, 가격이 그 구간에서 반드시 멈추거나 튕기는 것은 아니에요.",
  },
  {
    q: "삼성전자·SK하이닉스 청산맵도 볼 수 있나요?",
    a: "네. 거래소들이 주식 가격을 따라가는 선물을 상장하면서 청산맵 서비스에서도 주식 티커를 볼 수 있게 됐어요. kr-stocks.com 청산맵 페이지에서 삼성전자·SK하이닉스·NVIDIA·DRAM·S&P500·KORU 청산 지도(CoinGlass, 외부 사이트)로 바로 갈 수 있어요.",
  },
  {
    q: "CVD는 무엇인가요?",
    a: "시장가로 사들인 체결량에서 시장가로 판 체결량을 빼서 계속 더한 값이에요. 선이 오르면 사려는 힘이, 내리면 팔려는 힘이 강했다는 뜻이에요. kr-stocks.com은 바이낸스 공개 캔들 데이터로 삼성전자·SK하이닉스·현대차 선물의 CVD를 직접 계산해 보여줘요.",
  },
  {
    q: "청산맵만 보고 매매해도 되나요?",
    a: "권하지 않아요. 청산맵은 추정치이고 CVD도 보조 지표라, 가격 차트·뉴스·수급과 함께 참고용으로만 보세요.",
  },
];

export default async function GuideLiquidationMap() {
  const fx = await getGuideFx();
  return (
    <GuideShell
      url={URL}
      title={TITLE}
      description={DESC}
      eyebrow="📖 가이드 · 선물 시장 읽기"
      intro={<>청산맵은 레버리지 포지션이 강제로 정리될 것으로 추정되는 가격대를 보여주는 지도예요. 이제 삼성전자·SK하이닉스 같은 주식 티커도 볼 수 있어요.</>}
      datePublished="2026-11-08"
      faq={FAQ}
      fx={fx}
      related={[
        { href: "/liquidation", label: "청산맵 · 체결강도(CVD) 페이지", desc: "청산 지도 바로가기 6종 + 삼전·닉스·현대차 CVD + 레버리지 ETF 차트" },
        { href: "/korea/samsung", label: "삼성전자 24시간 시세" },
        { href: "/korea/hynix", label: "SK하이닉스 24시간 시세" },
      ]}
    >
      <GuideSection id="liq-what" title="청산맵이 보여주는 것">
        <p>
          선물은 증거금보다 큰 금액을 거래할 수 있어서, 가격이 반대로 일정 수준 이상 움직이면 거래소가 포지션을 강제로 정리(청산)해요. 청산맵은
          거래 데이터로 <b className="text-text">이런 청산이 몰려 있을 것으로 추정되는 가격대</b>를 밝은 색으로 칠해 보여줘요.
        </p>
      </GuideSection>

      <GuideSection id="liq-read" title="청산맵 읽는 순서">
        <ol className="list-decimal ml-5 space-y-1">
          <li>지금 가격 위아래로 밝게 빛나는 띠를 찾아요. 위쪽은 하락에 건 쪽(숏), 아래쪽은 상승에 건 쪽(롱)의 청산 추정 구간이에요.</li>
          <li>가격이 밝은 띠에 가까워지면 청산 물량이 한꺼번에 나와 움직임이 커질 수 있어요.</li>
          <li>추정치라 맞지 않을 때도 많아요. 단독 신호가 아니라 참고 자료로만 써요.</li>
        </ol>
      </GuideSection>

      <GuideSection id="liq-here" title="kr-stocks.com 청산맵 페이지에 있는 것">
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <b className="text-text">청산 지도 바로가기</b> — 삼성전자·SK하이닉스·NVIDIA·DRAM·S&amp;P500·KORU 청산맵(CoinGlass, 외부 사이트)으로 이동해요.
          </li>
          <li>
            <b className="text-text">체결강도(CVD) 차트</b> — 바이낸스 선물 공개 캔들로 삼성전자·SK하이닉스·현대차의 최근 7일 CVD를 직접 계산해
            보여줘요. 가격과 CVD 방향이 엇갈리는지(다이버전스) 함께 볼 수 있어요.
          </li>
          <li>
            <b className="text-text">레버리지 ETF 차트</b> — 코스피에 상장된 KODEX SK하이닉스레버리지 일별 시세를 SK하이닉스 등락과 비교해,
            하루 급락한 날을 표시해요.
          </li>
        </ul>
      </GuideSection>
    </GuideShell>
  );
}
