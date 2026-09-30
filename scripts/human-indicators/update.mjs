#!/usr/bin/env node
// 인물 지표(/poll, 홈) 자동 업데이트 — 전인구경제연구소 채널의 "새 영상 여부"를 매일 체크.
//
// 파이프라인:
//   1. 채널 RSS(무료, 인증 불필요, 최대 15건 제공)로 last_checked_video_id 이후 올라온
//      영상을 전부(1건이 아니라) 후보로 잡음. ⚠️ 2026-09-20 수정: 예전엔 매번 "최신 1건"만
//      확인해서, 크론 주기(하루 1회) 안에 여러 건이 올라오면(전인구 채널은 하루 1~3건)
//      최신 1건 외 나머지가 영구 누락됐음(9/8~9/19 사이 13건 유실 확인).
//   2. 새 영상이면 yt-dlp로 자동 자막(json3)을 받아 텍스트 추출.
//      ⚠️ 2026-09-27 수정: 예전엔 watch 페이지를 Playwright로 열어 스크립트 패널에서
//      추출했는데, YouTube의 get_transcript 엔드포인트가 영구적으로 400
//      FAILED_PRECONDITION을 반환하기 시작해 완전히 막힘(대표님 맥에서도 재현). 대체 경로로
//      timedtext를 직접 curl/fetch로 때리는 것도 서명 문제로 항상 빈 응답(2026-09-18 실측).
//      → yt-dlp(--write-auto-subs --sub-format json3)는 서버사이드 자막 파이프라인을 그대로
//      쓰기 때문에 안정적으로 동작(2026-09-27 이 맥에서 실측 확인). Playwright 의존성 제거.
//      ⚠️ yt-dlp가 "Sign in to confirm you're not a bot" 류의 에러를 반환하면 전면 차단으로
//      간주하고 즉시 중단(process.exit) — 개별 영상 재시도로 해결될 문제가 아님.
//      ⚠️ 2026-09-20 수정: 자막 추출이 실패해도 last_checked_video_id는 그 영상을 넘어
//      전진하지 않음(예전엔 실패해도 포인터가 전진해 해당 영상이 영구 유실됐음) — 대신
//      person.pending에 최대 MAX_TRANSCRIPT_ATTEMPTS회까지 재시도 대상으로 남김.
//   3. 증시 방향성 의견인지 + 어느 쪽인지 판정 — 키워드 매칭 대신 LLM을 쓰는 이유:
//      "하락은 없을 것"처럼 부정문에서 키워드만 보면 반대로 잘못 읽기 쉬움.
//      relevant가 아니면 아무것도 안 만들고 조용히 넘어감(지어내지 않음).
//      ⚠️ 2026-09-27 수정: ANTHROPIC_API_KEY가 있으면 기존 REST API(claude-haiku-4-5) 경로를
//      그대로 쓰고, 없으면(이 맥의 실제 운영 조건) 로컬 `claude` CLI(-p, model sonnet)를
//      호출하는 경로로 대체. 프롬프트/파싱 로직은 두 경로가 동일한 함수를 공유.
//   4. data/human_indicators.json 갱신 — opinions 배열 맨 앞에 추가, last_checked_video_id 기록.
//
// 백필(--backfill id1,id2,...): RSS lookback(15건)이나 실패 후 포기(person.pending 3회 초과)로
// person.opinions에 반영되지 못하고 유실된 과거 영상들을 지정한 videoId 목록으로 강제 재처리.
// 각 id는 메타데이터(제목/업로드일, yt-dlp로 조회)를 기준으로 오래된 것부터 처리하고, 이미
// opinions에 있는 영상(video_url 매칭)은 건너뜀. 목록 자체는 이 스크립트가 채널을 순회해
// 알아내지 않고 호출 시점에 명시적으로 넘겨받음(재현 가능성을 위해 — 어떤 영상이 백필됐는지
// 커맨드 자체에 기록으로 남도록).
//   예: node update.mjs --backfill nvyI5duc1M4,PE2ncHdM20w,340aKFGvt08
//
// 실행: node scripts/human-indicators/update.mjs (Node 의존성 없음 — npm install 불필요,
// 시스템에 yt-dlp(+deno)와 claude CLI 또는 ANTHROPIC_API_KEY 필요)
// GitHub Actions: .github/workflows/update-human-indicators.yml (2026-09-27부로 스케줄 제거,
// 실제 정기 실행은 이 맥의 launchd: com.claude-bot.kr-stocks-human-indicators, 매일 21:00 KST)

