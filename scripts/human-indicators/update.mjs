#!/usr/bin/env node
// 인물 지표(/poll, 홈) 자동 업데이트 — 전인구경제연구소 채널의 "새 영상 여부"를 매일 체크.
//
// 파이프라인:
//   1. 채널 RSS(무료, 인증 불필요)로 최신 영상 확인 — 지난번과 같으면 여기서 종료.
//   2. 새 영상이면 watch 페이지를 Playwright로 열어 자막(스크립트 패널) 텍스트 추출.
//      → 직접 timedtext URL을 curl/fetch로 때리면 서명이 있어도 항상 빈 응답이 옴
//        (2026-09-18 실측, 헤더 다 붙여도 동일) — 실제 브라우저 렌더링이 필요해서
//        이 스크립트만 playwright에 의존(루트 package.json엔 안 넣음, Vercel 빌드 무관).
//   3. Claude Haiku로 "증시 방향성 의견인지 + 어느 쪽인지"만 판정 — 키워드 매칭 대신 LLM을
//      쓰는 이유: "하락은 없을 것"처럼 부정문에서 키워드만 보면 반대로 잘못 읽기 쉬움.
//      relevant가 아니면 아무것도 안 만들고 조용히 넘어감(지어내지 않음).
//   4. data/human_indicators.json 갱신 — opinions 배열 맨 앞에 추가, last_checked_video_id 기록.
//
// 실행: node scripts/human-indicators/update.mjs (이 디렉토리에서 먼저 npm install 필요)
// GitHub Actions: .github/workflows/update-human-indicators.yml

import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../.."); // repo root
const DATA_PATH = resolve(ROOT, "data/human_indicators.json");

const PEOPLE = [
  { id: "jeoningu", name: "전인구", channelId: "UCznImSIaxZR7fdLCICLdgaQ" },
];

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

// ────────────────────────────────────────────────────────────
// RSS — 최신 영상 1건
// ────────────────────────────────────────────────────────────
async function fetchLatestVideo(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`RSS ${channelId} HTTP ${res.status}`);
  const xml = await res.text();
  const entryMatch = xml.match(/<entry>[\s\S]*?<\/entry>/);
  if (!entryMatch) return null;
  const entry = entryMatch[0];
  const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
  const title = entry.match(/<title>([^<]*)<\/title>/)?.[1];
  const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
  if (!videoId || !title) return null;
  return {
    videoId,
    title: decodeEntities(title),
    date: (published ?? "").slice(0, 10),
  };
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ────────────────────────────────────────────────────────────
// Playwright — 자막 추출 (스크립트 패널 렌더링 방식만 안정적으로 동작함, 실측 확인)
// ────────────────────────────────────────────────────────────
async function fetchTranscript(videoId) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`https://www.youtube.com/watch?v=${videoId}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const clicked = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("button")];
      const btn = buttons.find((b) => (b.getAttribute("aria-label") || "").includes("스크립트"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (!clicked) return null;

    await page.waitForTimeout(2000);

    const text = await page.evaluate(() => {
      const segs = [...document.querySelectorAll("ytd-transcript-segment-renderer")];
      return segs
        .map((s) => s.textContent.trim())
        .filter(Boolean)
        .join(" ")
        // 세그먼트 텍스트가 타임스탬프+중복 렌더로 겹쳐 나오는 경우가 있어(예: "0:02 이제 그 뉴스 이제 그
        // 뉴스") 대략적인 정리만 함 — 완벽한 클린업은 아니고 LLM이 이해하는 데 지장 없는 수준이면 충분.
        .replace(/\d+:\d+(:\d+)?/g, "");
    });

    return text && text.length > 200 ? text.slice(0, 12000) : null;
  } catch (e) {
    console.error(`[human-indicators] transcript fetch 실패(${videoId}):`, e.message);
    return null;
  } finally {
    await browser.close();
  }
}

// ────────────────────────────────────────────────────────────
// Claude — 증시 관련 여부 + 방향성 판정
// ────────────────────────────────────────────────────────────
async function analyzeTranscript(transcript, title) {
  if (!ANTHROPIC_API_KEY) {
    console.error("[human-indicators] ANTHROPIC_API_KEY 없음 — 분석 스킵");
    return { is_market_relevant: false };
  }

  const prompt = `다음은 한국 경제 유튜브 채널의 영상 자막입니다.

