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

async function fetchNaverConsensus(code) {
  const url = `https://finance.naver.com/item/coinfo.naver?code=${code}&target=finsum_more`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Referer: "https://finance.naver.com/",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // 네이버 금융은 EUC-KR. fetch는 Content-Type 기준 디코딩이라 한글 깨질 수 있음 → 원시 바이트로
  const buf = new Uint8Array(await res.arrayBuffer());
  const decoder = new TextDecoder("euc-kr");
  const html = decoder.decode(buf);

  // 투자의견 정보 테이블 영역 추출
  const tableMatch = html.match(/투자의견 정보[\s\S]*?<\/table>/);
  if (!tableMatch) return null;
  const block = tableMatch[0];

  // 평점/의견: <span class="f_(up|down)"><em>4.04</em>매수</span>
  const ratingMatch = block.match(/<span class="f_(up|down|buy)"><em>([0-9.]+)<\/em>([^<]+)<\/span>/);
  const score = ratingMatch ? parseFloat(ratingMatch[2]) : null;
  const label = ratingMatch ? ratingMatch[3].trim() : null;

  // <em>로 둘러싸인 숫자 후보 (순서: 점수, 평균 목표가, 52주 최고, 52주 최저)
  const emNums = [...block.matchAll(/<em>([0-9,]+)<\/em>/g)].map((m) =>
    parseInt(m[1].replaceAll(",", ""), 10),
  );
  // 평점은 보통 첫 매칭이지만 위 정규식이 정수만 잡으므로 자동 제외됨
  const avgTarget = emNums[0] ?? null;
  const high52 = emNums[1] ?? null;
  const low52 = emNums[2] ?? null;

  return {
    opinion_score: score,
    opinion_label: label,
    avg_target_krw: avgTarget,
    high_52w_krw: high52,
    low_52w_krw: low52,
    source: "finance.naver.com",
    fetched_at: new Date().toISOString(),
  };
}

async function main() {
  let changed = 0;
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
        continue;
      }
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      const prev = data.naver_snapshot;
      const isSame =
        prev &&
        prev.opinion_score === snap.opinion_score &&
        prev.avg_target_krw === snap.avg_target_krw &&
        prev.high_52w_krw === snap.high_52w_krw &&
        prev.low_52w_krw === snap.low_52w_krw;
      if (isSame) {
        console.log(`[skip] ${slug}: 변화 없음`);
        continue;
      }
      data.naver_snapshot = snap;
      // history 보강: 같은 날 동일 avg면 추가 안 함
      const today = new Date().toISOString().slice(0, 10);
      const lastHist = data.history?.[data.history.length - 1];
      if (!lastHist || lastHist.date !== today || lastHist.avg_target_krw !== snap.avg_target_krw) {
        data.history = data.history || [];
        data.history.push({
          date: today,
          avg_target_krw: snap.avg_target_krw,
          opinion_count: data.consensus?.opinion_count ?? 0,
        });
        if (data.history.length > 60) data.history = data.history.slice(-60);
      }
      data.updated_at = new Date().toISOString();
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n", "utf8");
      console.log(`[ok] ${slug}: avg=${snap.avg_target_krw} 평점=${snap.opinion_score}(${snap.opinion_label})`);
      changed += 1;
    } catch (e) {
      console.error(`[err] ${slug}:`, e.message);
    }
  }
  console.log(`[done] ${changed}/${TARGETS.length} 갱신`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
