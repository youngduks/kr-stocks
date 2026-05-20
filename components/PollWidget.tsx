"use client";
import { useEffect, useState } from "react";

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
}: {
  pollId: string;
  title: string;
  question: string;
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

  if (!result) {
    return (
      <div className="rounded-xl bg-bg-card border border-line p-4 mb-6 text-sm text-text-dim">
        🗳️ 투표 위젯 불러오는 중...
      </div>
    );
  }

  const total = result.total;
  const yesPct = total > 0 ? Math.round((result.yes / total) * 100) : 0;
  const noPct = total > 0 ? 100 - yesPct : 0;
  const voted = result.voted;
  const isClosed = result.isClosed;
  const showResults = !!voted || isClosed || total > 0;
  const closeStr = formatCloseDate(result.closedAt);

  return (
    <div className="rounded-xl bg-bg-card border border-line p-4 mb-6">
      <div className="mb-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
          <div className="text-base font-bold text-text">🗳️ {title}</div>
          <div className="text-[11px] text-text-dim">
            재미로 ㅎ · {total}명 참여
            {closeStr && !isClosed ? ` · ${closeStr} 마감` : ""}
          </div>
        </div>
        <div className="text-sm text-text-muted">{question}</div>
      </div>

      {!voted && !isClosed && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            onClick={() => castVote("yes")}
            disabled={loading}
            className="rounded-lg border border-line bg-bg py-3 text-sm font-bold text-text disabled:opacity-50 hover:border-text-muted transition"
          >
            👍 YES (타결한다)
          </button>
          <button
            onClick={() => castVote("no")}
            disabled={loading}
            className="rounded-lg border border-line bg-bg py-3 text-sm font-bold text-text disabled:opacity-50 hover:border-text-muted transition"
          >
            👎 NO (안 한다)
          </button>
        </div>
      )}

      {showResults && (
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span className={voted === "yes" ? "font-bold text-text" : ""}>
                👍 YES{voted === "yes" ? " (투표함)" : ""}
              </span>
              <span>
                {yesPct}% · {result.yes}표
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-bg overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${yesPct}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span className={voted === "no" ? "font-bold text-text" : ""}>
                👎 NO{voted === "no" ? " (투표함)" : ""}
              </span>
              <span>
                {noPct}% · {result.no}표
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-bg overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${noPct}%` }}
              />
            </div>
          </div>
          {isClosed && (
            <div className="text-[11px] text-text-dim mt-2">
              투표 마감 — 결과만 표시
            </div>
          )}
        </div>
      )}

      {err && <div className="text-[11px] text-red-500 mt-2">{err}</div>}
    </div>
  );
}
