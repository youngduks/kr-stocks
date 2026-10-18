// 줍줍파파 숙소 PICK(/pick) 데이터 — data/stays.json.
//
// ⚠️ 빌드타임 import 금지 — lib/historyStats.ts·lib/humanIndicators.ts 와 같은 이유로 GitHub raw 를
// 런타임에 fetch. 숙소 추가 커밋을 'chore(data): auto-update ...' 로 하면 vercel.json ignoreCommand 로
// 재빌드 없이 다음 revalidate(5분) 뒤 반영됨.
//
// 프리뷰 배포(브랜치)에선 그 브랜치의 파일을 먼저 읽고, 없으면 main 으로 폴백.
// STAYS_JSON_URL: 로컬 검증용 오버라이드(미설정 시 GitHub raw).

const REPO_RAW = "https://raw.githubusercontent.com/youngduks/kr-stocks";
const FILE = "data/stays.json";
export const STAYS_REVALIDATE = 300;

export type StayLink = { platform: string; url: string };

/** 링크 버튼 아래 같은 날짜 가격 비교 줄(서버에서 문구까지 만들어 넘김) */
export type StayPriceCheckView = {
  /** "10/24(토) 1박·성인2 기준 쿠팡 18.2만원 · 트립닷컴 19.5만원 (10/19 확인)" */
  line: string;
  /** 이 날짜 더 싼 플랫폼 — 두 곳 모두 세금 포함 금액으로 읽혔을 때만 */
  cheaper?: string;
};

export type Stay = {
  no: number;
  name: string;
  region: string;
  type: string;
  hook_title: string;
  summary: string;
  thumb: string;
  links: StayLink[];
  added: string;
  priceCheck?: StayPriceCheckView;
};

function rawUrls(): string[] {
  if (process.env.STAYS_JSON_URL) return [process.env.STAYS_JSON_URL];
  const ref = process.env.VERCEL_GIT_COMMIT_REF;
  const urls: string[] = [];
  if (process.env.VERCEL_ENV === "preview" && ref && ref !== "main") {
    urls.push(`${REPO_RAW}/refs/heads/${ref}/${FILE}`);
  }
  urls.push(`${REPO_RAW}/main/${FILE}`);
  return urls;
}

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

/** "10/24(토)" */
function md(date: string, withWeekday = true): string {
  const [, m, d] = date.split("-").map(Number);
  const wd = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return withWeekday ? `${m}/${d}(${wd})` : `${m}/${d}`;
}

/** 18.2만원 — 천원 자리 반올림 */
const man1 = (krw: number) => `${(Math.round(krw / 1000) / 10).toLocaleString("ko-KR")}만원`;

/**
 * data/stays.json price_check(~/.claude-bot/ops/price_compare.py, 주 1회) → 비교 줄.
 * 체크인 날짜가 지났으면 표시 안 함. 읽은 금액만 그대로 — "최저가" 같은 단정 없이 기준 날짜·확인 날짜·금액만.
 */
function priceCheckView(pc: any, today: string): StayPriceCheckView | undefined {
  if (!pc || !isDate(pc.date) || !isDate(pc.checked) || pc.date < today) return undefined;
  // flag("이상값" 등)가 붙은 기록은 가격 줄·배지 모두 표시하지 않음(수집기 규칙: 300만원 초과 또는 두 곳 비율 1.8 초과)
  if (pc.flag) return undefined;
  const prices = pc.prices && typeof pc.prices === "object" ? pc.prices : {};
  const parts: string[] = [];
  const packages: string[] = [];
  for (const [platform, p] of Object.entries<any>(prices)) {
    const name = str(platform, 20);
    if (!name || !p) continue;
    if (p.kind === "package") packages.push(`${name}: 패키지 상품`);
    else if (typeof p.krw === "number" && Number.isFinite(p.krw) && p.krw > 0)
      parts.push(`${name} ${man1(p.krw)}${p.tax === "포함" ? "" : p.tax === "별도" ? "(세금 별도)" : "(세금 포함 여부 불명)"}`);
  }
  if (!parts.length && !packages.length) return undefined;
  const nights = Number(pc.nights) || 1;
  const adults = Number(pc.adults) || 2;
  const segs: string[] = [];
  if (parts.length) segs.push(`${md(pc.date)} ${nights}박·성인${adults} 기준 ${parts.join(" · ")} (${md(pc.checked, false)} 확인)`);
  segs.push(...packages);
  const cheaper = parts.length >= 2 && typeof pc.cheaper === "string" && pc.cheaper in prices ? pc.cheaper : undefined;
  return { line: segs.join(" · "), cheaper };
}

/** 수기 입력 데이터라 필드 누락·오타에 관대하게 — no·name 없는 행만 버림. 썸네일·링크는 https 만. */
function normalize(row: any, today: string): Stay | null {
  const no = Number(row?.no);
  const name = str(row?.name, 80);
  if (!Number.isInteger(no) || no <= 0 || !name) return null;
  const thumb = str(row?.thumb, 1000);
  const links: StayLink[] = Array.isArray(row?.links)
    ? row.links
        .map((l: any) => ({ platform: str(l?.platform, 20), url: str(l?.url, 2000) }))
        .filter((l: StayLink) => l.url.startsWith("https://"))
    : [];
  return {
    no,
    name,
    region: str(row?.region, 40),
    type: str(row?.type, 20),
    hook_title: str(row?.hook_title, 120),
    summary: str(row?.summary, 200),
    thumb: thumb.startsWith("https://") ? thumb : "",
    links,
    added: str(row?.added, 20),
    priceCheck: priceCheckView(row?.price_check, today),
  };
}

/** 번호 내림차순(최신 먼저). 같은 번호가 두 번 있으면 앞의 것만. */
export async function getStays(): Promise<Stay[]> {
  for (const url of rawUrls()) {
    try {
      const res = await fetch(url, { next: { revalidate: STAYS_REVALIDATE } });
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data)) continue;
      const seen = new Set<number>();
      const today = kstToday();
      const stays: Stay[] = [];
      for (const row of data) {
        const s = normalize(row, today);
        if (s && !seen.has(s.no)) {
          seen.add(s.no);
          stays.push(s);
        }
      }
      return stays.sort((a, b) => b.no - a.no);
    } catch {
      /* 다음 후보 */
    }
  }
  return [];
}

/** 아웃바운드 링크 — /shopping/go 경유(화이트리스트 + 채널·pick별 클릭 집계). */
export function stayGoHref(no: number, url: string): string {
  return `/shopping/go?url=${encodeURIComponent(url)}&source=instagram&pick=${no}`;
}
