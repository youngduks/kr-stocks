import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "데이터 원칙·이용법",
  description:
    "kr-stocks.com 이 보여주는 시세·신호·통계·뉴스를 어디서, 얼마나 자주 가져오는지와 한계, 이용 시 유의점을 정리했습니다.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://kr-stocks.com/about" },
};

const LAST_UPDATED = "2026-10-08";

// 출처·주기는 코드 기준(lib/fetchPrices·semiSignal·historyStats, .github/workflows/*.yml). 바꾸면 여기도 같이 고칠 것.
const SOURCES: { title: string; from: string; cycle: string }[] = [
  {
    title: "한국 주식(삼성전자·SK하이닉스·현대차) 시세",
    from: "정규장·NXT 시간외 거래 중에는 네이버 금융 가격, 그 밖의 시간에는 바이낸스 USDT-M 무기한 선물 가격",
    cycle: "종목 페이지 약 30초, 홈 약 2분 간격",
  },
  {
    title: "미국·비상장·글로벌 종목 시세",
    from: "종목에 따라 바이낸스 USDT-M 또는 Hyperliquid HIP-3(xyz, vntl) 무기한 선물 가격. 정규장 가격이 연결된 일부 미국 종목은 미국 정규장 중 Yahoo Finance 가격을 보여줌",
    cycle: "종목 페이지 약 30초, 홈 약 2분 간격",
  },
  {
    title: "원화 환산 환율",
    from: "업비트 KRW/USDT 시세",
    cycle: "시세와 같은 주기",
  },
  {
    title: "미국 반도체 야간 신호",
    from: "Yahoo Finance 의 SOXL(미국 반도체 3배 ETF) 등락을 3으로 나눈 추정치",
    cycle: "약 5분",
  },
  {
    title: "과거 통계·채점표",
    from: "필라델피아 반도체지수(^SOX) 일봉(Yahoo Finance)과 한국 거래소 공식 종가(네이버 금융), 최근 약 5년",
    cycle: "매주 토요일 09:00(KST)",
  },
  {
    title: "외국인 5일 순매수",
    from: "네이버 금융 종목별 외국인·기관 매매 동향",
    cycle: "평일 17:00(KST)",
  },
  {
    title: "증권사 목표주가",
    from: "네이버 금융 리서치의 증권사 평균 목표주가·투자의견",
    cycle: "평일 16:00(KST)",
  },
  {
    title: "뉴스룸",
    from: "한국경제·머니투데이·연합뉴스(경제·국제) RSS와 네이버 금융 종목 공시를 키워드로 걸러 제목·요약(RSS 제공분)·원문 링크를 모음",
    cycle: "1시간마다",
  },
  {
    title: "다가오는 일정",
    from: "확정된 휴장일·FOMC 발표일 목록과, 규칙으로 계산한 코스피200 옵션 만기일(매월 둘째 목요일, 휴장이면 직전 거래일)",
    cycle: "날짜는 화면을 열 때 기준으로 계산",
  },
  {
    title: "인간지표 투표",
    from: "방문자 익명 투표(브라우저 세션당 1표). 결과는 장 마감 뒤 네이버 금융 정규장 종가로 판정",
    cycle: "평일 15:45(KST) 결과 기록",
  },
  {
    title: "인물 지표",
    from: "특정 경제 유튜브 채널의 공개 영상 자막을 AI가 읽고, 증시 방향 의견이 있는 영상만 상승·하락으로 분류",
    cycle: "새 영상이 있을 때 수동·자동 갱신",
  },
];

