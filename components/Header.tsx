import { StatsBar } from "./StatsBar";

export function Header({ fxRate, fxChange }: { fxRate: number; fxChange: number }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/80 border-b border-line">
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse-soft shadow-[0_0_12px_#1FAE6F] flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-base font-bold text-text tracking-tight">KR Stocks</div>
            <div className="text-[11px] text-text-dim font-medium hidden sm:block">24h Global Markets</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <StatsBar />
          <div className="text-right">
            <div className="text-[11px] text-text-dim">USD/KRW</div>
            <div className="text-sm font-semibold tabular text-text">
              {fxRate.toFixed(2)}원
              <span className={`ml-2 text-[11px] ${fxChange >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                {fxChange >= 0 ? "+" : ""}{fxChange.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
