// 줍줍파파 숙소 PICK(/pick) 카드의 쿠팡 가격 줄 — data/stay_prices.json.
// ~/.claude-bot/ops/build_stay_prices.py 가 쿠팡트래블 60일 조회 기록(하루 한 숙소 순환)을 요약해 생성.
//
// GitHub raw 런타임 fetch 우선(데이터 커밋은 'chore(data): auto-update stay prices' → vercel.json ignoreCommand 로
// 재빌드 없이 다음 revalidate 뒤 반영) + 빌드 시점 스냅샷 폴백(raw 가 막히거나 파일이 아직 main 에 없을 때).
// 스냅샷은 옛 값일 수 있어서 '이번 주'·stale 판정은 렌더 시점(KST 오늘) 기준으로 다시 계산한다.
//
// 표기 원칙: 원자료 숫자만, "쿠팡 기준·조회일" 명시, "최저가 보장" 같은 단정 금지.
// STAY_PRICES_JSON_URL: 로컬 검증용 오버라이드(미설정 시 GitHub raw).
import snapshot from "../data/stay_prices.json";

const REPO_RAW = "https://raw.githubusercontent.com/youngduks/kr-stocks";
const FILE = "data/stay_prices.json";
export const STAY_PRICES_REVALIDATE = 3600;
const STALE_DAYS = 8;
const WEEK_DAYS = 7;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

type Lowest = { date: string; price_krw: number; same_price_days?: number };
type RawStayPrice = {
  collected_on: string;
  stale?: boolean;
  range_days?: number;
  range_lowest?: Lowest | null;
  days?: [string, number][];
};

/** 카드에 그대로 찍는 문구(서버에서 계산해 클라이언트 컴포넌트엔 문자열만 넘김) */
export type StayPriceView = {
  stale: boolean;
  /** "이번 주 가장 싼 날 10/14(화) 23만원대~" — 7일 안 확정 가격이 없으면 없음 */
  week?: string;
  /** 미니 카드용 "이번 주 23만원대~" */
  weekShort?: string;
  /** "60일 최저 11/23(월) 외 2일 31.8만원" */
  low?: string;
  /** "쿠팡 10/9 조회" */
  checked: string;
};

function rawUrls(): string[] {
  if (process.env.STAY_PRICES_JSON_URL) return [process.env.STAY_PRICES_JSON_URL];
  const ref = process.env.VERCEL_GIT_COMMIT_REF;
  const urls: string[] = [];
  if (process.env.VERCEL_ENV === "preview" && ref && ref !== "main") {
    urls.push(`${REPO_RAW}/refs/heads/${ref}/${FILE}`);
  }
  urls.push(`${REPO_RAW}/main/${FILE}`);
  return urls;
}

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isPrice = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400_000);
}

/** "10/14(화)" */
function md(date: string, withWeekday = true): string {
  const [, m, d] = date.split("-").map(Number);
  const wd = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return withWeekday ? `${m}/${d}(${wd})` : `${m}/${d}`;
}

/** 23만원대 — 만원 단위 내림 */
const manDae = (krw: number) => `${Math.floor(krw / 10000).toLocaleString("ko-KR")}만원대`;
/** 31.8만원 — 천원 자리 반올림(실제보다 싸 보이게 내리지 않음) */
const man1 = (krw: number) => `${(Math.round(krw / 1000) / 10).toLocaleString("ko-KR")}만원`;

function toView(p: RawStayPrice, today: string): StayPriceView | null {
  if (!isDate(p?.collected_on)) return null;
  const checked = `쿠팡 ${md(p.collected_on, false)} 조회`;
  const stale = Boolean(p.stale) || daysBetween(p.collected_on, today) > STALE_DAYS;
  if (stale) return { stale, checked };

  const days = (Array.isArray(p.days) ? p.days : []).filter(
    (d): d is [string, number] => Array.isArray(d) && isDate(d[0]) && isPrice(d[1]),
  );
  const end = addDays(today, WEEK_DAYS - 1);
  let week: [string, number] | null = null;
  for (const d of days) {
    if (d[0] < today || d[0] > end) continue;
    if (!week || d[1] < week[1] || (d[1] === week[1] && d[0] < week[0])) week = d;
  }

  const view: StayPriceView = { stale, checked };
  if (week) {
    view.week = `이번 주 가장 싼 날 ${md(week[0])} ${manDae(week[1])}~`;
    view.weekShort = `이번 주 ${manDae(week[1])}~`;
  }
  const lo = p.range_lowest;
  if (lo && isDate(lo.date) && isPrice(lo.price_krw)) {
    const more = lo.same_price_days && lo.same_price_days > 1 ? ` 외 ${lo.same_price_days - 1}일` : "";
    const span = p.range_days && p.range_days > 0 ? `${p.range_days}일` : "조회 기간";
    view.low = `${span} 최저 ${md(lo.date)}${more} ${man1(lo.price_krw)}`;
  }
  return view.week || view.low ? view : null;
}

function toViews(data: any): Record<number, StayPriceView> | null {
  const stays = data?.stays;
  if (!stays || typeof stays !== "object") return null;
  const today = kstToday();
  const out: Record<number, StayPriceView> = {};
  for (const [k, v] of Object.entries(stays)) {
    const no = Number(k);
    if (!Number.isInteger(no) || no <= 0) continue;
    const view = toView(v as RawStayPrice, today);
    if (view) out[no] = view;
  }
  return out;
}

/** 숙소 번호 → 카드 문구. 실패해도 빈 객체(카드는 가격 줄 없이 그대로). */
export async function getStayPriceViews(): Promise<Record<number, StayPriceView>> {
  for (const url of rawUrls()) {
    try {
      const res = await fetch(url, { next: { revalidate: STAY_PRICES_REVALIDATE } });
      if (!res.ok) continue;
      const views = toViews(await res.json());
      if (views) return views;
    } catch {
      /* 다음 후보 */
    }
  }
  return toViews(snapshot) ?? {};
}
