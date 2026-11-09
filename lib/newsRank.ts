// 뉴스 중요도·상태·지금 뜨는 키워드 (2026-11-09) — 전부 규칙 기반. 사람이 판단하거나 지어낸 값 없음.
// 입력: data/news/*.json (scripts/aggregate-news.mjs 가 1시간마다 수집한 제목·출처·시각). 수집 파이프라인은 바꾸지 않음.
//
// 중요도 ★ (1~3):
//   기본 ★1
//   +1  다른 매체 2곳 이상이 같은 소식을 보도 (12시간 안, 제목 핵심 낱말 3개 이상 겹침 = 같은 소식으로 봄)
//   +1  제목에 [속보] 또는 시장 충격 낱말(IMPACT_WORDS)
// 상태: 제목 [속보] → 속보 · 제목 (종합…) → 종합 · 출처 전자공시(DART) → 공시 · 그 외 표시 없음
// 지금 뜨는 키워드: 최근 6시간(기사가 8건 미만이면 24시간) 제목에서 2건 이상 나온 낱말(서술어 제외), 많이 나온 순 8개

export type RankInput = { title: string; link: string; source: string; ts: number };
export type NewsStatus = "속보" | "종합" | "공시" | null;
export type NewsRank = { stars: 1 | 2 | 3; status: NewsStatus; coverage: number; reasons: string[] };

export const IMPACT_WORDS = [
  "급락", "급등", "폭락", "폭등", "사상 최대", "사상 최고", "사상 최저", "서킷브레이커", "사이드카",
  "금리 인상", "금리 인하", "영업이익", "잠정실적", "자사주", "유상증자", "합병", "공습", "침공",
];

const STOP = new Set([
  "속보", "종합", "단독", "기자", "뉴스", "오늘", "내일", "어제", "지난", "이번", "관련", "위해", "대한", "통해", "따라",
  "있다", "없다", "한다", "했다", "된다", "이후", "가운데", "전망", "가능성", "예상", "우려", "때문", "만에", "넘어",
  "올해", "내년", "작년", "이상", "이하", "최근", "현재", "등", "것", "수", "더", "또", "중",
  "너무", "매우", "다시", "또다시", "가장", "모두", "함께", "계속", "이미", "아직",
]);
const PARTICLE_2 = ["에서", "으로", "까지", "부터", "에게", "보다"];
const PARTICLE_1 = "은는이가을를의에도와과로";

/** 제목 → 핵심 낱말 (간단 규칙: 괄호 태그 제거, 2글자 이상, 흔한 조사 1개 제거, 불용어·숫자 제외) */
export function titleTokens(title: string): string[] {
  const clean = title
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\((종합|\d+보|속보|단독)[^)]*\)/g, " ")
    .replace(/[“”"'‘’…·,.!?:;()<>《》「」『』\-–—/|~]/g, " ");
  const out: string[] = [];
  for (let w of clean.split(/\s+/)) {
    if (!w) continue;
    for (const p of PARTICLE_2) if (w.length > p.length + 1 && w.endsWith(p)) { w = w.slice(0, -p.length); break; }
    if (w.length >= 3 && PARTICLE_1.includes(w[w.length - 1])) w = w.slice(0, -1);
    if (w.length < 2) continue;
    if (/^[\d.%+\-∼~]+$/.test(w)) continue;
    if (/^\d/.test(w)) continue; // "3∼5%대" 같은 숫자 표현
    if (STOP.has(w)) continue;
    out.push(w);
  }
  return [...new Set(out)];
}

const SAME_STORY_MIN_SHARED = 3;
const SAME_STORY_WINDOW_MS = 12 * 3600 * 1000;

export function statusOf(it: RankInput): NewsStatus {
  if (it.title.includes("[속보]")) return "속보";
  if (/\(종합/.test(it.title)) return "종합";
  if (it.source.includes("공시")) return "공시";
  return null;
}

export function rankNews(items: RankInput[]): Map<string, NewsRank> {
  const toks = items.map((it) => new Set(titleTokens(it.title)));
  const out = new Map<string, NewsRank>();
  items.forEach((it, i) => {
    const sources = new Set([it.source]);
    items.forEach((o, j) => {
      if (i === j || o.source === it.source) return;
      if (Math.abs(o.ts - it.ts) > SAME_STORY_WINDOW_MS) return;
      let shared = 0;
      for (const t of toks[i]) if (toks[j].has(t)) shared++;
      if (shared >= SAME_STORY_MIN_SHARED) sources.add(o.source);
    });
    const reasons: string[] = [];
    let stars = 1;
    if (sources.size >= 2) {
      stars++;
      reasons.push(`${sources.size}개 매체 보도`);
    }
    const impact = it.title.includes("[속보]") ? "[속보]" : IMPACT_WORDS.find((w) => it.title.includes(w));
    if (impact) {
      stars++;
      reasons.push(`제목에 '${impact}'`);
    }
    out.set(it.link, { stars: Math.min(3, stars) as 1 | 2 | 3, status: statusOf(it), coverage: sources.size, reasons });
  });
  return out;
}

export type TrendingResult = { hours: number; articles: number; words: { word: string; count: number }[] };

export function trendingKeywords(items: RankInput[], nowMs: number, topN = 8): TrendingResult {
  let hours = 6;
  let recent = items.filter((it) => nowMs - it.ts <= hours * 3600 * 1000);
  if (recent.length < 8) {
    hours = 24;
    recent = items.filter((it) => nowMs - it.ts <= hours * 3600 * 1000);
  }
  const cnt = new Map<string, number>();
  // 키워드엔 서술어(…다로 끝나는 말) 제외 — 같은 소식 판정(rankNews)에는 그대로 사용
  for (const it of recent) for (const t of titleTokens(it.title)) if (!t.endsWith("다")) cnt.set(t, (cnt.get(t) ?? 0) + 1);
  const words = [...cnt.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
  return { hours, articles: recent.length, words };
}
