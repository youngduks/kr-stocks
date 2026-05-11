import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 임시 — env 이름만 확인용 (값은 일부 마스킹). 검증 후 즉시 제거.
export async function GET() {
  const upstashKeys = Object.keys(process.env)
    .filter((k) => /UPSTASH|KV_|REDIS/i.test(k))
    .sort();

  const detail: Record<string, string> = {};
  for (const k of upstashKeys) {
    const v = process.env[k] ?? "";
    detail[k] = v ? `${v.slice(0, 12)}... (len=${v.length})` : "EMPTY";
  }

  // fromEnv() 시도
  let redisFromEnvResult = "n/a";
  try {
    const { Redis } = await import("@upstash/redis");
    const r = Redis.fromEnv();
    const pong = await r.ping();
    redisFromEnvResult = String(pong);
  } catch (e: any) {
    redisFromEnvResult = `error: ${e?.message ?? String(e)}`;
  }

  return NextResponse.json({
    keys_found: upstashKeys,
    keys_detail: detail,
    redis_from_env_ping: redisFromEnvResult,
  });
}
