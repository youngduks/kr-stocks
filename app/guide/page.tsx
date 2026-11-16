// 가이드 목록 (2026-11-16 정보 구조 재정비) — 예전엔 /guide 주소가 없어(404) 헤더 '가이드'가 글 하나로만 연결됐음.
// 목록 데이터: lib/guides.ts
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageTitle } from "@/components/ui/PageTitle";
import { LinkRow } from "@/components/ui/LinkRow";
import { getGuideFx } from "@/components/guide/GuideShell";
import { GUIDES, GUIDE_GROUPS } from "@/lib/guides";

export const revalidate = 3600;

const URL = "https://kr-stocks.com/guide";
const TITLE = "가이드 — 야간 시세·지표 읽는 법";
const DESC =
  "삼성전자 야간 가격 보는 법, 코스피200 야간선물·NXT 시간외 거래시간, VIX지수·CNN 공포탐욕지수·청산맵 읽는 법, 바이낸스·Hyperliquid 거래 방법까지 kr-stocks.com 가이드 모음.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESC, url: URL, type: "website" },
};

const LD = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${URL}#page`,
  url: URL,
  name: TITLE,
  description: DESC,
  inLanguage: "ko-KR",
  isPartOf: { "@id": "https://kr-stocks.com/#website" },
  publisher: { "@id": "https://kr-stocks.com/#organization" },
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: GUIDES.length,
    itemListElement: GUIDES.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: g.title,
      url: `https://kr-stocks.com${g.href}`,
    })),
  },
};

export default async function GuideIndex() {
  const fx = await getGuideFx();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LD) }} />
      <Header fxRate={fx.krw_per_usdt} fxChange={fx.change_24h_pct} />
      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-2 pb-12">
        <PageTitle eyebrow={`가이드 ${GUIDES.length}편`} title="야간 시세·지표 읽는 법" backHref="/" className="mb-4" />

        {GUIDE_GROUPS.map((group) => {
          const items = GUIDES.filter((g) => g.group === group);
          if (items.length === 0) return null;
          const id = `guide-g-${GUIDE_GROUPS.indexOf(group)}`;
          return (
            <section key={group} className="ds-card mb-4" style={{ padding: "8px 20px" }} aria-labelledby={id}>
              <div className="pt-3 pb-1">
                <h2 id={id} className="text-[17px] font-extrabold">
                  {group}
                </h2>
              </div>
              {items.map((g) => (
                <LinkRow key={g.href} href={g.href} title={g.title} desc={g.desc} />
              ))}
            </section>
          );
        })}

        <section className="ds-card" style={{ padding: "8px 20px" }} aria-labelledby="guide-site-h">
          <div className="pt-3 pb-1">
            <h2 id="guide-site-h" className="text-[17px] font-extrabold">
              사이트 안내
            </h2>
          </div>
          <LinkRow href="/about" title="데이터 원칙·이용법" desc="데이터 출처와 갱신 주기, 알아두어야 할 한계" />
          <LinkRow href="/research" title="리서치" desc="지표가 실제로 맞았는지 숫자로 검증한 글" />
          <LinkRow href="/community" title="커뮤니티" desc="닉네임만으로 쓰는 자유게시판 — 수익인증·잡담·정보 공유" />
        </section>

        <p className="ds-meta pt-4">
          English guides:{" "}
          {GUIDES.filter((g) => g.enHref).map((g, i) => (
            <span key={g.enHref}>
              {i > 0 && " · "}
              <Link href={g.enHref as any} prefetch={false} hrefLang="en" className="underline hover:text-text-muted">
                {g.enHref!.includes("binance") ? "Binance Korean-stock perps" : "Hyperliquid onramp"}
              </Link>
            </span>
          ))}
        </p>
        <p className="ds-meta pt-2">가이드는 정보 제공만을 목적으로 하며 투자 권유·자문이 아닙니다.</p>
      </main>
      <Footer />
    </>
  );
}
