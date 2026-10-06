// 다가오는 일정 — data/events.json(확정 일정, 코드와 함께 손으로 갱신) + 매월 옵션만기(규칙 계산).
// 렌더 시점(KST) 기준으로 지난 일정은 자동으로 빠진다 → 홈 ISR(120s)만으로 D-day 가 넘어감. Redis 없음.
import data from "../data/events.json";

export type MarketEvent = {
  date: string; // YYYY-MM-DD (KST)
  title: string;
  note?: string;
  kind: "holiday" | "macro" | "expiry";
  source: string;
};

const KRX_HOLIDAYS = new Set<string>(data.krxHolidays);

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** 오늘 날짜 (KST) YYYY-MM-DD */
export function kstToday(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

/** 두 날짜(YYYY-MM-DD) 사이 일수 */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** 코스피200 옵션 만기 = 매월 둘째 목요일, 휴장일이면 직전 거래일. 3·6·9·12월은 선물 동시만기. */
function optionExpiry(year: number, month: number): MarketEvent {
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=일
  let day = 1 + ((4 - firstDow + 7) % 7) + 7;
  let date = ymd(year, month, day);
  while (KRX_HOLIDAYS.has(date) || [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay())) {
    day -= 1;
    date = ymd(year, month, day);
  }
  const quad = month % 3 === 0;
  return {
    date,
    title: quad ? "선물·옵션 동시만기" : "옵션 만기",
    note: "코스피200",
    kind: "expiry",
    source: "한국거래소 규정 (매월 둘째 목요일)",
  };
}

export type UpcomingEvent = MarketEvent & { dday: number };

/** 오늘(KST)부터 withinDays 안의 일정, 가까운 순 최대 limit 개 */
export function getUpcomingEvents(limit = 4, withinDays = 45, now = new Date()): UpcomingEvent[] {
  const today = kstToday(now);
  const [y, m] = today.split("-").map(Number);
  const expiries = [0, 1, 2].map((k) => {
    const mm = ((m - 1 + k) % 12) + 1;
    return optionExpiry(y + Math.floor((m - 1 + k) / 12), mm);
  });
  return [...(data.events as MarketEvent[]), ...expiries]
    .map((e) => ({ ...e, dday: daysBetween(today, e.date) }))
    .filter((e) => e.dday >= 0 && e.dday <= withinDays)
    .sort((a, b) => a.dday - b.dday || a.title.localeCompare(b.title))
    .slice(0, limit);
}
