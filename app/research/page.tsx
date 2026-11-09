// 리서치 목록 — 검증형 글 연재 (2026-11-09)
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageTitle } from "@/components/ui/PageTitle";
import { getGuideFx } from "@/components/guide/GuideShell";
import { RESEARCH } from "@/lib/research";

export const revalidate = 3600;

const URL = "https://kr-stocks.com/research";

export const metadata: Metadata = {
  title: "리서치 — 숫자로 검증한 한국 주식 야간 지표",
  description: "바이낸스 삼성전자 야간 등락, 미국 반도체 신호 등 한국 주식 야간 지표가 실제로 맞았는지 표본 수·기간·기준선과 함께 검증한 글 모음.",
  alternates: { canonical: URL },
  openGraph: { title: "리서치 — kr-stocks.com", url: URL, type: "website" },
};

export default async function ResearchIndex() {
  const fx = await getGuideFx();
  return (
    <>
      <Header fxRate={fx.krw_per_usdt} fxChange={fx.change_24h_pct} />
      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-4 pb-12">
        <PageTitle backHref="/" eyebrow="🔬 리서치" title="숫자로 검증한 한국 주식 야간 지표" />
        <p className="ds-explain mt-3 mb-4">
          표본 수·기간·기준일과 &lsquo;아무 날&rsquo; 기준선을 함께 적어요. 결과가 좋지 않아도 그대로 싣고, 계산 스크립트는 저장소에 남겨요.
        </p>
        <section className="ds-card" style={{ padding: "8px 20px" }}>
          {RESEARCH.map((r) => (
            <Link key={r.slug} href={`/research/${r.slug}`} prefetch={false} className="ds-row hover:bg-bg-hover/60 -mx-2 px-2 rounded-xl transition">
              <div className="flex-1 min-w-0 py-2">
                <div className="text-[15px] font-bold text-text">{r.title}</div>
                <div className="ds-meta mt-0.5">{r.summary}</div>
                <div className="ds-meta mt-0.5">{r.date.replace(/-/g, ".")} 기준</div>
              </div>
            </Link>
          ))}
        </section>
        <p className="ds-meta pt-4">정보 제공용이며 투자 권유·자문이 아닙니다. 과거 결과가 앞으로도 같다는 보장은 없습니다.</p>
      </main>
      <Footer />
    </>
  );
}
