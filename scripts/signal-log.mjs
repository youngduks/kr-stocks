#!/usr/bin/env node
// "그래서 내일 아침 한국장은?" 신호 — 개장 전 실제 기록 + 장 마감 후 채점 (2026-11-08 시작)
//
// ⚠ 미래정보 금지 원칙
//   - 기록(record)은 한국 거래일 당일 06:30~09:00 KST(정규장 개장 전)에만 남긴다. 그 밖의 시각엔 아무것도 쓰지 않음.
//     미국 정규장이 진행 중이면(신호가 아직 움직이는 중) 기록하지 않음.
//   - 과거 신호를 일봉으로 재구성해 채우지 않는다. 기록이 없는 날은 그냥 없음.
//   - 이미 있는 날짜의 기록은 절대 덮어쓰지 않음. 틀린 기록도 지우지 않음.
//   - 채점(grade)은 그날 KRX 정규장 종가가 확정된 뒤(16:00 KST 이후) 네이버 fchart 일봉(거래소 공식 종가)으로만.
//
// 신호 = lib/semiSignal.ts 와 같은 계산: SOXL 마지막 완료 거래일 종가 ÷ 그 전 거래일 종가 − 1 → ÷3 → 임계값 ±0.4 / ±1.5
// 채점 기준 = 그날 종가가 전 거래일 종가보다 높으면 "상승", 낮으면 "하락", 같으면 "보합".
//   상승 신호(up/strong_up) → 상승이면 맞음, 하락 신호(down/strong_down) → 하락이면 맞음, 보합은 틀림으로 셈.
//   보합 신호(flat)는 방향을 말하지 않았으므로 채점하지 않음.
//
// 실행: node scripts/signal-log.mjs [auto|record|grade] [--dry]
//   auto  = grade 후 record (기록 시간창일 때만 실제 기록)
// 출력: data/signal-log.json — GitHub Actions(.github/workflows/signal-log.yml)가 커밋.
//   커밋 제목 "chore(data): auto-update signal log" → vercel.json ignoreCommand 로 재빌드 생략,
//   화면은 lib/signalLog.ts 가 GitHub raw 를 런타임에 읽음.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../data/signal-log.json");
const UAS = ["Mozilla/5.0", "Mozilla/5.0 (compatible; kr-stocks-bot/1.0; +https://kr-stocks.com)"];
const STOCKS = [
  { slug: "samsung", code: "005930", name: "삼성전자" },
  { slug: "hynix", code: "000660", name: "SK하이닉스" },
];
const KST_OFFSET = 9 * 3600 * 1000;

const mode = process.argv[2] ?? "auto";
const DRY = process.argv.includes("--dry");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, { asText = false, tries = 4 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UAS[i % UAS.length] }, signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return asText ? await res.arrayBuffer() : await res.json();
    } catch (e) {
      last = e;
      if (i < tries - 1) await sleep(3000 * 2 ** i);
    }
  }
  throw last;
}

/** epoch ms → KST {date:"YYYY-MM-DD", hhmm: 0~2359, dow: 0(일)~6} */
function kst(ms) {
  const d = new Date(ms + KST_OFFSET);
  return {
    date: d.toISOString().slice(0, 10),
    hhmm: d.getUTCHours() * 100 + d.getUTCMinutes(),
    dow: d.getUTCDay(),
  };
}

function classify(p) {
  if (p >= 1.5) return "strong_up";
  if (p >= 0.4) return "up";
  if (p <= -1.5) return "strong_down";
  if (p <= -0.4) return "down";
  return "flat";
}
const callOf = (dir) => (dir === "up" || dir === "strong_up" ? "up" : dir === "down" || dir === "strong_down" ? "down" : "none");

function load() {
  if (existsSync(OUT)) return JSON.parse(readFileSync(OUT, "utf8"));
  return null;
}

