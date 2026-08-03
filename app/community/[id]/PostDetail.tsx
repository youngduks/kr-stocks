"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Post = {
  id: string;
  nickname: string;
  title: string;
  body: string;
  imageUrl: string | null;
  createdAt: number;
};

type Comment = {
  id: string;
  postId: string;
  nickname: string;
  body: string;
  createdAt: number;
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export function PostDetail({ post, initialComments }: { post: Post; initialComments: Comment[] }) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [cNickname, setCNickname] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cBody, setCBody] = useState("");
  const [cError, setCError] = useState<string | null>(null);
  const [cSubmitting, setCSubmitting] = useState(false);
  const mountedAt = useRef(Date.now());

  async function onDeletePost() {
    const password = window.prompt("게시글을 삭제하려면 비밀번호를 입력하세요.");
    if (password == null) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/community/posts/${post.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error ?? "삭제에 실패했습니다.");
        setDeleting(false);
        return;
      }
      router.push("/community");
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
      setDeleting(false);
    }
  }

  async function onReport() {
    if (!window.confirm("이 게시글을 신고하시겠습니까? (스팸·불법홍보·투자권유 등)")) return;
    try {
      const res = await fetch(`/api/community/posts/${post.id}/report`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setReportMsg(data?.error ?? "신고 처리에 실패했습니다.");
        return;
      }
      setReportMsg(data.hidden ? "신고가 누적되어 게시글이 숨김 처리되었습니다." : "신고가 접수되었습니다.");
    } catch {
      setReportMsg("신고 처리 중 오류가 발생했습니다.");
    }
  }

  async function onDeleteComment(commentId: string) {
    const password = window.prompt("댓글을 삭제하려면 비밀번호를 입력하세요.");
    if (password == null) return;
    try {
      const res = await fetch(`/api/community/comments/${commentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, postId: post.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error ?? "삭제에 실패했습니다.");
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    }
  }

  async function onSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    setCError(null);
    if (Date.now() - mountedAt.current < 1500) {
      setCError("잠시 후 다시 시도해주세요.");
      return;
    }
    if (!cNickname.trim() || !cPassword.trim() || !cBody.trim()) {
      setCError("닉네임/비밀번호/댓글을 모두 입력해주세요.");
      return;
    }
    if (cPassword.length < 4) {
      setCError("비밀번호는 4자 이상이어야 합니다.");
      return;
    }
    setCSubmitting(true);
    try {
      const res = await fetch(`/api/community/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: cNickname, password: cPassword, body: cBody }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCError(data?.error ?? "댓글 작성에 실패했습니다.");
        setCSubmitting(false);
        return;
      }
      setComments((prev) => [...prev, data]);
      setCBody("");
    } catch {
      setCError("댓글 작성 중 오류가 발생했습니다.");
    } finally {
      setCSubmitting(false);
    }
  }

  return (
    <article className="mt-4">
      <header className="mb-4">
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {post.imageUrl && (
            <span className="text-[10px] font-bold text-accent-green bg-accent-green/10 border border-accent-green/30 px-1.5 py-0.5 rounded">
              💰 인증
            </span>
          )}
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-text leading-snug">{post.title}</h1>
        <div className="mt-2 flex items-center gap-2 text-xs text-text-dim">
          <span className="font-semibold text-text-muted">{post.nickname}</span>
          <span className="text-text-dim/40">·</span>
          <span>{formatDate(post.createdAt)}</span>
        </div>
      </header>

      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.imageUrl} alt="첨부 이미지" className="w-full rounded-xl border border-line mb-4" />
      )}

      <div className="text-sm text-text leading-relaxed whitespace-pre-wrap rounded-xl border border-line bg-bg-card p-4">
        {post.body}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onReport}
          className="px-3 py-1.5 rounded-lg border border-line text-xs text-text-dim hover:text-text hover:border-text-dim transition"
        >
          🚨 신고
        </button>
        <button
          type="button"
          onClick={onDeletePost}
          disabled={deleting}
          className="px-3 py-1.5 rounded-lg border border-line text-xs text-text-dim hover:text-red-400 hover:border-red-900/50 transition disabled:opacity-50"
        >
          {deleting ? "삭제 중…" : "삭제"}
        </button>
        {reportMsg && <span className="text-[11px] text-text-dim">{reportMsg}</span>}
      </div>

      {/* 댓글 */}
      <section className="mt-8">
        <h2 className="text-sm font-bold text-text mb-3">댓글 {comments.length}</h2>

        {comments.length > 0 && (
          <div className="space-y-2 mb-4">
            {comments.map((c) => (
              <div key={c.id} className="rounded-lg border border-line bg-bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] text-text-dim">
                    <span className="font-semibold text-text-muted">{c.nickname}</span>
                    <span className="text-text-dim/40">·</span>
                    <span>{formatDate(c.createdAt)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteComment(c.id)}
                    className="text-[10px] text-text-dim hover:text-red-400 transition shrink-0"
                  >
                    삭제
                  </button>
                </div>
                <div className="mt-1.5 text-sm text-text whitespace-pre-wrap">{c.body}</div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={onSubmitComment} className="rounded-xl border border-line bg-bg-card p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={cNickname}
              onChange={(e) => setCNickname(e.target.value)}
              maxLength={20}
              placeholder="닉네임"
              className="px-2.5 py-1.5 rounded-md bg-bg border border-line text-xs text-text focus:outline-none focus:border-accent-blue"
            />
            <input
              type="password"
              value={cPassword}
              onChange={(e) => setCPassword(e.target.value)}
              maxLength={64}
              placeholder="비밀번호 (4자 이상)"
              className="px-2.5 py-1.5 rounded-md bg-bg border border-line text-xs text-text focus:outline-none focus:border-accent-blue"
            />
          </div>
          <textarea
            value={cBody}
            onChange={(e) => setCBody(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="댓글을 입력하세요"
            className="w-full px-2.5 py-1.5 rounded-md bg-bg border border-line text-xs text-text focus:outline-none focus:border-accent-blue resize-y"
          />
          {cError && <div className="text-[11px] text-red-400">{cError}</div>}
          <button
            type="submit"
            disabled={cSubmitting}
            className="px-3 py-1.5 rounded-md bg-accent-blue text-white text-xs font-bold hover:brightness-110 transition disabled:opacity-50"
          >
            {cSubmitting ? "등록 중…" : "댓글 등록"}
          </button>
        </form>
      </section>
    </article>
  );
}
