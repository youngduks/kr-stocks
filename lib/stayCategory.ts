// /pick "📚 숙소 리스트" 카테고리 — data/stays.json 의 region(지역)·type(숙소 유형) 글자로 자동 분류.
// 새 숙소가 추가돼도 손으로 분류하지 않게 키워드 규칙만 둔다. 어디에도 안 걸리면 "기타".
//
// 지역(숙소마다 정확히 하나):
//  1) region 첫 낱말이 키워드와 똑같으면 그 지역(예: "후쿠오카(하카타역)" → 후쿠오카 → 일본, "고성" → 강원)
//  2) 아니면 낱말 중 키워드로 시작하는 것(예: "하카타역" → 하카타) — 해외 → 부산 → 제주 → 강원 → 수도권 → 충청·전라·경상 순서
//  ※ "고성"은 강원 고성으로 보되 region 에 "경남"이 있으면 경남 고성.
// 테마(여러 개 가능): type 글자에 키워드가 들어 있으면 붙임.

export const REGION_CATEGORIES = [
  "서울·경기·인천",
  "강원",
  "충청·전라·경상",
  "부산",
  "제주",
  "일본",
  "괌·하와이·동남아",
  "기타",
] as const;
export type RegionCategory = (typeof REGION_CATEGORIES)[number];

export const THEME_TAGS = ["🏊 수영장·워터파크", "♨️ 온천", "🎄 크리스마스"] as const;
export type ThemeTag = (typeof THEME_TAGS)[number];

const REGION_KEYWORDS: Record<Exclude<RegionCategory, "기타">, string[]> = {
  일본: [
    "일본", "후쿠오카", "하카타", "후쓰카이치", "시카노시마", "오이타", "벳푸", "유후인", "사가", "우레시노", "나가사키",
    "사세보", "하우스텐보스", "구마모토", "가고시마", "오사카", "USJ", "교토", "고베", "도쿄", "지바", "요코하마",
    "하코네", "마쓰야마", "에히메", "삿포로", "홋카이도", "오키나와", "나고야",
  ],
  "괌·하와이·동남아": [
    "괌", "사이판", "하와이", "호놀룰루", "와이키키", "필리핀", "세부", "보라카이", "베트남", "푸꾸옥", "다낭", "나트랑",
    "냐짱", "태국", "방콕", "푸껫", "푸켓", "발리", "인도네시아", "말레이시아", "코타키나발루", "싱가포르",
  ],
  부산: ["부산", "해운대", "기장"],
  제주: ["제주", "서귀포"],
  강원: [
    "강원", "속초", "양양", "평창", "홍천", "원주", "춘천", "고성", "삼척", "강릉", "정선", "동해", "태백", "횡성",
    "인제", "철원",
  ],
  "서울·경기·인천": [
    "서울", "경기", "인천", "영종도", "가평", "화성", "수원", "용인", "파주", "양평", "포천", "강화",
  ],
  "충청·전라·경상": [
    "충남", "충북", "전북", "전남", "경북", "경남", "충청", "전라", "경상", "대전", "대구", "광주", "울산", "세종",
    "부여", "예산", "덕산", "제천", "단양", "태안", "보령", "공주", "울진", "부안", "변산", "전주", "군산", "여수",
    "순천", "경주", "포항", "안동", "남해", "거제", "통영",
  ],
};

/** 낱말 시작 매칭 순서 — 해외 먼저(한국 지명 낱말과 겹칠 일이 적은 긴 지명), 수도권·충청 등 넓은 지역은 뒤 */
const PREFIX_ORDER: Exclude<RegionCategory, "기타">[] = [
  "일본",
  "괌·하와이·동남아",
  "부산",
  "제주",
  "강원",
  "서울·경기·인천",
  "충청·전라·경상",
];

const tokensOf = (s: string) => s.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

export function regionCategory(region: string): RegionCategory {
  const tokens = tokensOf(region || "");
  if (!tokens.length) return "기타";
  if (tokens.includes("고성") && tokens.includes("경남")) return "충청·전라·경상";
  const first = tokens[0];
  for (const cat of PREFIX_ORDER) if (REGION_KEYWORDS[cat].includes(first)) return cat;
  for (const cat of PREFIX_ORDER)
    if (tokens.some((t) => REGION_KEYWORDS[cat].some((k) => t.startsWith(k)))) return cat;
  return "기타";
}

const THEME_KEYWORDS: Record<ThemeTag, string[]> = {
  "🏊 수영장·워터파크": ["수영장", "풀", "워터파크", "물놀이"],
  "♨️ 온천": ["온천", "노천", "료칸", "대욕장", "스파"],
  "🎄 크리스마스": ["크리스마스", "산타"],
};

export function themeTags(type: string): ThemeTag[] {
  const t = type || "";
  return THEME_TAGS.filter((tag) => THEME_KEYWORDS[tag].some((k) => t.includes(k)));
}