function emptyLog() {
  return {
    version: 1,
    startedAt: null,
    method: {
      signal: "SOXL 마지막 완료 거래일 종가 ÷ 전 거래일 종가 − 1, ÷3 = 반도체지수 환산. ±0.4% 이상 강세/약세, ±1.5% 이상 강한 신호 (lib/semiSignal.ts 와 동일)",
      recordWindow: "한국 평일 06:30~09:00 KST (정규장 개장 전), 미국 정규장 진행 중이면 기록 안 함. 기존 기록 덮어쓰기 금지",
      grading: "그날 KRX 정규장 종가 vs 전 거래일 종가 (네이버 fchart 일봉, 거래소 공식 종가). 강세 신호→상승이면 맞음, 약세 신호→하락이면 맞음, 보합은 틀림. 보합 신호는 채점 안 함",
      noReconstruction: "과거 신호를 재구성해 채우지 않음. 틀린 기록도 지우지 않음",
    },
    records: [],
  };
}

/** SOXL 완료된 일봉 (뉴욕 날짜) — 진행 중 봉 제외 */
async function soxlBars() {
  const j = await fetchWithRetry("https://query1.finance.yahoo.com/v8/finance/chart/SOXL?range=10d&interval=1d");
  const r = j?.chart?.result?.[0];
  if (!r?.timestamp?.length) throw new Error("Yahoo SOXL 빈 응답");
  const off = r.meta?.gmtoffset ?? -18000;
  const reg = r.meta?.currentTradingPeriod?.regular ?? {};
  const nowSec = Math.floor(Date.now() / 1000);
  const live = typeof reg.start === "number" && typeof reg.end === "number" && nowSec >= reg.start && nowSec < reg.end + 20 * 60;
  const todayNy = typeof reg.start === "number" ? new Date((reg.start + off) * 1000).toISOString().slice(0, 10) : null;
  const closes = r.indicators?.quote?.[0]?.close ?? [];
  const bars = [];
  r.timestamp.forEach((t, i) => {
    const c = closes[i];
    if (typeof c !== "number" || !(c > 0)) return;
    const date = new Date((t + off) * 1000).toISOString().slice(0, 10);
    if (live && date === todayNy) return; // 진행 중 봉
    if (bars.length && bars[bars.length - 1].date === date) bars[bars.length - 1] = { date, close: c };
    else bars.push({ date, close: c });
  });
  return { bars, live };
}

/** 네이버 fchart 일봉 Map<YYYY-MM-DD, close> */
async function naverDaily(code) {
  const buf = await fetchWithRetry(`https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=day&count=30&requestType=0`, { asText: true });
  const text = new TextDecoder("latin1").decode(buf);
  const m = new Map();
  for (const x of text.matchAll(/<item data="(\d{8})\|([\d.]+)\|([\d.]+)\|([\d.]+)\|([\d.]+)\|(\d+)"/g)) {
    m.set(`${x[1].slice(0, 4)}-${x[1].slice(4, 6)}-${x[1].slice(6, 8)}`, +x[5]);
  }
  return m;
}

