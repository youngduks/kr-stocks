// 가이드 — 코스피200 야간선물 거래시간 (2026-11-08)
// 네이버 월간 검색량(2026-11-08): 코스피야간선물 188,400 · 코스피200야간선물 50,340 · 야간선물 32,200 · 코스피야간선물시간 840
// 사실 근거 (한국거래소 발표를 다룬 언론 보도, 다수 매체 교차 확인):
//   - 2025-06-09 한국거래소 자체 야간 파생상품시장 개장 (개장식 보도)
//   - 2026-11-06 수능일 거래시간 안내: 파생상품 야간 거래 평소 오후 6시 개장 → 수능일 오후 7시, 종료는 다음 날 오전 6시 그대로
//                                    정규 파생상품시장 수능일 09:45~16:45 (평소보다 1시간 늦춤 → 평소 08:45~15:45)
// 실시간 KRX 야간선물 시세는 제공하지 않음 → /korea/kospi-night (EWY 대용 지표) 로 연결.

import type { Metadata } from "next";
import { GuideShell, GuideSection, getGuideFx, type GuideFaq } from "@/components/guide/GuideShell";

export const revalidate = 3600;

const URL = "https://kr-stocks.com/guide/kospi-night-futures-hours";
const TITLE = "코스피200 야간선물 거래시간 — 코스피 야간선물 몇 시까지?";
const DESC =
  "코스피200 야간선물(코스피 야간선물)은 평소 오후 6시에 열려 다음 날 오전 6시에 끝나요. 한국거래소 야간 파생상품시장 거래시간과 정규 선물시장 시간, 수능일처럼 시간이 바뀌는 날을 정리했어요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: ["코스피200 야간선물", "코스피 야간선물", "야간선물", "코스피 야간선물 시간", "야간선물 거래시간", "야간선물 몇시까지"],
  openGraph: { title: TITLE, description: DESC, url: URL, type: "article" },
  alternates: { canonical: URL },
};

const FAQ: GuideFaq[] = [
  {
    q: "코스피200 야간선물은 몇 시부터 몇 시까지 거래되나요?",
    a: "2026년 11월 한국거래소 안내 기준으로 평소 오후 6시에 열려 다음 날 오전 6시에 끝나요. 거래시간은 바뀔 수 있으니 거래 전 한국거래소나 이용하는 증권사 공지를 확인하세요.",
  },
  {
    q: "코스피200 선물 정규 거래시간은 언제인가요?",
    a: "평소 오전 8시 45분부터 오후 3시 45분까지예요. 정규 거래가 끝나고 오후 6시부터 야간 거래가 이어져요.",
  },
  {
    q: "거래시간이 바뀌는 날도 있나요?",
    a: "네. 예를 들어 2026년 11월 19일 수능일에는 정규 파생상품시장이 1시간 늦은 오전 9시 45분~오후 4시 45분에 열리고, 야간 거래도 1시간 늦은 오후 7시에 시작해 다음 날 오전 6시에 끝나요.",
  },
  {
    q: "한국거래소 야간선물은 언제부터 생겼나요?",
    a: "한국거래소는 2025년 6월 9일 자체 야간 파생상품시장을 열었어요. 코스피200 선물과 미국달러선물 등이 야간에도 거래돼요.",
  },
  {
    q: "코스피 야간선물 시세를 kr-stocks.com에서 볼 수 있나요?",
    a: "KRX 코스피200 야간선물 시세 자체는 제공하지 않아요. 대신 24시간 거래되는 한국 ETF(EWY) 무기한 선물의 등락률을 코스피 야간선물 페이지(/korea/kospi-night)에서 대용 지표로 볼 수 있어요. 실제 야간선물 가격과는 달라요.",
  },
];

const ROWS: [string, string][] = [
  ["정규 파생상품시장", "오전 8시 45분 ~ 오후 3시 45분"],
  ["야간 파생상품시장", "오후 6시 ~ 다음 날 오전 6시"],
  ["수능일(2026년 11월 19일) 정규", "오전 9시 45분 ~ 오후 4시 45분"],
  ["수능일(2026년 11월 19일) 야간", "오후 7시 ~ 다음 날 오전 6시"],
];

export default async function GuideKospiNightHours() {
  const fx = await getGuideFx();
  return (
    <GuideShell
      url={URL}
      title={TITLE}
      description={DESC}
      eyebrow="📖 가이드 · 코스피 야간선물"
      intro={<>코스피200 야간선물은 평소 <b className="text-text">오후 6시부터 다음 날 오전 6시까지</b> 거래돼요(2026년 11월 한국거래소 안내 기준).</>}
      datePublished="2026-11-08"
      faq={FAQ}
      fx={fx}
      related={[
        { href: "/korea/kospi-night", label: "코스피 야간선물 대신 보는 한국 ETF(EWY) 24시간 시세", desc: "미국 정규장 종가 대비 등락률 · 대용 지표" },
        { href: "/korea/samsung", label: "삼성전자 24시간 시세 (야간·주말)" },
        { href: "/guide/korean-overnight-prices", label: "한국 주식 야간 가격 확인하는 법" },
      ]}
    >
      <GuideSection id="kn-table" title="코스피200 선물 거래시간 한눈에">
        <table className="w-full text-sm">
          <tbody>
            {ROWS.map(([k, v]) => (
              <tr key={k} className="border-t border-line first:border-t-0">
                <td className="py-2 pr-3 text-text font-semibold">{k}</td>
                <td className="py-2 tabular">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="ds-meta">출처: 한국거래소 2026년 11월 6일 수능일 거래시간 안내(언론 보도). 시간은 바뀔 수 있어요.</p>
      </GuideSection>

      <GuideSection id="kn-what" title="야간선물은 왜 보나요">
        <p>
          코스피200 야간선물은 한국 주식시장이 닫힌 저녁과 새벽에도 코스피200 지수 선물이 거래되는 시장이에요. 밤사이 미국 시장이나 해외
          뉴스에 한국 주식 분위기가 어떻게 반응하는지 가늠할 때 많이 찾아요. 다만 다음 날 정규장 시작 가격을 보장하지는 않아요.
        </p>
      </GuideSection>

      <GuideSection id="kn-alt" title="야간선물 시세를 못 볼 때">
        <p>
          kr-stocks.com은 KRX 야간선물 시세를 직접 보여주지 않아요. 대신 24시간 거래되는 한국 ETF(EWY) 무기한 선물이 미국 종가보다 몇 %
          움직였는지를 코스피 야간선물 페이지에서 대용 지표로 보여줘요. 코스피200이 아니라 MSCI 한국 지수를 따르는 달러 ETF라 실제
          야간선물과는 다르게 움직일 수 있어요.
        </p>
      </GuideSection>
    </GuideShell>
  );
}
