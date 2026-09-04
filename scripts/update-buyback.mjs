#!/usr/bin/env node
// SK하이닉스 자사주 매입(바이백) 진행 현황 자동 갱신
//
// 데이터 source: https://kind.krx.co.kr/corpgeneral/treasurystk.do (KRX 공시채널 KIND)
// 로그인·API키 불필요, 공개 POST 엔드포인트. 신고내역(decl)/체결내역(trd) 두 탭 사용.
// "신청내역"(appl)은 신고수량 대비 잔여치만 알려주고 신고내역만으로 충분히 계산 가능해 미사용.
//
// 실행: node scripts/update-buyback.mjs
// GitHub Actions: .github/workflows/update-buyback.yml (KST 18:30 평일 — KRX 당일 체결내역 확정 이후)
//
// ⚠️ 이 매입 프로그램은 2026-08-20~2026-11-19 한시적 — 종료 후 이 스크립트/워크플로우는
// 자연 소멸(신고내역 테이블이 더 안 늘어남) 또는 정리 대상.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_PATH = resolve(ROOT, "data/buyback/hynix.json");

const ISUR_CD = "00066"; // SK하이닉스 KIND 내부 코드
const REP_ISU_SRT_CD = "A000660"; // 대표종목 단축코드
const CORP_NAME = "SK하이닉스";

