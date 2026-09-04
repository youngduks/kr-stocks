import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import { getBuyback, formatKRW, formatShares } from "@/lib/buyback";
import { BuybackChart } from "@/components/BuybackChart";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "SK하이닉스 자사주 매입(바이백) 현황 — 일별 체결 추이",
  description:
    "SK하이닉스 24,070,000주(40조원) 자사주 매입 진행률을 매일 자동 갱신. 누적 체결량, 일정 대비 페이스, 완료 예상일, 일별 체결량 차트를 KRX 공시(KIND) 원본 데이터로 제공.",
  keywords: [
    "SK하이닉스 자사주",
    "SK하이닉스 바이백",
    "하이닉스 자사주 매입",
    "하이닉스 자기주식 취득",
    "SK하이닉스 소각",
    "자사주 매입 진행률",
    "KRX 자기주식 공시",
    "하이닉스 주가 소각",
  ],
  openGraph: {
    title: "SK하이닉스 자사주 매입 현황 — 일별 체결 추이",
    description: "24,070,000주 자사주 매입 진행률 실시간 추적 — KRX 공시 원본 데이터.",
    url: "https://kr-stocks.com/korea/hynix/buyback",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SK하이닉스 자사주 매입 현황",
    description: "24,070,000주 자사주 매입 진행률 — 일별 체결 추이.",
  },
  alternates: {
    canonical: "https://kr-stocks.com/korea/hynix/buyback",
  },
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-4 rounded-xl bg-bg-card border border-line">
      <div className="text-[11px] text-text-dim mb-1">{label}</div>
      <div className="text-xl font-bold tabular text-text">{value}</div>
      {sub && <div className="text-[10px] text-text-dim mt-1">{sub}</div>}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-line/30 last:border-0">
      <span className="text-xs text-text-dim">{label}</span>
      <span className="text-xs font-semibold tabular text-text">{value}</span>
    </div>
  );
}

