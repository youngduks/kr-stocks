/**
 * 전체 종목 이름 링크 목록 (2026-11-16) — 검색 유입 보호용.
 * 재정비 때 홈의 종목 목록(비상장·미국·글로벌)이 /markets 로 내려가면서 홈 → 종목 상세 링크가 4개로 줄었던 것을 되돌린다.
 *   - 가격 없이 이름만. 목록은 data/universe_map.json(SYMBOLS) 정적 값 → 시세 호출이 실패해도 링크는 그대로.
 *   - 서버 컴포넌트 · 일반 <a href> — 서버가 내보내는 HTML에 전 종목 링크가 들어간다(클라이언트 렌더링 아님).
 *   - 종목 수가 많은 카테고리(미국)는 <details>로 접어 두지만, 접힌 상태에서도 링크는 HTML에 그대로 있다.
 * 새 fetch·Redis 없음.
 */
import Link from "next/link";
import { SYMBOLS, CATEGORY_LABELS, type SymbolMeta } from "@/lib/universe";

const ORDER: SymbolMeta["category"][] = ["korea", "private", "us", "themes", "global"];
/** 이 수를 넘는 카테고리는 접어 둔다 */
const FOLD_OVER = 12;

function Names({ items }: { items: SymbolMeta[] }) {
  return (
    <ul className="flex flex-wrap gap-x-3">
      {items.map((s) => (
        <li key={s.slug}>
          <Link
            href={`/${s.category}/${s.slug}`}
            prefetch={false}
            className="inline-flex items-center min-h-[36px] text-[13px] text-text-muted hover:text-text hover:underline"
          >
            {s.name_ko || s.name_en || s.slug}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function AllStocksIndex({ className = "mt-4" }: { className?: string }) {
  const groups = ORDER.map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat].ko,
    items: SYMBOLS.filter((s) => s.category === cat && !s.is_fx),
  })).filter((g) => g.items.length > 0);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section className={`ds-card ${className}`} style={{ padding: "8px 20px 14px" }} aria-labelledby="all-stocks-h">
      <div className="flex items-center justify-between gap-3 pt-3 pb-1">
        <h2 id="all-stocks-h" className="text-[17px] font-extrabold">
          전체 종목
        </h2>
        <Link href="/markets" prefetch={false} className="ds-meta shrink-0 inline-flex items-center min-h-[36px] hover:text-text-muted">
          {total}종목 시세 보기 →
        </Link>
      </div>
      {groups.map((g) =>
        g.items.length > FOLD_OVER ? (
          <details key={g.cat} className="group border-t border-line">
            <summary className="flex items-center justify-between gap-3 min-h-[44px] cursor-pointer text-[13px] font-bold text-text">
              <span>
                {g.label} <span className="ds-meta font-medium num">{g.items.length}</span>
              </span>
              <span className="ds-meta group-open:hidden" aria-hidden="true">
                펼치기 ▾
              </span>
              <span className="ds-meta hidden group-open:inline" aria-hidden="true">
                접기 ▴
              </span>
            </summary>
            <div className="pb-2">
              <Names items={g.items} />
            </div>
          </details>
        ) : (
          <div key={g.cat} className="border-t border-line pt-2 pb-1">
            <div className="text-[13px] font-bold text-text">
              {g.label} <span className="ds-meta font-medium num">{g.items.length}</span>
            </div>
            <Names items={g.items} />
          </div>
        ),
      )}
    </section>
  );
}
