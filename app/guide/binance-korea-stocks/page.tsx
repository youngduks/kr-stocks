import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

// 운영자 referral link (사용자 가격 부담 없음, 거래 수수료 일부가 사이트 운영비로)
const BINANCE_REF = "https://www.binance.com/register?ref=KRSTOCKS";

export const metadata: Metadata = {
  title: "바이낸스에서 삼성·SK하이닉스·현대차 거래하는 법 — 24h 선물 가이드",
  description:
    "삼성전자·SK하이닉스·현대차 한국 주식을 바이낸스 USDT-M 선물(SAMSUNGUSDT·SKHYNIXUSDT·HYUNDAIUSDT)로 24시간 거래하는 단계별 안내. 가입 → USDT 확보 → 선물 이체 → 거래.",
  keywords: [
    "바이낸스 삼성전자 선물",
    "바이낸스 한국주식",
    "SAMSUNGUSDT 거래",
    "SKHYNIXUSDT",
    "HYUNDAIUSDT",
    "삼성전자 24시간 거래",
    "SK하이닉스 야간 거래",
    "현대차 선물",
    "바이낸스 가입 한국",
    "바이낸스 USDT 충전",
    "한국주식 perp 거래",
    "삼성전자 코인 거래",
  ],
  openGraph: {
    title: "바이낸스에서 삼성·SK하이닉스·현대차 거래하는 법",
    description: "한국 주식 3종을 바이낸스 USDT-M 선물로 24시간 거래하는 단계별 가이드",
    url: "https://kr-stocks.com/guide/binance-korea-stocks",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "바이낸스에서 삼성·SK하이닉스·현대차 거래하는 법",
    description: "한국 주식 3종 바이낸스 24h 선물 거래 가이드",
  },
  alternates: {
    canonical: "https://kr-stocks.com/guide/binance-korea-stocks",
    languages: {
      "ko-KR": "https://kr-stocks.com/guide/binance-korea-stocks",
      "en-US": "https://kr-stocks.com/en/guide/binance-korea-stocks",
      "x-default": "https://kr-stocks.com/guide/binance-korea-stocks",
    },
  },
};

