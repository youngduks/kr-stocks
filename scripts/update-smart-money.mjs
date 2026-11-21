#!/usr/bin/env node
// 고수 지갑 vs 손실 지갑 — 하이퍼리퀴드 공개 데이터 자체 집계 (/smart-money)
//
// 1) 리더보드(stats-data.hyperliquid.xyz)에서 두 묶음을 고른다 (우리 기준):
//    - 고수 지갑: 누적 손익(allTime pnl) ≥ +$200K, 계좌 평가액 ≥ $2K
//    - 손실 지갑: 누적 손익 −$1M ~ −$100K, 계좌 평가액 ≥ $2K
//    - vault(위탁 운용 지갑)는 stats-data /Mainnet/vaults 목록 주소로 제외
// 2) 두 묶음의 모든 지갑 포지션을 api.hyperliquid.xyz/info clearinghouseState 로 조회
//    (기본 거래소 무기한 선물만 — HIP-3 별도 dex·현물은 포함 안 됨)
// 3) 코인별·묶음별 롱/숏 지갑 수, 롱/숏 금액(포지션 평가액) 집계 → data/smart_money/latest.json
//    + 회차별 요약 data/smart_money/history.json (최근 48회·약 26시간) → 24시간 변화 계산
//
// 요청 예절: 하이퍼리퀴드 한도 IP당 분당 가중치 1200, clearinghouseState 가중치 2 → 초당 7.5회 이하로
// 고정 간격 발사(전체 약 14분), 429·5xx 는 뒤로 물러나며 재시도(최대 5번), 429가 나면 전체 속도도 잠시 늦춘다.
//
// 실행: node scripts/update-smart-money.mjs
//   SMART_MONEY_RPS=7.5   초당 요청 수 (기본 7.5, 최대 9로 제한)
//   SMART_MONEY_LIMIT=N   묶음별 N개만 조회 (시험용 — 이 값을 주면 파일을 쓰지 않고 요약만 출력)
// 비밀값·키 없음 (공개 API).

import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "data/smart_money");
const LATEST = resolve(OUT_DIR, "latest.json");
const HISTORY = resolve(OUT_DIR, "history.json");

const LEADERBOARD_URL = "https://stats-data.hyperliquid.xyz/Mainnet/leaderboard";
const VAULTS_URL = "https://stats-data.hyperliquid.xyz/Mainnet/vaults";
const INFO_URL = "https://api.hyperliquid.xyz/info";

const SMART_MIN_PNL = 200_000;
const LOSING_MIN_PNL = -1_000_000;
const LOSING_MAX_PNL = -100_000;
const MIN_ACCOUNT = 2_000;

const TOP_COINS = 40;
const ALWAYS_COINS = ["BTC", "ETH", "SOL", "HYPE"];
const HISTORY_MAX = 48;
const HISTORY_MAX_AGE_MS = 26 * 3600_000;
const CH24_TARGET_MS = 24 * 3600_000;
const CH24_TOLERANCE_MS = 2 * 3600_000; // 22~26시간 전 회차가 없으면 24시간 변화는 비움

const RPS = Math.min(9, Math.max(1, Number(process.env.SMART_MONEY_RPS) || 7.5));
const LIMIT = Number(process.env.SMART_MONEY_LIMIT) || 0;
const CONCURRENCY = 10;
const MAX_TRIES = 5;
const UA = "Mozilla/5.0 (compatible; kr-stocks-smart-money/1.0)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a);

function kstIso(ms) {
  const d = new Date(ms + 9 * 3600_000);
  return d.toISOString().replace(/\.\d{3}Z$/, "+09:00");
}

