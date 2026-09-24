#!/usr/bin/env node
// 외인·기관 매매 자동 갱신 — 네이버 금융 frgn.naver 페이지 scrape
//
// 데이터 source: https://finance.naver.com/item/frgn.naver?code={code}
// "외국인 기관 순매매 거래량" 테이블 (최근 5일)
//
// 추정 매매대금 = 순매매량(주식수) × 종가 (±5% 정확도, 시각화 용도 충분)
//
// 실행: node scripts/update-trading-flow.mjs
// GitHub Actions: .github/workflows/update-trading-flow.yml (KST 17:00 평일)

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "data/trading_flow");

const TICKERS = [
  { slug: "samsung", code: "005930", name_ko: "삼성전자", name_en: "Samsung Electronics" },
  { slug: "hynix",   code: "000660", name_ko: "SK하이닉스", name_en: "SK Hynix" },
  { slug: "hyundai", code: "005380", name_ko: "현대차",    name_en: "Hyundai Motor" },
];

// ────────────────────────────────────────────────────────────
// 네이버 증권 모바일 API
// 2026-09-24: finance.naver.com/item/frgn.naver 가 "Npay 증권" 앱 셸로 바뀌어 HTML에
// 데이터가 없어짐(9/23부터 No rows parsed) → 새 프론트가 쓰는 JSON API로 교체.
// ────────────────────────────────────────────────────────────
const toInt = (v) => parseInt(String(v ?? "").replace(/−/g, "-").replace(/[,+]/g, ""), 10);

async function fetchRows(code) {
  const url = `https://m.stock.naver.com/api/stock/${code}/trend?pageSize=10`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Referer": "https://m.stock.naver.com/",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${code}`);
  const list = await res.json();
  if (!Array.isArray(list)) throw new Error(`Unexpected response for ${code}`);
  const rows = [];
  for (const r of list) { // 최신일이 먼저(기존 HTML 표와 같은 순서)
    const b = String(r.bizdate ?? "");
    const close = toInt(r.closePrice);
    const foreignQty = toInt(r.foreignerPureBuyQuant);
    const instQty = toInt(r.organPureBuyQuant);
    if (b.length !== 8 || !isFinite(close) || !isFinite(foreignQty) || !isFinite(instQty)) continue;
    rows.push({
      date: `${b.slice(0, 4)}-${b.slice(4, 6)}-${b.slice(6, 8)}`,
      close,
      foreign_qty: foreignQty,
      institutional_qty: instQty,
      foreign_won: foreignQty * close,
      institutional_won: instQty * close,
    });
  }
  return rows;
}

// ────────────────────────────────────────────────────────────
// JSON 빌드 + 저장
// ────────────────────────────────────────────────────────────
function buildJson(ticker, rows5) {
  const cum = rows5.reduce(
    (acc, r) => ({
      foreign_won: acc.foreign_won + r.foreign_won,
      institutional_won: acc.institutional_won + r.institutional_won,
    }),
    { foreign_won: 0, institutional_won: 0 }
  );
  // 개인 = -(외인+기관). 한국 시장은 close to zero-sum.
  const retail_won = -(cum.foreign_won + cum.institutional_won);

  const nowKst = new Date();
  const nowIsoKst = new Date(nowKst.getTime() + 9 * 3600 * 1000)
    .toISOString()
    .replace("Z", "+09:00");

  return {
    slug: ticker.slug,
    ticker: ticker.code,
    name_ko: ticker.name_ko,
    name_en: ticker.name_en,
    updated_at: nowIsoKst,
    source: "naver_mstock_trend",
    note: "추정 매매대금 = 종가 × 순매매량 (±5% 정확도)",
    daily: rows5.map((r) => ({
      date: r.date,
      foreign_won: r.foreign_won,
      institutional_won: r.institutional_won,
    })),
    cumulative_5d: {
      foreign_won: cum.foreign_won,
      institutional_won: cum.institutional_won,
      retail_won,
    },
  };
}

async function processTicker(ticker) {
  console.log(`[${ticker.slug}] fetching ${ticker.code}...`);
  const rows = await fetchRows(ticker.code);
  if (rows.length === 0) throw new Error(`No rows parsed for ${ticker.slug}`);
  const rows5 = rows.slice(0, 5).reverse(); // 옛날→최근 순으로 저장
  const json = buildJson(ticker, rows5);

  const outPath = resolve(OUT_DIR, `${ticker.slug}.json`);
  writeFileSync(outPath, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(
    `[${ticker.slug}] saved ${rows5.length} days, ` +
      `foreign 5d=${(json.cumulative_5d.foreign_won / 1e8).toFixed(0)}억, ` +
      `inst 5d=${(json.cumulative_5d.institutional_won / 1e8).toFixed(0)}억`
  );
  return json;
}

// ────────────────────────────────────────────────────────────
// main
// ────────────────────────────────────────────────────────────
async function main() {
  const errors = [];
  for (const t of TICKERS) {
    try {
      await processTicker(t);
      // 네이버에 부담 안 주려고 작은 delay
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      console.error(`[${t.slug}] ERROR: ${e.message}`);
      errors.push({ slug: t.slug, error: e.message });
    }
  }
  if (errors.length === TICKERS.length) {
    console.error("All tickers failed — exiting 1");
    process.exit(1);
  }
  if (errors.length > 0) {
    console.error(`Partial failure: ${errors.length}/${TICKERS.length}`);
    // 일부만 실패해도 commit 은 진행
    process.exit(0);
  }
  console.log("✅ all done");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
