#!/usr/bin/env node
// 리서치: "밤사이 바이낸스 삼성전자·SK하이닉스 등락이 다음 날 KRX 시가 방향을 맞혔나" (2026-11-09)
//
// 신호 (개장 전에 관측 가능한 값만):
//   전 거래일 P 15:30 KST(5분봉 15:25~15:30 종가) → 당일 D 08:55 KST(5분봉 08:50~08:55 종가)
//   바이낸스 USDT-M 무기한 선물 가격 변화. 원화 환산 = 가격 × 같은 시각 업비트 KRW-USDT 5분봉 종가.
//   (KRX 정규장 종가는 15:30 동시호가로 정해짐 → 15:30 이후 값부터 '밤사이'로 봄. 08:55 는 09:00 개장 5분 전)
// 결과: 당일 D KRX 시가 vs 전 거래일 P KRX 종가 (네이버 fchart 일봉 = 거래소 공식 OHLC)
// 기준선: 같은 기간 '시가가 전일 종가보다 높게 시작한 날' 비율, 그리고 최근 5년 전체 비율.
// 미래정보 없음: 신호 구간 끝(08:55)이 결과(09:00 시가)보다 앞섬. 결과가 별로여도 그대로 기록.
//
// 실행: node scripts/research-overnight-gap.mjs   → data/research/overnight-gap.json
// 데이터: 바이낸스 fapi klines, 업비트 candles, 네이버 fchart (모두 공개 API, 무료)

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../data/research/overnight-gap.json");
const STOCKS = [
  { slug: "samsung", name: "삼성전자", code: "005930", binance: "SAMSUNGUSDT" },
  { slug: "hynix", name: "SK하이닉스", code: "000660", binance: "SKHYNIXUSDT" },
];
const MIN5 = 5 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
      if (r.status === 429) throw new Error("429");
      if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
      return await r.json();
    } catch (e) {
      last = e;
      await sleep(1500 * 2 ** i);
    }
  }
  throw last;
}

/** KST "YYYY-MM-DD" + "HH:MM" → epoch ms */
const kstMs = (ymd, hm) => Date.parse(`${ymd}T${hm}:00+09:00`);

