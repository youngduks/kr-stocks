import { promises as fs } from "node:fs";
import path from "node:path";
import Link from "next/link";

export const revalidate = 1800; // 30분 ISR

type NewsItem = {
  title: string;
  link: string;
  source: string;
  ts: number;
  pub: string;
  sentiment?: "positive" | "negative" | "neutral"; // 5/26 추가
};

function sentimentBadge(s?: NewsItem["sentiment"]) {
  if (s === "positive") {
    return {
      label: "호재",
      bg: "rgba(34,197,94,0.12)",
      color: "#22c55e",
      border: "rgba(34,197,94,0.35)",
    };
  }
  if (s === "negative") {
    return {
      label: "악재",
      bg: "rgba(59,130,246,0.12)",
      color: "#3b82f6",
      border: "rgba(59,130,246,0.35)",
    };
  }
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

async function loadCategory(cat: string): Promise<CategoryFile | null> {
  try {
    const file = path.join(process.cwd(), "data", "news", `${cat}.json`);
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as CategoryFile;
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
  const data = await Promise.all(CATEGORIES.map(async (c) => ({ meta: c, file: await loadCategory(c.id) })));

  const latestUpdate = data
    .map((d) => d.file?.updated_at)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem 1rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>뉴스룸</h1>
        <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>
          국제정세 · 삼성전자 · SK하이닉스 · 현대차 — 한경 / 머투 / 연합뉴스에서 키워드 필터링 (30분마다 갱신)
          {latestUpdate && (
            <>
              {" · 마지막 업데이트 "}
              {new Date(latestUpdate).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
            </>
          )}
        </p>
      </header>

      <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        {data.map(({ meta, file }) => (
          <section
            key={meta.id}
            style={{
              border: "1px solid rgba(127,127,127,0.25)",
              borderRadius: 10,
              padding: "1rem",
              background: "rgba(127,127,127,0.04)",
            }}
          >
            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", display: "flex", justifyContent: "space-between" }}>
              <span>
                {meta.emoji} {meta.label}
              </span>
              <span style={{ fontSize: "0.75rem", opacity: 0.6, fontWeight: 400 }}>{file?.count ?? 0}건</span>
            </h2>
            {!file || file.items.length === 0 ? (
              <p style={{ fontSize: "0.85rem", opacity: 0.5 }}>아직 수집된 기사가 없습니다.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {file.items.slice(0, 15).map((it) => {
                  const badge = sentimentBadge(it.sentiment);
                  return (
                    <li key={it.link}>
                      <a
                        href={it.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: "none", color: "inherit", display: "block" }}
                      >
                        <div style={{ fontSize: "0.9rem", lineHeight: 1.35, marginBottom: "0.2rem", display: "flex", alignItems: "flex-start", gap: "0.4rem", flexWrap: "wrap" }}>
                          {badge && (
                            <span style={{
                              flex: "0 0 auto",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              padding: "0.1rem 0.35rem",
                              borderRadius: 4,
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              lineHeight: 1.4,
                              marginTop: "0.1rem",
                            }}>
                              {badge.label}
                            </span>
                          )}
                          <span style={{ flex: "1 1 auto" }}>{it.title}</span>
                        </div>
                        <div style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                          {it.source} · {relativeTime(it.ts)}
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>

      <footer style={{ marginTop: "2rem", fontSize: "0.75rem", opacity: 0.5, lineHeight: 1.5 }}>
        <p>
          뉴스 출처: <Link href="https://www.hankyung.com">한국경제</Link>, <Link href="https://news.mt.co.kr">머니투데이</Link>,{" "}
          <Link href="https://www.yna.co.kr">연합뉴스</Link>. 본 페이지는 각 매체 RSS 피드를 키워드로 필터링한 헤드라인 모음이며,
          제목 클릭 시 원문 매체 페이지로 이동합니다.
        </p>
      </footer>
    </main>
  );
}
