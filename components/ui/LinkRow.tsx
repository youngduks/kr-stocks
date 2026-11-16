/**
 * 허브 페이지용 링크 줄 — 1줄 = 1페이지 (제목 + 한 줄 설명 + 화살표). 서버 컴포넌트.
 * ds-card 안에 나열해 쓴다. 높이 64px 이상(터치 타깃).
 */
import Link from "next/link";

export function LinkRow({
  href,
  title,
  desc,
  note,
}: {
  href: string;
  title: React.ReactNode;
  desc?: React.ReactNode;
  /** 제목 옆 작은 보조 글씨 */
  note?: React.ReactNode;
}) {
  return (
    <Link href={href as any} prefetch={false} className="ds-row hover:bg-bg-hover/60 -mx-2 px-2 rounded-xl transition">
      <div className="flex-1 min-w-0">
        <div className="text-[16px] font-bold text-text">
          {title}
          {note && <span className="ds-meta font-medium"> {note}</span>}
        </div>
        {desc && <div className="text-[13px] mt-[2px] text-text-muted">{desc}</div>}
      </div>
      <span className="shrink-0 text-text-dim" aria-hidden="true">
        →
      </span>
    </Link>
  );
}
