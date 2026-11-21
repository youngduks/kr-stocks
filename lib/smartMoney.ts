// 고수 지갑 vs 손실 지갑 로더 — data/smart_money/latest.json (scripts/update-smart-money.mjs 가 갱신).
//
// ⚠️ 빌드타임 import 금지 — lib/historyStats.ts·lib/buyback.ts 와 같은 이유로 GitHub raw 를 런타임에
// fetch. 봇 데이터 커밋은 vercel.json ignoreCommand 로 재빌드를 건너뛰므로, 빌드타임 import 를 쓰면
// 다음 코드 배포 전까지 화면이 옛 숫자에 멈춤(2026-09-04 trading_flow 사고).
//
// 프리뷰 배포(브랜치)에선 그 브랜치의 파일을 먼저 읽고, 없으면 main 으로 폴백.
// 로컬(VERCEL 환경 변수 없음)에선 저장소의 파일을 먼저 읽는다 — 아직 올리지 않은 수집 결과 확인용.

const REPO_RAW = "https://raw.githubusercontent.com/youngduks/kr-stocks";
const FILE = "data/smart_money/latest.json";

export type SmartMoneySide = {
  longWallets: number;
  shortWallets: number;
  longUsd: number;
  shortUsd: number;
  /** 지갑 수 기준 롱 비율 (0~100, 포지션 없으면 null) */
  walletLongPct: number | null;
  /** 금액 기준 롱 비율 */
  usdLongPct: number | null;
  /** 한 지갑이 이 묶음 금액에서 차지하는 최대 비중 */
  topWalletSharePct: number | null;
};

export type SmartMoneyCoin = {
  coin: string;
  totalUsd: number;
  smart: SmartMoneySide;
  losing: SmartMoneySide;
  /** 24시간 전 대비 롱 비율 변화(%p) — 기록이 쌓이기 전엔 null */
  change24h: {
    smartWalletLongPct: number | null;
    smartUsdLongPct: number | null;
    losingWalletLongPct: number | null;
    losingUsdLongPct: number | null;
  } | null;
};

export type SmartMoneyGroup = {
  eligible: number;
  vaultExcluded: number;
  swept: number;
  failed: number;
  withPositions: number;
  longPositions: number;
  shortPositions: number;
  longUsd: number;
  shortUsd: number;
  usdLongPct: number | null;
};

export type SmartMoneyData = {
  version: number;
  updatedAt: string;
  updatedAtMs: number;
  definition: { vaultsExcluded: boolean; scope: string };
  groups: { smart: SmartMoneyGroup; losing: SmartMoneyGroup };
  change24hBase: string | null;
  coins: SmartMoneyCoin[];
};

function rawUrls(): string[] {
  const ref = process.env.VERCEL_GIT_COMMIT_REF;
  const urls: string[] = [];
  if (process.env.VERCEL_ENV === "preview" && ref && ref !== "main") {
    urls.push(`${REPO_RAW}/refs/heads/${ref}/${FILE}`);
  }
  urls.push(`${REPO_RAW}/main/${FILE}`);
  return urls;
}

function valid(d: unknown): d is SmartMoneyData {
  const x = d as SmartMoneyData;
  return !!x && Array.isArray(x.coins) && typeof x.updatedAtMs === "number" && !!x.groups;
}

async function readLocal(): Promise<SmartMoneyData | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const d = JSON.parse(await readFile(join(process.cwd(), FILE), "utf8"));
    return valid(d) ? d : null;
  } catch {
    return null;
  }
}

export async function getSmartMoney(): Promise<SmartMoneyData | null> {
  if (!process.env.VERCEL) {
    const local = await readLocal();
    if (local) return local;
  }
  for (const url of rawUrls()) {
    try {
      const res = await fetch(url, { next: { revalidate: 600 } });
      if (!res.ok) continue;
      const d = await res.json();
      if (valid(d)) return d;
    } catch {
      // 다음 후보로
    }
  }
  return null;
}

/** 두 묶음이 크게 엇갈리는지 / 같은 쪽인지 (지갑 수 기준) */
export type Stance = "split-smart-short" | "split-smart-long" | "both-long" | "both-short" | null;

export const STRONG = 70;
/** 한쪽 지갑 수가 이보다 적으면 판정하지 않음 (지갑 몇 개로 70%가 나오는 것 방지) */
export const MIN_WALLETS = 20;

export function stanceOf(c: SmartMoneyCoin): Stance {
  const s = c.smart.walletLongPct;
  const l = c.losing.walletLongPct;
  const sn = c.smart.longWallets + c.smart.shortWallets;
  const ln = c.losing.longWallets + c.losing.shortWallets;
  if (s == null || l == null || sn < MIN_WALLETS || ln < MIN_WALLETS) return null;
  const hi = STRONG;
  const lo = 100 - STRONG;
  if (s <= lo && l >= hi) return "split-smart-short";
  if (s >= hi && l <= lo) return "split-smart-long";
  if (s >= hi && l >= hi) return "both-long";
  if (s <= lo && l <= lo) return "both-short";
  return null;
}

export function fmtUsdShort(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}
