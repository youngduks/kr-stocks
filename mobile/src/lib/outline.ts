// 규칙 기반 실시간 정리.
//
// LLM 없이 자막에서 바로 만드는 정리본이다. 녹음 중에는 이걸 화면에 띄운다.
// 네트워크도 모델도 타지 않으므로 지연이 사실상 0이고, 비용도 0이다.
//
// 품질의 한계는 분명하다. 이건 "추출"이지 "재서술"이 아니다. 말한 문장을 골라
// 분류할 뿐, 문장을 다시 쓰지는 못한다. 재서술은 녹음이 끝난 뒤 온디바이스
// LLM(appleLlm.ts)이 맡는다.

import {
  classifySentence,
  extractKeywords,
  isFiller,
  looksQuotable,
  scoreSentence,
  splitSentences,
  trimTail,
  type SentenceKind,
} from "./korean";
import { formatClock } from "./format";
import type { LiveSummary, Segment, VoiceMode } from "../types";

export type OutlineSentence = {
  text: string;
  atMs: number;
  kind: SentenceKind;
  score: number;
};

/** 주제 블록 개수. 너무 잘게 나누면 목차가 아니라 소음이 된다. */
const MIN_BLOCKS = 1;
const MAX_BLOCKS = 8;
const MINUTES_PER_BLOCK = 5;
/** 블록마다 보여줄 문장 수. */
const POINTS_PER_BLOCK = 3;

export function toSentences(segments: Segment[]): OutlineSentence[] {
  const raw: { text: string; atMs: number }[] = [];
  for (const seg of segments) {
    for (const text of splitSentences(seg.text)) {
      if (!isFiller(text)) raw.push({ text, atMs: seg.atMs });
    }
  }

  const keywords = extractKeywords(
    raw.map((r) => r.text),
    12,
  );

  return raw.map((r) => ({
    text: r.text,
    atMs: r.atMs,
    kind: classifySentence(r.text),
    score: scoreSentence(r.text, keywords),
  }));
}

function blockCount(durationMs: number): number {
  const byTime = Math.ceil(durationMs / 60000 / MINUTES_PER_BLOCK);
  return Math.max(MIN_BLOCKS, Math.min(MAX_BLOCKS, byTime));
}

