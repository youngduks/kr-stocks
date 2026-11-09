// 가이드 — 청산맵 보는 법 (2026-11-08)
// 네이버 월간 검색량(2026-11-08): 청산맵 3,320 · 청산맵보는법 15 · (11-09 추가) 청산히트맵 1,710
// 2026-11-09 보강: 레버리지별 청산 거리 표. ⚠ /liquidation 은 청산가를 직접 계산하지 않음(CoinGlass 지도 링크) →
//   표는 하이퍼리퀴드 공식 문서의 청산가 공식으로 이 페이지가 계산(아래 liqDistance). 최대 레버리지는 HL 공개 meta 를 읽음.
//   공식: liq_price = price − side × margin_available / position_size / (1 − l × side), l = 1/MAINTENANCE_LEVERAGE
//         유지증거금 = 최대 레버리지 초기증거금의 절반 → l = 1 / (2 × 최대 레버리지)  (docs: trading/liquidations)
//   격리 마진·진입 직후 기준: margin_available = P·Q·(1/L − l) → 롱 거리 (1/L − l)/(1 − l), 숏 거리 (1/L − l)/(1 + l)
// 설명 범위: kr-stocks.com /liquidation 에 실제로 있는 것만 — CoinGlass 청산 지도 바로가기 6종,
//   바이낸스 공개 캔들로 계산한 CVD(삼성전자·SK하이닉스·현대차), KODEX SK하이닉스레버리지 일별 차트.

import type { Metadata } from "next";
import { GuideShell, GuideSection, getGuideFx, type GuideFaq } from "@/components/guide/GuideShell";

export const revalidate = 3600;

const URL = "https://kr-stocks.com/guide/liquidation-map";
const TITLE = "청산맵 보는 법 — 청산 히트맵 뜻과 레버리지별 청산 거리";
const DESC =
  "청산맵(청산 히트맵·리퀴데이션 히트맵)이 무엇을 보여주는지, 밝은 구간을 어떻게 읽는지, 레버리지 10·25·50·100배일 때 청산까지 얼마나 남는지 공식과 표로 정리했어요. 삼성전자·SK하이닉스 주식 청산맵 보는 곳과 CVD 차트 읽는 법도 함께.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: ["청산맵", "청산 히트맵", "청산히트맵", "청산맵 보는법", "청산가 계산", "청산 지도", "리퀴데이션 히트맵", "liquidation heatmap", "삼성전자 청산맵", "CVD"],
  openGraph: { title: TITLE, description: DESC, url: URL, type: "article" },
  alternates: { canonical: URL },
};

/** 격리 마진 진입 직후 청산까지 거리(%) — 하이퍼리퀴드 공식. L > 최대 레버리지면 null(거래 불가) */
function liqDistance(L: number, maxLev: number): { long: number; short: number } | null {
  if (L > maxLev) return null;
  const l = 1 / (2 * maxLev);
  const m = 1 / L - l;
  return { long: (m / (1 - l)) * 100, short: (m / (1 + l)) * 100 };
}

const LEVS = [10, 25, 50, 100];
// 청산맵 페이지(/liquidation)에 바로가기가 있는 종목 → 하이퍼리퀴드 xyz 이름. 실패 시 2026-11-09 실측값
const GROUP_ASSETS: { label: string; hl: string; fallbackMax: number }[] = [
  { label: "삼성전자", hl: "xyz:SMSN", fallbackMax: 10 },
  { label: "SK하이닉스", hl: "xyz:SKHX", fallbackMax: 10 },
  { label: "KORU", hl: "xyz:KORU", fallbackMax: 10 },
  { label: "NVIDIA", hl: "xyz:NVDA", fallbackMax: 20 },
  { label: "DRAM", hl: "xyz:DRAM", fallbackMax: 20 },
  { label: "S&P500", hl: "xyz:SP500", fallbackMax: 50 },
];

async function fetchMaxLev(): Promise<{ map: Record<string, number>; live: boolean }> {
  try {
    const r = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "meta", dex: "xyz" }),
      next: { revalidate: 3600 },
    });
    if (!r.ok) throw new Error(String(r.status));
    const d: any = await r.json();
    const map: Record<string, number> = {};
    for (const u of d?.universe ?? []) if (u?.name && u?.maxLeverage) map[u.name] = Number(u.maxLeverage);
    return { map, live: true };
  } catch {
    return { map: {}, live: false };
  }
}

