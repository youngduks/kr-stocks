import type { FinalNote, LiveSummary, Segment } from "../types";
import { MODE_LABEL, type VoiceMode } from "../types";

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}초`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}분`;
  return `${Math.floor(m / 60)}시간 ${m % 60}분`;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function transcriptText(segments: Segment[]): string {
  return segments.map((s) => s.text).join(" ");
}

/** 서버로 보낼 때는 타임스탬프를 붙여 모델이 순서/시점을 잡을 수 있게 한다. */
export function transcriptWithTimestamps(segments: Segment[]): string {
  return segments
    .map((s) => `[${formatClock(s.atMs)}] ${s.text}`)
    .join("\n");
}

/** 공유·복사용 텍스트. 최종 노트가 있으면 그 마크다운을, 없으면 라이브 요약을 쓴다. */
export function noteToShareText(args: {
  title: string;
  mode: VoiceMode;
  createdAt: number;
  durationSec: number;
  summary: LiveSummary | null;
  finalNote: FinalNote | null;
}): string {
  const { title, mode, createdAt, durationSec, summary, finalNote } = args;
  const header = `# ${title}\n\n${MODE_LABEL[mode]} · ${formatDate(
    createdAt,
  )} · ${formatDuration(durationSec)}\n`;

  if (finalNote) return `${header}\n${finalNote.markdown}`;

  const s = summary;
  if (!s) return header;

  const lines: string[] = [header];
  if (s.headline) lines.push(`## 한 줄 요약\n${s.headline}\n`);
  if (s.topics.length) {
    lines.push("## 논의 내용");
    for (const t of s.topics) {
      lines.push(`### ${t.title}`);
      lines.push(...t.points.map((p) => `- ${p}`));
      lines.push("");
    }
  }
  if (s.decisions.length) {
    lines.push("## 결정·확인된 사실");
    lines.push(...s.decisions.map((d) => `- ${d}`), "");
  }
  if (s.actionItems.length) {
    lines.push("## 할 일");
    lines.push(
      ...s.actionItems.map((a) => `- ${a.text}${a.owner ? ` (${a.owner})` : ""}`),
      "",
    );
  }
  if (s.quotes.length) {
    lines.push("## 주요 발언");
    lines.push(
      ...s.quotes.map((q) => `> ${q.text}${q.speaker ? `\n> — ${q.speaker}` : ""}`),
      "",
    );
  }
  if (s.openQuestions.length) {
    lines.push("## 남은 질문");
    lines.push(...s.openQuestions.map((q) => `- ${q}`), "");
  }
  return lines.join("\n");
}
