// /api/voice/* 공통 가드 — 공유 시크릿 + IP 레이트리밋.
// Claude 토큰을 쓰는 엔드포인트라 공개 상태로 두면 안 된다.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getClientIp } from "@/lib/requestIp";

const WINDOW_SEC = 60 * 60; // 1시간
const MAX_PER_WINDOW = 240; // 40분 녹음 ≈ 60회 + 여유

let _redis: Redis | null = null;
function redis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

/** 통과하면 null, 막히면 그대로 반환할 응답. */
export async function guardVoiceRequest(
  req: NextRequest,
): Promise<NextResponse | null> {
  const secret = process.env.VOICE_API_SECRET;
  if (secret && req.headers.get("x-voice-key") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const r = redis();
  if (!r) return null; // Redis 미설정 환경(로컬 등)에서는 레이트리밋 생략

  const key = `voice:rl:${getClientIp(req)}`;
  try {
    const count = await r.incr(key);
    if (count === 1) await r.expire(key, WINDOW_SEC);
    if (count > MAX_PER_WINDOW) {
      return NextResponse.json(
        { error: "rate_limited", retryAfterSec: WINDOW_SEC },
        { status: 429 },
      );
    }
  } catch {
    // Redis 장애로 녹음을 막지는 않는다.
  }
  return null;
}
