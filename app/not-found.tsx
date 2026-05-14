// 404 — 페이지를 찾을 수 없음
// 형님 5/14: retail 친화 fallback (메인으로 돌아갈 deeplink + 인기 종목 추천)

import Link from "next/link";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "페이지를 찾을 수 없음 — kr-stocks.com",
  description: "요청하신 종목 또는 페이지를 찾을 수 없습니다.",
};

export default function NotFound() {
  return (
    <>
      <header className="border-b border-line">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse-soft" />
          <Link href="/" className="text-base font-bold text-text tracking-tight hover:text-accent-blue transition">
            KR Stocks
          </Link>
          <span className="text-[11px] text-text-dim hidden sm:inline">24h Global Markets</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 pt-12 pb-12 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          페이지를 찾을 수 없음
        </h1>
        <p className="text-base text-text-muted mb-8 leading-relaxed">
          요청하신 종목 또는 페이지가 존재하지 않습니다.
          <br />
          URL을 확인하시거나 아래 인기 페이지로 이동해주세요.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-left">
          <Link
            href="/"
            className="p-4 rounded-2xl bg-accent-blue/5 hover:bg-accent-blue/10 border border-accent-blue/20 transition"
          >
            <div className="text-sm font-semibold text-accent-blue mb-1">🏠 홈으로</div>
            <div className="text-xs text-text-dim">42 종목 24h 시세 한 화면</div>
          </Link>
          <Link
            href="/korea/samsung"
            className="p-4 rounded-2xl bg-accent-blue/5 hover:bg-accent-blue/10 border border-accent-blue/20 transition"
          >
            <div className="text-sm font-semibold text-accent-blue mb-1">📈 삼성전자 (005930)</div>
            <div className="text-xs text-text-dim">정규장 + NXT + 야간 + 컨센서스</div>
          </Link>
          <Link
            href="/korea/hynix"
            className="p-4 rounded-2xl bg-accent-blue/5 hover:bg-accent-blue/10 border border-accent-blue/20 transition"
          >
            <div className="text-sm font-semibold text-accent-blue mb-1">📈 SK하이닉스 (000660)</div>
            <div className="text-xs text-text-dim">동일 정보</div>
          </Link>
          <Link
            href="/consensus"
            className="p-4 rounded-2xl bg-accent-purple/5 hover:bg-accent-purple/10 border border-accent-purple/20 transition"
          >
            <div className="text-sm font-semibold text-accent-purple mb-1">📊 증권사 컨센서스</div>
            <div className="text-xs text-text-dim">한국 13~14개 증권사 평균 목표가</div>
          </Link>
          <Link
            href="/private/spacex"
            className="p-4 rounded-2xl bg-accent-green/5 hover:bg-accent-green/10 border border-accent-green/20 transition"
          >
            <div className="text-sm font-semibold text-accent-green mb-1">🚀 SpaceX (비상장)</div>
            <div className="text-xs text-text-dim">implied valuation 24h 추적</div>
          </Link>
          <Link
            href="/guide/korean-overnight-prices"
            className="p-4 rounded-2xl bg-bg-card hover:bg-bg-hover border border-line transition"
          >
            <div className="text-sm font-semibold text-text mb-1">📖 야간 가격 가이드</div>
            <div className="text-xs text-text-dim">삼성전자 야간 가격 확인법</div>
          </Link>
        </div>

        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl bg-accent-blue text-white font-semibold hover:bg-accent-blue/90 transition"
        >
          → 메인으로 돌아가기
        </Link>
      </main>

      <Footer />
    </>
  );
}
