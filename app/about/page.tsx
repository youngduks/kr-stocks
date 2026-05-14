// About 페이지 — 빌더 narrative + 데이터 source + disclaimer
// AdSense 심사 + 사이트 신뢰도 직격 (5/14 형님 요청)

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600; // 1시간 (자주 안 바뀜)

export const metadata: Metadata = {
  title: "About — kr-stocks.com 소개",
  description:
    "kr-stocks.com 은 한국 retail 투자자를 위한 24시간 주식 정보 사이트입니다. " +
    "Hyperliquid HIP-3 perp + 네이버 금융 + KRX 데이터를 통합해 정규장, NXT 시간외, 야간까지 끊김 없이 추적합니다.",
  keywords: [
    "kr-stocks 소개",
    "한국 주식 24시간",
    "Hyperliquid 한국주식",
    "야간 주식 시세",
    "비상장 SpaceX 가격",
  ],
  openGraph: {
    title: "About — kr-stocks.com 소개",
    description:
      "한국 retail 투자자를 위한 24시간 주식 정보 사이트. 정규장 + NXT + Hyperliquid 통합.",
    url: "https://kr-stocks.com/about",
    type: "website",
  },
  alternates: {
    canonical: "https://kr-stocks.com/about",
    languages: {
      "ko-KR": "https://kr-stocks.com/about",
      "en-US": "https://kr-stocks.com/en/about",
      "x-default": "https://kr-stocks.com/about",
    },
  },
};