export default async function BinanceKoreaStocksGuide() {
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
            <div className="text-xs text-accent-amber font-semibold mb-2 tracking-wider">GUIDE · BINANCE</div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              바이낸스에서 삼성·SK하이닉스·현대차 거래하는 법
            </h1>
            <p className="text-text-muted text-base leading-relaxed">
              2026년 6월 2일 바이낸스가 삼성전자·SK하이닉스·현대차 주가를 추종하는
              USDT-M 무기한 선물을 상장했습니다. 한국 주식을 정규장 휴장 시간에도
              24시간 long/short 거래할 수 있습니다. 외부 지갑·블록체인 브릿지 없이
              바이낸스 계정 하나로 끝나는 단계별 안내.
            </p>
          </header>

          <section className="mb-8 p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-2">바이낸스 한국주식 선물이란?</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              바이낸스 USDT-M 선물에 상장된 <span className="font-mono text-text">SAMSUNGUSDT</span>,
              <span className="font-mono text-text"> SKHYNIXUSDT</span>,
              <span className="font-mono text-text"> HYUNDAIUSDT</span>는 각 주식 가격을 추종하는
              cash-settled(현금 정산) 무기한 선물입니다. 실제 주식을 주고받지 않고 USDT로 정산하며,
              한국 증시가 닫힌 밤·주말에도 24시간 거래됩니다. 최대 20배 레버리지, 펀딩은 8시간마다 정산.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">단계별 거래 방법</h2>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-amber font-semibold mb-1 tracking-wider">STEP 1</div>
                <h3 className="font-bold text-base mb-2">바이낸스 가입 + 본인인증(KYC)</h3>
                <p className="text-sm text-text-muted leading-relaxed mb-3">
                  바이낸스 계정 생성 후 KYC(신분증 인증) 완료. 한국인 가입 가능하고 인증은 5~10분.
                  선물 거래를 처음 켤 때 간단한 적합성 퀴즈를 한 번 풀면 선물 지갑이 활성화됩니다.
                </p>
                <a
                  href={BINANCE_REF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 rounded-lg bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20 text-sm font-semibold transition"
                >
                  바이낸스 가입하기 →
                </a>
                <p className="text-[10px] text-text-dim mt-2 leading-relaxed">
                  ※ 위 링크는 운영자 referral 입니다. 사용자 가격 부담은 없으며,
                  거래 수수료의 일부가 kr-stocks.com 운영비로 사용됩니다.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-amber font-semibold mb-1 tracking-wider">STEP 2</div>
                <h3 className="font-bold text-base mb-2">USDT 확보</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  이 선물은 USDT로 정산됩니다. 바이낸스 P2P에서 원화(KRW)로 USDT를 직접 매수하거나,
                  보유 중인 BTC·코인을 USDT로 환전. P2P는 국내 은행 송금 기반이라 별도 해외송금 없이
                  바로 충전됩니다.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-amber font-semibold mb-1 tracking-wider">STEP 3</div>
                <h3 className="font-bold text-base mb-2">선물(USD-M Futures) 지갑으로 이체</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  바이낸스 앱 → [지갑] → [이체(Transfer)] → 현물(Spot)에서 USD-M 선물로 USDT 이동.
                  내부 이체라 수수료·대기시간 없음. 하이퍼리퀴드처럼 외부 지갑(MetaMask)이나
                  Arbitrum 브릿지가 전혀 필요 없습니다.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-amber font-semibold mb-1 tracking-wider">STEP 4</div>
                <h3 className="font-bold text-base mb-2">종목 검색 + long/short 진입</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  선물 거래화면 검색창에 심볼 입력:
                </p>
                <ul className="text-sm text-text-muted leading-relaxed mt-2 space-y-1">
                  <li>• 삼성전자: <span className="font-mono text-text">SAMSUNGUSDT</span></li>
                  <li>• SK하이닉스: <span className="font-mono text-text">SKHYNIXUSDT</span></li>
                  <li>• 현대차: <span className="font-mono text-text">HYUNDAIUSDT</span></li>
                </ul>
                <p className="text-sm text-text-muted leading-relaxed mt-2">
                  레버리지 설정(초보자는 1~3x 권장) → 상승 예상이면 long(매수),
                  하락 예상이면 short(매도) 진입.
                </p>
              </div>
            </div>
          </section>

          {/* 바이낸스 vs HL 비교 */}
          <section className="mb-8 p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-3">바이낸스 vs 하이퍼리퀴드 — 뭐가 다른가</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-dim text-xs border-b border-line">
                    <th className="text-left py-2 font-medium"> </th>
                    <th className="text-left py-2 font-medium">바이낸스</th>
                    <th className="text-left py-2 font-medium">하이퍼리퀴드(HL)</th>
                  </tr>
                </thead>
                <tbody className="text-text-muted">
                  <tr className="border-b border-line/50">
                    <td className="py-2 text-text-dim">가입 방식</td>
                    <td className="py-2">계정 + KYC</td>
                    <td className="py-2">EVM 지갑 연결</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="py-2 text-text-dim">충전</td>
                    <td className="py-2">P2P · 내부 이체</td>
                    <td className="py-2">Arbitrum 브릿지</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="py-2 text-text-dim">한국주식</td>
                    <td className="py-2 text-accent-green">삼성·하이닉스·현대차</td>
                    <td className="py-2 text-accent-green">삼성·하이닉스·현대차</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="py-2 text-text-dim">비상장 빅테크</td>
                    <td className="py-2 text-text-dim">없음</td>
                    <td className="py-2 text-accent-green">OpenAI·SpaceX·Anthropic</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-text-dim">유동성</td>
                    <td className="py-2">깊음 (가격 안정)</td>
                    <td className="py-2">얇음 (프리미엄 변동 큼)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-text-dim mt-3 leading-relaxed">
              삼성·하이닉스·현대차만 거래한다면 절차가 단순한 바이낸스가 편하고,
              OpenAI·SpaceX 같은 비상장 빅테크까지 거래하려면 하이퍼리퀴드가 필요합니다.
            </p>
          </section>

          <section className="mb-8 p-5 rounded-xl bg-accent-amber/5 border border-accent-amber/20">
            <h2 className="text-sm font-bold text-accent-amber mb-2">⚠️ 주의 사항</h2>
            <ul className="text-xs text-text-muted space-y-1 leading-relaxed">
              <li>• 선물 가격은 KRX 정규장 종가와 차이날 수 있음 (premium / discount)</li>
              <li>• cash-settled라 실제 주식·배당·의결권은 없음 (가격 추종만)</li>
              <li>• 레버리지 사용 시 청산 위험. 초보자는 1x 로 학습 권고</li>
              <li>• 펀딩비는 8시간마다 정산 — 장기 보유 시 비용/수취 확인</li>
              <li>• 본 정보는 참고용이며 투자 권유가 아닙니다</li>
            </ul>
          </section>

          <section className="p-5 rounded-xl bg-accent-blue/5 border border-accent-blue/20">
            <h2 className="text-sm font-bold text-accent-blue mb-3">📊 가격 보면서 타이밍 잡기</h2>
            <p className="text-sm text-text-muted leading-relaxed mb-3">
              가입 + 충전 완료 후, kr-stocks.com 카드에서 바이낸스 24h 시세 + 정규장 종가 대비
              프리미엄을 확인하며 거래 타이밍 잡기:
            </p>
            <div className="flex flex-col gap-1.5">
              <Link href="/korea/samsung" className="text-accent-blue hover:underline font-semibold text-sm">
                → 삼성전자 24h 가격 (Binance premium 포함)
              </Link>
              <Link href="/korea/hynix" className="text-accent-blue hover:underline font-semibold text-sm">
                → SK하이닉스 24h 가격
              </Link>
              <Link href="/korea/hyundai" className="text-accent-blue hover:underline font-semibold text-sm">
                → 현대차 24h 가격
              </Link>
            </div>
            <p className="text-sm text-text-muted leading-relaxed mt-4">
              OpenAI·SpaceX 같은 비상장 빅테크나 미국주식 야간 거래는{" "}
              <Link href="/guide/hyperliquid-onramp" className="text-accent-blue hover:underline font-semibold">
                하이퍼리퀴드 거래 가이드
              </Link>
              를 참고하세요.
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
