"use client";

import { useState } from "react";
import Link from "next/link";

export type PostSummary = {
  id: string;
  nickname: string;
  title: string;
  createdAt: number;
  commentCount: number;
  hasImage: boolean;
};

function timeAgo(ms: number): string {
  const diffMin = Math.max(0, Math.floor((Date.now() - ms) / 60000));
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}시간 전`;
  return `${Math.floor(diffH / 24)}일 전`;
}

export function CommunityList({
  initialPosts,
  initialCursor,
}: {
  initialPosts: PostSummary[];
  initialCursor: number | null;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (cursor == null || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/community/posts?cursor=${cursor}`, { cache: "no-store" });
      const data = await res.json();
      setPosts((prev) => [...prev, ...(data.posts ?? [])]);
      setCursor(data.nextCursor ?? null);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  if (posts.length === 0) {
    return (
      <div className="p-8 rounded-xl bg-bg-card border border-line text-center text-text-dim text-sm">
        아직 글이 없어요. 첫 글을 남겨보세요.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-line bg-bg-card divide-y divide-line/60 overflow-hidden">
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/community/${p.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {p.hasImage && (
                  <span className="text-[10px] font-bold text-accent-green bg-accent-green/10 border border-accent-green/30 px-1.5 py-0.5 rounded shrink-0">
                    💰 인증
                  </span>
                )}
                <span className="text-sm font-semibold text-text truncate">{p.title}</span>
                {p.commentCount > 0 && (
                  <span className="text-[11px] text-accent-blue font-bold shrink-0">[{p.commentCount}]</span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-text-dim">
                <span>{p.nickname}</span>
                <span className="text-text-dim/40">·</span>
                <span>{timeAgo(p.createdAt)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {cursor != null && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="mt-3 w-full py-2.5 rounded-lg border border-line text-sm text-text-dim hover:text-text hover:border-text-dim transition disabled:opacity-50"
        >
          {loading ? "불러오는 중…" : "더보기"}
        </button>
      )}
    </>
  );
}