async function getJson(url, init = {}, timeoutMs = 120_000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal, headers: { "User-Agent": UA, ...(init.headers || {}) } });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${url}`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function getJsonRetry(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await getJson(url);
    } catch (e) {
      last = e;
      await sleep(5_000 * (i + 1));
    }
  }
  throw last;
}

const allTimePnl = (row) => {
  const w = Object.fromEntries(row.windowPerformances || []);
  return Number(w.allTime?.pnl);
};

// ---------- 전체 속도 조절 (고정 간격 + 429 시 감속) ----------
let nextSlot = 0;
let penaltyUntil = 0;
async function takeSlot() {
  const gap = 1000 / RPS;
  for (;;) {
    const now = Date.now();
    if (now < penaltyUntil) {
      await sleep(penaltyUntil - now);
      continue;
    }
    const slot = Math.max(now, nextSlot);
    nextSlot = slot + gap;
    if (slot > now) await sleep(slot - now);
    return;
  }
}

const stats = { requests: 0, retries: 0, http429: 0 };

async function fetchState(user) {
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    await takeSlot();
    stats.requests++;
    try {
      return await getJson(
        INFO_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "clearinghouseState", user }),
        },
        20_000,
      );
    } catch (e) {
      const st = e.status ?? 0;
      if (st === 429) {
        stats.http429++;
        // 전체 발사를 잠시 멈춤 — 분당 한도가 다시 차오를 시간
        penaltyUntil = Math.max(penaltyUntil, Date.now() + 10_000 * attempt);
      }
      const retryable = st === 0 || st === 429 || st >= 500;
      if (!retryable || attempt === MAX_TRIES) return null;
      stats.retries++;
      await sleep(Math.min(60_000, 2_000 * 2 ** (attempt - 1)) + Math.random() * 1000);
    }
  }
  return null;
}

async function sweep(addrs, onEach) {
  let i = 0;
  let done = 0;
  const startedAt = Date.now();
  async function worker() {
    while (i < addrs.length) {
      const a = addrs[i++];
      const st = await fetchState(a.addr);
      onEach(a, st);
      done++;
      if (done % 500 === 0) {
        const el = (Date.now() - startedAt) / 1000;
        log(`진행 ${done}/${addrs.length} · ${el.toFixed(0)}초 · 429 ${stats.http429}회 · 재시도 ${stats.retries}회`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

const pct = (a, b) => (a + b > 0 ? Math.round((a / (a + b)) * 1000) / 10 : null);
const r0 = (v) => Math.round(v);

async function main() {
  const t0 = Date.now();
  log(`리더보드 받는 중 (${LEADERBOARD_URL})`);
  const lb = await getJsonRetry(LEADERBOARD_URL);
  const rows = lb.leaderboardRows || [];
  log(`리더보드 ${rows.length}개 지갑`);

  let vaultSet = new Set();
  let vaultListOk = false;
  try {
    const vaults = await getJsonRetry(VAULTS_URL);
    vaultSet = new Set(vaults.map((v) => String(v?.summary?.vaultAddress || "").toLowerCase()).filter(Boolean));
    vaultListOk = vaultSet.size > 0;
    log(`vault 목록 ${vaultSet.size}개`);
  } catch (e) {
    log(`vault 목록 실패 — 제외 없이 진행: ${e.message}`);
  }

  const groups = { smart: [], losing: [] };
  const vaultExcluded = { smart: 0, losing: 0 };
  for (const row of rows) {
    const pnl = allTimePnl(row);
    const av = Number(row.accountValue);
    if (!Number.isFinite(pnl) || !Number.isFinite(av) || av < MIN_ACCOUNT) continue;
    let g = null;
    if (pnl >= SMART_MIN_PNL) g = "smart";
    else if (pnl >= LOSING_MIN_PNL && pnl <= LOSING_MAX_PNL) g = "losing";
    if (!g) continue;
    const addr = String(row.ethAddress).toLowerCase();
    if (vaultSet.has(addr)) {
      vaultExcluded[g]++;
      continue;
    }
    groups[g].push({ addr, g });
  }
  if (LIMIT > 0) {
    groups.smart = groups.smart.slice(0, LIMIT);
    groups.losing = groups.losing.slice(0, LIMIT);
  }
  log(`고수 지갑 ${groups.smart.length} · 손실 지갑 ${groups.losing.length} · vault 제외 ${vaultExcluded.smart}/${vaultExcluded.losing} · 초당 ${RPS}회`);

  // coin → group → [롱지갑, 숏지갑, 롱$, 숏$, 최대 단일지갑$]
  const agg = new Map();
  const gs = {
    smart: { swept: 0, failed: 0, withPositions: 0 },
    losing: { swept: 0, failed: 0, withPositions: 0 },
  };
  const cell = (coin, g) => {
    if (!agg.has(coin)) agg.set(coin, { smart: [0, 0, 0, 0, 0], losing: [0, 0, 0, 0, 0] });
    return agg.get(coin)[g];
  };

  // 두 묶음을 섞어서 조회 — 중간에 멈춰도 한쪽만 비는 일이 없게
  const all = [];
  const n = Math.max(groups.smart.length, groups.losing.length);
  for (let k = 0; k < n; k++) {
    if (k < groups.smart.length) all.push(groups.smart[k]);
    if (k < groups.losing.length) all.push(groups.losing[k]);
  }

  await sweep(all, (a, st) => {
    const s = gs[a.g];
    if (!st) {
      s.failed++;
      return;
    }
    s.swept++;
    const ps = st.assetPositions || [];
    if (ps.length > 0) s.withPositions++;
    for (const ap of ps) {
      const p = ap.position || {};
      const sz = Number(p.szi);
      const v = Math.abs(Number(p.positionValue));
      if (!p.coin || !Number.isFinite(sz) || sz === 0 || !Number.isFinite(v)) continue;
      const c = cell(p.coin, a.g);
      if (sz > 0) {
        c[0]++;
        c[2] += v;
      } else {
        c[1]++;
        c[3] += v;
      }
      if (v > c[4]) c[4] = v;
    }
  });

  const sweepSec = Math.round((Date.now() - t0) / 1000);
  const side = (c) => ({
    longWallets: c[0],
    shortWallets: c[1],
    longUsd: r0(c[2]),
    shortUsd: r0(c[3]),
    walletLongPct: pct(c[0], c[1]),
    usdLongPct: pct(c[2], c[3]),
    // 한 지갑이 이 묶음 금액의 몇 %를 차지하나 (큰손 쏠림 확인용)
    topWalletSharePct: c[2] + c[3] > 0 ? Math.round((c[4] / (c[2] + c[3])) * 1000) / 10 : null,
  });

  const ranked = [...agg.entries()]
    .map(([coin, v]) => ({ coin, v, total: v.smart[2] + v.smart[3] + v.losing[2] + v.losing[3] }))
    .sort((a, b) => b.total - a.total);
  const picked = ranked.slice(0, TOP_COINS);
  for (const c of ALWAYS_COINS) {
    if (!picked.some((x) => x.coin === c)) {
      const x = ranked.find((y) => y.coin === c);
      if (x) picked.push(x);
    }
  }

  const nowMs = Date.now();
  const coins = picked.map(({ coin, v, total }) => ({
    coin,
    totalUsd: r0(total),
    smart: side(v.smart),
    losing: side(v.losing),
    change24h: null,
  }));

  const totals = (g) => {
    let lw = 0, sw = 0, lu = 0, su = 0;
    for (const v of agg.values()) {
      lw += v[g][0]; sw += v[g][1]; lu += v[g][2]; su += v[g][3];
    }
    return { longPositions: lw, shortPositions: sw, longUsd: r0(lu), shortUsd: r0(su), usdLongPct: pct(lu, su) };
  };

  // ---------- 기록 + 24시간 변화 ----------
  let history = [];
  if (existsSync(HISTORY)) {
    try {
      history = JSON.parse(readFileSync(HISTORY, "utf8")).snapshots || [];
    } catch {
      history = [];
    }
  }
  const target = nowMs - CH24_TARGET_MS;
  let base = null;
  for (const h of history) {
    if (Math.abs(h.t - target) <= CH24_TOLERANCE_MS && (!base || Math.abs(h.t - target) < Math.abs(base.t - target))) base = h;
  }
  const d = (a, b) => (a == null || b == null ? null : Math.round((a - b) * 10) / 10);
  for (const c of coins) {
    const prev = base?.c?.[c.coin];
    if (!prev) continue;
    c.change24h = {
      smartWalletLongPct: d(c.smart.walletLongPct, prev[0]),
      smartUsdLongPct: d(c.smart.usdLongPct, prev[1]),
      losingWalletLongPct: d(c.losing.walletLongPct, prev[2]),
      losingUsdLongPct: d(c.losing.usdLongPct, prev[3]),
    };
  }

  const latest = {
    version: 1,
    updatedAt: kstIso(nowMs),
    updatedAtMs: nowMs,
    source: "Hyperliquid 공개 API (리더보드 + clearinghouseState) — kr-stocks 자체 집계",
    definition: {
      smart: { label: "고수 지갑", minAllTimePnlUsd: SMART_MIN_PNL, minAccountValueUsd: MIN_ACCOUNT },
      losing: { label: "손실 지갑", allTimePnlRangeUsd: [LOSING_MIN_PNL, LOSING_MAX_PNL], minAccountValueUsd: MIN_ACCOUNT },
      vaultsExcluded: vaultListOk,
      scope: "하이퍼리퀴드 기본 무기한 선물 포지션 (HIP-3 별도 dex·현물 제외)",
    },
    groups: {
      smart: { eligible: groups.smart.length, vaultExcluded: vaultExcluded.smart, ...gs.smart, ...totals("smart") },
      losing: { eligible: groups.losing.length, vaultExcluded: vaultExcluded.losing, ...gs.losing, ...totals("losing") },
    },
    sweep: { seconds: sweepSec, requests: stats.requests, retries: stats.retries, http429: stats.http429, rps: RPS },
    change24hBase: base ? kstIso(base.t) : null,
    coins,
  };

  const summary = `고수 ${gs.smart.swept}/${groups.smart.length}(실패 ${gs.smart.failed}) · 손실 ${gs.losing.swept}/${groups.losing.length}(실패 ${gs.losing.failed}) · ${sweepSec}초 · 요청 ${stats.requests} · 429 ${stats.http429} · 재시도 ${stats.retries}`;
  if (LIMIT > 0) {
    log(`시험 모드(LIMIT=${LIMIT}) — 파일 안 씀. ${summary}`);
    for (const c of coins.slice(0, 8)) {
      console.log(c.coin, "고수 지갑롱%", c.smart.walletLongPct, "금액롱%", c.smart.usdLongPct, "| 손실 지갑롱%", c.losing.walletLongPct, "금액롱%", c.losing.usdLongPct);
    }
    return;
  }

  // 실패가 너무 많으면 이번 회차는 버림 (잘못된 숫자를 올리지 않게)
  const failRate = (gs.smart.failed + gs.losing.failed) / Math.max(1, all.length);
  if (failRate > 0.1) {
    console.error(`실패율 ${(failRate * 100).toFixed(1)}% — 이번 회차는 저장하지 않음. ${summary}`);
    process.exit(2);
  }

  // 기록: 상위 코인만 [고수 지갑롱%, 고수 금액롱%, 손실 지갑롱%, 손실 금액롱%]
  const snap = { t: nowMs, c: {} };
  for (const c of coins) snap.c[c.coin] = [c.smart.walletLongPct, c.smart.usdLongPct, c.losing.walletLongPct, c.losing.usdLongPct];
  history = [...history.filter((h) => nowMs - h.t <= HISTORY_MAX_AGE_MS), snap].slice(-HISTORY_MAX);

  mkdirSync(OUT_DIR, { recursive: true });
  const writeAtomic = (path, obj) => {
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, JSON.stringify(obj) + "\n");
    renameSync(tmp, path);
  };
  writeAtomic(LATEST, latest);
  writeAtomic(HISTORY, { version: 1, fields: ["smartWalletLongPct", "smartUsdLongPct", "losingWalletLongPct", "losingUsdLongPct"], snapshots: history });
  log(`저장 완료 — ${summary} · 기록 ${history.length}회`);
}

main().catch((e) => {
  console.error("실패:", e?.stack || e);
  process.exit(1);
});
