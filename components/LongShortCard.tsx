// 큰손 롱·숏 비율 카드 (2026-11-09) — FundingBar 와 같은 ds-card·가로 막대 디자인. 서버 컴포넌트.
// 데이터·정의: lib/longShort.ts (바이낸스 공개 선물 데이터)
import type { LongShortData, LongShortPoint } from "@/lib/longShort";

function Bar({ label, p, note }: { label: string; p: LongShortPoint; note: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="text-xs text-text-dim">{label}</div>
        <div className="text-xs tabular">
          <span className="text-up font-semibold">롱 {p.longPct.toFixed(0)}%</span>
          <span className="text-text-dim"> · </span>
          <span className="text-down font-semibold">숏 {p.shortPct.toFixed(0)}%</span>
        </div>
      </div>
      <div className="relative h-2.5 bg-line/40 rounded-full overflow-hidden">
        <div className="absolute left-0 top-0 h-full bg-up" style={{ width: `${p.longPct}%`, opacity: 0.7 }} />
        <div className="absolute right-0 top-0 h-full bg-down" style={{ width: `${p.shortPct}%`, opacity: 0.7 }} />
      </div>
      <div className="ds-meta mt-1">{note}</div>
    </div>
  );
}

export function LongShortCard({ data, symbol }: { data: LongShortData | null; symbol: string }) {
  if (!data) return null;
  const ts = data.top?.timestamp ?? data.global?.timestamp;
  const when = ts
    ? new Date(ts).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
    : null;
  return (
    <section className="ds-card mb-4" aria-label="큰손 롱·숏 비율">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="text-xs text-text-dim">큰손 롱·숏 비율 (바이낸스 {symbol})</div>
        {when && <div className="ds-meta shrink-0">{when} 기준 1시간</div>}
      </div>
      {data.top && <Bar label="큰손 포지션 (증거금 상위 20%)" p={data.top} note="상위 20% 계좌가 가진 포지션 중 롱·숏 비중" />}
      {data.global && <Bar label="전체 계좌" p={data.global} note="이 종목 포지션을 가진 계좌 중 롱·숏 계좌 비중" />}
      <p className="ds-meta mt-2">
        바이낸스 공개 선물 데이터예요. 한쪽으로 쏠려 있다고 그 방향으로 간다는 뜻은 아니에요 · 매매 권유가 아니에요
      </p>
    </section>
  );
}
