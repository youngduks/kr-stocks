// 해설(가이드) 페이지 공용 틀 — 2026-11-08
// 화면 FAQ 와 FAQPage JSON-LD 를 같은 배열에서 생성(문구 불일치 방지) + Article + BreadcrumbList.
// 서버 컴포넌트. 헤더 환율은 fetch 실패해도 페이지가 깨지지 않게 getGuideFx() 로 받는다.

import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageTitle } from "@/components/ui/PageTitle";
import { fetchAllPrices } from "@/lib/fetchPrices";

export type GuideFaq = { q: string; a: string };
export type GuideLink = { href: string; label: string; desc?: string; external?: boolean };

export async function getGuideFx(): Promise<{ krw_per_usdt: number; change_24h_pct: number }> {
  try {
    return (await fetchAllPrices()).fx;
  } catch {
    return { krw_per_usdt: 0, change_24h_pct: 0 };
  }
}

export function GuideShell({
  url,
  title,
  description,
  eyebrow,
  intro,
  datePublished,
  dateModified,
  faq,
  related,
  fx,
  children,
  disclaimer,
}: {
  url: string;
  /** h1 + Article headline */
  title: string;
  description: string;
  eyebrow: string;
  intro: React.ReactNode;
  /** YYYY-MM-DD */
  datePublished: string;
  dateModified?: string;
  faq: GuideFaq[];
  related: GuideLink[];
  fx: { krw_per_usdt: number; change_24h_pct: number };
  children: React.ReactNode;
  /** 맨 아래 면책 문구 (기본: 가이드용) */
  disclaimer?: string;
}) {
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      inLanguage: "ko-KR",
      datePublished,
      dateModified: dateModified ?? datePublished,
      mainEntityOfPage: url,
      url,
      isPartOf: { "@id": "https://kr-stocks.com/#website" },
      publisher: { "@id": "https://kr-stocks.com/#organization" },
      author: { "@id": "https://kr-stocks.com/#organization" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "kr-stocks.com", item: "https://kr-stocks.com" },
        { "@type": "ListItem", position: 2, name: title, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <>
      {ld.map((d) => (
        <script key={d["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />
      ))}
      <Header fxRate={fx.krw_per_usdt} fxChange={fx.change_24h_pct} />
      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-4 pb-12">
        <PageTitle backHref="/" eyebrow={eyebrow} title={title} />
        <div className="ds-explain mt-3 mb-4">{intro}</div>

        <article className="space-y-4">{children}</article>

        <section className="ds-card mt-4" aria-labelledby="guide-faq">
          <h2 id="guide-faq" className="text-[17px] font-extrabold mb-3">
            자주 묻는 질문
          </h2>
          <div className="space-y-4">
            {faq.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-text mb-1 text-[15px]">Q. {f.q}</h3>
                <p className="ds-explain">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {related.length > 0 && (
          <section className="ds-card mt-4" aria-labelledby="guide-related">
            <h2 id="guide-related" className="text-[17px] font-extrabold mb-2">
              kr-stocks.com에서 바로 보기
            </h2>
            <div className="space-y-2">
              {related.map((l) =>
                l.external ? (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="block p-3 rounded-xl bg-bg-hover/40 hover:bg-bg-hover transition"
                  >
                    <div className="text-sm font-semibold text-text">{l.label} ↗</div>
                    {l.desc && <div className="ds-meta mt-0.5">{l.desc}</div>}
                  </a>
                ) : (
                  <Link
                    key={l.href}
                    href={l.href}
                    prefetch={false}
                    className="block p-3 rounded-xl bg-accent-blue/5 hover:bg-accent-blue/10 border border-accent-blue/20 transition"
                  >
                    <div className="text-sm font-semibold text-accent-blue">→ {l.label}</div>
                    {l.desc && <div className="ds-meta mt-0.5">{l.desc}</div>}
                  </Link>
                ),
              )}
            </div>
          </section>
        )}

        <p className="ds-meta pt-4">
          {disclaimer ?? "본 가이드는 정보 제공만을 목적으로 하며 투자 권유·자문이 아닙니다. 지표는 앞으로의 가격을 예측하거나 보장하지 않습니다."}
        </p>
      </main>
      <Footer />
    </>
  );
}

/** 가이드 본문 카드 */
export function GuideSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="ds-card" aria-labelledby={id}>
      <h2 id={id} className="text-[17px] font-extrabold mb-2">
        {title}
      </h2>
      <div className="ds-explain space-y-2">{children}</div>
    </section>
  );
}