export default async function HynixBuybackPage() {
  const [data, buyback] = await Promise.all([fetchAllPrices(), getBuyback("hynix")]);

  if (!buyback) {
    return (
      <>
        <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />
        <main className="max-w-3xl mx-auto px-5 pt-6 pb-12">
          <p className="text-sm text-text-dim">바이백 데이터를 불러올 수 없습니다.</p>
        </main>
        <Footer />
      </>
    );
  }

  const { program, progress, daily } = buyback;
  const lastDaily = daily[daily.length - 1];
  const aheadLabel =
    progress.ahead_pct > 0.5
      ? `▲ 일정보다 앞섬 ${progress.ahead_pct.toFixed(1)}%p`
      : progress.ahead_pct < -0.5
      ? `▼ 일정보다 뒤처짐 ${Math.abs(progress.ahead_pct).toFixed(1)}%p`
      : "일정과 거의 동일";
  const aheadColor =
    progress.ahead_pct > 0.5 ? "text-accent-green" : progress.ahead_pct < -0.5 ? "text-accent-red" : "text-text-dim";

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />
      <main className="max-w-3xl mx-auto px-5 pt-6 pb-12">
        <Link href="/korea/hynix" className="text-xs text-text-dim hover:text-text-muted">
          ← SK하이닉스 시세로
        </Link>

        <article className="mt-4">
          <header className="mb-6">
            <div className="text-xs text-accent-green font-semibold mb-2 tracking-wider">BUYBACK TRACKER</div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">SK하이닉스 자사주 매입 현황</h1>
            <p className="text-text-muted text-base leading-relaxed">
              2026년 8월 19일 이사회가 결의한 {formatShares(program.planned_qty)} ({formatKRW(program.planned_amount_krw)}, {program.purpose})
              자사주 매입 프로그램의 진행 상황을 KRX 공시채널(KIND) 원본 데이터로 매일 자동 추적합니다.
              방식은 {program.method}({program.broker} 매매 대행)이며 신탁계약이 아닙니다.
            </p>
          </header>

          <section className="mb-6 p-4 rounded-xl bg-accent-blue/5 border border-accent-blue/20">
            <p className="text-xs text-text-muted leading-relaxed">
              ⓘ <span className="font-semibold text-text">당일 체결은 실시간이 아닙니다.</span> KRX 규정상 당일
              매매 결과는 그날 저녁에야 확정 공시됩니다. 아래 최신 데이터는 {lastDaily.date} 체결분(익영업일 저녁
              확정치)이 마지막입니다.
            </p>
          </section>

          <section className="grid grid-cols-2 gap-3 mb-6">
            <StatCard
              label="최근 체결일"
              value={lastDaily.date.slice(5).replace("-", "/")}
              sub={`${formatShares(lastDaily.executed_qty)} 체결 (${lastDaily.execution_rate_pct}%)`}
            />
            <StatCard
              label="1일 매수한도"
              value={formatShares(program.daily_limit_qty)}
              sub="신고수량의 10% (KRX 규정)"
            />
            <StatCard
              label="누적 진행률"
              value={`${progress.progress_pct.toFixed(1)}%`}
              sub={`${formatShares(progress.cum_executed_qty)} / ${formatShares(program.planned_qty)}`}
            />
            <StatCard
              label="완료 예상"
              value={progress.eta_date ?? "—"}
              sub={`지금 페이스로 영업일 ${progress.remaining_biz_days}일 남음`}
            />
          </section>

          <section className="mb-8 p-5 rounded-2xl bg-bg-card border border-line">
            <h2 className="text-lg font-bold mb-1">취득 진행률</h2>
            <p className="text-[10px] text-text-dim mb-3">
              {program.period_start} ~ {program.period_end} · {program.method} · {program.broker}
            </p>

            <div className={`inline-flex items-center gap-1 text-xs font-bold mb-3 ${aheadColor}`}>{aheadLabel}</div>

            <div className="relative h-3 bg-line/30 rounded-full overflow-hidden mb-1">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent-green/70 to-accent-green"
                style={{ width: `${Math.min(progress.progress_pct, 100)}%` }}
              />
              <div
                className="absolute inset-y-0 w-[2px] bg-text-dim/70"
                style={{ left: `${Math.min(progress.schedule_elapsed_pct, 100)}%` }}
                title="일정 경과"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-text-dim mb-4">
              <span>진행 {progress.progress_pct.toFixed(1)}%</span>
              <span>일정 {progress.schedule_elapsed_pct.toFixed(1)}% 경과</span>
            </div>

            <div className="grid grid-cols-2 gap-x-4">
              <div>
                <DetailRow label="취득예정" value={`${formatShares(program.planned_qty)}`} />
                <DetailRow label="잔여" value={formatShares(progress.remaining_qty)} />
                <DetailRow label="최근 5일 평균" value={formatShares(progress.recent5_avg_qty)} />
                <DetailRow label="남은 영업일" value={`${progress.remaining_biz_days}일`} />
              </div>
              <div>
                <DetailRow label="매입 금액(누적)" value={formatKRW(progress.cum_amount_krw)} />
                <DetailRow label="평균 매입단가" value={progress.avg_price_krw ? `${progress.avg_price_krw.toLocaleString("ko-KR")}원` : "—"} />
                <DetailRow label="필요 일평균" value={formatShares(progress.needed_daily_avg_qty)} />
                <DetailRow label="기한 내 완료" value={progress.on_track ? "가능" : "페이스 부족"} />
              </div>
            </div>
          </section>

          <section className="mb-8">
            <BuybackChart
              daily={daily}
              periodStart={program.period_start}
              periodEnd={program.period_end}
              plannedQty={program.planned_qty}
              aheadPct={progress.ahead_pct}
            />
          </section>

          <section className="p-5 rounded-xl bg-accent-amber/5 border border-accent-amber/20">
            <h2 className="text-sm font-bold text-accent-amber mb-2">⚠️ 참고 사항</h2>
            <ul className="text-xs text-text-muted space-y-1 leading-relaxed">
              <li>• 데이터 출처: KRX 공시채널(KIND) 자기주식취득/처분 공개 조회 화면 (로그인·API 불필요)</li>
              <li>• 매일 자동 갱신되며, 당일 체결은 익영업일 저녁 KIND 확정 공시 기준입니다</li>
              <li>• 신고금액 40조 43억원은 2026-08-19 이사회 결의 공시(언론 보도) 기준 고정값입니다</li>
              <li>• 완료 예상일은 최근 5거래일 평균 페이스로 추정한 참고용 수치입니다</li>
              <li>• 본 정보는 참고용이며 투자 권유가 아닙니다</li>
            </ul>
            <p className="text-[10px] text-text-dim mt-3">
              마지막 갱신: {buyback.updated_at} ·{" "}
              <a href={buyback.source_url} target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">
                원본 데이터 보기
              </a>
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
