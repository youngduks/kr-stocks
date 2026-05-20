// 투표 카운터 — Upstash Redis (INCR + SET NX dedup)
// visitorStats.ts 패턴 그대로. UPSTASH_REDIS_REST_URL / _TOKEN 필요.

import { Redis } from "@upstash/redis";

const FALLBACK_URL = "https://frank-liger-120993.upstash.io";
const TTL_SEC = 60 * 60 * 24 * 30; // 30일

let _redis: Redis | null = null;
function redis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || FALLBACK_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

export type PollChoice = "yes" | "no";

export type PollResult = {
  pollId: string;
  yes: number;
  no: number;
  total: number;
  voted: PollChoice | null;
  closedAt: string;
  isClosed: boolean;
};

export type VoteResult = PollResult & { ok: boolean; error?: string };

function keyCount(pollId: string, choice: PollChoice) {
  return `kr-stocks:poll:${pollId}:${choice}`;
}
function keyVoted(pollId: string, sessionId: string) {
  return `kr-stocks:poll:${pollId}:voted:${sessionId}`;
}

export async function getPoll(
  pollId: string,
  sessionId: string | null,
  closedAtISO: string,
): Promise<PollResult> {
  const isClosed = new Date(closedAtISO).getTime() < Date.now();
  const empty: PollResult = {
    pollId,
    yes: 0,
    no: 0,
    total: 0,
    voted: null,
    closedAt: closedAtISO,
    isClosed,
  };
  const r = redis();
  if (!r) return empty;
  try {
    const [yesV, noV, votedV] = await Promise.all([
      r.get<number>(keyCount(pollId, "yes")),
      r.get<number>(keyCount(pollId, "no")),
      sessionId
        ? r.get<PollChoice>(keyVoted(pollId, sessionId))
        : Promise.resolve(null),
    ]);
    const yes = yesV ?? 0;
    const no = noV ?? 0;
    return {
      pollId,
      yes,
      no,
      total: yes + no,
      voted: votedV ?? null,
      closedAt: closedAtISO,
      isClosed,
    };
  } catch {
    return empty;
  }
}

export async function vote(
  pollId: string,
  sessionId: string,
  choice: PollChoice,
  closedAtISO: string,
): Promise<VoteResult> {
  const isClosed = new Date(closedAtISO).getTime() < Date.now();
  if (isClosed) {
    const cur = await getPoll(pollId, sessionId, closedAtISO);
    return { ...cur, ok: false, error: "closed" };
  }
  const r = redis();
  if (!r) {
    const cur = await getPoll(pollId, sessionId, closedAtISO);
    return { ...cur, ok: false, error: "redis_unavailable" };
  }
  try {
    // SET NX — 같은 sessionId 중복 차단
    const vk = keyVoted(pollId, sessionId);
    const setRes = await r.set(vk, choice, { nx: true, ex: TTL_SEC });
    if (setRes === null) {
      const cur = await getPoll(pollId, sessionId, closedAtISO);
      return { ...cur, ok: false, error: "already_voted" };
    }
    const ck = keyCount(pollId, choice);
    await r.incr(ck);
    await r.expire(ck, TTL_SEC);
    const cur = await getPoll(pollId, sessionId, closedAtISO);
    return { ...cur, ok: true };
  } catch {
    const cur = await getPoll(pollId, sessionId, closedAtISO);
    return { ...cur, ok: false, error: "exception" };
  }
}
