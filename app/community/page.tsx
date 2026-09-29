import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import { listPosts } from "@/lib/community";
import { CommunityList } from "./CommunityList";
import Link from "next/link";
import { PageTitle } from "@/components/ui/PageTitle";
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
      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-4 pb-12">
        <div className="flex items-start justify-between gap-3">
          <PageTitle eyebrow="커뮤니티룸 · 닉네임만으로, 회원가입 없음" title="자유게시판" backHref="/" className="min-w-0" />
          <Link
            href="/community/new"
            className="mt-3 shrink-0 h-11 px-4 inline-flex items-center rounded-tile bg-ink text-on-ink text-[15px] font-extrabold hover:opacity-90 transition"
          >
            ✏️ 글쓰기
          </Link>
        </div>
        <p className="ds-explain mt-2 mb-4" style={{ fontSize: 14 }}>
          수익인증, 잡담, 정보공유 — 닉네임만으로 자유롭게.
        </p>

        <CommunityList initialPosts={initial.posts} initialCursor={initial.nextCursor} />

        <p className="ds-meta mt-6">
          ※ 비밀번호는 본인 글/댓글 삭제 확인용으로만 쓰입니다(계정 시스템 없음). 리딩방·투자 권유·불법 홍보성 게시글은
          신고 시 자동 숨김 처리됩니다. 게시된 내용에 대한 투자 판단 책임은 본인에게 있습니다.
        </p>
      </main>
      <Footer />
    </>
  );
}