import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
const CLAUDE_MODEL = "claude-haiku-4-5-20251001"; // REST API 경로(ANTHROPIC_API_KEY 있을 때만)

// 로컬 claude CLI 경로/모델 — ANTHROPIC_API_KEY가 없을 때(이 맥의 실제 운영 조건) 사용.
const CLAUDE_CLI_PATH = process.env.CLAUDE_CLI_PATH || "/Users/trollman/.local/bin/claude";
const CLAUDE_CLI_MODEL = "sonnet";
const CLAUDE_CLI_TIMEOUT_MS = 180_000;

// yt-dlp 경로 — launchd 환경엔 /opt/homebrew/bin이 PATH에 없어서 절대경로 필요.
const YTDLP_PATH = process.env.YTDLP_PATH || "/opt/homebrew/bin/yt-dlp";
const YTDLP_TIMEOUT_MS = 90_000;
const YTDLP_META_TIMEOUT_MS = 30_000;

// 자막 추출(또는 분류) 실패 영상을 몇 번까지 재시도할지(캡션 미처리 영상은 하루 뒤 재시도하면 대개
// 풀림, 영구히 자막이 없는 영상도 있어 무한 재시도는 하지 않음 — 3일 지나면 포기).
const MAX_TRANSCRIPT_ATTEMPTS = 3;

// 영상 처리 사이 최소 대기(레이트리밋/차단 방지) — 백필처럼 여러 건을 몰아서 처리할 때 특히 중요.
const MIN_DELAY_BETWEEN_VIDEOS_MS = 10_000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ────────────────────────────────────────────────────────────
// 공용: 자식 프로세스 실행(타임아웃 포함)
// ────────────────────────────────────────────────────────────
function runCommand(cmd, args, { cwd, timeoutMs, input } = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      clearTimeout(timer);
      rejectPromise(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        rejectPromise(new Error(`${cmd} timeout after ${timeoutMs}ms`));
        return;
      }
      if (code === 0) {
        resolvePromise({ stdout, stderr });
      } else {
        const err = new Error(`${cmd} exited ${code}: ${stderr.slice(-800) || stdout.slice(-800)}`);
        err.stdout = stdout;
        err.stderr = stderr;
        rejectPromise(err);
      }
    });

    if (input != null) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

// yt-dlp가 전면 차단(로그인 요구) 신호를 주면 개별 영상 재시도로 해결될 문제가 아니므로
// 즉시 전체 실행을 중단하고 사람이 확인하도록 함. process.exit를 여기서 바로 부르면 finally의
// 임시 디렉토리 정리가 안 되므로 전용 에러를 던지고 main()에서 저장 없이 exit(2).
// (yt-dlp는 차단 시 대개 non-zero로 종료하므로 성공/실패 양쪽 출력 모두 검사해야 함.)
class YtdlpHardBlockError extends Error {}
function checkYtdlpHardBlock(text) {
  if (/sign in to confirm|confirm you.re not a bot/i.test(text || "")) {
    throw new YtdlpHardBlockError(`yt-dlp 로그인 요구(차단) 응답: ${String(text).slice(-600)}`);
  }
}

// 날짜는 KST 기준 YYYY-MM-DD로 통일(RSS published/yt-dlp upload_date는 UTC 기준이라
// 한국 오전 9시 이전 업로드분이 전날로 찍히는 문제 방지).
function toKstDate(isoOrEpochSec) {
  const ms = typeof isoOrEpochSec === "number" ? isoOrEpochSec * 1000 : Date.parse(isoOrEpochSec);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms + 9 * 3600_000).toISOString().slice(0, 10);
}

