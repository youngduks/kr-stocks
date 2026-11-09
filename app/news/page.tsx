import Link from "next/link";
import { PageTitle } from "@/components/ui/PageTitle";
import { AsOf } from "@/components/ui/AsOf";
import { MoreDetails } from "@/components/ui/MoreDetails";
import AffiliateStrip from "@/components/AffiliateStrip";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import { rankNews, trendingKeywords, IMPACT_WORDS, type NewsRank } from "@/lib/newsRank";

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
  // 중요도·상태·뜨는 키워드 — 규칙 기반 (lib/newsRank.ts). 전 분류 기사를 링크로 중복 제거해 한 번에 계산
  const allItems = [...new Map(data.flatMap((d) => d.file?.items ?? []).map((it) => [it.link, it])).values()];
  const ranks = rankNews(allItems);
  const trending = trendingKeywords(allItems, Date.now());
  const renderItem = (it: NewsItem) => {
    const badge = sentimentBadge(it.sentiment);
    const rk: NewsRank | undefined = ranks.get(it.link);
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
              {rk?.status && (
                <span className="ds-pill ds-pill-flat mr-1.5 align-[2px]" style={{ padding: "1px 7px", fontSize: 11 }}>
                  {rk.status}
                </span>
              )}
              {badge && (
                <span className={`ds-pill ${badge.cls} mr-1.5 align-[2px]`} style={{ padding: "1px 7px", fontSize: 11 }}>
                  {badge.label}
                </span>
              )}
              {it.title}
            </div>
            {it.desc && <div className="font-sys text-[13px] text-text-muted leading-snug line-clamp-2 mt-0.5">{it.desc}</div>}
            <div className="ds-meta mt-0.5">
              {rk && (
                <span className="text-accent-amber mr-1" title={rk.reasons.join(" · ") || "기본"} aria-label={`중요도 ${rk.stars}`}>
                  {"★".repeat(rk.stars)}
                  <span className="text-text-dim">{"☆".repeat(3 - rk.stars)}</span>
                </span>
              )}
              {it.source} · {relativeTime(it.ts)}
              {rk && rk.coverage >= 2 && <> · {rk.coverage}개 매체</>}
            </div>
          </div>
        </a>
      </li>
    );
  };

  return (
    <>
      <Header fxRate={prices.fx.krw_per_usdt} fxChange={prices.fx.change_24h_pct} />
      <main className="max-w-3xl mx-auto px-4 sm:px-5 pt-4 pb-12">
        <PageTitle eyebrow="국제정세 · 삼성전자 · SK하이닉스 · 현대차" title="뉴스룸" backHref="/">
          {latestUpdate ? (
            <AsOf at={latestUpdate} note="1시간마다 갱신 · 한경·머투·연합 키워드 필터" />
          ) : (
            <div className="ds-meta">한경 / 머투 / 연합뉴스에서 키워드 필터링 (1시간마다 갱신)</div>
          )}
        </PageTitle>

        {/* 지금 뜨는 키워드 + 중요도·상태 범례 (규칙 기반, lib/newsRank.ts) */}
        <section className="ds-card mt-4" aria-labelledby="trend-h">
          <h2 id="trend-h" className="ds-h2 flex items-center justify-between gap-2">
            <span>지금 뜨는 키워드</span>
            <span className="ds-meta font-normal">최근 {trending.hours}시간 기사 {trending.articles}건</span>
          </h2>
          {trending.words.length === 0 ? (
            <p className="ds-explain py-2">2건 이상 겹친 낱말이 아직 없어요.</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-2">
              {trending.words.map((w) => (
                <span key={w.word} className="ds-pill ds-pill-flat">
                  {w.word} <span className="num text-text-dim">{w.count}</span>
                </span>
              ))}
            </div>
          )}
          <MoreDetails summary="중요도 ★와 상태 표시는 어떻게 정하나요?" className="!mt-3">
            <>
              모두 정해진 규칙으로만 계산해요. 사람이 고르거나 지어낸 값은 없어요.
              <br />
              <b className="text-text">중요도</b>: 기본 ★1 · 다른 매체 2곳 이상이 12시간 안에 같은 소식을 보도하면(제목 핵심 낱말 3개 이상 겹침) +1 ·
              제목에 [속보] 또는 {IMPACT_WORDS.slice(0, 8).join("·")} 등 시장 충격 낱말이 있으면 +1 (최대 ★3)
              <br />
              <b className="text-text">상태</b>: 제목에 [속보] → 속보 · (종합) → 종합 · 전자공시 → 공시
              <br />
              <b className="text-text">키워드</b>: 최근 6시간(기사가 8건 미만이면 24시간) 제목에서 2건 이상 나온 낱말, 많이 나온 순
            </>
          </MoreDetails>
        </section>

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
