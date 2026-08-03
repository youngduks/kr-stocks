import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import { listPosts } from "@/lib/community";
import { CommunityList } from "./CommunityList";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 0; // 실시간성 필요 — 캐시 없음(트래픽 적어 부담 안 됨)

export const metadata: Metadata = {
  title: "커뮤니티룸 — 줍줍쇼핑처럼 자유게시판 | 줍줍쇼핑",
  description: "수익인증, 자유 잡담, 트레이딩 정보 공유 — 누구나 닉네임으로 자유롭게 글 쓰고 댓글 달 수 있는 커뮤니티룸.",
  alternates: { canonical: "https://kr-stocks.com/community" },
};

export default async function CommunityPage() {
  const [data, initial] = await Promise.all([fetchAllPrices(), listPosts()]);

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />
      <main className="max-w-3xl mx-auto px-5 pt-6 pb-12">
        <Link href="/" className="text-xs text-text-dim hover:text-text-muted">
          ← 홈으로
        </Link>

        <header className="mt-4 mb-6 flex items-end justify-between gap-3">
          <div>
            <div className="text-xs text-accent-blue font-semibold mb-2 tracking-wider">커뮤니티룸</div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">자유게시판</h1>
            <p className="text-text-muted text-sm mt-2">
              수익인증, 잡담, 정보공유 — 닉네임만으로 자유롭게. 회원가입 없음.
            </p>
          </div>
          <Link
            href="/community/new"
            className="shrink-0 px-4 py-2 rounded-lg bg-accent-blue text-white text-sm font-bold hover:brightness-110 transition"
          >
            ✏️ 글쓰기
          </Link>
        </header>

        <CommunityList initialPosts={initial.posts} initialCursor={initial.nextCursor} />

        <p className="text-[10px] text-text-dim mt-6 leading-relaxed">
          ※ 비밀번호는 본인 글/댓글 삭제 확인용으로만 쓰입니다(계정 시스템 없음). 리딩방·투자 권유·불법 홍보성 게시글은
          신고 시 자동 숨김 처리됩니다. 게시된 내용에 대한 투자 판단 책임은 본인에게 있습니다.
        </p>
      </main>
      <Footer />
    </>
  );
}