// yt-dlp 실행 — 실패(non-zero) 출력에서도 차단 여부를 검사.
async function runYtdlp(cmd, args, opts) {
  try {
    return await runCommand(cmd, args, opts);
  } catch (e) {
    checkYtdlpHardBlock(`${e.stderr ?? ""}${e.stdout ?? ""}${e.message ?? ""}`);
    throw e;
  }
}

// ────────────────────────────────────────────────────────────
// RSS — 최근 영상 목록(최대 15건, 최신순)
// ────────────────────────────────────────────────────────────
async function fetchRecentVideos(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`RSS ${channelId} HTTP ${res.status}`);
  const xml = await res.text();
  const entries = [...xml.matchAll(/<entry>[\s\S]*?<\/entry>/g)].map((m) => m[0]);
  return entries
    .map((entry) => {
      const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      const title = entry.match(/<title>([^<]*)<\/title>/)?.[1];
      const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
      if (!videoId || !title) return null;
      return {
        videoId,
        title: decodeEntities(title),
        date: published ? toKstDate(published) || published.slice(0, 10) : "",
        // published_at은 항상 toISOString() 형식(…Z)으로 통일 — 같은 날짜 정렬 시 문자열 비교.
        published_at: published && Number.isFinite(Date.parse(published))
          ? new Date(Date.parse(published)).toISOString()
          : "",
      };
    })
    .filter(Boolean);
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
// yt-dlp — 영상 메타데이터(제목/업로드일) 조회. 백필 시 정렬/표기용.
// (채널 /videos 탭 --flat-playlist 결과는 제목이 영어로 번역되어 나오는 경우가 있어
//  단건 조회로 원문(한국어) 제목을 받아옴 — 2026-09-27 실측 확인.)
// ────────────────────────────────────────────────────────────
async function fetchVideoMeta(videoId) {
  const { stdout, stderr } = await runYtdlp(
    YTDLP_PATH,
    [
      "--skip-download",
      "--no-warnings",
      "--print",
      "%(timestamp)s|||%(upload_date)s|||%(title)s",
      `https://www.youtube.com/watch?v=${videoId}`,
    ],
    { timeoutMs: YTDLP_META_TIMEOUT_MS },
  );
  checkYtdlpHardBlock(stderr + stdout);
  const line = stdout.trim().split("\n")[0] ?? "";
  const parts = line.split("|||");
  if (parts.length < 3) throw new Error(`메타데이터 파싱 실패(${videoId}): ${line.slice(0, 200)}`);
  const [tsRaw, uploadDate, ...titleParts] = parts; // timestamp(epoch초) | YYYYMMDD(UTC) | 제목
  const title = titleParts.join("|||").trim();
  const ts = Number(tsRaw);
  const hasTs = /^\d+$/.test(tsRaw.trim()) && Number.isFinite(ts);
  const date = hasTs
    ? toKstDate(ts)
    : /^\d{8}$/.test(uploadDate.trim())
      ? `${uploadDate.slice(0, 4)}-${uploadDate.slice(4, 6)}-${uploadDate.slice(6, 8)}`
      : "";
  const published_at = hasTs ? new Date(ts * 1000).toISOString() : "";
  return { videoId, title, date, published_at };
}

