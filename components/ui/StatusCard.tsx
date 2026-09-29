/**
 * 상태 카드 — 리디자인 기본 단위: 질문(eyebrow) → 상태 헤드라인 → 쉬운 해석 → 핵심 숫자 타일 → 조금 더.
 * 서버 컴포넌트 (상호작용 없음).
 */
import { MoreDetails } from "./MoreDetails";

export type StatusTone = "up" | "down" | "flat" | "warn";

const PILL: Record<StatusTone, string> = {
  up: "ds-pill-up",
  down: "ds-pill-down",
  flat: "ds-pill-flat",
  warn: "ds-pill-warn",
};

export function StatusCard({
  eyebrow,
  pill,
  headline,
  headingLevel = "h2",
  explain,
  children,
  more,
  footer,
  className = "",
}: {
  eyebrow: React.ReactNode;
  pill?: { tone: StatusTone; label: React.ReactNode };
  headline: React.ReactNode;
  /** 페이지 대표 카드면 h1 */
  headingLevel?: "h1" | "h2";
  explain?: React.ReactNode;
  /** 핵심 숫자 타일 등 */
  children?: React.ReactNode;
  more?: { summary: React.ReactNode; content: React.ReactNode };
  footer?: React.ReactNode;
  className?: string;
}) {
  const H = headingLevel;
  return (
    <section className={`ds-card ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="ds-eyebrow">{eyebrow}</div>
        {pill && <span className={`ds-pill ${PILL[pill.tone]} shrink-0`}>{pill.label}</span>}
      </div>
      <H className="ds-status mt-2">{headline}</H>
      {explain && <p className="ds-explain mt-2">{explain}</p>}
      {children}
      {footer}
      {more && <MoreDetails summary={more.summary}>{more.content}</MoreDetails>}
    </section>
  );
}

/** 상태 카드 안 숫자 타일 */
export function StatTile({
  label,
  value,
  valueClass = "",
  sub,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  valueClass?: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="ds-tile min-w-0">
      <div className="text-[13px] font-bold text-text-muted truncate">{label}</div>
      <div className={`num text-[26px] sm:text-[28px] leading-tight font-extrabold mt-1 truncate ${valueClass}`}>{value}</div>
      {sub && <div className="ds-meta mt-1">{sub}</div>}
    </div>
  );
}
