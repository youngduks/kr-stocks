import Link from "next/link";
import { PageTitle } from "@/components/ui/PageTitle";
import { AsOf } from "@/components/ui/AsOf";
import { MoreDetails } from "@/components/ui/MoreDetails";
import AffiliateStrip from "@/components/AffiliateStrip";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";

export const revalidate = 3600; // 1시간 ISR — GitHub raw fetch, 빌드 없이 갱신

type NewsItem = {
  title: string;
  link: string;
  source: string;
  ts: number;
  pub: string;
  sentiment?: "positive" | "negative" | "neutral";
  desc?: string;
  image?: string;
};

// 한국 관례: 호재 = 빨강(up), 악재 = 파랑(down) — Phase A 토큰
function sentimentBadge(s?: NewsItem["sentiment"]) {
  if (s === "positive") return { label: "호재", cls: "ds-pill-up" };
  if (s === "negative") return { label: "악재", cls: "ds-pill-down" };
  return null;
}

type CategoryFile = {
  category: string;
  updated_at: string;
  count: number;
  items: NewsItem[];
};

const CATEGORIES: { id: string; label: string; emoji: string }[] = [
  { id: "intl", label: "국제정세", emoji: "🌐" },
  { id: "samsung", label: "삼성전자", emoji: "📱" },
  { id: "hynix", label: "SK하이닉스", emoji: "💾" },
  { id: "hyundai", label: "현대차", emoji: "🚗" },
];

const GITHUB_RAW =
  "https://raw.githubusercontent.com/youngduks/kr-stocks/main/data/news";

async function loadCategory(cat: string): Promise<CategoryFile | null> {
  try {
    const res = await fetch(`${GITHUB_RAW}/${cat}.json`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as CategoryFile;
  } catch {
    return null;
  }
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

export default async function NewsPage() {
  const [data, prices] = await Promise.all([
    Promise.all(CATEGORIES.map(async (c) => ({ meta: c, file: await loadCategory(c.id) }))),
    fetchAllPrices(),
  ]);

  const latestUpdate = data
    .map((d) => d.file?.updated_at)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const NEWS_TOP = 6;
  const renderItem = (it: NewsItem) => {
    const badge = sentimentBadge(it.sentiment);
    return (
      <li key={it.link} className="border-b border-line last:border-b-0">
        <a href={it.link} target="_blank" rel="noopener noreferrer" className="flex gap-3 items-start py-3 group">
          {/* 카드뉴스 썸네일(2026-08-20) — RSS에 원래 있던 이미지(AI 생성 아님). 서버 컴포넌트라 onError 불가 →
              background-image로 깨진 URL도 빈 배경만 남김. 고정 64px(CLS 0). */}
          {it.image && (
            <div
              aria-hidden="true"
              className="w-16 h-16 rounded-tile flex-none bg-bg-hover"
              style={{ background: `rgb(var(--bg-hover)) url(${JSON.stringify(it.image)}) center/cover no-repeat` }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-sys text-[15px] font-bold leading-snug line-clamp-2 group-hover:underline decoration-text-dim/40">
              {badge && (
                <span className={`ds-pill ${badge.cls} mr-1.5 align-[2px]`} style={{ padding: "1px 7px", fontSize: 11 }}>
                  {badge.label}
                </span>
              )}
              {it.title}
            </div>
            {it.desc && <div className="font-sys text-[13px] text-text-muted leading-snug line-clamp-2 mt-0.5">{it.desc}</div>}
            <div className="ds-meta mt-0.5">
              {it.source} · {relativeTime(it.ts)}
            </div>
          </div>
        </a>
      </li>
    );
  };

  return (
    <>
      <Header fxRate={prices.fx.krw_per_usdt} fxChange={prices.fx.change_24h_pct} />
      <main className="max-w-6xl mx-auto px-4 sm:px-5 pt-4 pb-12">
        <PageTitle eyebrow="국제정세 · 삼성전자 · SK하이닉스 · 현대차" title="뉴스룸" backHref="/">
          {latestUpdate ? (
            <AsOf at={latestUpdate} note="1시간마다 갱신 · 한경·머투·연합 키워드 필터" />
          ) : (
            <div className="ds-meta">한경 / 머투 / 연합뉴스에서 키워드 필터링 (1시간마다 갱신)</div>
          )}
        </PageTitle>

        <div className="grid gap-4 mt-4 md:grid-cols-2">
          {data.map(({ meta, file }) => (
            <section key={meta.id} className="ds-card" style={{ paddingTop: 16, paddingBottom: 8 }}>
              <h2 className="ds-h2 flex items-center justify-between gap-2">
                <span>
                  {meta.emoji} {meta.label}
                </span>
                <span className="ds-meta font-normal num">{file?.count ?? 0}건</span>
              </h2>
              {!file || file.items.length === 0 ? (
                <p className="ds-explain py-3">아직 수집된 기사가 없어요.</p>
              ) : (
                <>
                  <ul className="mt-1">{file.items.slice(0, NEWS_TOP).map(renderItem)}</ul>
                  {file.items.length > NEWS_TOP && (
                    <MoreDetails summary={`더 보기 ${Math.min(file.items.length, 15) - NEWS_TOP}건`} className="!mt-0">
                      <ul>{file.items.slice(NEWS_TOP, 15).map(renderItem)}</ul>
                    </MoreDetails>
                  )}
                </>
              )}
            </section>
          ))}
        </div>

        <AffiliateStrip />

        <p className="ds-meta mt-8">
          뉴스 출처: <Link href="https://www.hankyung.com" className="underline">한국경제</Link>,{" "}
          <Link href="https://news.mt.co.kr" className="underline">머니투데이</Link>,{" "}
          <Link href="https://www.yna.co.kr" className="underline">연합뉴스</Link>. 본 페이지는 각 매체 RSS 피드를 키워드로 필터링한 헤드라인
          모음이며, 제목 클릭 시 원문 매체 페이지로 이동합니다.
        </p>
      </main>
      <Footer />
    </>
  );
}
