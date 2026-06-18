/**
 * scripts/update-poll.mjs
 *
 * 매일 평일 15:45 KST (06:45 UTC) GitHub Actions에서 실행.
 * 1. 오늘 마감된 투표 결과 → data/polls/history.json 최상단에 추가
 * 2. 다음 거래일 투표 → app/api/poll/route.ts POLLS 오브젝트에 추가
 * 3. app/page.tsx PollWidget → 다음 거래일로 업데이트
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─── 날짜 유틸 ──────────────────────────────────────────────────────────────

/** KST 기준 오늘 날짜 문자열 YYYY-MM-DD */
function todayKST() {
  const now = new Date();
  // UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** YYYY-MM-DD 문자열 → Date (UTC 자정) */
function parseDate(str) {
  return new Date(str + "T00:00:00.000Z");
}

/** Date → YYYY-MM-DD */
function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * 주어진 날짜의 다음 거래일 (주말 skip).
 * @param {string} dateStr YYYY-MM-DD
 * @returns {string} YYYY-MM-DD
 */
function nextTradingDay(dateStr) {
  const d = parseDate(dateStr);
  do {
    d.setUTCDate(d.getUTCDate() + 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6); // 일=0, 토=6
  return fmtDate(d);
}

/**
 * YYYY-MM-DD → 한국어 날짜 레이블 "M/D (요일)"
 */
function dateLabel(dateStr) {
  const [, mm, dd] = dateStr.split("-");
  const d = parseDate(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const dow = days[d.getUTCDay()];
  return `${parseInt(mm)}/${parseInt(dd)} (${dow})`;
}

/**
 * YYYY-MM-DD → 질문 문자열 "M/D(요일) 한국 증시, 오를까요 내릴까요?"
 */
function buildQuestion(dateStr) {
  const [, mm, dd] = dateStr.split("-");
  const d = parseDate(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const dow = days[d.getUTCDay()];
  return `${parseInt(mm)}/${parseInt(dd)}(${dow}) 한국 증시, 오를까요 내릴까요?`;
}

/**
 * YYYY-MM-DD → route.ts 주석용 "M/D 요일"
 */
function shortDateLabel(dateStr) {
  const [, mm, dd] = dateStr.split("-");
  const d = parseDate(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const dow = days[d.getUTCDay()];
  return `${parseInt(mm)}/${parseInt(dd)} ${dow}`;
}

// ─── Naver Finance 주가 fetch ─────────────────────────────────────────────

/**
 * Naver Finance fchart에서 최근 N개 일별 시세 XML 파싱.
 * @param {string} symbol  종목코드 e.g. "005930"
 * @returns {{ close: number, prevClose: number } | null}
 *   오늘자 종가와 전일 종가. 실패 시 null.
 */
async function fetchNaverClose(symbol) {
  const url = `https://fchart.stock.naver.com/sise.nhn?symbol=${symbol}&timeframe=day&count=5&requestType=0`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://finance.naver.com/",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const text = await res.text();

    // 포맷: <item data="YYYYMMDD|open|high|low|close|volume" />
    const matches = [...text.matchAll(/<item data="(\d{8})\|\d+\|\d+\|\d+\|(\d+)\|\d+"/g)];
    if (matches.length < 2) return null;

    // 가장 최근 두 항목
    const latest = matches[matches.length - 1];
    const prev = matches[matches.length - 2];
    return {
      close: parseInt(latest[2]),
      prevClose: parseInt(prev[2]),
    };
  } catch {
    return null;
  }
}

/**
 * pct 계산 — (close - prevClose) / prevClose * 100
 */
function calcPct(close, prevClose) {
  if (!prevClose) return 0;
  return ((close - prevClose) / prevClose) * 100;
}

/**
 * 부호 포함 pct 문자열 — 양수: "+X.XX%", 음수: "−X.XX%" (U+2212)
 */
function fmtPct(pct) {
  const abs = Math.abs(pct).toFixed(2);
  return pct >= 0 ? `+${abs}%` : `−${abs}%`;
}

// ─── 투표 결과 fetch ──────────────────────────────────────────────────────

async function fetchPollVotes(pollId) {
  const url = `https://kr-stocks.com/api/poll?pollId=${encodeURIComponent(pollId)}&sessionId=cron-bot`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return { yes: data.yes ?? 0, no: data.no ?? 0 };
  } catch {
    return null;
  }
}

// ─── 메인 ────────────────────────────────────────────────────────────────

async function main() {
  const today = todayKST();
  const todayId = `market-updown-${today}`;
  const nextDay = nextTradingDay(today);
  const nextId = `market-updown-${nextDay}`;

  console.log(`[update-poll] today=${today}, todayId=${todayId}`);
  console.log(`[update-poll] nextDay=${nextDay}, nextId=${nextId}`);

  // ── 1. 투표 결과 fetch ────────────────────────────────────────────────
  const votes = await fetchPollVotes(todayId);
  console.log(`[update-poll] votes:`, votes);

  const hasVotes = votes && (votes.yes > 0 || votes.no > 0);

  // ── 2. 주가 fetch ─────────────────────────────────────────────────────
  const [samsung, hynix, hyundai] = await Promise.all([
    fetchNaverClose("005930"),
    fetchNaverClose("000660"),
    fetchNaverClose("005380"),
  ]);

  let outcome = "flat";
  let outcomeDetail = "시장 데이터 미확인";

  if (samsung || hynix || hyundai) {
    const entries = [
      { name: "삼성전자", data: samsung },
      { name: "SK하이닉스", data: hynix },
      { name: "현대차", data: hyundai },
    ];

    const pcts = entries.map(({ data }) =>
      data ? calcPct(data.close, data.prevClose) : null
    );

    const validPcts = pcts.filter((p) => p !== null);
    const avgPct =
      validPcts.length > 0
        ? validPcts.reduce((a, b) => a + b, 0) / validPcts.length
        : 0;

    outcome = avgPct > 0.1 ? "up" : avgPct < -0.1 ? "down" : "flat";
    const marketLabel =
      outcome === "up" ? "상승" : outcome === "down" ? "하락" : "보합";

    const pctLabels = entries
      .map(({ name, data }, i) => {
        const pct = pcts[i];
        return `${name} ${pct !== null ? fmtPct(pct) : "N/A"}`;
      })
      .join(", ");

    outcomeDetail = `코스피 ${marketLabel} — ${pctLabels}`;
  }

  console.log(`[update-poll] outcome=${outcome}, detail=${outcomeDetail}`);

  // ── 3. history.json 업데이트 ──────────────────────────────────────────
  const historyPath = path.join(ROOT, "data/polls/history.json");
  const historyRaw = fs.readFileSync(historyPath, "utf8");
  const history = JSON.parse(historyRaw);

  const alreadyInHistory = history.polls.some((p) => p.pollId === todayId);

  if (!hasVotes) {
    console.log(`[update-poll] 투표 데이터 없음 → history 추가 skip`);
  } else if (alreadyInHistory) {
    console.log(`[update-poll] ${todayId} 이미 history에 존재 → skip`);
  } else {
    const [, mm, dd] = today.split("-");
    const newEntry = {
      pollId: todayId,
      date: today,
      dateLabel: dateLabel(today),
      question: buildQuestion(today),
      yesLabel: "📈 상승",
      noLabel: "📉 하락",
      yes: votes.yes,
      no: votes.no,
      outcome,
      outcomeDetail,
      resolvedAt: new Date().toISOString(),
    };
    history.polls.unshift(newEntry);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2) + "\n", "utf8");
    console.log(`[update-poll] history.json 업데이트 완료: ${todayId}`);
  }

  // ── 4. route.ts 업데이트 ──────────────────────────────────────────────
  const routePath = path.join(ROOT, "app/api/poll/route.ts");
  let routeContent = fs.readFileSync(routePath, "utf8");

  if (routeContent.includes(`"${nextId}"`)) {
    console.log(`[update-poll] ${nextId} 이미 route.ts에 존재 → skip`);
  } else {
    // closedAt: 다음 거래일 08:00 KST = 전날 23:00 UTC
    const closedAtDate = new Date(`${nextDay}T09:00:00+09:00`);
    // 실제로는 전날 23:00 UTC
    const closedAt = new Date(closedAtDate.getTime() - 9 * 60 * 60 * 1000)
      .toISOString()
      .replace(/\.\d{3}Z$/, ".000Z");

    // closedAt: nextDay 08:00 KST = nextDay-1 23:00 UTC
    // 전날 날짜 계산
    const closedAtPrevDay = (() => {
      const d = parseDate(nextDay);
      d.setUTCDate(d.getUTCDate() - 1);
      return fmtDate(d);
    })();

    const shortNext = shortDateLabel(nextDay);
    const shortPrev = (() => {
      const [, mm, dd] = closedAtPrevDay.split("-");
      return `${parseInt(mm)}/${parseInt(dd)}`;
    })();

    const newLine =
      `  // 인간지표 — 내일(${shortNext}) 상승 vs 하락. 마감 = 장 시작 전 ${shortNext} 09:00 KST = ${nextDay} 00:00 UTC\n` +
      `  "${nextId}": { closedAt: "${closedAt}" },`;

    // POLLS 오브젝트 닫는 }; 바로 앞에 삽입
    routeContent = routeContent.replace(
      /^(\s*"market-updown-[^"]+": \{ closedAt: "[^"]*" \},?\s*)(\n\};)/m,
      (match, lastEntry, closing) => {
        // 마지막 엔트리 끝에 쉼표가 없으면 추가
        const lastWithComma = lastEntry.replace(/,?\s*$/, ",\n");
        return lastWithComma + newLine + "\n" + closing;
      }
    );

    // 위 방식이 실패한 경우 fallback: }; 직전 마지막 줄 뒤에 삽입
    if (!routeContent.includes(nextId)) {
      routeContent = routeContent.replace(
        /(const POLLS[\s\S]*?)(^\};)/m,
        (match, body, closing) => {
          // body 끝 트림 후 새 줄 추가
          return body.trimEnd() + "\n" + newLine + "\n" + closing;
        }
      );
    }

    fs.writeFileSync(routePath, routeContent, "utf8");
    console.log(`[update-poll] route.ts 업데이트 완료: ${nextId} closedAt=${closedAt}`);
  }

  // ── 5. page.tsx 업데이트 ─────────────────────────────────────────────
  const pagePath = path.join(ROOT, "app/page.tsx");
  let pageContent = fs.readFileSync(pagePath, "utf8");

  const newQuestion = buildQuestion(nextDay);

  pageContent = pageContent.replace(
    /pollId="market-updown-\d{4}-\d{2}-\d{2}"/,
    `pollId="${nextId}"`
  );
  pageContent = pageContent.replace(
    /question="[^"]*한국 증시, 오를까요 내릴까요\?"/,
    `question="${newQuestion}"`
  );

  fs.writeFileSync(pagePath, pageContent, "utf8");
  console.log(`[update-poll] page.tsx 업데이트 완료: pollId=${nextId}, question=${newQuestion}`);

  console.log("[update-poll] 완료.");
}

main().catch((err) => {
  console.error("[update-poll] 오류:", err);
  process.exit(1);
});
