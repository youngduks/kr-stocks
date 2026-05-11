"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "kr-stocks:sid";
const POLL_INTERVAL_MS = 30_000;

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

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return (n / 1_000).toFixed(1) + "k";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toLocaleString("ko-KR");
}

export function StatsBar() {
  const [stats, setStats] = useState<{ online: number; total: number } | null>(null);

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
    <div className="flex items-center gap-2 text-[11px] text-text-dim tabular">
      <span className="flex items-center gap-1">
        <span className="inline-block w-2 h-2 rounded-full bg-accent-green animate-pulse"></span>
        <span className="font-semibold text-accent-green">{fmt(stats.online)}</span>
        <span className="hidden sm:inline">online</span>
      </span>
      <span className="text-line">·</span>
      <span className="flex items-center gap-1">
        <span className="font-semibold text-text-muted">{fmt(stats.total)}</span>
        <span className="hidden sm:inline">누적</span>
      </span>
    </div>
  );
}
