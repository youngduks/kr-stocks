// 방문자 카운터 — Upstash Redis (ZSET + INCR)
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 환경변수 필요.
// 환경변수 없으면 graceful 0 반환 (배포 망가지지 않음).

import { Redis } from "@upstash/redis";

const KEY_TOTAL = "kr-stocks:visits:total";
const KEY_ONLINE = "kr-stocks:online"; // ZSET (member=sessionId, score=timestamp ms)
const ONLINE_WINDOW_MS = 5 * 60 * 1000; // 5분 active session

// URL fallback (Vercel env에 URL 누락 시 사용 — public endpoint라 노출 OK).
// TOKEN은 반드시 env로 (secret).
const FALLBACK_URL = "https://frank-liger-120993.upstash.io";

let _redis: Redis | null = null;
function redis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || FALLBACK_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

export type Stats = { online: number; total: number };

/** 새 방문 기록 + 현재 stats 반환. sessionId 중복은 INCR하지 않음 (unique 방문만 누적). */
export async function trackVisit(sessionId: string): Promise<Stats> {
  const r = redis();
  if (!r) return { online: 0, total: 0 };
  try {
    const now = Date.now();
    // 1) 5분 지난 멤버 정리
    await r.zremrangebyscore(KEY_ONLINE, 0, now - ONLINE_WINDOW_MS);
    // 2) ZSET에 이미 있는지 확인 (없으면 새 unique 방문 → INCR)
    const score = await r.zscore(KEY_ONLINE, sessionId);
    const isNew = score == null;
    // 3) ZSET upsert + 누적 카운터
    if (isNew) {
      await Promise.all([
        r.zadd(KEY_ONLINE, { score: now, member: sessionId }),
        r.incr(KEY_TOTAL),
      ]);
    } else {
      // 같은 세션 — score만 refresh
      await r.zadd(KEY_ONLINE, { score: now, member: sessionId });
    }
    // 4) 현재 stats
    const [online, total] = await Promise.all([
      r.zcard(KEY_ONLINE),
      r.get<number>(KEY_TOTAL),
    ]);
    return { online: online ?? 0, total: total ?? 0 };
  } catch (e) {
    return { online: 0, total: 0 };
  }
}

/** 읽기 전용 — 현재 stats 조회. */
export async function getStats(): Promise<Stats> {
  const r = redis();
  if (!r) return { online: 0, total: 0 };
  try {
    const now = Date.now();
    await r.zremrangebyscore(KEY_ONLINE, 0, now - ONLINE_WINDOW_MS);
    const [online, total] = await Promise.all([
      r.zcard(KEY_ONLINE),
      r.get<number>(KEY_TOTAL),
    ]);
    return { online: online ?? 0, total: total ?? 0 };
  } catch {
    return { online: 0, total: 0 };
  }
}