export default async function AboutPage() {
  const data = await fetchAllPrices();

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />
      <main className="max-w-3xl mx-auto px-5 pt-6 pb-12">
        <Link href="/" className="text-xs text-text-dim hover:text-text-muted">
          ← 홈으로
        </Link>

        <article className="mt-4">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">데이터 원칙·이용법</h1>
            <p className="text-text-dim text-sm">최종 수정: {LAST_UPDATED}</p>
          </header>

          <div className="space-y-6 text-sm text-text-muted leading-relaxed">
            <p>
              kr-stocks.com(이하 "사이트")은 한국 정규장이 닫힌 시간에도 주요 종목의 가격 흐름을 볼 수 있도록 공개
              시세와 통계를 모아 보여주는 정보 사이트입니다. 이 페이지는 화면의 숫자가 어디서 오는지, 얼마나 자주
              바뀌는지, 무엇을 할 수 없는지를 정리한 것입니다.
            </p>

            <section>
              <h2 className="text-lg font-bold text-text mb-2">1. 원칙</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>화면의 수치는 아래 출처에서 받은 실제 데이터로만 계산합니다. 데이터를 받지 못하면 숫자를 지어내지 않고 "—" 로 비워 두거나 해당 카드를 숨깁니다.</li>
                <li>과거 통계는 표본 수(n)를 함께 표시하고, 표본이 15번 미만이면 보여주지 않습니다.</li>
                <li>각 카드에 기준 시각이나 계산 기간을 함께 적습니다.</li>
                <li>신호·통계·투표는 참고용 요약이며 매수·매도 지시가 아닙니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-text mb-2">2. 데이터 출처와 갱신 주기</h2>
              <div className="space-y-2">
                {SOURCES.map((s) => (
                  <div key={s.title} className="p-4 rounded-xl bg-bg-card border border-line">
                    <div className="font-semibold text-text">{s.title}</div>
                    <div className="mt-1">{s.from}</div>
                    <div className="mt-1 text-text-dim">갱신: {s.cycle}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-text-dim">
                갱신 주기는 캐시 기준이라 방문 시점에 따라 조금 더 늦게 반영될 수 있습니다. 출처 서비스의 장애·지연은
                사이트에도 그대로 반영됩니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-text mb-2">3. 알아두어야 할 한계</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  정규장이 닫힌 시간의 가격은 해외 거래소의 무기한 선물(perp) 시세입니다. 실제 주식이 아니라 가격을
                  따라가는 파생상품이라 다음 날 정규장 시작 가격과 차이가 날 수 있습니다.
                </li>
                <li>
                  비상장 회사(OpenAI·Anthropic 등) 가격은 상장 주식 가격이 아니라 선물 시장에서 형성된 기업가치
                  추정치(implied valuation)입니다.
                </li>
                <li>
                  미국 반도체 야간 신호는 SOXL 등락을 3으로 나눈 추정치라 실제 반도체지수와 조금 다를 수 있습니다.
                  홈의 채점표는 실제 지수(^SOX)가 1% 넘게 움직인 날을 기준으로 따로 계산한 과거 통계입니다.
                </li>
                <li>과거에 그랬다고 앞으로도 그렇다는 보장은 없습니다. 표본이 작을수록 우연일 가능성이 큽니다.</li>
                <li>인간지표 투표와 인물 지표는 재미·역발상 참고용이며 통계적 예측 도구가 아닙니다.</li>
                <li>뉴스룸은 기사 제목·요약과 원문 링크를 모아 보여줄 뿐이며, 기사 내용의 정확성은 각 언론사에 있습니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-text mb-2">4. 이용법</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>홈 맨 위 "오늘 한눈에"에서 밤사이 미국 반도체·환율·외국인 수급과 다가오는 일정을 먼저 확인하세요.</li>
                <li>"그래서 내일 아침 한국장은?" 카드의 "조금 더"를 열면 신호를 만드는 방법을 볼 수 있습니다.</li>
                <li>종목 이름을 누르면 종목 페이지에서 가격 차트와 정규장 대비 괴리를, 한국 3종목은 증권사 목표주가와 외국인·기관 매매 동향도 볼 수 있습니다.</li>
                <li>종목 페이지의 가격 옆 표시(정규장·NXT·Binance·Hyperliquid)로 지금 보이는 가격의 출처를 알 수 있습니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-text mb-2">5. 광고와 제휴</h2>
              <p>
                일부 페이지에는 광고와 거래소·쇼핑·숙소 제휴(추천) 링크가 포함될 수 있으며, 제휴 링크를 통한 구매·가입
                시 사이트가 수수료를 받을 수 있습니다. 광고·제휴 여부는 화면의 수치 계산에 영향을 주지 않습니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-text mb-2">6. 투자 권유가 아닙니다</h2>
              <p>
                사이트의 모든 정보는 정보 제공 목적이며 투자 권유·자문이 아닙니다. 투자 판단과 그 결과의 책임은
                이용자 본인에게 있습니다. 정확한 거래 가격은 이용하는 증권사·거래소에서 확인하세요.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-text mb-2">7. 문의·오류 제보</h2>
              <p>
                숫자가 이상하거나 출처 표기가 잘못된 곳을 발견하면{" "}
                <a href="mailto:contact@kr-stocks.com" className="text-accent-blue hover:underline">
                  contact@kr-stocks.com
                </a>
                으로 알려 주세요. 개인정보 처리는{" "}
                <Link href="/privacy" prefetch={false} className="text-accent-blue hover:underline">
                  개인정보처리방침
                </Link>
                에서 확인할 수 있습니다.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
