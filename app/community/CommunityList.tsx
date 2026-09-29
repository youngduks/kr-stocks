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
      <div className="ds-card text-center ds-explain">
        아직 글이 없어요. 첫 글을 남겨보세요.
      </div>
    );
  }

  return (
    <>
      <div className="ds-card !p-0 divide-y divide-line overflow-hidden">
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/community/${p.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-bg-hover transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {p.hasImage && (
                  <span className="ds-pill ds-pill-flat shrink-0 !px-2 !py-0.5 !text-[11px]">
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
          className="mt-3 w-full h-12 rounded-tile bg-bg-card shadow-card text-[15px] font-bold text-text-muted hover:text-text transition disabled:opacity-50"
        >
          {loading ? "불러오는 중…" : "더보기"}
        </button>
      )}
    </>
  );
}
