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

/** 수기 입력 데이터라 필드 누락·오타에 관대하게 — no·name 없는 행만 버림. 썸네일·링크는 https 만. */
function normalize(row: any): Stay | null {
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
      const stays: Stay[] = [];
      for (const row of data) {
        const s = normalize(row);
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
