"use client";

import { useMemo, useState } from "react";
import type { Stay } from "@/lib/stays";
import type { StayPriceView } from "@/lib/stayPrices";
import {
  REGION_CATEGORIES,
  THEME_TAGS,
  regionCategory,
  themeTags,
  type RegionCategory,
  type ThemeTag,
} from "@/lib/stayCategory";
import { StayRow } from "./StayCard";

// 칩 모양은 /shopping 필터 칩(app/shopping/ShoppingList.tsx)과 같게
const CHIP = "ds-chip !h-11 !px-3 !text-[14px] hover:text-text transition aria-pressed:!bg-ink aria-pressed:!text-on-ink";
const ALL = "전체";

type Item = { stay: Stay; region: RegionCategory; themes: ThemeTag[] };

/**
 * 📚 숙소 리스트 — 번호 오름차순(1번 → 최신).
 * - 기본(전체·테마 없음·검색 없음): 지역 카테고리별 묶음, 묶음 안은 번호 오름차순
 * - 지역 칩 → 그 지역만, 테마 칩 → 추가로 좁힘(AND)
 * - 검색("12" → 12번 우선, 나머지는 번호·이름 포함): 칩과 상관없이 전체에서 찾고 한 줄 목록
 * 카테고리는 region·type 글자로 자동 분류(lib/stayCategory.ts).
 */
export function StaySearch({ stays, prices }: { stays: Stay[]; prices: Record<number, StayPriceView> }) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<RegionCategory | typeof ALL>(ALL);
  const [theme, setTheme] = useState<ThemeTag | null>(null);

  const items = useMemo<Item[]>(
    () =>
      [...stays]
        .sort((a, b) => a.no - b.no)
        .map((s) => ({ stay: s, region: regionCategory(s.region), themes: themeTags(s.type) })),
    [stays],
  );

  const t = q.trim().replace(/번$/, "").toLowerCase();
  const searching = t.length > 0;

  const searchResults = useMemo(() => {
    if (!t) return [];
    const asNo = /^\d+$/.test(t) ? Number(t) : null;
    return items
      .filter(({ stay: s }) => (asNo != null && String(s.no).includes(t)) || s.name.toLowerCase().includes(t))
      .sort((a, b) => Number(b.stay.no === asNo) - Number(a.stay.no === asNo)); // 안정 정렬 → 나머지는 오름차순 유지
  }, [t, items]);

  // 칩 숫자: 지역 칩은 현재 테마 기준, 테마 칩은 현재 지역 기준
  const byTheme = theme ? items.filter((i) => i.themes.includes(theme)) : items;
  const byRegion = region === ALL ? items : items.filter((i) => i.region === region);
  const regionCounts = new Map<string, number>();
  for (const i of byTheme) regionCounts.set(i.region, (regionCounts.get(i.region) ?? 0) + 1);
  const themeCounts = new Map<string, number>();
  for (const i of byRegion) for (const th of i.themes) themeCounts.set(th, (themeCounts.get(th) ?? 0) + 1);

  const filtered = byRegion.filter((i) => !theme || i.themes.includes(theme));
  const grouped = !searching && region === ALL && theme == null;

  const pickRegion = (r: RegionCategory | typeof ALL) => {
    setRegion(r);
    setQ("");
  };
  const pickTheme = (th: ThemeTag) => {
    setTheme(theme === th ? null : th);
    setQ("");
  };

  const rows = (list: Item[]) => (
    <ul className="mt-3 space-y-3">
      {list.map(({ stay }) => (
        <StayRow key={stay.no} stay={stay} price={prices[stay.no]} />
      ))}
    </ul>
  );

  return (
    <>
      <input
        type="search"
        inputMode="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="번호나 숙소 이름으로 찾기"
        aria-label="숙소 번호 또는 이름 검색"
        className="mt-3 w-full h-12 px-4 rounded-tile bg-bg-card text-text text-[16px] shadow-[var(--shadow)] placeholder:text-text-dim"
      />

      <nav aria-label="지역별 숙소" className="-mx-4 px-4 sm:-mx-5 sm:px-5 mt-3 ds-chipnav ds-fade-right flex gap-2 overflow-x-auto py-1">
        {[ALL, ...REGION_CATEGORIES].map((r) => {
          const n = r === ALL ? byTheme.length : regionCounts.get(r) ?? 0;
          const on = !searching && region === r;
          if (r !== ALL && n === 0 && region !== r) return null;
          return (
            <button key={r} type="button" onClick={() => pickRegion(r as RegionCategory | typeof ALL)} aria-pressed={on} className={CHIP}>
              {r}
              <span className={`ml-1 num text-[12px] ${on ? "opacity-70" : "text-text-dim"}`}>{n}</span>
            </button>
          );
        })}
        <span className="flex-none w-4" aria-hidden="true" />
      </nav>
      <nav aria-label="테마별 숙소" className="-mx-4 px-4 sm:-mx-5 sm:px-5 mt-1 ds-chipnav ds-fade-right flex gap-2 overflow-x-auto py-1">
        {THEME_TAGS.map((th) => {
          const n = themeCounts.get(th) ?? 0;
          const on = !searching && theme === th;
          if (n === 0 && theme !== th) return null;
          return (
            <button key={th} type="button" onClick={() => pickTheme(th)} aria-pressed={on} className={CHIP}>
              {th}
              <span className={`ml-1 num text-[12px] ${on ? "opacity-70" : "text-text-dim"}`}>{n}</span>
            </button>
          );
        })}
        <span className="flex-none w-4" aria-hidden="true" />
      </nav>

      {searching ? (
        searchResults.length === 0 ? (
          <div className="ds-card mt-3 text-center ds-explain">‘{q.trim()}’에 맞는 숙소가 없어요.</div>
        ) : (
          <>
            <p className="ds-meta mt-2">전체 숙소에서 찾은 결과 {searchResults.length}곳</p>
            {rows(searchResults)}
          </>
        )
      ) : grouped ? (
        REGION_CATEGORIES.map((r) => {
          const list = items.filter((i) => i.region === r);
          if (!list.length) return null;
          return (
            <section key={r} className="mt-5" aria-labelledby={`stay-group-${r}`}>
              <h3 id={`stay-group-${r}`} className="text-[16px] font-extrabold tracking-tight flex items-baseline gap-2">
                {r}
                <span className="ds-meta num font-semibold">{list.length}곳</span>
              </h3>
              {rows(list)}
            </section>
          );
        })
      ) : filtered.length === 0 ? (
        <div className="ds-card mt-3 text-center ds-explain">이 조건에 맞는 숙소가 아직 없어요.</div>
      ) : (
        rows(filtered)
      )}
    </>
  );
}
