#!/usr/bin/env node
// 과거 사례 통계 — "미국 반도체 전일 등락 → 다음 한국 거래일 삼성전자·SK하이닉스 등락"
//
// 데이터:
//   - 미국: Yahoo chart API ^SOX (필라델피아 반도체지수, 일봉 5년)
//   - 한국: Yahoo chart API 005930.KS / 000660.KS (일봉 5년, 거래 달력 기준)
//     + 네이버 fchart(거래소 공식 종가)로 교체·교차검증 — Yahoo KRX 일봉에는 거래량 0으로
//       전일 종가를 복사해 둔 "죽은 행"(2022-01~03), 빈 행(2025-09-19), 아예 빠진 거래일
//       (2022-01-03, 2022-05-09), 공식 종가와 0.5%+ 다른 종가가 있음(실측). 네이버도 없으면
//       그 날이 걸린 수익률은 버림.
//
// 원칙 (2026-07-30 사고 재발 방지):
//   - Yahoo meta.chartPreviousClose / regularMarketPreviousClose 는 절대 쓰지 않음.
//     수익률은 항상 "연속된 두 거래일 종가"로 직접 계산.
//   - 오늘 진행 중인 봉(장중)은 제외.
//   - 달력 정렬: 미국 거래일 D(뉴욕 날짜) → 한국 거래일 E = D 보다 뒤인 첫 KRX 거래일.
//     E 의 수익률 구간 [직전 KRX 거래일 P 종가 → E 종가] 안에 미국 거래일이 정확히 1개일 때만
//     사례로 인정 (한국 연휴로 미국 거래일이 2개 이상 끼면 어느 날 효과인지 섞이므로 제외,
//     미국 휴장으로 0개면 신호가 없으므로 제외).
//
// 출력: data/history-stats.json
// 실행: node scripts/history-stats.mjs            (네트워크 필요, 유료 API 없음)
// 스케줄: .github/workflows/update-history-stats.yml (주 1회, KST 토 09:00)
//
// Yahoo 가 GitHub Actions IP 를 계속 429 로 막을 때의 대안 — Mac launchd (주 1회):
//   ~/Library/LaunchAgents/com.krstocks.history-stats.plist
//     ProgramArguments: /bin/zsh -lc "cd <repo> && git pull --rebase origin main &&
//       node scripts/history-stats.mjs && git add data/history-stats.json &&
//       (git diff --cached --quiet || (git commit -m 'chore(data): auto-update history stats $(date +%F)' && git push origin main))"
//     StartCalendarInterval: { Weekday: 6, Hour: 9, Minute: 0 }
//   커밋 제목은 반드시 "chore(data): auto-update history stats " 로 시작 (vercel.json ignoreCommand → 재빌드 생략,
//   화면은 lib/historyStats.ts 가 GitHub raw 를 런타임에 읽으므로 1시간 내 반영).

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "data/history-stats.json");

// ⚠️ Yahoo 는 "완전한 브라우저 UA"에 쿠키/crumb 가 없으면 429 를 줌(2026-09-30 실측).
//    짧은 "Mozilla/5.0" 은 통과 → 이걸 먼저, 실패 시 다른 UA 로 순환.
const UAS = ["Mozilla/5.0", "Mozilla/5.0 (compatible; kr-stocks-bot/1.0; +https://kr-stocks.com)"];

const US_SYMBOL = { symbol: "^SOX", label: "미국 반도체지수(^SOX)" };
const KR_STOCKS = [
  { slug: "samsung", symbol: "005930.KS", code: "005930", name: "삼성전자" },
  { slug: "hynix", symbol: "000660.KS", code: "000660", name: "SK하이닉스" },
];

// 조건 구간 (미국 반도체 전일 등락률, %)
const BUCKETS = [
  { id: "le_-2", label: "−2% 이하", test: (r) => r <= -2 },
  { id: "-2_-1", label: "−2% ~ −1%", test: (r) => r > -2 && r <= -1 },
  { id: "-1_1", label: "−1% ~ +1%", test: (r) => r > -1 && r < 1 },
  { id: "1_2", label: "+1% ~ +2%", test: (r) => r >= 1 && r < 2 },
  { id: "ge_2", label: "+2% 이상", test: (r) => r >= 2 },
];