export default async function AboutPage() {
  const data = await fetchAllPrices();

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />

      <main className="max-w-3xl mx-auto px-5 pt-6 pb-12">
        <Link href="/" className="text-xs text-text-dim hover:text-text-muted">
          ← 홈으로
        </Link>

        <article className="mt-4 space-y-8">
          <header>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              About kr-stocks.com
            </h1>
            <p className="text-base text-text-muted leading-relaxed">
              한국 retail 투자자를 위한 24시간 주식 정보 사이트.
              <br />
              KRX 정규장 → NXT 시간외 → 야간 Hyperliquid perp 까지 끊김 없이 추적합니다.
            </p>
          </header>

          <section className="p-5 rounded-2xl bg-accent-blue/5 border border-accent-blue/20">
            <h2 className="text-lg font-bold mb-3">🎯 사이트 정체성</h2>
            <ul className="space-y-2 text-sm text-text-muted leading-relaxed">
              <li>
                <strong className="text-text">정보 사이트입니다</strong> — 거래소나 매매 서비스가 아닙니다.
                광고나 회원가입 없이 가격 정보만 제공합니다.
              </li>
              <li>
                <strong className="text-text">타겟: 한국 주식 retail 투자자</strong> — KRX 정규장 외 시간에도
                삼성전자·SK하이닉스·현대차 같은 한국주식 가격이 어떻게 움직이는지 보고 싶은 분들을 위해
                만들었습니다.
              </li>
              <li>
                <strong className="text-text">코인 거래소 아닙니다</strong> — Hyperliquid HIP-3 perp 는 24시간
                가격 발견을 위한 source 로만 활용합니다.
              </li>
            </ul>
          </section>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-3">📊 데이터 출처</h2>
            <div className="space-y-3 text-sm text-text-muted leading-relaxed">
              <div>
                <div className="font-semibold text-text mb-1">정규장 가격 + 전일 종가</div>
                <ul className="ml-4 list-disc space-y-1 text-xs">
                  <li>한국주식: 네이버 금융 m.stock.naver.com (장중 실시간 + NXT 시간외)</li>
                  <li>미국주식·글로벌 지수: Yahoo Finance v8 chart API</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-text mb-1">24시간 perp 가격</div>
                <ul className="ml-4 list-disc space-y-1 text-xs">
                  <li>
                    Hyperliquid HIP-3 (xyz, vntl) DEX{" "}
                    <a
                      href="https://hyperliquid.xyz"
                      target="_blank"
                      rel="noopener"
                      className="text-accent-blue hover:underline"
                    >
                      hyperliquid.xyz
                    </a>
                  </li>
                  <li>한국주식·미국주식·비상장 빅테크·테마 ETF·글로벌 지수 — 24/7 perp</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-text mb-1">증권사 컨센서스 (한국주식 3종)</div>
                <ul className="ml-4 list-disc space-y-1 text-xs">
                  <li>네이버 금융 리서치 (한국 13~14개 증권사 평균 목표주가)</li>
                  <li>일별·증권사별 추이 + 의견 분포</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-text mb-1">외국인·기관 매매 동향 (한국주식 3종)</div>
                <ul className="ml-4 list-disc space-y-1 text-xs">
                  <li>KRX 공식 + 네이버 금융 — 외국인 / 기관 / 개인 5거래일 누적</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-text mb-1">환율</div>
                <ul className="ml-4 list-disc space-y-1 text-xs">
                  <li>
                    Upbit KRW/USDT spot{" "}
                    <a
                      href="https://upbit.com"
                      target="_blank"
                      rel="noopener"
                      className="text-accent-blue hover:underline"
                    >
                      upbit.com
                    </a>{" "}
                    — 30초마다 갱신
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="p-5 rounded-2xl bg-accent-green/5 border border-accent-green/20">
            <h2 className="text-lg font-bold mb-3">🚀 차별점 (USP)</h2>
            <ul className="space-y-2 text-sm text-text-muted leading-relaxed">
              <li>
                <strong className="text-text">3-phase 자동 인지</strong> — KRX 정규장 (09:00~15:30) / NXT 시간외
                (08:00~08:50 + 15:30~20:00) / 야간 Hyperliquid (그 외 시간) 자동 전환
              </li>
              <li>
                <strong className="text-text">한국 retail 친화 라벨</strong> — "상승 베팅 우세" 같이 코인 jargon
                없는 한국어 표현
              </li>
              <li>
                <strong className="text-text">phase별 source 화폐</strong> — 정규장 시간엔 원화 메인, HL 시간엔
                원화 + 달러 보조
              </li>
              <li>
                <strong className="text-text">3in1 통합 분석</strong> — 야간 시세 + 정규장 종가 비교 + 증권사
                컨센서스 + 외인·기관 매매 한 화면
              </li>
              <li>
                <strong className="text-text">비상장 빅테크</strong> — SpaceX, OpenAI, Anthropic implied
                valuation KRW 환산
              </li>
            </ul>
          </section>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-3">⏱ 빌드 timeline</h2>
            <ul className="space-y-2 text-sm text-text-muted leading-relaxed">
              <li>
                <strong className="text-text">2026-05-10</strong> — 첫 commit: Hyperliquid HIP-3 + Upbit 환율
                통합. 한국주식 3종 + 미국주식 + 비상장 빅테크 카드 grid.
              </li>
              <li>
                <strong className="text-text">2026-05-11~12</strong> — 정규장 종가 prem 박스 + 한국 NXT 시간외
                통합 + 환율 KRW 종목 추가.
              </li>
              <li>
                <strong className="text-text">2026-05-13</strong> — 페르소나 재정의 (한국 retail).
                컨센서스·외인기관 카드 + sentiment 박스 + 종목별 OG 이미지 자동 생성.
              </li>
              <li>
                <strong className="text-text">2026-05-14+</strong> — Share button + About + 가이드 확장 + 검색.
                AdSense 신청.
              </li>
            </ul>
          </section>

          <section className="p-5 rounded-2xl bg-accent-amber/5 border border-accent-amber/20">
            <h2 className="text-lg font-bold mb-3">📬 문의 / 제휴</h2>
            <p className="text-sm text-text-muted leading-relaxed mb-2">
              광고·affiliate·데이터 정정·기능 제안 등은 이메일로 부탁드립니다:
            </p>
            <a
              href="mailto:contact@kr-stocks.com"
              className="inline-block text-base font-semibold text-accent-blue hover:underline"
            >
              contact@kr-stocks.com
            </a>
            <p className="mt-3 text-xs text-text-dim">평일 24h 이내 답변드립니다.</p>
          </section>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-3">⚠️ 면책 (Disclaimer)</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              본 서비스는 정보 제공만을 목적으로 하며, 투자 권유·자문·예측이 아닙니다. 표시 가격은 perp DEX
              시세로 정규장 거래소 가격과 차이가 있을 수 있습니다. 비상장 회사 가격은 implied valuation
              기반의 추정치입니다. 투자의 모든 책임은 투자자 본인에게 있으며, 본 사이트는 손실에 대해 책임지지
              않습니다.
            </p>
          </section>

          <div className="text-center pt-4">
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-xl bg-accent-blue text-white font-semibold hover:bg-accent-blue/90 transition"
            >
              → 사이트 둘러보기
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </>
  );
}
