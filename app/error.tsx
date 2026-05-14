"use client";

// 500 / runtime error boundary
// 형님 5/14: HL / Upbit / 네이버 fetch 실패 시 retail 친화 fallback + 새로고침 안내

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // production 로그 — Vercel Functions logs 에서 확인 가능
    console.error("[kr-stocks] page error:", error?.message, error?.digest);
  }, [error]);

  return (
    <html lang="ko">
      <body className="bg-bg text-text">
        <header className="border-b border-line">
          <div className="max-w-6xl mx-auto px-5 py-4 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-accent-amber animate-pulse-soft" />
            <Link
              href="/"
              className="text-base font-bold text-text tracking-tight hover:text-accent-blue transition"
            >
              KR Stocks
            </Link>
            <span className="text-[11px] text-accent-amber hidden sm:inline">일시 오류</span>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-5 pt-12 pb-12 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            잠시 서비스를 불러올 수 없습니다
          </h1>
          <p className="text-base text-text-muted mb-2 leading-relaxed">
            가격 데이터 (Hyperliquid · 네이버 · 업비트) 중 하나에서 일시적인 응답 지연이 발생했습니다.
          </p>
          <p className="text-sm text-text-dim mb-8 leading-relaxed">
            잠시 후 다시 시도해주세요. 보통 30초~1분 내 자동 복구됩니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <button
              type="button"
              onClick={() => reset()}
              className="px-6 py-3 rounded-xl bg-accent-blue text-white font-semibold hover:bg-accent-blue/90 transition"
            >
              🔄 다시 시도
            </button>
            <Link
              href="/"
              className="px-6 py-3 rounded-xl bg-bg-card text-text font-semibold hover:bg-bg-hover border border-line transition"
            >
              🏠 메인으로
            </Link>
          </div>

          {error?.digest && (
            <p className="text-[10px] text-text-dim/60 font-mono mt-8">오류 ID: {error.digest}</p>
          )}

          <p className="text-[11px] text-text-dim mt-8 leading-relaxed max-w-md mx-auto">
            지속적으로 발생하면{" "}
            <a
              href="mailto:contact@kr-stocks.com?subject=%5B%EC%82%AC%EC%9D%B4%ED%8A%B8%20%EC%98%A4%EB%A5%98%5D%20kr-stocks.com"
              className="text-accent-blue hover:underline"
            >
              contact@kr-stocks.com
            </a>{" "}
            로 알려주시면 빠르게 확인하겠습니다.
          </p>
        </main>
      </body>
    </html>
  );
}
