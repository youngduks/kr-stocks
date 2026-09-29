/** '조금 더' 접이식 설명 — 네이티브 <details> (JS 0, 접근성 기본 제공). 스타일: globals.css details.ds-more */
export function MoreDetails({
  summary,
  children,
  className = "",
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details className={`ds-more ${className}`}>
      <summary>{summary}</summary>
      <div className="ds-explain pb-3">{children}</div>
    </details>
  );
}
