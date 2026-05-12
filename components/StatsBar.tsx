"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "kr-stocks:sid";
const POLL_INTERVAL_MS = 30_000;

const I18N = {
  ko: { online: "지금 접속", total: "누적 접속", unit: "명" },
  en: { online: "Online", total: "Total", unit: "" },
} as const;

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function fmt(n: number, locale: "ko" | "en" = "ko"): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return (n / 1_000).toFixed(1) + "k";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toLocaleString(locale === "en" ? "en-US" : "ko-KR");
}

export function StatsBar() {
  const [stats, setStats] = useState<{ online: number; total: number } | null>(null);
  const pathname = usePathname() || "/";
  const isEn = pathname === "/en" || pathname.startsWith("/en/");
  const locale: "ko" | "en" = isEn ? "en" : "ko";
  const t = I18N[locale];

  useEffect(() => {
    let alive = true;
    const sid = getOrCreateSessionId();

    // 첫 방문 — POST /api/visit
    fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (alive && d && typeof d.online === "number") setStats({ online: d.online, total: d.total });
      })
      .catch(() => {});

    // 30초마다 폴링 + 자기 세션 유지 위해 visit ping
    const tick = () => {
      fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (alive && d && typeof d.online === "number") setStats({ online: d.online, total: d.total });
        })
        .catch(() => {});
    };
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!stats || (stats.online === 0 && stats.total === 0)) return null;

  return (
    <div className="flex items-center gap-2 text-[11px] tabular leading-tight">
      <span className="flex flex-col items-end">
        <span className="text-[9px] text-text-dim flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse"></span>
          {t.online}
        </span>
        <span className="font-bold text-accent-green text-xs">
          {fmt(stats.online, locale)}
          {t.unit && <span className="text-[9px] text-text-dim font-normal ml-0.5">{t.unit}</span>}
        </span>
      </span>
      <span className="text-line text-base">·</span>
      <span className="flex flex-col items-end">
        <span className="text-[9px] text-text-dim">{t.total}</span>
        <span className="font-bold text-text-muted text-xs">
          {fmt(stats.total, locale)}
          {t.unit && <span className="text-[9px] text-text-dim font-normal ml-0.5">{t.unit}</span>}
        </span>
      </span>
    </div>
  );
}
