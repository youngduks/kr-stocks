// 정리 엔진 — 전부 기기 안에서 돈다. 네트워크도 API 키도 없다.
//
//  녹음 중  : 규칙 기반(outline.ts)으로 즉시 갱신. 지연 0, 비용 0.
//  녹음 종료: 온디바이스 LLM(appleLlm.ts)이 그 결과를 사람 문장으로 다시 쓴다.
//
// 실시간 층을 규칙 기반으로 빼 둔 덕에, 느린 온디바이스 모델을 녹음이 끝난 뒤
// 딱 한 번만 부르면 된다. 이게 이 구조의 핵심이다.

import { useCallback, useEffect, useRef, useState } from "react";
import { buildDigest, buildOutline } from "../lib/outline";
import {
  ENGINE_STATUS_MESSAGE,
  MAX_BLOCKS,
  MAX_CHARS_PER_BLOCK,
  getLocalEngineStatus,
  outlineAsFinalNote,
  refineNote,
  type LocalEngineStatus,
  type RefineProgress,
} from "../lib/appleLlm";
import { EMPTY_SUMMARY, type FinalNote, type LiveSummary, type Segment, type VoiceMode } from "../types";

/** 규칙 기반 정리를 다시 계산하는 주기. 순수 계산이라 짧아도 부담이 없다. */
const RECOMPUTE_MS = 1500;

export type FinalizeResult = { note: FinalNote; engine: "apple-llm" | "rules" };

export function useLocalSummary(mode: VoiceMode) {
  const [outline, setOutline] = useState<LiveSummary>(EMPTY_SUMMARY);
  const [engineStatus, setEngineStatus] = useState<LocalEngineStatus | null>(null);
  const [progress, setProgress] = useState<RefineProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const segmentsRef = useRef<Segment[]>([]);
  const elapsedRef = useRef(0);
  const lastCount = useRef(-1);

  useEffect(() => {
    let alive = true;
    void getLocalEngineStatus().then((s) => {
      if (alive) setEngineStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 자막이 늘어났을 때만 다시 계산한다.
  useEffect(() => {
    const t = setInterval(() => {
      const segments = segmentsRef.current;
      if (segments.length === lastCount.current) return;
      lastCount.current = segments.length;
      setOutline(buildOutline(segments, mode, elapsedRef.current));
    }, RECOMPUTE_MS);
    return () => clearInterval(t);
  }, [mode]);

  const sync = useCallback((segments: Segment[], elapsedMs: number) => {
    segmentsRef.current = segments;
    elapsedRef.current = elapsedMs;
  }, []);

  const finalize = useCallback(
    async (segments: Segment[], durationSec: number): Promise<FinalizeResult> => {
      setError(null);
      const finalOutline = buildOutline(segments, mode, durationSec * 1000);
      setOutline(finalOutline);

      const status = engineStatus ?? (await getLocalEngineStatus());
      if (status !== "available") {
        setError(ENGINE_STATUS_MESSAGE[status]);
        return { note: outlineAsFinalNote(finalOutline, mode), engine: "rules" };
      }

      const { blocks } = buildDigest(segments, MAX_CHARS_PER_BLOCK, MAX_BLOCKS);
      if (blocks.length === 0) {
        return { note: outlineAsFinalNote(finalOutline, mode), engine: "rules" };
      }

      try {
        const note = await refineNote({
          mode,
          outline: finalOutline,
          blocks,
          durationSec,
          onProgress: setProgress,
        });
        return { note, engine: "apple-llm" };
      } catch (err) {
        // 규칙 기반 결과는 이미 있으므로 노트를 잃지는 않는다.
        setError(
          err instanceof Error
            ? `기기 내 AI 정리에 실패했습니다: ${err.message}`
            : "기기 내 AI 정리에 실패했습니다.",
        );
        return { note: outlineAsFinalNote(finalOutline, mode), engine: "rules" };
      } finally {
        setProgress(null);
      }
    },
    [engineStatus, mode],
  );

  return {
    outline,
    engineStatus,
    engineMessage: engineStatus ? ENGINE_STATUS_MESSAGE[engineStatus] : "",
    progress,
    error,
    sync,
    finalize,
  };
}
