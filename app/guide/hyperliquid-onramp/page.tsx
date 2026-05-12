import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

// 운영자 referral link (사용자 가격 부담 없음, 거래 수수료 일부가 사이트 운영비로)
const BINANCE_REF = "https://www.binance.com/register?ref=KRSTOCKS";
const BYBIT_REF = "https://www.bybit.com/invite?ref=OKWEGE";

export const metadata: Metadata = {
  title: "한국에서 Hyperliquid 거래하는 법 — 비상장 빅테크 24h 가이드",
  description:
    "OpenAI · SpaceX · Anthropic 비상장 빅테크와 한국 주식 야간시세를 한국에서 직접 거래하는 단계별 안내. Binance USDT 충전 → Hyperliquid Bridge → HIP-3 perp 거래.",
  keywords: [
    "Hyperliquid 한국",
    "Hyperliquid 가입",
    "Hyperliquid 한국인",
    "비상장 빅테크 거래",
    "OpenAI 주가 사는 법",
    "SpaceX 주가 사는 법",
    "Anthropic 주가 거래",
    "HIP-3 한국 거래",
    "Binance USDT 충전",
    "Bybit USDT 충전",
    "Bybit 한국 가입",
    "한국에서 비상장 perp 거래",
    "삼성전자 야간 거래",
  ],
  openGraph: {
    title: "한국에서 Hyperliquid 거래하는 법",
    description: "OpenAI · SpaceX · Anthropic 비상장 빅테크 24h 거래 단계별 가이드",
    url: "https://kr-stocks.com/guide/hyperliquid-onramp",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "한국에서 Hyperliquid 거래하는 법",
    description: "비상장 빅테크 24h 거래 가이드",
  },
  alternates: {
    canonical: "https://kr-stocks.com/guide/hyperliquid-onramp",
    languages: {
      "ko-KR": "https://kr-stocks.com/guide/hyperliquid-onramp",
      "en-US": "https://kr-stocks.com/en/guide/hyperliquid-onramp",
      "x-default": "https://kr-stocks.com/guide/hyperliquid-onramp",
    },
  },
};

