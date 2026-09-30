/**
 * 2×2 해석 그리드 (Phase B) — 두 축(예: 가격 × CVD, 가격 × 외국인)의 조합 4칸 중 '지금 여기'를 강조.
 * mockups/stock_card.html 의 '가격과 외국인, 같이 보면' 카드. 서버 컴포넌트.
 * 칸 순서: [▲·▲, ▲·▼, ▼·▲, ▼·▼] (가격 축 먼저).
 */
export type QuadCell = {
  /** 예: "가격 ▲ · 외국인 삼" */
  axis: React.ReactNode;
  title: React.ReactNode;
  desc: React.ReactNode;
  /** 강조 톤 — 지금 여기인 칸의 테두리/배경 */
  tone: "up" | "down" | "flat" | "warn";
  /** 이 칸에 해당하는 항목 이름(여러 종목일 때) — 비어 있지 않으면 '지금 여기' */
  tags?: string[];
  active?: boolean;
};

const TONE_STYLE: Record<QuadCell["tone"], { outline: string; bg: string; text: string; pill: string }> = {
  up: { outline: "rgb(var(--up))", bg: "rgb(var(--up-bg))", text: "text-up", pill: "ds-pill-up" },
  down: { outline: "rgb(var(--down))", bg: "rgb(var(--down-bg))", text: "text-down", pill: "ds-pill-down" },
  flat: { outline: "rgb(var(--flat))", bg: "rgb(var(--flat-bg))", text: "text-flat", pill: "ds-pill-flat" },
  warn: { outline: "rgb(var(--warn))", bg: "rgb(var(--warn-bg))", text: "text-warn", pill: "ds-pill-warn" },
};

export function QuadGrid({
  eyebrow,
  headline,
  cells,
  footnote,
  className = "",
}: {
  eyebrow: React.ReactNode;
  headline: React.ReactNode;
  cells: [QuadCell, QuadCell, QuadCell, QuadCell];
  footnote?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`ds-card ${className}`}>
      <div className="ds-eyebrow">{eyebrow}</div>
      <h2 className="ds-h2 mt-1">{headline}</h2>
      <div className="grid grid-cols-2 gap-2 mt-4 text-[14px]">
        {cells.map((c, i) => {
          const on = c.active ?? (c.tags != null && c.tags.length > 0);
          const t = TONE_STYLE[c.tone];
          return (
            <div
              key={i}
              className="ds-tile min-w-0"
              style={on ? { outline: `2px solid ${t.outline}`, outlineOffset: "-2px", background: t.bg } : undefined}
            >
              <div className={`font-extrabold ${on ? t.text : "text-text-muted"}`}>{c.axis}</div>
              <div className="font-bold mt-1">{c.title}</div>
              <div className="ds-meta mt-1">{c.desc}</div>
              {on && (
                <div className={`ds-pill ${t.pill} mt-2 max-w-full`} style={{ padding: "2px 8px", whiteSpace: "normal" }}>
                  ● {c.tags && c.tags.length > 0 ? c.tags.join(" · ") : "지금 여기"}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {footnote && <div className="ds-meta mt-3">{footnote}</div>}
    </section>
  );
}
