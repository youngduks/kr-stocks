#!/usr/bin/env node
// Aggregate Korean economic news RSS → filter by category → write data/news/*.json
// Categories: intl (국제정세), samsung, hynix, hyundai
// Native fetch + 단순 정규식 파싱 (dependency 0)

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data", "news");

const SOURCES = [
  { id: "hankyung", name: "한국경제", url: "https://www.hankyung.com/feed/all-news" },
  { id: "mt", name: "머니투데이", url: "https://rss.mt.co.kr/mt_news.xml" },
  { id: "yonhap_econ", name: "연합뉴스 경제", url: "https://www.yna.co.kr/rss/economy.xml" },
  { id: "yonhap_intl", name: "연합뉴스 국제", url: "https://www.yna.co.kr/rss/international.xml" },
];

const FILTERS = {
  intl: [
    // 전쟁 (한정적 phrase)
    "우크라","우크라이나","이스라엘","가자지구","하마스",
    "러시아 침공","푸틴","젤렌스키","ICBM","핵무기",
    // 미국 통화·매크로
    "Fed","FOMC","연준","파월","CPI","PCE","고용지표","비농업",
    // 정치 (외교)
    "트럼프","바이든","해리스","백악관","국무부",
    // 무역·관세
    "관세","tariff","무역전쟁",
    // 미중·대만
    "미중","중국 수출","중국 제재","대만 해협","대만 침공","반도체 수출통제",
    // 원자재 (한정 phrase — "고유가 지원금" 같은 noise 제거)
    "WTI 유가","Brent","원유 가격","달러 인덱스","DXY",
    // 영문 macro
    "Trump","Biden","Powell","Putin","Zelensky",
  ],
  samsung: [
    "삼성전자","Samsung Electronics","삼전",
    "HBM","HBM3","HBM4","HBM3E",
    "메모리","DDR5","낸드","NAND",
    "파운드리","갤럭시","Galaxy",
    "이재용","엑시노스",
  ],
  hynix: [
    // 종목 직격
    "SK하이닉스","SK Hynix","하이닉스",
    "DRAM","D램","HBM","HBM3","HBM4","HBM3E","HBM3e",
    "곽노정",
    // 경쟁사 (hynix와 같은 산업)
    "마이크론","Micron","CXMT",
    // 한국 반도체 산업 macro (form님 hynix 관심 = 메모리 산업 전반)
    "메모리","반도체","낸드","NAND",
    "엔비디아","Nvidia","TSMC","AI 반도체",
  ],
  hyundai: [
    // 종목 직격 (CORE) — 5/25 형님 지적: 단독 매칭만 hyundai 분류 (테슬라/BYD 등 단독 false positive 제거)
    "현대자동차","현대차","Hyundai Motor",
    "기아차","기아자동차","Kia Motors",
    "현대모비스","모비스",
    // 인물 (회장/사장단)
    "정의선","장재훈","송호성",
    // 차종 (현대·기아·제네시스 — 다른 회사와 안 겹침)
    "아이오닉","Ioniq","제네시스","Genesis",
    "그랜저","팰리세이드","쏘나타","아반떼","캐스퍼","코나","투싼","스타리아","싼타페",
    "EV6","EV9","니로","K5","K8",
    // 현대차그룹 로봇 (specific 키워드만 — 휴머노이드/로보틱스 단독 제거)
    "보스턴다이나믹스","Boston Dynamics","Optimus","옵티머스","Figure AI",
    // ❌ 제거: 테슬라/Tesla/BYD/비야디/폭스바겐/Volkswagen/도요타/Toyota/리비안/Rivian
    //   → 단독 매칭 시 false positive (예: "안창호함 = 테슬라 같다" → hyundai 잘못 분류, 5/25)
    // ❌ 제거: K배터리/자동차 수출/완성차/자율주행/휴머노이드/로보틱스/두산로보틱스 등
    //   → 너무 광범위, 다른 회사 기사 다수 흡수
  ],
};

// Negative filter — 모든 카테고리에 적용. 매칭 시 article drop.
// 사회복지/연예/스포츠/부동산/사회면 noise 제거.
const NEGATIVE_KEYWORDS = [
  // 사회복지 / 정부 지원 ("아이" 단독은 "피아이이로보틱스" 같은 회사명도 잡아서 phrase로 좁힘)
  "복지","지원금","아동","어린이","아이들","육아","주거 권리","건강보험","교육비","급식",
  "최대 25만원","최대 50만원","최대 100만원","바우처","상품권",
  // 연예/스포츠 / 문화
  "감독","배우","가수","연예","아이돌","드라마","영화",
  "축구","야구","올림픽","월드컵","KBO","MLB","아시안컵",
  "가요제","유로비전","음악제","콘서트","페스티벌","공연","뮤지컬",
  "박찬욱","칸 영화제","오스카","그래미",
  // 부동산
  "아파트 분양","전세","월세","청약","압구정","재건축","재개발",
  // 현대그룹 (자동차 외 계열사 — hyundai 종목과 무관)
  "현대건설","현대해상","HD현대","현대백화점","현대카드","현대중공업","현대오일뱅크",
  // 로봇 카테고리 noise (가전/의료 — hyundai 신사업과 무관)
  "로봇 청소기","수술 로봇","교육 로봇","조리 로봇","배달 로봇",
  // 사회면 / 사건사고
  "범죄","교통사고","화재","숨진","실종","구조","사망",
  "격투기","선수","감독상",
  // 한국 지자체 / 행정 (국제정세 아님)
  "부산시","서울시","대구시","인천시","광주시","대전시","울산시",
  "경기도","강원도","충남","충북","전남","전북","경남","경북",
  "지자체","민관합동","구청","시청","도청","동사무소","주민센터",
  // 매체 자체 광고 / 인사
  "수습 기자","기자 도전","인턴 모집","채용","공모전","입사 지원",
  // 군사 / 방산 (5/25 추가) — 현대차/삼성/하이닉스와 무관, false positive 방지
  "안창호함","잠수함","해군","구축함","함정","전함","호위함",
  "방산","무기수출","KF-21","K9 자주포","KAI","한국항공우주","현무미사일","천궁",
  "공군","육군","합참","국방부","무인기",
];