// 2026-08-19 "자기주식 취득 결정" 이사회 공시 — treasurystk.do 테이블엔 신고금액(원)
// 필드가 없어 뉴스로 확정한 값을 고정 상수로 둠 (fnnews.com/news/202608191548455814,
// biz.heraldcorp.com/article/10845698 교차 확인, 2026-09-04).
const PROGRAM_META = {
  declared_date: "2026-08-19",
  planned_amount_krw: 40_043_000_000_000, // 40조 43억원
  method: "직접취득", // 신탁계약 아님 — 위탁증권사가 장내매수 대행
  broker: "SK증권",
  purpose: "전량 소각 전제",
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

async function fetchTab(method, searchGubun, fromDate, toDate) {
  const body = new URLSearchParams({
    method,
    pageIndex: "1",
    currentPageSize: "100",
    orderMode: "0",
    orderStat: "D",
    isurCd: ISUR_CD,
    repIsuSrtCd: REP_ISU_SRT_CD,
    repIsuCd: "",
    corpName: "",
    searchGubun,
    paxreq: "",
    outsvcno: "",
    searchCodeType: "char",
    searchCorpName: CORP_NAME,
    marketType: "all",
    comAbbrv: CORP_NAME,
    trstkGubun: "all",
    acqDispGubun: "all",
    fromDate,
    toDate,
  });
  const res = await fetch("https://kind.krx.co.kr/corpgeneral/treasurystk.do", {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Referer: "https://kind.krx.co.kr/corpgeneral/treasurystk.do?method=loadInitPage",
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`KIND ${method} HTTP ${res.status}`);
  return res.text();
}

/** <tr>...</tr> 블록에서 <td> 셀 텍스트만 순서대로 추출 (태그 제거, 공백 정리). */
function extractCells(rowHtml) {
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
  const cells = [];
  let m;
  while ((m = cellRe.exec(rowHtml))) {
    const text = m[1]
      .replace(/<[^>]+>/g, " ") // 내부 태그(img/a/br 등) 제거
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    cells.push(text);
  }
  return cells;
}

function toInt(s) {
  const n = parseInt(String(s).replace(/[,\s]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function toFloat(s) {
  const n = parseFloat(String(s).replace(/[,\s%]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** 체결내역(trd) — 매매일 | 종목명 | 자사주/취득처분구분 | 신청수량 | 당일체결수량 | 체결율(%) */
function parseTrdRows(html) {
  const rowRe = /<tr\s*[^>]*>[\s\S]*?<\/tr>/g;
  const rows = [];
  const blocks = html.match(rowRe) ?? [];
  for (const block of blocks) {
    if (!block.includes('class="first txc"') && !block.includes("txc")) continue;
    const cells = extractCells(block);
    if (cells.length < 6) continue;
    const date = cells[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    rows.push({
      date,
      applied_qty: toInt(cells[3]),
      executed_qty: toInt(cells[4]),
      execution_rate_pct: toFloat(cells[5]),
    });
  }
  // 오래된→최신 순 정렬 (KIND는 최신순으로 내려줌)
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

/** 신고내역(decl) — 신고일 | 종목명 | 구분 | 기간 | 신고수량 | 체결수량누계 | 체결수량비율누계 | 체결금액누계 */
function parseDeclRow(html) {
  const rowRe = /<tr\s*[^>]*>[\s\S]*?<\/tr>/g;
  const blocks = html.match(rowRe) ?? [];
  for (const block of blocks) {
    const cells = extractCells(block);
    if (cells.length < 8) continue;
    const declDate = cells[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(declDate)) continue;
    const periodMatch = cells[3].match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
    if (!periodMatch) continue;
    return {
      decl_date: declDate,
      period_start: periodMatch[1],
      period_end: periodMatch[2],
      planned_qty: toInt(cells[4]),
      cum_executed_qty: toInt(cells[5]),
      cum_rate_pct: toFloat(cells[6]),
      cum_amount_krw: toInt(cells[7]),
    };
  }
  return null;
}

/** 남은 영업일 계산 (주말만 제외 — 공휴일 미반영, 참고용). */
function businessDaysBetween(fromISO, toISO) {
  const from = new Date(fromISO + "T00:00:00+09:00");
  const to = new Date(toISO + "T00:00:00+09:00");
  let count = 0;
  const d = new Date(from);
  while (d <= to) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function addBusinessDays(fromISO, n) {
  const d = new Date(fromISO + "T00:00:00+09:00");
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
}

async function main() {
  // ⚠️ toDate가 오늘보다 미래면 KIND가 200 OK + 빈 응답(0바이트)을 준다(실측 확인,
  // 2026-09-04) — 반드시 오늘 날짜로 고정. fromDate는 매입기간 시작(8/20)을 넉넉히
  // 포함하도록 오늘 기준 120일 전으로 계산(프로그램 진행 중엔 매일 자동으로 안전).
  const todayKstStr = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const fromDateStr = new Date(Date.now() + 9 * 3600 * 1000 - 120 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  console.log("[buyback] fetching KIND decl + trd for", CORP_NAME, `(${fromDateStr} ~ ${todayKstStr})`);
  const [declHtml, trdHtml] = await Promise.all([
    fetchTab("searchDeclOfTreasuryStkAcqDisp", "decl", fromDateStr, todayKstStr),
    fetchTab("searchTrdOfTreasuryStkAcqDisp", "trd", fromDateStr, todayKstStr),
  ]);

  const decl = parseDeclRow(declHtml);
  const daily = parseTrdRows(trdHtml);
  if (!decl) throw new Error("신고내역 파싱 실패 — KIND 응답 구조가 바뀌었을 수 있음");
  if (daily.length === 0) throw new Error("체결내역 파싱 실패 — 0건");

  const nowKst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");
  const todayKst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

  // 최근 5거래일 평균 페이스로 완료 예상일 추정 (일별 데이터 최소 1건 필요)
  const recentN = daily.slice(-5);
  const recentAvgQty = recentN.reduce((s, d) => s + d.executed_qty, 0) / recentN.length;
  const remainingQty = Math.max(decl.planned_qty - decl.cum_executed_qty, 0);
  const neededDays = recentAvgQty > 0 ? Math.ceil(remainingQty / recentAvgQty) : null;
  const etaDate = neededDays != null ? addBusinessDays(todayKst, neededDays) : null;

  // 일정 경과율 — 전체 캘린더 기간 대비 오늘까지 경과 비율
  const totalCalDays = Math.max(
    (new Date(decl.period_end).getTime() - new Date(decl.period_start).getTime()) / 86_400_000,
    1
  );
  const elapsedCalDays = Math.max(
    (new Date(todayKst).getTime() - new Date(decl.period_start).getTime()) / 86_400_000,
    0
  );
  const scheduleElapsedPct = Math.min((elapsedCalDays / totalCalDays) * 100, 100);
  const progressPct = decl.planned_qty > 0 ? (decl.cum_executed_qty / decl.planned_qty) * 100 : 0;
  const aheadPct = progressPct - scheduleElapsedPct;

  const avgPrice = decl.cum_executed_qty > 0 ? Math.round(decl.cum_amount_krw / decl.cum_executed_qty) : null;
  const remainingBizDays = businessDaysBetween(todayKst, decl.period_end);
  const dailyLimitQty = Math.round(decl.planned_qty / 10); // KRX 규정 — 1일 매수한도 = 신고수량의 10%
  const neededDailyAvg = remainingBizDays > 0 ? Math.ceil(remainingQty / remainingBizDays) : 0;

  const out = {
    slug: "hynix",
    ticker: "000660",
    name_ko: "SK하이닉스",
    name_en: "SK Hynix",
    updated_at: nowKst + "+09:00",
    source: "krx_kind_treasurystk",
    source_url: "https://kind.krx.co.kr/corpgeneral/treasurystk.do?method=loadInitPage",
    note: "당일 체결은 다음날 저녁 KIND 공시로 확정 — 실시간 아님. 신청수량=체결수량 100%면 그날 한도 전량 소진.",
    program: {
      ...PROGRAM_META,
      period_start: decl.period_start,
      period_end: decl.period_end,
      planned_qty: decl.planned_qty,
      daily_limit_qty: dailyLimitQty,
    },
    progress: {
      cum_executed_qty: decl.cum_executed_qty,
      cum_amount_krw: decl.cum_amount_krw,
      avg_price_krw: avgPrice,
      progress_pct: round2(progressPct),
      schedule_elapsed_pct: round2(scheduleElapsedPct),
      ahead_pct: round2(aheadPct),
      remaining_qty: remainingQty,
      remaining_biz_days: remainingBizDays,
      needed_daily_avg_qty: neededDailyAvg,
      on_track: neededDailyAvg <= dailyLimitQty,
      eta_date: etaDate,
      recent5_avg_qty: Math.round(recentAvgQty),
    },
    daily,
  };

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(
    `[buyback] saved ${daily.length} days, progress=${out.progress.progress_pct}%, ` +
      `ahead=${out.progress.ahead_pct}%p, eta=${out.progress.eta_date}`
  );
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
