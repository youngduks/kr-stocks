/**
 * scripts/update-consensus.mjs
 *
 * 네이버 금융 종목 페이지에서 컨센서스 요약(평균 목표주가·투자의견 평점·52주 high/low)을
 * 스크래핑해 data/consensus/*.json 의 `naver_snapshot` 필드를 갱신.
 *
 * 평일 16:00 KST GitHub Actions에서 실행.
 * 개별 증권사 리포트(brokers 배열)는 PDF 안에 있어 자동 추출 불가 → 손대지 않음.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const TARGETS = [
  { slug: "samsung", ticker: "005930" },
  { slug: "hynix", ticker: "000660" },
  { slug: "hyundai", ticker: "005380" },
];

// 2026-09-24: finance.naver.com/item/coinfo.naver 가 "Npay 증권" 앱 셸로 바뀌어 9/9부터
// 추출 실패(워크플로우는 success로 끝나 조용히 멈춰 있었음) → 모바일 JSON API로 교체.
const OPINION_LABELS = { 5: "강력매수", 4: "매수", 3: "중립", 2: "매도", 1: "강력매도" };
const num = (v) => {
  const n = parseInt(String(v ?? "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

async function fetchNaverConsensus(code) {
  const url = `https://m.stock.naver.com/api/stock/${code}/integration`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Referer: "https://m.stock.naver.com/",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  const ci = d?.consensusInfo;
  const avgTarget = num(ci?.priceTargetMean);
  if (!ci || avgTarget == null) return null;
  const info = Object.fromEntries((d.totalInfos ?? []).map((x) => [x.code, x.value]));
  const score = ci.recommMean != null ? parseFloat(ci.recommMean) : null;
  return {
    opinion_score: Number.isFinite(score) ? score : null,
    opinion_label: Number.isFinite(score) ? OPINION_LABELS[Math.min(5, Math.max(1, Math.round(score)))] : null,
    avg_target_krw: avgTarget,
    high_52w_krw: num(info.highPriceOf52Weeks),
    low_52w_krw: num(info.lowPriceOf52Weeks),
    source: "m.stock.naver.com",
    fetched_at: new Date().toISOString(),
  };
}

async function main() {
  let changed = 0;
  let failed = 0;
  for (const { slug, ticker } of TARGETS) {
    const jsonPath = path.join(ROOT, "data/consensus", `${slug}.json`);
    if (!fs.existsSync(jsonPath)) {
      console.warn(`[skip] ${jsonPath} 없음`);
      continue;
    }
    try {
      const snap = await fetchNaverConsensus(ticker);
      if (!snap || snap.avg_target_krw == null) {
        console.warn(`[skip] ${slug}: 컨센서스 추출 실패`);
        failed += 1;
        continue;
      }
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      const prev = data.naver_snapshot;
      const isSame =
        prev &&
        prev.opinion_score === snap.opinion_score &&
        prev.avg_target_krw === snap.avg_target_krw &&
        prev.high_52w_krw === snap.high_52w_krw &&
        prev.low_52w_krw === snap.low_52w_krw &&
        // naver_snapshot 자체는 안 바뀌어도 consensus.avg_target_krw가 아직 안 맞춰져
        // 있으면(구 데이터 백필 등) 반드시 갱신해야 함 — 안 그러면 이 skip 경로에서
        // 영원히 못 고침(2026-08-08 실측: 5월 시딩값이 naver_snapshot과 이미 8/3부터
        // 어긋나 있었는데 그날 이후 naver 쪽 숫자가 안 바뀌어 계속 스킵됨).
        data.consensus?.avg_target_krw === snap.avg_target_krw;
      if (isSame) {
        console.log(`[skip] ${slug}: 변화 없음`);
        continue;
      }
      data.naver_snapshot = snap;
      // 메인 카드(평균 목표가)도 여기서 같이 갱신 — 안 그러면 consensus.avg_target_krw가
      // brokers 배열 최초 시딩 시점(2026-05)에 영원히 고정됨. 실측(8/8): 삼성전자 33.8만원
      // (5월 고정값) vs 네이버 실제 49.3만원 — 46% 괴리.
      // median/max/min/opinion_count/brokers/opinion_distribution 은 PDF 리포트에서만
      // 나오는 값이라 자동 갱신이 불가능했고, 평균만 갱신되자 "평균 > 최고" 라는 산술적
      // 모순이 3종목 전부에 노출됐다 → 2026-08-08 형님 지시로 데이터·화면에서 전부 제거.
      // 이 스크립트가 채우는 값만 사이트에 남아 있으므로 여기 없는 필드는 되살리지 말 것.
      data.consensus.avg_target_krw = snap.avg_target_krw;
      // history 보강: 같은 날 동일 avg면 추가 안 함
      const today = new Date().toISOString().slice(0, 10);
      const lastHist = data.history?.[data.history.length - 1];
      if (!lastHist || lastHist.date !== today || lastHist.avg_target_krw !== snap.avg_target_krw) {
        data.history = data.history || [];
        // opinion_count 는 리포트 파생값이라 매 스냅샷에 같은 수가 복사되기만 했음
        // → 표시도 안 하고 의미도 없어 기록 중단(2026-08-08).
        data.history.push({
          date: today,
          avg_target_krw: snap.avg_target_krw,
        });
        if (data.history.length > 60) data.history = data.history.slice(-60);
      }
      data.updated_at = new Date().toISOString();
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n", "utf8");
      console.log(`[ok] ${slug}: avg=${snap.avg_target_krw} 평점=${snap.opinion_score}(${snap.opinion_label})`);
      changed += 1;
    } catch (e) {
      console.error(`[err] ${slug}:`, e.message);
      failed += 1;
    }
  }
  console.log(`[done] ${changed}/${TARGETS.length} 갱신`);
  if (failed === TARGETS.length) {
    console.error("All tickers failed — exiting 1 (조용한 실패 방지)");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
