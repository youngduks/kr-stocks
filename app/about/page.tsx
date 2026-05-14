// About — minimal (5/14 형님 5/14 압축: 강점/timeline/endpoint 매트릭스 제거 — 베끼기 가이드 회피)
// AdSense 심사 + retail 신뢰도에 필요한 핵심만 유지

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About — kr-stocks.com 소개",
  description:
    "kr-stocks.com 은 한국 retail 투자자를 위한 24시간 주식 정보 사이트입니다. " +
    "정규장 + NXT 시간외 + 야간 시세를 한 화면에서.",
  keywords: ["kr-stocks 소개", "한국 주식 24시간"],
  openGraph: {
    title: "About — kr-stocks.com",
    description: "한국 retail 24시간 주식 정보 사이트.",
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

        <article className="mt-4 space-y-6">
          <header>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              About
            </h1>
            <p className="text-base text-text-muted leading-relaxed">
              한국 retail 투자자를 위한 24시간 주식 정보 사이트입니다.
              정규장 시간 외에도 한국 · 미국 · 비상장 주요 종목 가격을 끊김 없이 추적합니다.
            </p>
          </header>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-base font-bold mb-2">데이터 출처</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              네이버 금융 · Yahoo Finance · Hyperliquid · Upbit. 30초마다 갱신.
              <br />
              증권사 평균 목표주가 · 외국인 · 기관 매매 동향은 한국주식 일부 종목에 한해 별도로 노출됩니다.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-base font-bold mb-2">문의</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              광고 · 제휴 · 데이터 정정 · 기능 제안:{" "}
              <a
                href="mailto:contact@kr-stocks.com"
                className="text-accent-blue hover:underline"
              >
                contact@kr-stocks.com
              </a>
              <br />
              <span className="text-xs text-text-dim">평일 24h 이내 답변</span>
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-base font-bold mb-2">면책</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              본 서비스는 정보 제공만을 목적으로 하며 투자 권유 · 자문 · 예측이 아닙니다.
              표시 가격은 거래소 정규장 가격과 차이가 있을 수 있으며,
              비상장 회사 가격은 추정치입니다. 투자의 모든 책임은 투자자 본인에게 있습니다.
            </p>
          </section>

          <div className="text-center pt-2">
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
