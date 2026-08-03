import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import { NewPostForm } from "./NewPostForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "글쓰기 — 커뮤니티룸 | 줍줍쇼핑",
  robots: { index: false }, // 작성 폼은 검색노출 불필요
};

export default async function NewPostPage() {
  const data = await fetchAllPrices();
  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />
      <main className="max-w-2xl mx-auto px-5 pt-6 pb-12">
        <Link href="/community" className="text-xs text-text-dim hover:text-text-muted">
          ← 커뮤니티룸으로
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-4 mb-6">✏️ 글쓰기</h1>
        <NewPostForm />
      </main>
      <Footer />
    </>
  );
}