const MAX_PER_CATEGORY = 50;

// ─────────────────────────────────────────────────────────────
// 단순 RSS 파싱 — native (DOMParser/regex)
// ─────────────────────────────────────────────────────────────

function decodeEntities(s) {
  return (s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    // Named entities — 한국어 RSS 자주 등장
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&middot;/g, "·")
    .replace(/&hellip;/g, "…")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rsquo;/g, "’")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    // Numeric entities (5/26: &#039; 같은 zero-padded 형태도 다 처리, generic)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    // Strip remaining HTML tags
    .replace(/<[^>]+>/g, "")
    .trim();
}

function extractItems(xml) {
  const items = [];
  const itemRegex = /<item\b[\s\S]*?<\/item>/gi;
  const matches = xml.match(itemRegex) || [];
  for (const block of matches) {
    const title = decodeEntities((block.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "");
    const link  = decodeEntities((block.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || "");
    const desc  = decodeEntities((block.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || "");
    const pub   = decodeEntities((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || "");
    if (!title || !link) continue;
    items.push({ title, link, desc, pub });
  }
  return items;
}

async function fetchSource(src) {
  try {
    const res = await fetch(src.url, {
      headers: { "User-Agent": "kr-stocks-news-bot/1.0 (https://kr-stocks.com)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn(`[${src.id}] HTTP ${res.status} ${res.statusText}`);
      return [];
    }
    const xml = await res.text();
    const items = extractItems(xml);
    console.log(`[${src.id}] fetched ${items.length} items`);
    return items.map((it) => ({ ...it, source_id: src.id, source_name: src.name }));
  } catch (err) {
    console.warn(`[${src.id}] fetch failed: ${err.message}`);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// Categorize
// ─────────────────────────────────────────────────────────────

function categorize(article) {
  // NEGATIVE + POSITIVE 둘 다 title only — 대칭 처리
  // (description 매칭 시 hynix·samsung 종목 기사가 무관 단어로 drop되는 false negative 발생)
  const title = article.title.toLowerCase();
  // (1) Negative filter — title에 사회복지/연예/지자체/부동산 단어 있으면 즉시 drop
  if (NEGATIVE_KEYWORDS.some((k) => title.includes(k.toLowerCase()))) {
    return [];
  }
  // (2) Positive filter — title 매칭
  const cats = [];
  for (const [cat, kws] of Object.entries(FILTERS)) {
    if (kws.some((k) => title.includes(k.toLowerCase()))) cats.push(cat);
  }
  return cats;
}

function parseTime(pub) {
  const t = Date.parse(pub);
  return Number.isFinite(t) ? t : Date.now();
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  const all = (await Promise.all(SOURCES.map(fetchSource))).flat();
  console.log(`Total raw items: ${all.length}`);

  // Dedup by link
  const byLink = new Map();
  for (const a of all) if (!byLink.has(a.link)) byLink.set(a.link, a);
  const deduped = [...byLink.values()];
  console.log(`After dedup: ${deduped.length}`);

  // Categorize
  const buckets = { intl: [], samsung: [], hynix: [], hyundai: [] };
  for (const a of deduped) {
    const cats = categorize(a);
    if (cats.length === 0) continue;
    const entry = {
      title: a.title,
      link: a.link,
      source: a.source_name,
      ts: parseTime(a.pub),
      pub: a.pub,
    };
    for (const c of cats) buckets[c].push(entry);
  }

  // Sort + truncate
  const summary = {};
  for (const [cat, list] of Object.entries(buckets)) {
    list.sort((a, b) => b.ts - a.ts);
    const top = list.slice(0, MAX_PER_CATEGORY);
    const file = join(DATA_DIR, `${cat}.json`);
    await writeFile(
      file,
      JSON.stringify(
        {
          category: cat,
          updated_at: new Date().toISOString(),
          count: top.length,
          items: top,
        },
        null,
        2,
      ),
    );
    summary[cat] = top.length;
    console.log(`[${cat}] wrote ${top.length} items → ${file}`);
  }

  // Index
  await writeFile(
    join(DATA_DIR, "index.json"),
    JSON.stringify(
      {
        updated_at: new Date().toISOString(),
        sources: SOURCES.map((s) => ({ id: s.id, name: s.name })),
        categories: summary,
      },
      null,
      2,
    ),
  );
  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