async function record(log) {
  const nowMs = Date.now();
  const k = kst(nowMs);
  const inWindow = k.dow >= 1 && k.dow <= 5 && k.hhmm >= 630 && k.hhmm < 900;
  if (!inWindow && !DRY) {
    console.log(`[record] 기록 시간창 아님 (KST ${k.date} ${k.hhmm}) → 건너뜀`);
    return false;
  }
  const krDate = k.date;
  if (log.records.some((r) => r.krDate === krDate)) {
    console.log(`[record] ${krDate} 이미 기록 있음 → 덮어쓰지 않음`);
    return false;
  }
  const { bars, live } = await soxlBars();
  if (live) {
    console.log("[record] 미국 정규장 진행 중 → 신호 확정 전이라 기록 안 함");
    return false;
  }
  if (bars.length < 2) throw new Error("SOXL 일봉 부족");
  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  if (!(last.date < krDate)) throw new Error(`미국 세션 날짜(${last.date})가 한국 날짜(${krDate})보다 늦음 — 이상`);
  const soxlPct = (last.close / prev.close - 1) * 100;
  const implied = soxlPct / 3;
  const direction = classify(implied);
  const rec = {
    krDate,
    recordedAt: new Date(nowMs).toISOString(),
    us: { session: last.date, prevSession: prev.date, soxlClose: last.close, soxlPrevClose: prev.close, soxlPct: +soxlPct.toFixed(3) },
    impliedSemiPct: +implied.toFixed(3),
    direction,
    call: callOf(direction),
    status: "pending",
    results: {},
  };
  if (DRY) {
    console.log("[record --dry] 기록하지 않음, 계산 결과:", JSON.stringify(rec));
    return false;
  }
  log.records.push(rec);
  log.records.sort((a, b) => (a.krDate < b.krDate ? -1 : 1));
  if (!log.startedAt) log.startedAt = rec.recordedAt;
  console.log(`[record] ${krDate} ${direction} (SOXL ${rec.us.soxlPct}%, 환산 ${rec.impliedSemiPct}%) 기록`);
  return true;
}

async function grade(log) {
  const pending = log.records.filter((r) => r.status === "pending");
  if (!pending.length) {
    console.log("[grade] 채점 대기 기록 없음");
    return false;
  }
  const nowMs = Date.now();
  const k = kst(nowMs);
  const daily = {};
  for (const s of STOCKS) daily[s.slug] = await naverDaily(s.code);
  let changed = false;
  for (const r of pending) {
    // 그날 종가 확정 전(당일 16:00 KST 이전)이면 채점하지 않음
    if (r.krDate > k.date || (r.krDate === k.date && k.hhmm < 1600)) continue;
    const res = {};
    let any = false;
    for (const s of STOCKS) {
      const m = daily[s.slug];
      const close = m.get(r.krDate);
      if (close == null) continue;
      const prevDates = [...m.keys()].filter((d) => d < r.krDate).sort();
      const pd = prevDates[prevDates.length - 1];
      if (!pd) continue;
      const prevClose = m.get(pd);
      const pct = (close / prevClose - 1) * 100;
      const outcome = close > prevClose ? "up" : close < prevClose ? "down" : "flat";
      const hit = r.call === "none" ? null : r.call === outcome;
      res[s.slug] = { prevDate: pd, prevClose, close, pct: +pct.toFixed(3), outcome, hit };
      any = true;
    }
    if (any) {
      r.results = res;
      r.status = "graded";
      r.gradedAt = new Date(nowMs).toISOString();
      changed = true;
      console.log(`[grade] ${r.krDate} 채점:`, JSON.stringify(res));
    } else {
      // 4일 지나도 그날 일봉이 없으면 휴장으로 처리 (채점 제외, 기록은 남김)
      const ageDays = (Date.parse(`${k.date}T00:00:00Z`) - Date.parse(`${r.krDate}T00:00:00Z`)) / 86400000;
      if (ageDays >= 4) {
        r.status = "no_session";
        changed = true;
        console.log(`[grade] ${r.krDate} 일봉 없음 → 휴장 처리`);
      }
    }
  }
  return changed;
}

async function main() {
  const log = load() ?? emptyLog();
  let changed = false;
  if (mode === "grade" || mode === "auto") changed = (await grade(log)) || changed;
  if (mode === "record" || mode === "auto") changed = (await record(log)) || changed;
  if (mode === "init" && !existsSync(OUT)) changed = true;
  if (changed && !DRY) {
    writeFileSync(OUT, JSON.stringify(log, null, 2) + "\n");
    console.log(`[write] ${OUT}`);
  } else console.log("[write] 변경 없음");
}

main().catch((e) => {
  console.error("[signal-log] 실패:", e);
  process.exit(1);
});