// ────────────────────────────────────────────────────────────
// yt-dlp — 자막 추출(자동 자막 우선, json3) — Playwright 스크립트 패널 대체.
// ────────────────────────────────────────────────────────────
async function fetchTranscript(videoId) {
  let dir;
  try {
    dir = await mkdtemp(join(tmpdir(), "human-indicators-ytdlp-"));
    const { stdout, stderr } = await runYtdlp(
      YTDLP_PATH,
      [
        "--skip-download",
        "--write-auto-subs",
        "--write-subs",
        "--sub-langs",
        "ko.*,ko",
        "--sub-format",
        "json3",
        "-o",
        "%(id)s.%(ext)s",
        `https://www.youtube.com/watch?v=${videoId}`,
      ],
      { cwd: dir, timeoutMs: YTDLP_TIMEOUT_MS },
    );
    checkYtdlpHardBlock(stderr + stdout);

    const files = await readdir(dir);
    // "ko.*,ko" 매칭으로 ko-orig(원본 자동자막)/ko(번역·표준 자동자막) 등 변형이 여러 개
    // 생길 수 있음 — "ko.json3"를 우선하고, 없으면 ko로 시작하는 아무 json3나 사용.
    const preferred = files.find((f) => f === `${videoId}.ko.json3`);
    const fallback = files.find((f) => f.startsWith(`${videoId}.ko`) && f.endsWith(".json3"));
    const target = preferred ?? fallback;
    if (!target) {
      console.error(
        `[human-indicators] yt-dlp 자막 파일 없음(${videoId}) — files: ${files.join(", ") || "(없음)"}`,
      );
      return null;
    }

    const raw = await readFile(join(dir, target), "utf8");
    const parsed = JSON.parse(raw);
    const text = (parsed.events ?? [])
      .flatMap((e) => e.segs ?? [])
      .map((s) => s.utf8 ?? "")
      .join("")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!(text && text.length > 200)) {
      console.error(`[human-indicators] yt-dlp 자막 텍스트 너무 짧음(${videoId}) — textLen=${text.length}`);
      return null;
    }
    return text.slice(0, 12000);
  } catch (e) {
    if (e instanceof YtdlpHardBlockError) throw e;
    console.error(`[human-indicators] transcript fetch 실패(${videoId}):`, e.message);
    return null;
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true });
  }
}

// ────────────────────────────────────────────────────────────
// Claude — 증시 관련 여부 + 방향성 판정 (REST API 또는 로컬 CLI)
// ────────────────────────────────────────────────────────────
// 분류 "실패"(CLI/API 오류·타임아웃·JSON 형식 불량)는 "증시 무관" 판정과 구분 — 실패를
// 무관으로 취급하면 해당 영상이 조용히 영구 스킵되므로, 실패는 자막 실패와 똑같이
// person.pending에 남겨 다음 실행 때 재시도(최대 MAX_TRANSCRIPT_ATTEMPTS회). 어느 쪽이든
// opinions에는 아무것도 추가하지 않음(지어내지 않음).
const ANALYSIS_ERROR = Object.freeze({ is_market_relevant: false, error: true });

function buildAnalysisPrompt(transcript, title) {
  return `다음은 한국 경제 유튜브 채널의 영상 자막입니다.

제목: ${title}

이 영상이 "한국 또는 미국 증시/주식시장의 방향성(오를지 내릴지)"에 대한 화자 본인의 의견을 담고
있는지 판단해줘. 부동산, 개별 종목 소개, 세금, 연금 등 증시 방향성과 무관한 주제면 false로.

반드시 아래 JSON 형식으로만, 다른 텍스트 없이 답해:
{"is_market_relevant": boolean, "stance": "bullish"|"bearish"|"cautious"|"neutral", "summary": "실제 발언 내용만 2문장 이내 한국어 요약, 추측·과장 금지", "summary_short": "10자 내외 핵심 한 줄"}

is_market_relevant가 false면 나머지 필드는 빈 문자열로.

자막:
${transcript}`;
}

function parseAnalysisJson(raw, sourceLabel) {
  const jsonMatch = (raw ?? "").match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error(`[human-indicators] ${sourceLabel} 응답에서 JSON 못 찾음:`, (raw ?? "").slice(0, 200));
    return ANALYSIS_ERROR;
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const validStances = ["bullish", "bearish", "cautious", "neutral"];
    if (
      typeof parsed.is_market_relevant !== "boolean" ||
      (parsed.is_market_relevant &&
        (!validStances.includes(parsed.stance) ||
          typeof parsed.summary !== "string" ||
          !parsed.summary.trim() ||
          typeof parsed.summary_short !== "string" ||
          !parsed.summary_short.trim()))
    ) {
      console.error(`[human-indicators] ${sourceLabel} 응답 형식이 기대와 다름 — 스킵:`, parsed);
      return ANALYSIS_ERROR;
    }
    return parsed;
  } catch (e) {
    console.error(`[human-indicators] ${sourceLabel} JSON 파싱 실패 — 스킵:`, e.message);
    return ANALYSIS_ERROR;
  }
}

