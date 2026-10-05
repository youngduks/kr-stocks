"use client";

import { useMemo, useState } from "react";
import type { Stay } from "@/lib/stays";
import { StayRow } from "./StayCard";

/** 📚 숙소 리스트 — 번호 내림차순 전체 + 번호·이름 검색("12" → 12번 우선, 나머지는 이름 포함) */
export function StaySearch({ stays }: { stays: Stay[] }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().replace(/번$/, "").toLowerCase();
    if (!t) return stays;
    const asNo = /^\d+$/.test(t) ? Number(t) : null;
    return stays
      .filter((s) => (asNo != null && String(s.no).includes(t)) || s.name.toLowerCase().includes(t))
      .sort((a, b) => Number(b.no === asNo) - Number(a.no === asNo));
  }, [q, stays]);

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
      {list.length === 0 ? (
        <div className="ds-card mt-3 text-center ds-explain">‘{q.trim()}’에 맞는 숙소가 없어요.</div>
      ) : (
        <ul className="mt-3 space-y-3">
          {list.map((s) => (
            <StayRow key={s.no} stay={s} />
          ))}
        </ul>
      )}
    </>
  );
}
