"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type PollChoice = "yes" | "no";
type PollResult = {
  pollId: string;
  yes: number;
  no: number;
  total: number;
  voted: PollChoice | null;
  closedAt: string;
  isClosed: boolean;
};

const SID_KEY = "kr-stocks-sid";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = window.localStorage.getItem(SID_KEY);
  if (!sid || sid.length < 8) {
    sid =
      Math.random().toString(36).slice(2) +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2);
    window.localStorage.setItem(SID_KEY, sid);
  }
  return sid;
}

function formatCloseDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function PollWidget({
  pollId,
  title,
  question,
  yesLabel = "👍 YES",
  noLabel = "👎 NO",
  historyHref,
}: {
  pollId: string;
  title: string;
  question: string;
  yesLabel?: string;
  noLabel?: string;
  historyHref?: string;
}) {
  const [result, setResult] = useState<PollResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const sid = getSessionId();
    fetch(
      `/api/poll?pollId=${encodeURIComponent(pollId)}&sessionId=${encodeURIComponent(sid)}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.yes === "number") setResult(d);
      })
      .catch(() => setErr("로드 실패"));
  }, [pollId]);

  async function castVote(choice: PollChoice) {
    if (loading || !result) return;
    if (result.isClosed || result.voted) return;
    setLoading(true);
    setErr(null);
    try {
      const sid = getSessionId();
      const res = await fetch("/api/poll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pollId, sessionId: sid, choice }),
      });
      const data = await res.json();
      if (data && typeof data.yes === "number") setResult(data);
      if (data && !data.ok && data.error) {
        setErr(
          data.error === "already_voted"
            ? "이미 투표하셨어요"
            : data.error === "closed"
              ? "마감됐어요"
              : "투표 실패",
        );
      }
    } catch {
      setErr("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  // ── 높이 고정 설계 (2026-09 Phase A) ──
  // loading / 투표 전 / 투표 후 / 마감 — 모든 상태에서 같은 DOM 골격 + 고정 높이 영역만 내용 교체.
  //  ① 선택 타일 2개 (h-56): 투표 전 = 버튼, 투표 후·마감 = 같은 크기 결과 타일(%·표)
  //  ② 분포 바 (h-2): 한 줄 split bar
  //  ③ 메타 한 줄 (h-[18px], truncate): 마감시각 / 마감 안내 / 에러
  // → 광고·다른 섹션이 투표 중 밀리지 않음(CLS 0, 오클릭 방지).
  const loaded = !!result;
  const total = result?.total ?? 0;
  const yesPct = total > 0 ? Math.round(((result?.yes ?? 0) / total) * 100) : 0;
  const noPct = total > 0 ? 100 - yesPct : 0;
  const voted = result?.voted ?? null;
  const isClosed = result?.isClosed ?? false;
  const showResults = loaded && (!!voted || isClosed);
  const closeStr = result ? formatCloseDate(result.closedAt) : "";
  const canVote = loaded && !voted && !isClosed && !loading;

  const metaLine = err
    ? err
    : !loaded
      ? "투표 불러오는 중…"
      : isClosed
        ? "투표 마감 — 결과만 표시 · 장 마감 후 자동 채점"
        : voted
          ? `투표 완료${closeStr ? ` · ${closeStr} 마감` : ""} · 결과는 장 마감 후 자동 채점`
          : `${closeStr ? `${closeStr} 마감 · ` : ""}결과는 장 마감 후 자동 채점`;

  const tile = (choice: PollChoice) => {
    const isYes = choice === "yes";
    const label = isYes ? yesLabel : noLabel;
    const tone = isYes ? "bg-up-bg text-up" : "bg-down-bg text-down";
    const mine = voted === choice;
    const pct = isYes ? yesPct : noPct;
    const cnt = isYes ? result?.yes ?? 0 : result?.no ?? 0;
    if (showResults) {
      return (
        <div
          className={`h-14 rounded-2xl ${tone} flex items-center justify-between px-4 ${
            mine ? "ring-2 ring-current" : "opacity-80"
          }`}
          aria-label={`${label} ${pct}% ${cnt}표${mine ? " (내 투표)" : ""}`}
        >
          <span className="text-[15px] font-extrabold truncate">
            {label}
            {mine ? " ✓" : ""}
          </span>
          <span className="num text-[15px] font-extrabold shrink-0">
            {pct}%<span className="text-[12px] font-bold opacity-80 ml-1">{cnt}표</span>
          </span>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => castVote(choice)}
        disabled={!canVote}
        className={`h-14 rounded-2xl ${tone} text-[17px] font-extrabold transition disabled:opacity-60`}
      >
        {label}
      </button>
    );
  };

  return (
    <section className="ds-card mb-6" aria-busy={!loaded}>
      <div className="flex items-center justify-between gap-3">
        <div className="ds-eyebrow truncate">{title}</div>
        <span className="ds-pill ds-pill-flat num shrink-0">{loaded ? `${total}명 참여` : "— 명 참여"}</span>
      </div>
      <h2 className="ds-h2 mt-2">{question}</h2>

      <div className="grid grid-cols-2 gap-3 mt-4">
        {tile("yes")}
        {tile("no")}
      </div>

      {/* 분포 바 — 항상 같은 높이. 투표 전엔 결과를 숨겨 쏠림 방지(회색 바). */}
      <div className="mt-3 h-2 w-full rounded-full bg-flat-bg overflow-hidden flex" aria-hidden="true">
        {showResults && total > 0 && (
          <>
            <div className="h-full bg-up transition-all" style={{ width: `${yesPct}%` }} />
            <div className="h-full bg-down transition-all" style={{ width: `${noPct}%` }} />
          </>
        )}
      </div>

      <div className={`mt-2 h-[18px] text-[12px] leading-[18px] truncate ${err ? "text-up" : "text-text-dim"}`}>
        {metaLine}
      </div>

      {historyHref && (
        <Link
          href={historyHref as any}
          prefetch={false}
          className="mt-3 inline-flex items-center min-h-[32px] text-[13px] font-bold text-text-muted hover:text-text transition"
        >
          지난 투표 결과 · 적중률 보기 →
        </Link>
      )}
    </section>
  );
}
