// 쇼핑 딜 아웃바운드 클릭 추적 — 채널별(kr-stocks 자체 트래픽 vs 쓰레드) 기여도를
// 몰라서 일 10만원 목표 액션플랜을 감으로 짤 수밖에 없었음(2026-08-17) → 해결.
// visitorStats.ts와 같은 Upstash Redis 재사용 (별도 저장소/비용 없이).

import { redis } from "./visitorStats";

const SOURCES = ["kr-stocks", "threads", "unknown"] as const;
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
