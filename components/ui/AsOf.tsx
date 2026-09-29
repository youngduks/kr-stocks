"use client";

import { useEffect, useState } from "react";

/**
 * 기준 시각 + 신선도 표시. 데이터 시각(at)이 FRESH_MS 이내면 초록 점(실시간), 아니면 회색 점 + 'N분 전'.
 * SSR 은 시각만 렌더(시간 의존 텍스트는 mount 후) → hydration mismatch 없음.
 */
const FRESH_MS = 5 * 60_000;

function fmtKst(iso: string | number, locale: "ko" | "en") {
  try {
    const d = new Date(iso);
    const s = d.toLocaleString(locale === "en" ? "en-US" : "ko-KR", {
      timeZone: "Asia/Seoul",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${s} KST`;
  } catch {
    return "";
  }
}

export function AsOf({
  at,
  locale = "ko",
  note,
  className = "",
}: {
  /** ISO 시각 */
  at: string | number;
  locale?: "ko" | "en";
  /** 추가 설명 (예: "약 2분마다 갱신") */
  note?: string;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const ageMs = now == null ? 0 : now - new Date(at).getTime();
  const fresh = now == null || ageMs < FRESH_MS;
  const ageMin = Math.max(0, Math.round(ageMs / 60_000));
  const status =
    now == null
      ? null
      : fresh
        ? locale === "en"
          ? "Live"
          : "실시간"
        : locale === "en"
          ? `${ageMin} min ago`
          : `${ageMin}분 전 데이터`;
  return (
    <div className={`flex items-center gap-2 ds-meta min-w-0 ${className}`}>
      <span className={fresh ? "ds-live-dot" : "ds-idle-dot"} aria-hidden="true" />
      <span className="truncate">
        {status && <span className="font-semibold">{status} · </span>}
        {fmtKst(at, locale)} {locale === "en" ? "as of" : "기준"}
        {note ? ` · ${note}` : ""}
      </span>
    </div>
  );
}