export default async function HyperliquidOnrampGuide() {
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
            <div className="text-xs text-accent-blue font-semibold mb-2 tracking-wider">GUIDE · ONRAMP</div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              한국에서 Hyperliquid 거래하는 법
            </h1>
            <p className="text-text-muted text-base leading-relaxed">
              비상장 OpenAI · SpaceX · Anthropic + 미국주식 + 한국주식 야간 시세를
              한국에서 직접 거래하려면 Hyperliquid (HL) 분산형 거래소를 사용합니다.
              단계별 안내.
            </p>
          </header>

          <section className="mb-8 p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-2">Hyperliquid (HL) 는 무엇?</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Hyperliquid는 Arbitrum 기반 분산형 perpetual futures 거래소입니다.
              HIP-3 builder dex (xyz, vntl)에서 비상장 빅테크 (OpenAI · SpaceX · Anthropic) 의
              implied valuation 을 24/7 거래할 수 있고, 삼성전자 · SK하이닉스 같은
              한국 주식 perp 도 거래됩니다. 정규장 휴장 시간에도 가격 변동.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">단계별 거래 방법</h2>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-blue font-semibold mb-1 tracking-wider">STEP 1</div>
                <h3 className="font-bold text-base mb-2">USDT 확보 (Binance 또는 Bybit)</h3>
                <p className="text-sm text-text-muted leading-relaxed mb-3">
                  HL 은 USDT denominated 거래소입니다. Binance 또는 Bybit 에서
                  KRW 또는 BTC → USDT 매수 후 사용. 두 거래소 모두 한국인 가입 가능, KYC 5분 정도.
                  수수료·UI 취향에 따라 선택.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={BINANCE_REF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 rounded-lg bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20 text-sm font-semibold transition"
                  >
                    Binance 가입하기 →
                  </a>
                  <a
                    href={BYBIT_REF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 text-sm font-semibold transition"
                  >
                    Bybit 가입하기 →
                  </a>
                </div>
                <p className="text-[10px] text-text-dim mt-2 leading-relaxed">
                  ※ 위 링크는 운영자 referral 입니다. 사용자 가격 부담은 없으며,
                  거래 수수료의 일부가 kr-stocks.com 운영비로 사용됩니다.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-blue font-semibold mb-1 tracking-wider">STEP 2</div>
                <h3 className="font-bold text-base mb-2">Arbitrum 호환 지갑 준비</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  MetaMask 또는 Rabby 같은 EVM 지갑 설치 (브라우저 확장).
                  Hyperliquid 는 Arbitrum 기반이라 별도 ETH 또는 ARB 가스비는
                  거의 필요 없음 (HL Bridge 가 처리).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-blue font-semibold mb-1 tracking-wider">STEP 3</div>
                <h3 className="font-bold text-base mb-2">Hyperliquid 접속 + 지갑 연결</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  <a href="https://app.hyperliquid.xyz" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">app.hyperliquid.xyz</a> 접속
                  → "Connect Wallet" 클릭 → 본인 EVM 지갑 선택. 첫 접속 시 서명 1회
                  요청 (가스비 X). 자동으로 HL 계정 생성됨.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-blue font-semibold mb-1 tracking-wider">STEP 4</div>
                <h3 className="font-bold text-base mb-2">USDT 입금 (Bridge)</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  HL 사이트에서 "Deposit" 클릭 → 표시되는 Arbitrum 주소 복사 →
                  Binance / Bybit 에서 <span className="font-mono text-text">Arbitrum One</span> network 로 USDT 출금.
                  5~10분 안에 HL 잔액 반영. 최소 입금 5 USDT 권장 (수수료 절감).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-card border border-line">
                <div className="text-xs text-accent-blue font-semibold mb-1 tracking-wider">STEP 5</div>
                <h3 className="font-bold text-base mb-2">비상장 빅테크 / 한국주식 perp 거래</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  HL UI 좌상단 dex selector → "xyz" 또는 "vntl" 선택 (HIP-3 builder dex).
                  종목 검색:
                </p>
                <ul className="text-sm text-text-muted leading-relaxed mt-2 space-y-1">
                  <li>• 비상장: <span className="font-mono text-text">OPENAI</span>, <span className="font-mono text-text">SPACEX</span>, <span className="font-mono text-text">ANTHROPIC</span> (vntl dex)</li>
                  <li>• 한국주식: <span className="font-mono text-text">SMSN</span>, <span className="font-mono text-text">SKHX</span>, <span className="font-mono text-text">HYUNDAI</span> (xyz dex)</li>
                  <li>• 미국주식: <span className="font-mono text-text">TSLA</span>, <span className="font-mono text-text">NVDA</span>, <span className="font-mono text-text">AAPL</span>, <span className="font-mono text-text">MSFT</span> 등 (xyz dex)</li>
                </ul>
                <p className="text-sm text-text-muted leading-relaxed mt-2">
                  long / short 포지션 entry, leverage 설정 (1x ~ 10x 권장).
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8 p-5 rounded-xl bg-accent-amber/5 border border-accent-amber/20">
            <h2 className="text-sm font-bold text-accent-amber mb-2">⚠️ 주의 사항</h2>
            <ul className="text-xs text-text-muted space-y-1 leading-relaxed">
              <li>• HL perp 가격은 정규장 종가와 차이날 수 있음 (premium / discount)</li>
              <li>• 비상장 종목은 implied valuation 기반 추정치 (정확한 1주 가격 아님)</li>
              <li>• Leverage 사용 시 청산 위험. 초보자는 1x 로 학습 권고</li>
              <li>• 본 정보는 참고용이며 투자 권유가 아닙니다</li>
              <li>• HL · Binance 모두 본인 책임 하에 사용</li>
            </ul>
          </section>

          <section className="p-5 rounded-xl bg-accent-blue/5 border border-accent-blue/20">
            <h2 className="text-sm font-bold text-accent-blue mb-3">📊 가격 보면서 타이밍 잡기</h2>
            <p className="text-sm text-text-muted leading-relaxed mb-3">
              가입 + 입금 완료 후, kr-stocks.com 카드에서 실시간 가격 + 정규장 종가 대비
              HL premium 확인하며 거래 타이밍 잡기:
            </p>
            <div className="flex flex-col gap-1.5">
              <Link href="/private/anthropic" className="text-accent-blue hover:underline font-semibold text-sm">
                → Anthropic 24h 가격
              </Link>
              <Link href="/private/spacex" className="text-accent-blue hover:underline font-semibold text-sm">
                → SpaceX 24h 가격
              </Link>
              <Link href="/private/openai" className="text-accent-blue hover:underline font-semibold text-sm">
                → OpenAI 24h 가격
              </Link>
              <Link href="/korea/samsung" className="text-accent-blue hover:underline font-semibold text-sm">
                → 삼성전자 야간 가격 (HL premium 포함)
              </Link>
              <Link href="/korea/hynix" className="text-accent-blue hover:underline font-semibold text-sm">
                → SK하이닉스 야간 가격
              </Link>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