async function analyzeViaRestApi(prompt) {
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
    return ANALYSIS_ERROR;
  }

  const data = await res.json();
  const raw = data?.content?.[0]?.text ?? "";
  return parseAnalysisJson(raw, "Claude API");
}

// ANTHROPIC_API_KEY 없을 때(이 맥의 실제 운영 조건) 로컬 claude CLI로 대체.
// - cwd를 임시 디렉토리로 둬서 프로젝트 CLAUDE.md/설정을 로드하지 않게 함.
// - --safe-mode로 CLAUDE.md/skills/plugins/hooks/MCP를 전부 비활성화(이중 방어).
// - --tools ""로 내장 도구를 전부 비활성화해 순수 텍스트 분류만 하도록 강제.
// - --no-session-persistence로 세션 기록을 남기지 않음(매일 호출 누적 방지).
// - stdin으로 프롬프트를 넘겨 커맨드라인 인자 파싱 문제(가변 인자 옵션이 프롬프트까지
//   삼켜버리는 문제, 2026-09-27 실측)를 피함.
async function analyzeViaClaudeCli(prompt) {
  let dir;
  try {
    dir = await mkdtemp(join(tmpdir(), "human-indicators-claude-"));
    const { stdout, stderr } = await runCommand(
      CLAUDE_CLI_PATH,
      [
        "-p",
        "--model",
        CLAUDE_CLI_MODEL,
        "--output-format",
        "json",
        "--safe-mode",
        "--no-session-persistence",
        "--tools",
        "",
      ],
      { cwd: dir, timeoutMs: CLAUDE_CLI_TIMEOUT_MS, input: prompt },
    );

    let envelope;
    try {
      envelope = JSON.parse(stdout);
    } catch (e) {
      console.error("[human-indicators] Claude CLI 응답 JSON 파싱 실패:", e.message, stderr.slice(0, 300));
      return ANALYSIS_ERROR;
    }
    if (envelope.is_error || envelope.subtype !== "success") {
      console.error("[human-indicators] Claude CLI 오류:", envelope.subtype, String(envelope.result).slice(0, 300));
      return ANALYSIS_ERROR;
    }
    return parseAnalysisJson(envelope.result ?? "", "Claude CLI");
  } catch (e) {
    console.error("[human-indicators] Claude CLI 실행 실패:", e.message);
    return ANALYSIS_ERROR;
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true });
  }
}

async function analyzeTranscript(transcript, title) {
  const prompt = buildAnalysisPrompt(transcript, title);
  if (ANTHROPIC_API_KEY) {
    return analyzeViaRestApi(prompt);
  }
  return analyzeViaClaudeCli(prompt);
}

// ────────────────────────────────────────────────────────────
// 백필: CLI 인자로 넘겨받은 videoId 목록을 메타데이터 기준 오래된 순으로 정렬.
// ────────────────────────────────────────────────────────────
function parseBackfillArg(argv) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--backfill" && argv[i + 1]) return argv[i + 1];
    if (argv[i].startsWith("--backfill=")) return argv[i].slice("--backfill=".length);
  }
  return null;
}

