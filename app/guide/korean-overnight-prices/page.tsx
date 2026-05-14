// 가이드 — 한국주식 야간 가격 확인하는 법
// long-tail SEO: "삼성전자 야간" / "한국주식 24시간" / "야간 주가" (5/14 형님 요청)

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "삼성전자 야간 가격 확인하는 법 — 24시간 한국주식 추적 완전 가이드",
  description:
    "KRX 휴장 시간에도 삼성전자, SK하이닉스, 현대차 가격이 어떻게 움직이는지 보는 법. " +
    "정규장 (09:00~15:30) + NXT 시간외 (08:00~08:50 + 15:30~20:00) + 야간 Hyperliquid perp (20:00~익일 09:00) 자동 추적.",
  keywords: [
    "삼성전자 야간",
    "삼성전자 새벽 가격",
    "한국주식 24시간",
    "한국주식 야간 시세",
    "SK하이닉스 야간",
    "현대차 야간",
    "한국주식 새벽",
    "한국주식 시간외",
    "야간 주가 확인",
    "Hyperliquid 한국주식",
  ],
  openGraph: {
    title: "삼성전자 야간 가격 확인하는 법 — kr-stocks.com",
    description:
      "KRX 휴장 후에도 삼성전자·SK하이닉스·현대차 가격 24시간 추적 — 정규장 + NXT + Hyperliquid 통합 가이드.",
    url: "https://kr-stocks.com/guide/korean-overnight-prices",
    type: "article",
  },
  alternates: {
    canonical: "https://kr-stocks.com/guide/korean-overnight-prices",
  },
};

