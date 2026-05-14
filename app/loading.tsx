// 글로벌 loading skeleton — SSR fetch 진행 중 표시
// 형님 5/14: retail UX — 빈 화면 대신 친화 skeleton

export default function Loading() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse-soft" />
          <div className="text-base font-bold text-text tracking-tight">KR Stocks</div>
          <span className="text-[11px] text-text-dim hidden sm:inline">24h Global Markets</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 pt-6 pb-12">
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mb-4" />
          <div className="text-sm text-text-muted">가격 정보 불러오는 중…</div>
          <div className="text-[10px] text-text-dim mt-1">Hyperliquid · 네이버 · 업비트</div>
        </div>

        {/* skeleton card grid (시각 안정 — 빈 화면 회피) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 opacity-30">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-bg-card border border-line rounded-2xl p-4 h-44 animate-pulse"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
