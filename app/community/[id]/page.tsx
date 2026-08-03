import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import { getPost, listComments } from "@/lib/community";
import { PostDetail } from "./PostDetail";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.id);
  if (!post) return { title: "게시글을 찾을 수 없습니다 | 커뮤니티룸" };
  return {
    title: `${post.title} — 커뮤니티룸 | 줍줍쇼핑`,
    robots: { index: false }, // UGC — 모더레이션 전 검색노출 방지
  };
}

export default async function CommunityPostPage({ params }: Props) {
  const [data, post, comments] = await Promise.all([
    fetchAllPrices(),
    getPost(params.id),
    listComments(params.id),
  ]);
  if (!post) notFound();

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />
      <main className="max-w-2xl mx-auto px-5 pt-6 pb-12">
        <Link href="/community" className="text-xs text-text-dim hover:text-text-muted">
          ← 커뮤니티룸으로
        </Link>
        <PostDetail post={post} initialComments={comments} />
      </main>
      <Footer />
    </>
  );
}