/** 바이낸스 5분봉 전체 → Map<openTime, close> */
async function binance5m(symbol, startMs) {
  const m = new Map();
  let from = startMs;
  const end = Date.now();
  while (from < end) {
    const rows = await getJson(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=5m&startTime=${from}&limit=1500`);
    if (!rows.length) break;
    for (const k of rows) m.set(k[0], +k[4]);
    const lastOpen = rows[rows.length - 1][0];
    if (lastOpen + MIN5 <= from) break;
    from = lastOpen + MIN5;
    await sleep(250);
  }
  return m;
}

/** 업비트 KRW-USDT 5분봉: 'to' 직전 봉 1개의 종가 (= to 시각 직전 가격) */
const fxCache = new Map();
async function upbitAt(ms) {
  if (fxCache.has(ms)) return fxCache.get(ms);
  const to = new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
  const rows = await getJson(`https://api.upbit.com/v1/candles/minutes/5?market=KRW-USDT&to=${encodeURIComponent(to)}&count=1`);
  await sleep(130); // 초당 10회 제한
  const c = rows?.[0];
  // 봉 시작이 to-5분이어야 정확히 그 시각의 봉 (거래 공백이면 더 이전 봉 → 그래도 직전 가격)
  const v = c ? +c.trade_price : null;
  fxCache.set(ms, v);
  return v;
}

/** 네이버 fchart 일봉 [{date, open, close}] */
async function naverDaily(code) {
  const r = await fetch(`https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=day&count=1500&requestType=0`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const text = new TextDecoder("latin1").decode(await r.arrayBuffer());
  const out = [];
  for (const x of text.matchAll(/<item data="(\d{8})\|([\d.]+)\|([\d.]+)\|([\d.]+)\|([\d.]+)\|(\d+)"/g)) {
    out.push({ date: `${x[1].slice(0, 4)}-${x[1].slice(4, 6)}-${x[1].slice(6, 8)}`, open: +x[2], close: +x[5], volume: +x[6] });
  }
  return out.filter((d) => d.volume > 0 && d.open > 0).sort((a, b) => (a.date < b.date ? -1 : 1));
}

const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
function stats(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  const slope = sxx > 0 ? sxy / sxx : null;
  return { corr: sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null, slope, intercept: slope != null ? my - slope * mx : null };
}
const r2 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const pct1 = (a, b) => Math.round((a / b) * 1000) / 10;

async function runStock(s) {
  const daily = await naverDaily(s.code);
  const listMs = kstMs("2026-06-02", "12:00");
  const perp = await binance5m(s.binance, listMs - 60 * 60 * 1000);
  const rows = [];
  for (let i = 1; i < daily.length; i++) {
    const P = daily[i - 1];
    const D = daily[i];
    const t0 = kstMs(P.date, "15:30");
    const t1 = kstMs(D.date, "08:55");
    const tE = kstMs(D.date, "07:55"); // NXT 프리마켓(08:00~) 시작 전 — 순수 '밤사이' 구간
    if (t0 < listMs) continue;
    const p0 = perp.get(t0 - MIN5); // 15:25 봉 종가
    const p1 = perp.get(t1 - MIN5); // 08:50 봉 종가
    const pE = perp.get(tE - MIN5); // 07:50 봉 종가
    if (p0 == null || p1 == null || pE == null) continue;
    const fx0 = await upbitAt(t0);
    const fx1 = await upbitAt(t1);
    const fxE = await upbitAt(tE);
    if (!fx0 || !fx1 || !fxE) continue;
    const sigUsd = (p1 / p0 - 1) * 100;
    const sigKrw = ((p1 * fx1) / (p0 * fx0) - 1) * 100;
    const sigKrwEarly = ((pE * fxE) / (p0 * fx0) - 1) * 100;
    const gap = (D.open / P.close - 1) * 100;
    rows.push({ prev: P.date, day: D.date, sigUsd: r2(sigUsd), sigKrw: r2(sigKrw), sigKrwEarly: r2(sigKrwEarly), gap: r2(gap), prevClose: P.close, open: D.open });
  }
  const evalSig = (key) => {
    const dir = rows.filter((r) => sign(r.gap) !== 0 && sign(r[key]) !== 0);
    const hits = dir.filter((r) => sign(r.gap) === sign(r[key])).length;
    const big = dir.filter((r) => Math.abs(r[key]) >= 1);
    const bigHits = big.filter((r) => sign(r.gap) === sign(r[key])).length;
    const st = stats(rows.map((r) => r[key]), rows.map((r) => r.gap));
    const mae = rows.reduce((a, r) => a + Math.abs(r.gap - r[key]), 0) / (rows.length || 1);
    return {
      direction: { n: dir.length, hits, hitRatePct: dir.length ? pct1(hits, dir.length) : null },
      bigSignal: { thresholdPct: 1, n: big.length, hits: bigHits, hitRatePct: big.length ? pct1(bigHits, big.length) : null },
      size: { corr: r2(st.corr), slope: r2(st.slope), intercept: r2(st.intercept), maePct: r2(mae) },
    };
  };
  const main = evalSig("sigKrw");
  const early = evalSig("sigKrwEarly");
  // 기준선: 같은 기간 시가 > 전일 종가 비율, 그리고 '더 자주 나온 방향을 늘 찍기'
  const ups = rows.filter((r) => r.gap > 0).length;
  const downs = rows.filter((r) => r.gap < 0).length;
  const majority = Math.max(ups, downs);
  // 최근 5년 전체 시가 상승 비율
  let ups5 = 0, n5 = 0;
  for (let i = 1; i < daily.length; i++) {
    const g = daily[i].open / daily[i - 1].close - 1;
    if (g !== 0) { n5++; if (g > 0) ups5++; }
  }
  return {
    slug: s.slug,
    name: s.name,
    binanceSymbol: s.binance,
    n: rows.length,
    periodStart: rows[0]?.day ?? null,
    periodEnd: rows[rows.length - 1]?.day ?? null,
    // 08:55 기준 (NXT 프리마켓·장전 동시호가 예상체결가가 이미 공개된 뒤)
    direction: main.direction,
    bigSignal: main.bigSignal,
    size: main.size,
    // 07:55 기준 (NXT 프리마켓 시작 전 — 순수 밤사이)
    early,
    baseline: {
      samePeriodUpPct: rows.length ? pct1(ups, ups + downs) : null,
      majorityGuessPct: ups + downs ? pct1(majority, ups + downs) : null,
      fiveYearUpPct: n5 ? pct1(ups5, n5) : null,
      fiveYearN: n5,
      fiveYearFrom: daily[0]?.date ?? null,
    },
    rows,
  };
}

async function main() {
  const stocks = [];
  for (const s of STOCKS) {
    console.log(`[${s.name}] 계산 중…`);
    stocks.push(await runStock(s));
  }
  const out = {
    version: 1,
    computedAt: new Date().toISOString(),
    method: {
      signal: "전 거래일 15:30 KST(바이낸스 5분봉 15:25~15:30 종가) → 당일 08:55 KST(08:50~08:55 종가) 무기한 선물 등락, 원화 환산(같은 시각 업비트 KRW-USDT 5분봉 종가)",
      outcome: "당일 KRX 시가 ÷ 전 거래일 KRX 종가 − 1 (네이버 fchart 일봉)",
      hit: "신호와 시가 갭의 부호가 같으면 적중. 시가 보합(0%)·신호 0 인 날은 방향 채점에서 제외",
      baseline: "같은 기간 시가가 오른 날 비율 / 더 자주 나온 방향을 늘 찍었을 때 적중률 / 최근 약 5년 전체 시가 상승 비율",
      lookahead: "신호 구간 끝(08:55)이 결과(09:00 시가)보다 앞섬 — 개장 전에 관측 가능한 값만 사용",
      earlyVariant: "07:55 KST 종료 신호도 계산 — 08:00 NXT 프리마켓·08:30 KRX 장전 동시호가 예상체결가가 공개되기 전의 순수 밤사이 정보",
    },
    stocks,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  for (const s of stocks) console.log(s.name, JSON.stringify({ n: s.n, period: [s.periodStart, s.periodEnd], direction: s.direction, big: s.bigSignal, baseline: s.baseline, size: s.size, early: s.early }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