function dedupe(items: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    // 앞 12자가 같으면 같은 말의 반복으로 본다. STT는 같은 문장을 자주 겹쳐 낸다.
    const key = item.slice(0, 12);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/** 자막에서 바로 만드는 정리본. 서버 요약과 같은 모양이라 화면을 그대로 쓴다. */
export function buildOutline(
  segments: Segment[],
  mode: VoiceMode,
  durationMs: number,
): LiveSummary {
  const sentences = toSentences(segments);
  if (sentences.length === 0) {
    return {
      headline: "",
      topics: [],
      decisions: [],
      actionItems: [],
      quotes: [],
      openQuestions: [],
      keywords: [],
    };
  }

  const keywords = extractKeywords(
    sentences.map((s) => s.text),
    5,
  );

  // 주제 블록 — 시간순으로 쪼개고, 각 블록에서 점수 높은 문장을 뽑는다.
  const blocks = blockCount(durationMs || sentences[sentences.length - 1].atMs);
  const span = Math.max(1, (durationMs || 1) / blocks);
  const buckets: OutlineSentence[][] = Array.from({ length: blocks }, () => []);
  for (const s of sentences) {
    const i = Math.min(blocks - 1, Math.floor(s.atMs / span));
    buckets[i].push(s);
  }

  const topics = buckets
    .map((bucket, i) => {
      const meaty = bucket.filter((s) => s.kind !== "question");
      if (meaty.length === 0) return null;

      const blockKeywords = extractKeywords(
        bucket.map((s) => s.text),
        2,
      );
      const title =
        blockKeywords.length > 0
          ? blockKeywords.join(" · ")
          : `${formatClock(i * span)} 이후`;

      const points = dedupe(
        [...meaty]
          .sort((a, b) => b.score - a.score)
          .map((s) => trimTail(s.text)),
        POINTS_PER_BLOCK,
      );
      return points.length > 0 ? { title, points } : null;
    })
    .filter((t): t is { title: string; points: string[] } => t !== null);

  const decisions = dedupe(
    sentences.filter((s) => s.kind === "decision").map((s) => trimTail(s.text)),
    8,
  );

  const actionItems = dedupe(
    sentences.filter((s) => s.kind === "action").map((s) => trimTail(s.text)),
    10,
  ).map((text) => ({ text, owner: "" }));

  const openQuestions = dedupe(
    sentences.filter((s) => s.kind === "question").map((s) => trimTail(s.text)),
    8,
  );

  const quotes =
    mode === "interview"
      ? dedupe(
          sentences
            .filter((s) => looksQuotable(s.text))
            .sort((a, b) => b.score - a.score)
            .map((s) => trimTail(s.text)),
          6,
        ).map((text) => ({ speaker: "", text }))
      : [];

  // 한 줄 요약은 만들 수 없다(재서술이 필요하므로). 대신 가장 점수 높은 문장을 얹는다.
  const top = [...sentences].sort((a, b) => b.score - a.score)[0];

  return {
    headline: top ? trimTail(top.text) : "",
    topics,
    decisions,
    actionItems,
    quotes,
    openQuestions,
    keywords,
  };
}

function pack(
  sentences: OutlineSentence[],
  maxCharsPerBlock: number,
): string[] {
  const blocks: string[] = [];
  let current = "";
  for (const s of sentences) {
    const line = `[${formatClock(s.atMs)}] ${trimTail(s.text)}`;
    if (current.length + line.length + 1 > maxCharsPerBlock && current) {
      blocks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

/**
 * 온디바이스 LLM에 넘길 자막 블록.
 *
 * Apple Foundation Models는 컨텍스트가 4,096토큰으로 고정이라 녹취록을 통째로 넣을
 * 수 없고, 블록 하나당 호출이 한 번이라 블록 수가 곧 대기 시간이다.
 *
 * 그래서 **필요할 때만** 버린다. 블록 수가 한도 안에 들어오면 문장을 하나도 버리지
 * 않고, 넘칠 때만 점수 낮은 문장부터 덜어낸다. 모델이 못 본 내용은 정리에도 없으니
 * 압축은 마지막 수단이다.
 */
export function buildDigest(
  segments: Segment[],
  maxCharsPerBlock: number,
  maxBlocks: number,
): { blocks: string[]; kept: number; dropped: number } {
  const sentences = toSentences(segments).filter((s) => s.score > 0);
  if (sentences.length === 0) return { blocks: [], kept: 0, dropped: 0 };

  const blocks = pack(sentences, maxCharsPerBlock);
  if (blocks.length <= maxBlocks) {
    return { blocks, kept: sentences.length, dropped: 0 };
  }

  // 점수 내림차순으로 살릴 문장을 고르되, 넣을 때는 시간순을 복원한다.
  const byScore = [...sentences].sort((a, b) => b.score - a.score);
  for (let ratio = 0.9; ratio >= 0.2; ratio -= 0.1) {
    const n = Math.max(1, Math.floor(sentences.length * ratio));
    const survivors = new Set(byScore.slice(0, n));
    const candidate = sentences.filter((s) => survivors.has(s));
    const packed = pack(candidate, maxCharsPerBlock);
    if (packed.length <= maxBlocks) {
      return {
        blocks: packed,
        kept: candidate.length,
        dropped: sentences.length - candidate.length,
      };
    }
  }

  // 여기까지 왔으면 아주 긴 녹음이다. 한도만큼만 자른다.
  const truncated = blocks.slice(0, maxBlocks);
  return { blocks: truncated, kept: sentences.length, dropped: 0 };
}