async function buildBackfillCandidates(csv, existingVideoIds) {
  const ids = [...new Set(csv.split(",").map((s) => s.trim()).filter(Boolean))].filter(
    (id) => !existingVideoIds.has(id),
  );
  if (ids.length === 0) return [];

  console.log(`[human-indicators] 백필 대상 ${ids.length}건 메타데이터 조회 중...`);
  const metas = [];
  for (const id of ids) {
    try {
      const meta = await fetchVideoMeta(id);
      metas.push(meta);
    } catch (e) {
      if (e instanceof YtdlpHardBlockError) throw e;
      console.error(`[human-indicators] 백필 메타데이터 조회 실패(${id}):`, e.message);
      // 메타데이터를 못 얻어도 처리는 시도(제목/날짜 없이) — 정렬은 맨 뒤로.
      metas.push({ videoId: id, title: "", date: "", published_at: "" });
    }
    await sleep(1500); // 메타데이터 조회끼리도 과도하게 몰아치지 않도록 소폭 대기.
  }
  metas.sort((a, b) => (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99"));
  return metas;
}

// ────────────────────────────────────────────────────────────
// main
// ────────────────────────────────────────────────────────────
async function main() {
  const store = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  let changed = false;

  const backfillCsv = parseBackfillArg(process.argv.slice(2));

  for (const cfg of PEOPLE) {
    const person = store.people.find((p) => p.id === cfg.id);
    if (!person) {
      console.error(`[human-indicators] data/human_indicators.json에 ${cfg.id} 없음 — 스킵`);
      continue;
    }
    if (!Array.isArray(person.pending)) person.pending = [];

    const existingVideoIds = new Set(
      person.opinions.map((o) => o.video_url?.match(/[?&]v=([^&]+)/)?.[1]).filter(Boolean),
    );

    console.log(`[${cfg.id}] RSS 확인 중...`);
    let recent;
    try {
      recent = await fetchRecentVideos(cfg.channelId);
    } catch (e) {
      console.error(`[${cfg.id}] RSS 조회 실패:`, e.message);
      recent = [];
    }

    // last_checked_video_id보다 최신인 영상을 전부 신규 후보로 잡음(최신순 배열이므로
    // 그 위치 이전 구간 = 더 최신). RSS lookback(15건) 밖으로 밀려나 못 찾거나(장기간
    // 미실행 등) 처음 등록되는 인물이면 RSS 전체(최대 15건)를 후보로 봄 — ⚠️ 2026-09-28 수정:
    // 예전엔 이 경우 최신 1건만 잡아 나머지가 조용히 유실됐음. 15건 × 10초 간격이면 충분히
    // 감당 가능하고, 이미 opinions에 있는 영상은 아래에서 제외됨.
    let newCandidates = [];
    if (recent.length === 0) {
      console.log(`[${cfg.id}] RSS에서 영상 못 찾음 — 신규 후보 없음(백필/pending은 계속 진행)`);
    } else {
      const lastIdx = person.last_checked_video_id
        ? recent.findIndex((v) => v.videoId === person.last_checked_video_id)
        : -1;
      newCandidates = (lastIdx === -1 ? [...recent] : recent.slice(0, lastIdx)).filter(
        (v) => !existingVideoIds.has(v.videoId),
      );
      newCandidates.reverse(); // 오래된 것부터 처리(의견 목록에 시간순으로 쌓이도록)
    }

    // 자막 추출 실패로 재시도 대기 중인 영상 + 신규 후보를 합침(중복 제거).
    const pendingIds = new Set(person.pending.map((p) => p.videoId));
    let candidates = [
      ...person.pending.map(({ videoId, title, date, published_at }) => ({ videoId, title, date, published_at })),
      ...newCandidates.filter((v) => !pendingIds.has(v.videoId)),
    ];

    // 백필: 명시적으로 지정된 videoId 목록을 오래된 순으로 추가(이미 opinions에 있거나
    // 이미 위 candidates에 포함된 건 제외).
    if (backfillCsv) {
      const alreadyQueued = new Set([...existingVideoIds, ...candidates.map((c) => c.videoId)]);
      const backfillCandidates = await buildBackfillCandidates(backfillCsv, alreadyQueued);
      if (backfillCandidates.length > 0) {
        console.log(`[${cfg.id}] 백필 후보 ${backfillCandidates.length}건 추가(오래된 순)`);
        candidates = [...backfillCandidates, ...candidates];
      }
    }

    if (recent.length > 0) {
      // RSS에서 확인한 범위는 여기까지 — last_checked_video_id를 최신으로 전진. 개별 영상의
      // 성공/실패와는 무관(실패분은 아래에서 person.pending에 남아 다음 실행 때 재시도됨).
      person.last_checked_video_id = recent[0].videoId;
      changed = true;
    }

    if (candidates.length === 0) {
      console.log(`[${cfg.id}] 새 영상 없음${recent[0] ? ` (최신=${recent[0].videoId})` : ""}`);
      continue;
    }

    console.log(`[${cfg.id}] 처리 대상 ${candidates.length}건 (재시도 대기 ${person.pending.length}건 포함)`);

    for (let i = 0; i < candidates.length; i++) {
      const video = candidates[i];
      const pendingEntry = person.pending.find((p) => p.videoId === video.videoId);
      const attempts = pendingEntry?.attempts ?? 0;
      console.log(`[${cfg.id}] 처리 중: "${video.title}" (${video.videoId})`);

      const transcript = await fetchTranscript(video.videoId);
      const analysis = transcript ? await analyzeTranscript(transcript, video.title) : null;
      if (!transcript || analysis.error) {
        const stage = transcript ? "분류" : "자막 추출";
        const nextAttempts = attempts + 1;
        if (nextAttempts >= MAX_TRANSCRIPT_ATTEMPTS) {
          console.log(`[${cfg.id}] ${stage} ${nextAttempts}회 실패 — 포기 (${video.videoId})`);
          person.pending = person.pending.filter((p) => p.videoId !== video.videoId);
        } else {
          console.log(`[${cfg.id}] ${stage} 실패(${nextAttempts}/${MAX_TRANSCRIPT_ATTEMPTS}) — 다음 실행 때 재시도 (${video.videoId})`);
          if (pendingEntry) {
            pendingEntry.attempts = nextAttempts;
          } else {
            person.pending.push({
              videoId: video.videoId,
              title: video.title,
              date: video.date,
              published_at: video.published_at ?? "",
              attempts: nextAttempts,
            });
          }
        }
        changed = true;
        if (i < candidates.length - 1) await sleep(MIN_DELAY_BETWEEN_VIDEOS_MS);
        continue;
      }

      if (pendingEntry) {
        person.pending = person.pending.filter((p) => p.videoId !== video.videoId);
      }
      changed = true;

      if (!analysis.is_market_relevant) {
        console.log(`[${cfg.id}] 증시 방향성 의견 아님 — opinions 추가 안 함 (${video.videoId})`);
        if (i < candidates.length - 1) await sleep(MIN_DELAY_BETWEEN_VIDEOS_MS);
        continue;
      }

      const opinion = {
        date: video.date,
        title: video.title,
        summary: analysis.summary.trim(),
        summary_short: analysis.summary_short.trim(),
        stance: analysis.stance,
        video_url: `https://www.youtube.com/watch?v=${video.videoId}`,
      };
      if (video.published_at) opinion.published_at = video.published_at;
      person.opinions.unshift(opinion);
      // 최신순 정렬 유지 — 백필은 과거 영상을 나중에 넣으므로 단순 unshift만 하면 /poll·홈이
      // 쓰는 opinions[0]이 최신이 아니게 됨. date(KST) 내림차순, 같은 날짜면 published_at
      // 내림차순, 둘 다 없으면 기존 순서 유지(stable sort).
      person.opinions.sort((a, b) => {
        const d = (b.date || "").localeCompare(a.date || "");
        if (d !== 0) return d;
        if (a.published_at && b.published_at) return b.published_at.localeCompare(a.published_at);
        return 0;
      });
      // 최근 10건만 유지 (무한정 쌓이는 것 방지, /poll 페이지는 최신 1건만 쓰지만 이력 목적)
      person.opinions = person.opinions.slice(0, 10);
      console.log(`[${cfg.id}] 새 의견 추가: ${analysis.stance} — ${analysis.summary_short}`);

      if (i < candidates.length - 1) await sleep(MIN_DELAY_BETWEEN_VIDEOS_MS);
    }
  }

  if (changed) {
    writeFileSync(DATA_PATH, JSON.stringify(store, null, 2) + "\n", "utf8");
    console.log("[human-indicators] data/human_indicators.json 저장 완료");
  } else {
    console.log("[human-indicators] 변경 없음");
  }
}

main().catch((err) => {
  if (err instanceof YtdlpHardBlockError) {
    // 저장하지 않고 종료 — last_checked_video_id 전진/pending 변화가 반영되지 않으므로
    // 차단이 풀린 뒤 다음 실행에서 같은 영상들을 그대로 다시 처리함.
    console.error("[human-indicators] ⚠️ yt-dlp 차단 감지 — 저장 없이 중단:", err.message);
    process.exit(2);
  }
  console.error("[human-indicators] 오류:", err);
  process.exit(1);
});