제목: ${title}

이 영상이 "한국 또는 미국 증시/주식시장의 방향성(오를지 내릴지)"에 대한 화자 본인의 의견을 담고
있는지 판단해줘. 부동산, 개별 종목 소개, 세금, 연금 등 증시 방향성과 무관한 주제면 false로.

반드시 아래 JSON 형식으로만, 다른 텍스트 없이 답해:
{"is_market_relevant": boolean, "stance": "bullish"|"bearish"|"cautious"|"neutral", "summary": "실제 발언 내용만 2문장 이내 한국어 요약, 추측·과장 금지", "summary_short": "10자 내외 핵심 한 줄"}

is_market_relevant가 false면 나머지 필드는 빈 문자열로.

자막:
${transcript}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    console.error(`[human-indicators] Claude API HTTP ${res.status}`);
    return { is_market_relevant: false };
  }

  const data = await res.json();
  const raw = data?.content?.[0]?.text ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[human-indicators] Claude 응답에서 JSON 못 찾음:", raw.slice(0, 200));
    return { is_market_relevant: false };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const validStances = ["bullish", "bearish", "cautious", "neutral"];
    if (
      typeof parsed.is_market_relevant !== "boolean" ||
      (parsed.is_market_relevant && !validStances.includes(parsed.stance))
    ) {
      console.error("[human-indicators] Claude 응답 형식이 기대와 다름 — 스킵:", parsed);
      return { is_market_relevant: false };
    }
    return parsed;
  } catch (e) {
    console.error("[human-indicators] JSON 파싱 실패 — 스킵:", e.message);
    return { is_market_relevant: false };
  }
}

// ────────────────────────────────────────────────────────────
// main
// ────────────────────────────────────────────────────────────
async function main() {
  const store = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  let changed = false;

  for (const cfg of PEOPLE) {
    const person = store.people.find((p) => p.id === cfg.id);
    if (!person) {
      console.error(`[human-indicators] data/human_indicators.json에 ${cfg.id} 없음 — 스킵`);
      continue;
    }

    console.log(`[${cfg.id}] RSS 확인 중...`);
    const latest = await fetchLatestVideo(cfg.channelId);
    if (!latest) {
      console.log(`[${cfg.id}] RSS에서 영상 못 찾음 — 스킵`);
      continue;
    }

    if (person.last_checked_video_id === latest.videoId) {
      console.log(`[${cfg.id}] 새 영상 없음 (최신=${latest.videoId}, "${latest.title}")`);
      continue;
    }

    console.log(`[${cfg.id}] 새 영상 발견: "${latest.title}" (${latest.videoId})`);
    person.last_checked_video_id = latest.videoId;
    changed = true; // last_checked_video_id 갱신 자체가 변경이므로, 관련 여부와 무관하게 저장

    const transcript = await fetchTranscript(latest.videoId);
    if (!transcript) {
      console.log(`[${cfg.id}] 자막 추출 실패 — 이번 영상은 건너뜀 (다음 새 영상 때 재시도)`);
      continue;
    }

    const analysis = await analyzeTranscript(transcript, latest.title);
    if (!analysis.is_market_relevant) {
      console.log(`[${cfg.id}] 증시 방향성 의견 아님 — opinions 추가 안 함`);
      continue;
    }

    person.opinions.unshift({
      date: latest.date,
      title: latest.title,
      summary: analysis.summary,
      summary_short: analysis.summary_short,
      stance: analysis.stance,
      video_url: `https://www.youtube.com/watch?v=${latest.videoId}`,
    });
    // 최근 10건만 유지 (무한정 쌓이는 것 방지, /poll 페이지는 최신 1건만 쓰지만 이력 목적)
    person.opinions = person.opinions.slice(0, 10);
    console.log(`[${cfg.id}] 새 의견 추가: ${analysis.stance} — ${analysis.summary_short}`);
  }

  if (changed) {
    writeFileSync(DATA_PATH, JSON.stringify(store, null, 2) + "\n", "utf8");
    console.log("[human-indicators] data/human_indicators.json 저장 완료");
  } else {
    console.log("[human-indicators] 변경 없음");
  }
}

main().catch((err) => {
  console.error("[human-indicators] 오류:", err);
  process.exit(1);
});