const FAQ: GuideFaq[] = [
  {
    q: "청산맵은 무엇인가요?",
    a: "레버리지(빌린 돈)로 선물 포지션을 잡은 사람들이 강제 청산될 것으로 추정되는 가격대를 색으로 칠한 지도예요. 청산 히트맵, 리퀴데이션 히트맵이라고도 불러요.",
  },
  {
    q: "레버리지 10배면 몇 % 움직일 때 청산되나요?",
    a: "거래소와 종목의 유지증거금에 따라 달라요. 하이퍼리퀴드 공식으로 계산하면 최대 10배 종목(삼성전자·SK하이닉스 등)에서 10배 롱은 약 5.3%, 최대 20배 종목에서는 약 7.7% 하락하면 청산돼요. 수수료·펀딩비를 빼고 격리 마진으로 막 진입한 경우의 계산이에요.",
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
  const [fx, ml] = await Promise.all([getGuideFx(), fetchMaxLev()]);
  // 최대 레버리지별로 묶기 (같은 최대 레버리지 = 같은 청산 거리)
  const groups = new Map<number, string[]>();
  for (const a of GROUP_ASSETS) {
    const mx = ml.map[a.hl] ?? a.fallbackMax;
    groups.set(mx, [...(groups.get(mx) ?? []), a.label]);
  }
  const cols = [...groups.entries()].sort((a, b) => a[0] - b[0]);
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

      <GuideSection id="liq-calc" title="레버리지별 청산까지 거리 (계산식 공개)">
        <p>
          하이퍼리퀴드가 공개한 청산가 공식이에요. 유지증거금률 l은 그 종목 최대 레버리지의 초기증거금 절반, 즉 1 ÷ (2 × 최대 레버리지)예요.
        </p>
        <p className="tabular text-text">liq_price = price − side × margin_available ÷ position_size ÷ (1 − l × side)</p>
        <p>
          격리 마진으로 레버리지 L배에 막 진입했다면 청산까지 거리는 롱 (1/L − l) ÷ (1 − l), 숏 (1/L − l) ÷ (1 + l)이에요. 아래 표는 이
          식으로 이 페이지가 직접 계산한 값이에요.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="ds-meta text-left">
                <th className="py-1 font-medium">레버리지</th>
                {cols.map(([mx, names]) => (
                  <th key={mx} className="py-1 font-medium text-right">
                    최대 {mx}배
                    <br />
                    <span className="font-normal">{names.join("·")}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular">
              {LEVS.map((L) => (
                <tr key={L} className="border-t border-line">
                  <td className="py-2 text-text font-semibold">{L}배</td>
                  {cols.map(([mx]) => {
                    const d = liqDistance(L, mx);
                    return (
                      <td key={mx} className="py-2 text-right">
                        {d ? (
                          <>
                            <span className="text-down">롱 −{d.long.toFixed(1)}%</span>
                            <br />
                            <span className="text-up">숏 +{d.short.toFixed(1)}%</span>
                          </>
                        ) : (
                          <span className="ds-meta">거래 불가</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ds-meta">
          하이퍼리퀴드 xyz 시장 기준 · 최대 레버리지는 하이퍼리퀴드 공개 정보{ml.live ? "에서 1시간마다 읽어요" : "(지금 못 읽어 2026년 11월 9일 값)"} ·
          수수료·펀딩비 제외, 격리 마진 진입 직후 기준 · 교차 마진은 계좌 전체 잔고에 따라 달라져요 · 바이낸스 등 다른 거래소는 유지증거금 기준이 달라 값이 달라요
        </p>
        <p>
          kr-stocks.com 청산맵 페이지는 청산가를 직접 계산하지 않고 CoinGlass 청산 지도로 연결해요. 이 표는 레버리지가 높을수록 청산까지 거리가 얼마나
          짧아지는지 감을 잡기 위한 예시예요.
        </p>
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