export default async function GuideKoreanOvernightPrices() {
  const data = await fetchAllPrices();

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />

      <main className="max-w-3xl mx-auto px-5 pt-6 pb-12">
        <Link href="/" className="text-xs text-text-dim hover:text-text-muted">
          ← 홈으로
        </Link>

        <article className="mt-4 space-y-6">
          <header className="mb-2">
            <div className="text-xs text-text-dim mb-2">📖 가이드 · 한국 retail 주식 24h 추적</div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 leading-tight">
              삼성전자 야간 가격 확인하는 법
            </h1>
            <p className="text-base text-text-muted leading-relaxed">
              KRX 닫혀도 삼성전자·SK하이닉스·현대차 가격이 어떻게 움직이는지 보는 법.
              정규장 + NXT 시간외 + 야간 Hyperliquid 까지 24시간 자동 전환.
            </p>
          </header>

          <section className="p-5 rounded-2xl bg-accent-blue/5 border border-accent-blue/20">
            <h2 className="text-lg font-bold mb-3">🌙 왜 한국주식 야간 가격이 궁금한가</h2>
            <p className="text-sm text-text-muted leading-relaxed mb-3">
              한국 retail 투자자가 자주 마주치는 상황:
            </p>
            <ul className="space-y-2 text-sm text-text-muted leading-relaxed ml-4 list-disc">
              <li>
                새벽에 미국 시장 큰 변동 — 삼성전자·하이닉스 갭 어떻게 될까?
              </li>
              <li>
                주말에 글로벌 뉴스 (지정학적 사건 / Fed 발표 등) — 월요일 시초가 prediction?
              </li>
              <li>
                NXT 시간외 (15:30~20:00) 가격 흐름 — 다음 날 갭업/갭다운 단서?
              </li>
              <li>
                해외 출장·시차 — 한국주식 거래 시간 외에 가격 추적?
              </li>
            </ul>
            <p className="text-sm text-text-muted leading-relaxed mt-3">
              <strong className="text-text">정규장만 보면 24시간 중 6시간 30분만 추적 가능.</strong>
              나머지 17시간 30분은 가격 발견이 안 됩니다.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-3">⏰ 3-phase 시간대 정리 (KST 기준)</h2>
            <div className="space-y-3 text-sm text-text-muted leading-relaxed">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-accent-green mt-1.5 shrink-0" />
                <div>
                  <div className="font-semibold text-text">정규장 (KRX) — 09:00 ~ 15:30</div>
                  <div className="text-xs">한국거래소 정식 거래 시간. 시초가·종가 모두 발생.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-accent-amber mt-1.5 shrink-0" />
                <div>
                  <div className="font-semibold text-text">
                    NXT 시간외 — 08:00 ~ 08:50 (프리장) + 15:30 ~ 20:00 (애프터장)
                  </div>
                  <div className="text-xs">
                    NXT(Next Trade) ATS 한국 대체거래소. 프리·애프터 두 세션 운영.
                    네이버 금융에서 가격 노출.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-accent-blue mt-1.5 shrink-0" />
                <div>
                  <div className="font-semibold text-text">
                    야간 Hyperliquid HIP-3 perp — 20:00 ~ 익일 08:00 + 주말·공휴일
                  </div>
                  <div className="text-xs">
                    Hyperliquid 라는 코인 인프라 위에 한국주식 perpetual 계약이 거래됨.
                    24/7 휴장 X. 가격은 USD 기준이지만 한국 retail 친화로 원화 환산도 같이 표시.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="p-5 rounded-2xl bg-accent-green/5 border border-accent-green/20">
            <h2 className="text-lg font-bold mb-3">🚀 kr-stocks.com 사용법</h2>
            <ol className="space-y-3 text-sm text-text-muted leading-relaxed ml-4 list-decimal">
              <li>
                <strong className="text-text">홈에서 종목 선택</strong> —{" "}
                <Link href="/" className="text-accent-blue hover:underline">
                  kr-stocks.com
                </Link>{" "}
                접속 → 한국주식 카드 (삼성전자·SK하이닉스·현대차·원화)
              </li>
              <li>
                <strong className="text-text">자동 phase 인지</strong> — 현재 시간에 따라 자동으로
                정규장/NXT/Hyperliquid 가격 메인 표시. 별도 토글 X.
              </li>
              <li>
                <strong className="text-text">phase pill 확인</strong> — 카드 우상단:
                <span className="ml-2 text-[10px] text-accent-green">●정규장</span>
                <span className="ml-2 text-[10px] text-accent-amber">●NXT</span>
                <span className="ml-2 text-[10px] text-accent-blue">●Hyperliquid</span>
              </li>
              <li>
                <strong className="text-text">정규장 종가 비교</strong> — 종목 상세 페이지로 들어가면
                "정규장 종가 vs 야간 가격" premium 박스 노출. 갭업/갭다운 % 즉시 확인.
              </li>
              <li>
                <strong className="text-text">증권사 컨센서스</strong> — 13~14개 한국 증권사 평균
                목표주가 + 상승여력 + 5일 외인·기관 매매 동향.
              </li>
            </ol>
          </section>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-3">💡 직접 추적해보기 (deeplink)</h2>
            <div className="space-y-2">
              <Link
                href="/korea/samsung"
                className="block p-3 rounded-xl bg-accent-blue/5 hover:bg-accent-blue/10 border border-accent-blue/20 transition"
              >
                <div className="text-sm font-semibold text-accent-blue">→ 삼성전자 (005930) 24h 시세</div>
                <div className="text-xs text-text-dim mt-0.5">
                  KRX 장중 + NXT + Hyperliquid + 증권사 컨센 + 외인·기관 매매
                </div>
              </Link>
              <Link
                href="/korea/hynix"
                className="block p-3 rounded-xl bg-accent-blue/5 hover:bg-accent-blue/10 border border-accent-blue/20 transition"
              >
                <div className="text-sm font-semibold text-accent-blue">→ SK하이닉스 (000660) 24h 시세</div>
                <div className="text-xs text-text-dim mt-0.5">
                  동일 정보 + AI · HBM 관련 외국인 매매 추이
                </div>
              </Link>
              <Link
                href="/korea/hyundai"
                className="block p-3 rounded-xl bg-accent-blue/5 hover:bg-accent-blue/10 border border-accent-blue/20 transition"
              >
                <div className="text-sm font-semibold text-accent-blue">→ 현대차 (005380) 24h 시세</div>
                <div className="text-xs text-text-dim mt-0.5">동일 정보</div>
              </Link>
            </div>
          </section>

          <section className="p-5 rounded-2xl bg-accent-amber/5 border border-accent-amber/20">
            <h2 className="text-lg font-bold mb-3">⚠️ 야간 가격 해석 시 주의</h2>
            <ul className="space-y-2 text-sm text-text-muted leading-relaxed">
              <li>
                <strong className="text-text">NXT 가격</strong>은 한국 호가 기반 — 실제 KRX 시초가에
                반영될 가능성 높음.
              </li>
              <li>
                <strong className="text-text">Hyperliquid perp 가격</strong>은 글로벌 거래자 sentiment
                기반 — 한국 시장 외 외국인이 주로 형성. 정규장 시초가와 차이날 수 있음.
              </li>
              <li>
                <strong className="text-text">갭 ≠ 확정 시초가</strong> — 야간에 +3% 떴어도 실제 KRX 시초가는
                다를 수 있음. 참고용.
              </li>
              <li>
                <strong className="text-text">거래량 작을 때 noise</strong> — Hyperliquid 거래량 적은
                시간엔 가격이 단일 거래에 흔들릴 수 있음.
              </li>
            </ul>
          </section>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-3">❓ 자주 묻는 질문</h2>
            <div className="space-y-4 text-sm text-text-muted leading-relaxed">
              <div>
                <div className="font-semibold text-text mb-1">
                  Q. 거래도 가능한가요?
                </div>
                <div>
                  kr-stocks.com 자체는 정보 사이트입니다. 거래는 별도 거래소 (Hyperliquid 등) 에서 가능하지만,
                  본 사이트는 거래 라우팅·CTA·affiliate 미제공.
                </div>
              </div>
              <div>
                <div className="font-semibold text-text mb-1">
                  Q. 가격이 KRX 시초가와 다른데요?
                </div>
                <div>
                  네. 야간 Hyperliquid 가격은 글로벌 perp 시장 sentiment 기반이라 정규장 시초가와 차이날 수
                  있습니다. 참고용으로만 활용 권장.
                </div>
              </div>
              <div>
                <div className="font-semibold text-text mb-1">
                  Q. 다른 한국주식도 추가될 예정?
                </div>
                <div>
                  Hyperliquid HIP-3 에 상장된 한국주식이 늘어나면 자동 반영 검토 중. 현재는 삼성전자·SK하이닉스·현대차
                  3종만 코스피 시총 대형주 위주.
                </div>
              </div>
              <div>
                <div className="font-semibold text-text mb-1">
                  Q. 데이터 정확도는?
                </div>
                <div>
                  정규장·NXT 가격은 네이버 금융 (KRX 공식 데이터 기반), Hyperliquid 가격은 HL 공식 API. 30초마다
                  자동 갱신. 단 implied valuation (비상장) 은 추정치.
                </div>
              </div>
            </div>
          </section>

          <div className="text-center pt-2">
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-xl bg-accent-blue text-white font-semibold hover:bg-accent-blue/90 transition"
            >
              → 지금 삼성전자 가격 확인하기
            </Link>
          </div>

          <p className="text-[10px] text-text-dim leading-relaxed pt-4 border-t border-line/40">
            본 가이드는 정보 제공만을 목적으로 하며 투자 권유·자문이 아닙니다. 표시 가격은 perp DEX 시세로
            정규장 거래소 가격과 차이가 있을 수 있습니다.
          </p>
        </article>
      </main>

      <Footer />
    </>
  );
}