const MIN_YEARS = 3;
const RECENT_DOTS = 30;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(urls, { tries = 5, asText = false } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < tries; attempt++) {
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": UAS[attempt % UAS.length] },
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
        return asText ? await res.arrayBuffer() : await res.json();
      } catch (e) {
        lastErr = e;
      }
    }
    if (attempt < tries - 1) await sleep(4000 * 2 ** attempt); // Yahoo 429(IP 레이트리밋) 대비: 4s,8s,16s,32s
  }
  throw lastErr;
}

/** "YYYY-MM-DD" in the exchange's local time zone */
function localDate(epochSec, gmtoffset) {
  return new Date((epochSec + gmtoffset) * 1000).toISOString().slice(0, 10);
}

/**
 * Yahoo 일봉 → [{date, open, close, volume, valid}] (날짜 오름차순, 중복 제거).
 * 오늘 진행 중(정규장 종료 전) 봉은 제외.
 */
async function fetchYahooDaily(symbol) {
  const enc = encodeURIComponent(symbol);
  const qs = `range=5y&interval=1d&includePrePost=false&events=div%2Csplit`;
  const json = await fetchWithRetry([
    `https://query1.finance.yahoo.com/v8/finance/chart/${enc}?${qs}`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${enc}?${qs}`,
  ]);
  const r = json?.chart?.result?.[0];
  if (!r?.timestamp?.length) throw new Error(`Yahoo: empty result for ${symbol}`);
  const off = r.meta?.gmtoffset ?? 0;
  const q = r.indicators?.quote?.[0] ?? {};
  const regEnd = r.meta?.currentTradingPeriod?.regular?.end ?? 0;
  const regStart = r.meta?.currentTradingPeriod?.regular?.start ?? 0;
  const nowSec = Math.floor(Date.now() / 1000);
  const todayLocal = regStart ? localDate(regStart, off) : null;
  const byDate = new Map();
  r.timestamp.forEach((t, i) => {
    const date = localDate(t, off);
    // 장중 봉 제외: 오늘 세션이고 정규장 종료 + 20분 이전
    if (todayLocal && date === todayLocal && nowSec < regEnd + 20 * 60) return;
    const close = q.close?.[i];
    const open = q.open?.[i];
    const volume = q.volume?.[i];
    byDate.set(date, { date, open: open ?? null, close: close ?? null, volume: volume ?? null });
  });
  return { rows: [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1)), meta: r.meta };
}

/** 네이버 fchart 일봉 (거래소 공식 OHLC). 실패 시 빈 Map. */
async function fetchNaverDaily(code) {
  try {
    const buf = await fetchWithRetry(
      [`https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=day&count=1500&requestType=0`],
      { asText: true, tries: 3 },
    );
    const text = new TextDecoder("latin1").decode(buf); // 종목명만 EUC-KR, 숫자 데이터는 ASCII
    const map = new Map();
    for (const m of text.matchAll(/<item data="(\d{8})\|([\d.]+)\|([\d.]+)\|([\d.]+)\|([\d.]+)\|(\d+)"/g)) {
      const d = `${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6, 8)}`;
      map.set(d, { open: +m[2], close: +m[5], volume: +m[6] });
    }
    return map;
  } catch (e) {
    console.warn(`[naver] ${code} 실패 — 교차검증 없이 진행: ${e.message}`);
    return new Map();
  }
}

/**
 * KRX 행 검증·보정. valid=false 인 행은 수익률 계산에서 제외.
 * 종가는 네이버(거래소 공식 정규장 종가)를 우선 사용 — Yahoo KRX 종가는 가끔 공식 종가와 다름
 * (2023-01-31, 2024-10-14, 2026-09 여러 날 0.5%+ 차이 실측; NXT 시간외 체결가가 섞인 것으로 추정).
 * 네이버가 없으면 Yahoo 값(거래량 > 0 인 행만) 사용.
 */
function reconcileKr(rows, naver) {
  const q = {
    yahooRows: rows.length,
    closeSource: naver.size ? "naver(공식 종가) 우선, 없으면 yahoo" : "yahoo (네이버 조회 실패)",
    fromNaver: 0,
    fromYahoo: 0,
    yahooStaleOrEmpty: 0, // Yahoo 거래량 0(전일 종가 복사)·빈 행
    yahooCloseDiffOver05pct: 0,
    invalid: 0,
    naverOnlyDates: 0, // Yahoo 에 아예 빠진 거래일
  };
  const out = rows.map((r) => {
    const n = naver.get(r.date);
    const yahooOk = r.close != null && r.close > 0 && r.volume != null && r.volume > 0;
    if (!yahooOk) q.yahooStaleOrEmpty++;
    if (n && n.volume > 0 && n.close > 0) {
      if (yahooOk && Math.abs(n.close / r.close - 1) > 0.005) q.yahooCloseDiffOver05pct++;
      q.fromNaver++;
      return { date: r.date, open: n.open, close: n.close, volume: n.volume, valid: true, src: "naver" };
    }
    if (yahooOk) {
      q.fromYahoo++;
      return { ...r, valid: true, src: "yahoo" };
    }
    q.invalid++;
    return { ...r, valid: false, src: "none" };
  });
  // Yahoo 에 아예 빠진 거래일 (네이버엔 있음, Yahoo 기간 안) → 달력에 추가
  if (naver.size && out.length) {
    const first = out[0].date;
    const last = out[out.length - 1].date;
    const have = new Set(out.map((r) => r.date));
    for (const [d, n] of naver) {
      if (d >= first && d <= last && !have.has(d) && n.volume > 0) {
        out.push({ date: d, open: n.open, close: n.close, volume: n.volume, valid: true, src: "naver" });
        q.naverOnlyDates++;
        q.fromNaver++;
      }
    }
    out.sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  return { rows: out, quality: q };
}

/** 연속된 두 거래일 종가로 일간 수익률(%) — 둘 다 valid 일 때만 */
function dailyReturns(rows) {
  const res = [];
  for (let i = 1; i < rows.length; i++) {
    const p = rows[i - 1];
    const c = rows[i];
    const ok = (p.valid ?? true) && (c.valid ?? true) && p.close > 0 && c.close > 0;
    res.push({
      date: c.date,
      prevDate: p.date,
      ret: ok ? (c.close / p.close - 1) * 100 : null,
      gap: ok && c.open > 0 ? (c.open / p.close - 1) * 100 : null,
    });
  }
  return res;
}

const round = (x, d = 2) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
function median(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function summarize(events) {
  const rets = events.map((e) => e.krRet);
  const gaps = events.map((e) => e.krGap).filter((g) => g != null);
  const hits = rets.filter((r) => r > 0).length;
  const downs = rets.filter((r) => r < 0).length;
  const dates = events.map((e) => e.krDate).sort();
  return {
    n: events.length,
    hits, // 다음 한국 거래일 종가가 전일 종가보다 높았던 횟수
    downs,
    flats: events.length - hits - downs,
    hitRatePct: events.length ? round((hits / events.length) * 100, 1) : null,
    meanPct: round(mean(rets)),
    medianPct: round(median(rets)),
    open: {
      // 시가 기준 (전일 종가 → 다음 날 시가)
      n: gaps.length,
      ups: gaps.filter((g) => g > 0).length,
      meanPct: round(mean(gaps)),
      medianPct: round(median(gaps)),
    },
    periodStart: dates[0] ?? null,
    periodEnd: dates[dates.length - 1] ?? null,
    recent: events
      .slice(-RECENT_DOTS)
      .map((e) => ({ us: e.usDate, kr: e.krDate, usRet: round(e.usRet), krRet: round(e.krRet) })),
  };
}

async function main() {
  const computedAt = new Date().toISOString();

  // 1) 미국
  const us = await fetchYahooDaily(US_SYMBOL.symbol);
  const usRows = us.rows.filter((r) => r.close != null && r.close > 0).map((r) => ({ ...r, valid: true }));
  const usRets = dailyReturns(usRows).filter((r) => r.ret != null);
  const usSanity = usRets.filter((r) => Math.abs(r.ret) > 20);
  if (usSanity.length) throw new Error(`^SOX 일간 ±20% 초과 ${usSanity.length}건 — 데이터 이상, 중단`);

  const result = {
    version: 1,
    computedAt,
    method: {
      usSeries: US_SYMBOL.symbol,
      krSeries: KR_STOCKS.map((s) => s.symbol),
      returnBasis: "연속 거래일 종가 대 종가 (chartPreviousClose 미사용)",
      alignment:
        "미국 거래일 D → D 이후 첫 한국 거래일 E. E의 직전 한국 거래일 종가~E 종가 구간에 미국 거래일이 정확히 1개일 때만 사례로 인정",
      hitDefinition: "다음 한국 거래일 종가 > 전 거래일 종가",
      krDataRepair:
        "한국 종가는 네이버 fchart(거래소 공식 종가) 우선, 없으면 Yahoo(거래량 0·빈 행 제외). Yahoo 달력에 빠진 거래일은 네이버로 보충. 둘 다 없으면 해당 수익률 제외",
      buckets: BUCKETS.map(({ id, label }) => ({ id, label })),
    },
    us: {
      symbol: US_SYMBOL.symbol,
      label: US_SYMBOL.label,
      sessions: usRows.length,
      firstDate: usRows[0]?.date,
      lastDate: usRows[usRows.length - 1]?.date,
    },
    stocks: {},
  };

  for (const s of KR_STOCKS) {
    await sleep(1500); // Yahoo 연속 호출 간격
    const y = await fetchYahooDaily(s.symbol);
    const naver = await fetchNaverDaily(s.code);
    const { rows: krRows, quality } = reconcileKr(y.rows, naver);
    const krRets = dailyReturns(krRows);
    const krSanity = krRets.filter((r) => r.ret != null && Math.abs(r.ret) > 31); // KRX 가격제한폭 ±30%
    if (krSanity.length) throw new Error(`${s.symbol} 가격제한폭 초과 수익률 ${krSanity.length}건 — 데이터 이상, 중단`);

    const usDates = usRets.map((r) => r.date); // 오름차순
    const events = [];
    const skip = { noUsSession: 0, multiUsSessions: 0, invalidKr: 0 };
    let j = 0; // usRets 포인터
    for (const k of krRets) {
      // 구간 [k.prevDate, k.date) 에 속하는 미국 거래일
      while (j < usDates.length && usDates[j] < k.prevDate) j++;
      let jj = j;
      const inWin = [];
      while (jj < usDates.length && usDates[jj] < k.date) inWin.push(usRets[jj++]);
      if (inWin.length === 0) {
        skip.noUsSession++;
        continue;
      }
      if (inWin.length > 1) {
        skip.multiUsSessions++;
        continue;
      }
      if (k.ret == null) {
        skip.invalidKr++;
        continue;
      }
      events.push({ usDate: inWin[0].date, usRet: inWin[0].ret, krDate: k.date, krRet: k.ret, krGap: k.gap });
    }
    // 미국 첫 수익률 이전 한국 날짜는 제외
    const firstUs = usRets[0]?.date ?? "9999";
    const evs = events.filter((e) => e.usDate >= firstUs);

    const spanYears =
      evs.length > 1 ? (Date.parse(evs[evs.length - 1].krDate) - Date.parse(evs[0].krDate)) / (365.25 * 864e5) : 0;
    if (spanYears < MIN_YEARS) throw new Error(`${s.symbol}: 기간 ${spanYears.toFixed(1)}년 < ${MIN_YEARS}년`);

    const buckets = {};
    for (const b of BUCKETS) buckets[b.id] = { label: b.label, ...summarize(evs.filter((e) => b.test(e.usRet))) };

    result.stocks[s.slug] = {
      symbol: s.symbol,
      name: s.name,
      totalEvents: evs.length,
      baseline: { label: "전체 (조건 없음)", ...summarize(evs), recent: undefined },
      buckets,
      skipped: skip,
      dataQuality: quality,
    };
    console.log(
      `[${s.slug}] events=${evs.length} skip=${JSON.stringify(skip)} quality=${JSON.stringify(quality)}`,
    );
    for (const b of BUCKETS) {
      const x = buckets[b.id];
      console.log(
        `  ${b.label.padEnd(12)} n=${x.n} hits=${x.hits} (${x.hitRatePct}%) mean=${x.meanPct}% median=${x.medianPct}% ${x.periodStart}~${x.periodEnd}`,
      );
    }
  }

  // 변경 없으면(computedAt 제외) 파일 안 건드림 → 워크플로 커밋 스킵
  if (existsSync(OUT)) {
    try {
      const prev = JSON.parse(readFileSync(OUT, "utf8"));
      const strip = (o) => JSON.stringify({ ...o, computedAt: null });
      if (strip(prev) === strip(result)) {
        console.log("변경 없음 — 파일 유지");
        return;
      }
    } catch {
      /* 덮어쓰기 */
    }
  }
  writeFileSync(OUT, JSON.stringify(result, null, 2) + "\n");
  console.log(`wrote ${OUT}`);
}

main().catch((e) => {
  console.error(`[history-stats] 실패 — 기존 파일 유지: ${e.message}`);
  process.exit(1);
});
