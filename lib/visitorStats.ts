// 방문자 카운터 — Upstash Redis (ZSET + INCR)
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 환경변수 필요.
// 환경변수 없으면 graceful 0 반환 (배포 망가지지 않음).

import { Redis } from "@upstash/redis";

const KEY_TOTAL = "kr-stocks:visits:total";
const KEY_ONLINE = "kr-stocks:online"; // ZSET (member=sessionId, score=timestamp ms)
const ONLINE_WINDOW_MS = 5 * 60 * 1000; // 5분 active session
// 일별 방문(세션) 수 — 누적 카운터만으론 추이를 못 봐서 추가(2026-09-24).
// 새 세션일 때 INCR 1회만 추가(Upstash 명령 수 증가 최소화), 400일 뒤 자동 만료.
const KEY_DAILY_PREFIX = "kr-stocks:visits:daily:";
const DAILY_TTL_SEC = 400 * 24 * 3600;
const kstDay = (ms: number) => new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);

// URL fallback (Vercel env에 URL 누락 시 사용 — public endpoint라 노출 OK).
// TOKEN은 반드시 env로 (secret).
const FALLBACK_URL = "https://frank-liger-120993.upstash.io";

let _redis: Redis | null = null;
export function redis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || FALLBACK_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

export type Stats = { online: number; total: number };

// 2026-10-01 Upstash 명령 수 절감(무료 한도 50만/월 초과로 8·9월 $7.41 과금):
// 방문 기록 = ZADD 1회(반환값으로 새 세션 판별, ZSCORE·정리·조회 제거) + 새 세션일 때만 INCR 2회.
// stats 조회는 인스턴스 메모리 60초 캐시 + /api/stats CDN 캐시(s-maxage)로 분당 최대 1회 수준.
const STATS_CACHE_MS = 60 * 1000;
let _statsCache: { ts: number; stats: Stats } | null = null;

/** 새 방문 기록 + 현재 stats 반환. sessionId 중복은 INCR하지 않음 (unique 방문만 누적). */
export async function trackVisit(sessionId: string): Promise<Stats> {
  const r = redis();
  if (!r) return { online: 0, total: 0 };
  try {
    const now = Date.now();
    // ZADD는 새 멤버면 1, 기존 멤버 score 갱신이면 0을 반환 → 별도 ZSCORE 불필요
    const added = await r.zadd(KEY_ONLINE, { score: now, member: sessionId });
    if (added === 1) {
      const dayKey = KEY_DAILY_PREFIX + kstDay(now);
      const [, dayCount] = await Promise.all([r.incr(KEY_TOTAL), r.incr(dayKey)]);
      if (dayCount === 1) await r.expire(dayKey, DAILY_TTL_SEC);
    }
    return await getStats();
  } catch (e) {
    return { online: 0, total: 0 };
  }
}

/** 읽기 전용 — 현재 stats 조회(60초 캐시, 만료된 접속자 정리는 캐시 갱신 때만). */
export async function getStats(): Promise<Stats> {
  const r = redis();
  if (!r) return { online: 0, total: 0 };
  const now = Date.now();
  if (_statsCache && now - _statsCache.ts < STATS_CACHE_MS) return _statsCache.stats;
  try {
    await r.zremrangebyscore(KEY_ONLINE, 0, now - ONLINE_WINDOW_MS);
    const [online, total] = await Promise.all([
      r.zcard(KEY_ONLINE),
      r.get<number>(KEY_TOTAL),
    ]);
    const stats = { online: online ?? 0, total: total ?? 0 };
    _statsCache = { ts: now, stats };
    return stats;
  } catch {
    return _statsCache?.stats ?? { online: 0, total: 0 };
  }
}

export type DailyVisit = { date: string; visits: number };

/** 최근 N일(KST, 오늘 포함) 일별 세션 수 — MGET 1회로 조회. 기록 시작(2026-09-24) 전 날짜는 0. */
export async function getDailyVisits(days: number): Promise<DailyVisit[]> {
  const r = redis();
  const n = Math.max(1, Math.min(90, Math.floor(days) || 30));
  const now = Date.now();
  const dates = Array.from({ length: n }, (_, i) => kstDay(now - (n - 1 - i) * 86400 * 1000));
  if (!r) return dates.map((date) => ({ date, visits: 0 }));
  try {
    const vals = await r.mget<(number | string | null)[]>(...dates.map((d) => KEY_DAILY_PREFIX + d));
    return dates.map((date, i) => ({ date, visits: Number(vals[i] ?? 0) || 0 }));
  } catch {
    return dates.map((date) => ({ date, visits: 0 }));
  }
}
