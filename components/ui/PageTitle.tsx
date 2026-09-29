/**
 * 페이지 제목 블록 (Phase B 공통) — 뒤로 버튼(선택) + eyebrow(meta) + h1.
 * mockups/stock_card.html · shopping_deals.html 상단과 같은 구조. 서버 컴포넌트.
 */
import Link from "next/link";

export function PageTitle({
  eyebrow,
  title,
  backHref,
  backLabel = "홈으로",
  children,
  className = "",
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** 있으면 왼쪽에 44px 뒤로 버튼 */
  backHref?: string;
  backLabel?: string;
  /** 제목 아래 짧은 설명/기준시각 등 */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`pt-2 ${className}`}>
      <div className="flex items-center gap-3">
        {backHref && (
          <Link href={backHref as any} prefetch={false} aria-label={backLabel} className="ds-iconbtn hover:bg-bg-hover transition text-[20px]">
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
        <div className="min-w-0">
          {eyebrow && <div className="ds-meta truncate">{eyebrow}</div>}
          <h1 className="text-[22px] font-extrabold tracking-tight leading-tight">{title}</h1>
        </div>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
