// 쇼핑 딜 아웃바운드 클릭 추적 — 채널별(kr-stocks 자체 트래픽 vs 쓰레드) 기여도를
// 몰라서 일 10만원 목표 액션플랜을 감으로 짤 수밖에 없었음(2026-08-17) → 해결.
// visitorStats.ts와 같은 Upstash Redis 재사용 (별도 저장소/비용 없이).

import { redis } from "./visitorStats";

// youtube 추가(2026-08-23) — 슬기로운의학생활 채널 고정댓글 상품링크 신설.
// instagram 추가(2026-09-30) — 인스타 스토리 링크 스티커(source=instagram) 클릭 집계.
const SOURCES = ["kr-stocks", "threads", "youtube", "instagram", "unknown"] as const;
type Source = (typeof SOURCES)[number];

function isKnownSource(s: string): s is Source {
  return (SOURCES as readonly string[]).includes(s);
}

// UTC로 저장하면 자정 근처 클릭이 전날/다음날로 잘못 집계됨 — KST(UTC+9) 날짜로 고정.
function todayKST(): string {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

/** 딜 아웃바운드 클릭 1건 기록. best-effort — 실패해도 리다이렉트를 막지 않음. */
export async function trackClick(source: string, store: string): Promise<void> {
  const r = redis();
  if (!r) return;
  const src: Source = isKnownSource(source) ? source : "unknown";
  const st = store && store.length <= 20 ? store : "unknown";
  const day = todayKST();
  try {
    await Promise.all([
      r.incr(`kr-stocks:clicks:total:${src}`),
      r.incr(`kr-stocks:clicks:${day}:${src}`),
      r.incr(`kr-stocks:clicks:${day}:${src}:${st}`),
    ]);
  } catch {
    /* ignore */
  }
}

export type ClickStats = {
  date: string;
  today: Record<string, number>;
  total: Record<string, number>;
};

/** 오늘(KST) 소스별 클릭수 + 서비스 시작 이후 누적. */
export async function getClickStats(): Promise<ClickStats> {
  const day = todayKST();
  const r = redis();
  if (!r) return { date: day, today: {}, total: {} };
  try {
    const [todayVals, totalVals] = await Promise.all([
      Promise.all(SOURCES.map((s) => r.get<number>(`kr-stocks:clicks:${day}:${s}`))),
      Promise.all(SOURCES.map((s) => r.get<number>(`kr-stocks:clicks:total:${s}`))),
    ]);
    const today: Record<string, number> = {};
    const total: Record<string, number> = {};
    SOURCES.forEach((s, i) => {
      today[s] = todayVals[i] ?? 0;
      total[s] = totalVals[i] ?? 0;
    });
    return { date: day, today, total };
  } catch {
    return { date: day, today: {}, total: {} };
  }
}

// ── 줍줍파파 숙소 PICK(/pick) 숙소별 클릭 집계 (2026-10-05) ─────────────────────────
// 일별 ZSET(member=숙소 번호, score=클릭수) 하나에 ZINCRBY. 주간 TOP 은 조회 때 최근 7일 키를
// ZUNION(명령 1개)으로 합산. Upstash 명령 절감 원칙(c8f03c41) 유지:
//  - 클릭 1회 = ZINCRBY + 소스별 일별 INCR = 2개 (EXPIRE 는 그날 그 숙소 첫 클릭 때만)
//  - 조회 = ZRANGE + ZUNION 2개, 인스턴스 메모리 5분 캐시(+ /pick ISR 5분)
const PICK_PREFIX = "kr-stocks:pick:";
const PICK_TTL_SEC = 9 * 24 * 3600; // 주간 합산(7일)에 쓰고 나면 자동 만료
const PICK_CACHE_MS = 5 * 60 * 1000;

function kstDayOffset(daysAgo: number): string {
  return new Date(Date.now() + 9 * 3600 * 1000 - daysAgo * 86400 * 1000).toISOString().slice(0, 10);
}

/** 숙소 PICK 아웃바운드 클릭 1건 기록. best-effort — 실패해도 리다이렉트를 막지 않음.
 *  명령 수 절감을 위해 trackClick(3개)은 호출하지 않음 — 소스별 '오늘' 클릭수만 같이 올리고,
 *  누적(total)·스토어별 키에는 pick 클릭이 들어가지 않음(pick 누적은 kr-stocks:pick:* 로 확인). */
export async function trackPickClick(pick: number, source: string): Promise<void> {
  const r = redis();
  if (!r) return;
  const src: Source = isKnownSource(source) ? source : "unknown";
  const day = todayKST();
  const key = `${PICK_PREFIX}${day}`;
  try {
    const [score] = await Promise.all([
      r.zincrby(key, 1, String(pick)),
      r.incr(`kr-stocks:clicks:${day}:${src}`),
    ]);
    if (Number(score) === 1) await r.expire(key, PICK_TTL_SEC);
  } catch {
    /* ignore */
  }
}

export type PickRank = { no: number; clicks: number };
export type PickRanks = { today: PickRank[]; week: PickRank[] };

let _pickCache: { ts: number; ranks: PickRanks } | null = null;

/** [member, score, member, score, ...] → 클릭수 내림차순(동률은 번호 내림차순) */
function parseRanks(flat: unknown): PickRank[] {
  if (!Array.isArray(flat)) return [];
  const out: PickRank[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const no = Number(flat[i]);
    const clicks = Number(flat[i + 1]);
    if (Number.isInteger(no) && no > 0 && clicks > 0) out.push({ no, clicks });
  }
  return out.sort((a, b) => b.clicks - a.clicks || b.no - a.no);
}

/** 오늘(KST) TOP 7 + 최근 7일 TOP 20. Redis 없거나 실패 시 빈 배열(페이지는 번호순 폴백). */
export async function getPickRanks(): Promise<PickRanks> {
  if (_pickCache && Date.now() - _pickCache.ts < PICK_CACHE_MS) return _pickCache.ranks;
  const r = redis();
  if (!r) return { today: [], week: [] };
  try {
    const weekKeys = Array.from({ length: 7 }, (_, i) => `${PICK_PREFIX}${kstDayOffset(i)}`);
    const [todayFlat, weekFlat] = await Promise.all([
      r.zrange(weekKeys[0], 0, 6, { rev: true, withScores: true }),
      r.zunion(weekKeys.length, weekKeys, { withScores: true }),
    ]);
    const ranks = { today: parseRanks(todayFlat).slice(0, 7), week: parseRanks(weekFlat).slice(0, 20) };
    _pickCache = { ts: Date.now(), ranks };
    return ranks;
  } catch {
    return { today: [], week: [] };
  }
}
